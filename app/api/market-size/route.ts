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
import { eq, desc } from 'drizzle-orm'
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
  marketCap: number
  revenue: number
  revenueHasAny: boolean
  withRevenue: number
  tickerCount: number
  growth: WeightAccum
  upside: WeightAccum
}

function emptyAccum(): NodeAccum {
  return {
    marketCap: 0,
    revenue: 0,
    revenueHasAny: false,
    withRevenue: 0,
    tickerCount: 0,
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
    revenueCoverage: { withRevenue: a.withRevenue, total: a.tickerCount },
    tickerCount: a.tickerCount,
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

    // 대표 산업 매핑 (카테고리 → 첫 산업, order 최소) + 산업 필터용
    const icRows = await db
      .select({
        categoryId: industryCategories.categoryId,
        industryId: industries.id,
        industryName: industries.name,
        order: industries.order,
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
      if (industryId && r.industryId === industryId) {
        industryCategoryIds.add(r.categoryId)
      }
      const cur = primaryIndustry.get(r.categoryId)
      if (!cur || (r.order ?? 0) < cur.order) {
        primaryIndustry.set(r.categoryId, {
          id: r.industryId,
          name: r.industryName,
          order: r.order ?? 0,
        })
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

      const sAcc = sectorAcc.get(sectorId) ?? emptyAccum()
      const cAcc = categoryAcc.get(categoryId) ?? emptyAccum()

      const apply = (acc: NodeAccum) => {
        acc.marketCap += mcapUsd
        acc.tickerCount += 1
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
        const revNative = revenueMap.get(ticker)
        if (revNative != null) {
          acc.revenue += toUsd(revNative, ticker)
          acc.revenueHasAny = true
          acc.withRevenue += 1
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
