import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  categories,
  sectors,
  sectorCompanies,
  companies,
  dailySnapshots,
  companyScores,
  companyProfiles,
  industries,
  industryCategories,
} from '@/drizzle/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import { resolveRegion, regionFilterToValue } from '@/lib/region'
import type {
  ApiResponse,
  MarketSizeResponse,
  MarketSizeNode,
  MarketSizeCategory,
} from '@/types'

export const revalidate = 3600

/** 시총 가중 평균 누적기 — 값이 있는 종목의 시총만 분모로. */
interface WeightAccum {
  num: number // Σ(mcapUsd * value)
  den: number // Σ(mcapUsd where value present)
}

interface NodeAccum {
  /** 배분 후 시총 합 — 소속 건별로 share 를 더한다. */
  marketCap: number
  /** 배분 후 매출 합 */
  revenue: number
  revenueHasAny: boolean
  /** 고유 종목 집합. 카테고리는 여러 섹터를 품으므로 건수로 세면 중복된다. */
  tickers: Set<string>
  withRevenue: Set<string>
  growth: WeightAccum
  upside: WeightAccum
}

function emptyAccum(): NodeAccum {
  return {
    marketCap: 0,
    revenue: 0,
    revenueHasAny: false,
    tickers: new Set(),
    withRevenue: new Set(),
    growth: { num: 0, den: 0 },
    upside: { num: 0, den: 0 },
  }
}

function finalize(id: string, name: string, a: NodeAccum): MarketSizeNode {
  return {
    id,
    name,
    marketCap: a.marketCap,
    revenueGrowth: a.growth.den > 0 ? a.growth.num / a.growth.den : null,
    targetUpside: a.upside.den > 0 ? a.upside.num / a.upside.den : null,
    revenueSum: a.revenueHasAny ? a.revenue : null,
    revenueCoverage: { withRevenue: a.withRevenue.size, total: a.tickers.size },
    tickerCount: a.tickers.size,
  }
}

/**
 * GET /api/market-size?industry=&region=
 *
 * 카테고리(+드릴다운 섹터)별 시장 규모 스냅샷:
 * - 시총 합 (toUsd 후 집계)
 * - 시총 가중 매출 성장률 / 목표주가 상승여력
 * - 매출 합 (toUsd) + 커버리지(보유 종목/전체)
 * 최신 거래일 1개 기준. 산업/region 필터 적용.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MarketSizeResponse>>> {
  try {
    const db = getDb()
    const searchParams = request.nextUrl.searchParams
    const region = resolveRegion(searchParams)
    const regionValue = regionFilterToValue(region)
    const industryParam = searchParams.get('industry')
    const industryId =
      industryParam && industryParam.length > 0 && industryParam.length < 64
        ? industryParam
        : null

    // 최신 거래일
    const [latest] = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1)
    const date = latest?.date ?? null
    if (!date) {
      return NextResponse.json({
        success: true,
        data: {
          categories: [],
          date: null,
          appliedRegion: region,
          appliedIndustryId: industryId,
          totalMarketCap: 0,
        },
      })
    }

    // 대표 산업 매핑 (카테고리 → is_primary 산업) + 산업 필터용
    //
    // 이 테이블의 M:N 은 내비게이션용이라 카테고리 하나가 여러 산업에 걸린다.
    // 지도는 면적을 그리려고 배타적 귀속이 필요한데, 예전엔 order 최소 산업을
    // 골랐다. 테크가 order=1 이라 다중 연결 카테고리 6개(제약·바이오·의료기기,
    // 결제, 전기차, 우주 등 전체의 23%)가 전부 테크로 쏠렸다.
    // 이제 GICS 기준으로 지정한 is_primary 를 쓴다.
    //
    // 스키마 가드: 코드는 main→Vercel 로, DB 는 db-snapshot 브랜치로 각각 배포되므로
    // is_primary 가 없는 DB 위에서 이 코드가 돌 수 있다(실제로 한 번 500 을 냈다).
    // 컬럼이 없으면 예전 order 규칙으로 물러난다 — 귀속은 부정확해지지만 지도는 산다.
    const hasIsPrimary =
      (
        db.all(
          sql`SELECT name FROM pragma_table_info('industry_categories') WHERE name = 'is_primary'`
        ) as unknown[]
      ).length > 0
    if (!hasIsPrimary) {
      console.warn(
        '[GET /api/market-size] industry_categories.is_primary 없음 — order 최소 규칙으로 폴백. ' +
          'scripts/migrate-add-primary-industry.ts 를 적용하고 db-snapshot 에 반영할 것.'
      )
    }

    const icRows = await db
      .select({
        categoryId: industryCategories.categoryId,
        industryId: industries.id,
        industryName: industries.name,
        order: industries.order,
        ...(hasIsPrimary ? { isPrimary: industryCategories.isPrimary } : {}),
      })
      .from(industryCategories)
      .innerJoin(industries, eq(industryCategories.industryId, industries.id))
    const primaryIndustry = new Map<
      string,
      { id: string; name: string; order: number }
    >()
    const industryCategoryIds = new Set<string>()
    for (const r of icRows) {
      if (!r.categoryId || !r.industryId) continue
      // 산업 필터는 M:N 그대로 — 대표가 아니어도 그 산업을 볼 때 포함된다.
      if (industryId && r.industryId === industryId) {
        industryCategoryIds.add(r.categoryId)
      }
      const order = r.order ?? 0
      if (hasIsPrimary) {
        if ((r as { isPrimary?: boolean }).isPrimary) {
          primaryIndustry.set(r.categoryId, {
            id: r.industryId,
            name: r.industryName,
            order,
          })
        }
      } else {
        const cur = primaryIndustry.get(r.categoryId)
        if (!cur || order < cur.order) {
          primaryIndustry.set(r.categoryId, {
            id: r.industryId,
            name: r.industryName,
            order,
          })
        }
      }
    }

    // 카테고리 / 섹터 taxonomy
    const catRows = await db
      .select({ id: categories.id, name: categories.name, order: categories.order })
      .from(categories)
    const sectorRows = await db
      .select({
        id: sectors.id,
        name: sectors.name,
        categoryId: sectors.categoryId,
      })
      .from(sectors)
    const sectorToCategory = new Map<string, string>()
    const sectorName = new Map<string, string>()
    for (const s of sectorRows) {
      if (s.categoryId) sectorToCategory.set(s.id, s.categoryId)
      sectorName.set(s.id, s.name)
    }

    // 섹터 → 티커
    const scRows = await db
      .select({ sectorId: sectorCompanies.sectorId, ticker: sectorCompanies.ticker })
      .from(sectorCompanies)

    // region 필터용 티커 region
    const regionRows = await db
      .select({ ticker: companies.ticker, region: companies.region })
      .from(companies)
    const tickerRegion = new Map<string, string>()
    for (const r of regionRows) tickerRegion.set(r.ticker, r.region)

    // 최신 스냅샷 (mcap, price)
    const snapRows = await db
      .select({
        ticker: dailySnapshots.ticker,
        marketCap: dailySnapshots.marketCap,
        price: dailySnapshots.price,
      })
      .from(dailySnapshots)
      .where(eq(dailySnapshots.date, date))
    const snap = new Map<string, { marketCap: number; price: number }>()
    for (const s of snapRows) {
      if (!s.ticker) continue
      snap.set(s.ticker, { marketCap: s.marketCap ?? 0, price: s.price ?? 0 })
    }

    // 성장률 / 목표주가
    const scoreRows = await db
      .select({
        ticker: companyScores.ticker,
        revenueGrowth: companyScores.revenueGrowth,
        targetMeanPrice: companyScores.targetMeanPrice,
      })
      .from(companyScores)
    const scoreMap = new Map<
      string,
      { revenueGrowth: number | null; targetMeanPrice: number | null }
    >()
    for (const s of scoreRows) {
      scoreMap.set(s.ticker, {
        revenueGrowth: s.revenueGrowth,
        targetMeanPrice: s.targetMeanPrice,
      })
    }

    // 매출
    const profileRows = await db
      .select({ ticker: companyProfiles.ticker, revenue: companyProfiles.revenue })
      .from(companyProfiles)
    const revenueMap = new Map<string, number>()
    for (const p of profileRows) {
      if (p.revenue && p.revenue > 0) revenueMap.set(p.ticker, p.revenue)
    }

    // 종목이 속한 전체 섹터 수 — 시총 균등 배분의 분모.
    //
    // 같은 종목이 여러 섹터에 속하면 시총이 그만큼 중복 합산되어, 부모 면적 =
    // 자식 합을 전제로 하는 트리맵이 거짓말을 한다(구글 10섹터 → $4.5T 가 $44.8T).
    // 그래서 시총을 소속 섹터 수로 나눠 배분해 전체 합을 실제 추적 시총과 일치시킨다.
    //
    // 분모는 필터와 무관하게 "종목의 전체 섹터 수"로 고정한다. 필터 통과분으로
    // 나누면 같은 산업이 전체 뷰와 산업 필터 뷰에서 다른 값을 갖게 된다.
    // (모든 섹터가 카테고리·산업에 연결돼 있어 배분분이 새지 않음을 확인함)
    const sectorCountByTicker = new Map<string, number>()
    for (const sc of scRows) {
      if (!sc.ticker || !sc.sectorId) continue
      if (!sectorToCategory.has(sc.sectorId)) continue
      sectorCountByTicker.set(
        sc.ticker,
        (sectorCountByTicker.get(sc.ticker) ?? 0) + 1
      )
    }

    // 집계
    const sectorAcc = new Map<string, NodeAccum>()
    const categoryAcc = new Map<string, NodeAccum>()

    for (const sc of scRows) {
      const { sectorId, ticker } = sc
      if (!sectorId || !ticker) continue
      const categoryId = sectorToCategory.get(sectorId)
      if (!categoryId) continue
      // 산업 필터
      if (industryId && !industryCategoryIds.has(categoryId)) continue
      // region 필터
      if (regionValue && tickerRegion.get(ticker) !== regionValue) continue
      // 최신 스냅샷 없는 종목 제외
      const s = snap.get(ticker)
      if (!s) continue

      const mcapUsd = toUsd(s.marketCap, ticker)
      if (mcapUsd <= 0) continue

      const share = 1 / (sectorCountByTicker.get(ticker) || 1)

      const sAcc = sectorAcc.get(sectorId) ?? emptyAccum()
      const cAcc = categoryAcc.get(categoryId) ?? emptyAccum()

      const apply = (acc: NodeAccum) => {
        // 면적성 값은 배분분만 더한다. 카테고리는 한 종목의 여러 섹터를 품을 수
        // 있으므로 소속 건마다 share 가 쌓여 그 카테고리 몫이 자연히 맞춰진다.
        acc.marketCap += mcapUsd * share
        const revNative = revenueMap.get(ticker)
        if (revNative != null) {
          acc.revenue += toUsd(revNative, ticker) * share
          acc.revenueHasAny = true
        }

        // 아래는 종목당 1회만 — 카테고리에서 같은 종목이 중복 반영되지 않게.
        if (acc.tickers.has(ticker)) return
        acc.tickers.add(ticker)
        if (revNative != null) acc.withRevenue.add(ticker)

        // 가중평균의 가중치는 배분 전 시총(대표성)을 쓴다. 배분값을 쓰면 소속
        // 섹터가 많은 종목만 영향력이 깎여 지표가 왜곡된다.
        const score = scoreMap.get(ticker)
        if (score?.revenueGrowth != null) {
          acc.growth.num += mcapUsd * score.revenueGrowth
          acc.growth.den += mcapUsd
        }
        // 상승여력 = (목표주가 - 현재가)/현재가. 동일통화 비율이라 통화 상쇄(무차원).
        if (score?.targetMeanPrice != null && s.price > 0) {
          const upside = (score.targetMeanPrice - s.price) / s.price
          acc.upside.num += mcapUsd * upside
          acc.upside.den += mcapUsd
        }
      }
      apply(sAcc)
      apply(cAcc)
      sectorAcc.set(sectorId, sAcc)
      categoryAcc.set(categoryId, cAcc)
    }

    // 카테고리 노드 조립
    const catName = new Map<string, string>()
    for (const c of catRows) catName.set(c.id, c.name)

    // 카테고리별 섹터 목록
    const sectorsByCategory = new Map<string, string[]>()
    for (const [sectorId, categoryId] of sectorToCategory.entries()) {
      if (!sectorAcc.has(sectorId)) continue
      const arr = sectorsByCategory.get(categoryId) ?? []
      arr.push(sectorId)
      sectorsByCategory.set(categoryId, arr)
    }

    const result: MarketSizeCategory[] = []
    for (const [categoryId, acc] of categoryAcc.entries()) {
      const base = finalize(categoryId, catName.get(categoryId) ?? categoryId, acc)
      const sectorIds = sectorsByCategory.get(categoryId) ?? []
      const sectorNodes = sectorIds
        .map((sid) =>
          finalize(sid, sectorName.get(sid) ?? sid, sectorAcc.get(sid)!)
        )
        .sort((x, y) => y.marketCap - x.marketCap)
      const pi = primaryIndustry.get(categoryId)
      result.push({
        ...base,
        industryId: pi?.id ?? null,
        industryName: pi?.name ?? null,
        sectors: sectorNodes,
      })
    }
    result.sort((a, b) => b.marketCap - a.marketCap)

    const totalMarketCap = result.reduce((sum, c) => sum + c.marketCap, 0)

    return NextResponse.json({
      success: true,
      data: {
        categories: result,
        date,
        appliedRegion: region,
        appliedIndustryId: industryId,
        totalMarketCap,
      },
    })
  } catch (error) {
    console.error('[GET /api/market-size] 실패:', error)
    return NextResponse.json(
      { success: false, error: '시장 규모 데이터를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
