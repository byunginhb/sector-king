import { NextRequest, NextResponse } from 'next/server'
import { eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companies, companyScores, dailySnapshots, scoreHistory } from '@/drizzle/schema'
import { matchesRegion } from '@/lib/region'
import { toUsd } from '@/lib/currency'
import {
  clampIntParam,
  resolveHorizon,
  resolveSortDir,
  type RankingHorizon,
  type RankingSortDir,
} from '@/lib/api-helpers'
import { resolveIndustryFilter } from '@/lib/api-helpers'
import { computeRankingScores, computeMomentumDelta } from '@/lib/ranking-score'
import type { ApiResponse, RegionFilter } from '@/types'

export interface RankingItem {
  ticker: string
  name: string | null
  nameKo: string | null
  /** 0~100, 모든 컴포넌트 결손 시 null. */
  shortScore: number | null
  /** 0~100, 모든 컴포넌트 결손 시 null. */
  longScore: number | null
  /** 모멘텀(추세) 데이터 결손(신규상장) — "추세 데이터 부족" 표기용. */
  momentumPartial: boolean
  /** 단기·장기 종합 점수(둘의 평균, 0~100). 상단 탑픽 선정용. 둘 다 결손 시 null. */
  combinedScore: number | null
  // 애널리스트
  recommendationKey: string | null
  analystCount: number | null
  /** ★ toUsd(targetMeanPrice, ticker) */
  targetMeanPriceUsd: number | null
  /** (targetUsd - priceUsd) / priceUsd, 비율(소수). */
  upsidePct: number | null
  // 가격 컨텍스트
  /** ★ toUsd(price, ticker) */
  priceUsd: number | null
  /** ★ toUsd(marketCap, ticker) */
  marketCapUsd: number | null
  // 재무 (비율·무차원 — toUsd 불요)
  returnOnEquity: number | null
  operatingMargin: number | null
  revenueGrowth: number | null
  peRatio: number | null
  // 추가 지표(고급 보기 — 전부 비율·무차원, marketCap 만 USD)
  pegRatio: number | null
  earningsGrowth: number | null
  beta: number | null
  debtToEquity: number | null
  /** 0~1 데이터 커버리지. */
  dataQuality: number
}

export interface RankingsResponse {
  items: RankingItem[]
  /** 단기·장기 종합 점수 상위 5종(현재 정렬·limit 과 무관, 필터 적용 후 전체에서 선정). */
  topPicks: RankingItem[]
  horizon: RankingHorizon
  sort: RankingSortDir
  appliedRegion: RegionFilter
  appliedIndustryId: string | null
  /** 최신 dailySnapshots 기준일. */
  date: string | null
  limit: number
  /** 필터 적용 후 전체 종목 수(slice 전). */
  total: number
}

/** 정렬 키별 비교값 추출(점수 외 다축 정렬). null 은 항상 뒤로. */
type SortKey =
  | 'short'
  | 'long'
  | 'name'
  | 'rec'
  | 'target'
  | 'upside'
  | 'roe'
  | 'margin'
  | 'pe'
  | 'marketcap'

const RECOMMENDATION_ORDER: Record<string, number> = {
  strong_buy: 5,
  buy: 4,
  hold: 3,
  underperform: 2,
  sell: 1,
}

function recommendationRank(key: string | null): number | null {
  if (!key) return null
  return RECOMMENDATION_ORDER[key] ?? null
}

/**
 * GET /api/rankings
 *
 * 종목을 단기/장기 점수(또는 다축) 기준으로 정렬해 반환한다.
 *
 * 쿼리:
 * - `?industry=` (없으면 전 산업), `?region=all|kr|global` (기본 all)
 * - `?horizon=short|long` (기본 long) — 토글이 부각하는 점수축
 * - `?sortKey=` (기본 = horizon) — 정렬 컬럼(다축). 미지정 시 horizon 점수로 정렬
 * - `?sort=desc|asc` (기본 desc), `?limit=` (1~200, 기본 50)
 *
 * 점수는 lib/ranking-score.ts 로 **메모리 계산**, 가격성은 toUsd 후 메모리 정렬·slice.
 * (혼합통화 SQL ORDER BY 함정 회피 — 후보집합만 SQL 로 좁힌다.)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RankingsResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams

    const resolved = await resolveIndustryFilter(searchParams)
    if (resolved.errorResponse) return resolved.errorResponse
    const { filter, region } = resolved

    const horizon = resolveHorizon(searchParams)
    const sortDir = resolveSortDir(searchParams)
    const limit = clampIntParam(searchParams, 'limit', {
      fallback: 50,
      min: 1,
      max: 200,
    })

    // 정렬 키: 명시 sortKey 우선, 없으면 horizon 점수
    const rawSortKey = searchParams.get('sortKey')
    const sortKey: SortKey = isSortKey(rawSortKey) ? rawSortKey : horizon

    const db = getDb()

    // 최신 거래일
    const [latestDateRow] = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(sql`${dailySnapshots.date} DESC`)
      .limit(1)
    const latestDate = latestDateRow?.date ?? null

    if (!latestDate) {
      return NextResponse.json({
        success: true,
        data: emptyResponse(horizon, sortDir, region, filter ? null : null, null, limit),
      })
    }

    const appliedIndustryId = searchParams.get('industry')

    // 후보집합(industry∩region)만 좁힌다.
    // industry 미지정이면 전 종목. region 은 메모리 마스크(matchesRegion).
    const industryTickers = filter?.tickers ?? null

    // companyScores + 최신 dailySnapshots + companies 조인 (상관 서브쿼리로 N+1 금지)
    const baseRows = await db
      .select({
        ticker: companyScores.ticker,
        name: companies.name,
        nameKo: companies.nameKo,
        scaleScore: companyScores.scaleScore,
        growthScore: companyScores.growthScore,
        profitabilityScore: companyScores.profitabilityScore,
        sentimentScore: companyScores.sentimentScore,
        smoothedScore: companyScores.smoothedScore,
        recommendationKey: companyScores.recommendationKey,
        analystCount: companyScores.analystCount,
        targetMeanPrice: companyScores.targetMeanPrice,
        returnOnEquity: companyScores.returnOnEquity,
        operatingMargin: companyScores.operatingMargin,
        revenueGrowth: companyScores.revenueGrowth,
        earningsGrowth: companyScores.earningsGrowth,
        beta: companyScores.beta,
        debtToEquity: companyScores.debtToEquity,
        dataQuality: companyScores.dataQuality,
        price: dailySnapshots.price,
        marketCap: dailySnapshots.marketCap,
        week52High: dailySnapshots.week52High,
        week52Low: dailySnapshots.week52Low,
        peRatio: dailySnapshots.peRatio,
        pegRatio: dailySnapshots.pegRatio,
      })
      .from(companyScores)
      .leftJoin(companies, eq(companyScores.ticker, companies.ticker))
      .leftJoin(
        dailySnapshots,
        sql`${companyScores.ticker} = ${dailySnapshots.ticker} AND ${dailySnapshots.date} = (
          SELECT MAX(date) FROM daily_snapshots WHERE ticker = ${companyScores.ticker}
        )`
      )
      .where(
        industryTickers && industryTickers.length > 0
          ? inArray(companyScores.ticker, industryTickers)
          : industryTickers && industryTickers.length === 0
            ? sql`1 = 0` // industry 지정됐으나 소속 종목 0 → 빈 결과
            : sql`1 = 1`
      )

    // region 메모리 마스크
    const candidates = baseRows.filter(
      (row): row is typeof row & { ticker: string } =>
        !!row.ticker && matchesRegion(row.ticker, region)
    )

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        data: emptyResponse(horizon, sortDir, region, appliedIndustryId, latestDate, limit),
      })
    }

    // 모멘텀 lookback: 후보 ticker 의 score_history 에서 (최신, 15거래일 전) smoothedScore Δ
    const momentumByTicker = await loadMomentumDeltas(
      db,
      candidates.map((c) => c.ticker)
    )

    // 점수 계산 + toUsd. _smoothedScore 는 정렬 타이브레이커 전용(응답 직전 제거).
    const items: (RankingItem & { _smoothedScore: number | null })[] =
      candidates.map((row) => {
      const ticker = row.ticker
      const priceUsd = row.price != null ? toUsd(row.price, ticker) : null
      const targetUsd =
        row.targetMeanPrice != null ? toUsd(row.targetMeanPrice, ticker) : null
      const marketCapUsd = row.marketCap != null ? toUsd(row.marketCap, ticker) : null

      const { shortScore, longScore, momentumPartial, upsidePct } =
        computeRankingScores({
          momentumDelta: momentumByTicker.get(ticker) ?? null,
          price: row.price,
          week52High: row.week52High,
          week52Low: row.week52Low,
          // subscore 결손은 0 으로(종목 상세 detail API 의 `?? 0` 와 동일 정책 → 동일 장기 점수).
          // 0 은 scoring.py 의 유효 최저값이며, 실데이터상 결손은 없다.
          sentimentScore: row.sentimentScore ?? 0,
          profitabilityScore: row.profitabilityScore ?? 0,
          growthScore: row.growthScore ?? 0,
          scaleScore: row.scaleScore ?? 0,
          targetUsd,
          priceUsd,
        })

      // 종합 점수: 단기·장기 평균(둘 중 하나만 있으면 그 값, 둘 다 없으면 null)
      const combinedScore =
        shortScore != null && longScore != null
          ? (shortScore + longScore) / 2
          : (shortScore ?? longScore ?? null)

      return {
        ticker,
        name: row.name ?? null,
        nameKo: row.nameKo ?? null,
        shortScore,
        longScore,
        momentumPartial,
        combinedScore,
        recommendationKey: row.recommendationKey ?? null,
        analystCount: row.analystCount ?? null,
        targetMeanPriceUsd: targetUsd,
        upsidePct,
        priceUsd,
        marketCapUsd,
        returnOnEquity: row.returnOnEquity ?? null,
        operatingMargin: row.operatingMargin ?? null,
        revenueGrowth: row.revenueGrowth ?? null,
        peRatio: row.peRatio ?? null,
        pegRatio: row.pegRatio ?? null,
        earningsGrowth: row.earningsGrowth ?? null,
        beta: row.beta ?? null,
        debtToEquity: row.debtToEquity ?? null,
        dataQuality: row.dataQuality ?? 0,
        // 정렬 보조(응답에는 미노출): smoothedScore, marketCapUsd 는 타이브레이커로 보관
        _smoothedScore: row.smoothedScore ?? null,
      } as RankingItem & { _smoothedScore: number | null }
    })

    // 메모리 정렬 — 1차 sortKey, 타이브레이커: smoothedScore desc → marketCap(USD) desc → ticker asc
    const sorted = sortItems(items, sortKey, sortDir)

    // 정렬 보조 필드 제거
    const cleaned: RankingItem[] = sorted.map((item) => {
      const { _smoothedScore, ...rest } = item as RankingItem & {
        _smoothedScore: number | null
      }
      void _smoothedScore
      return rest
    })

    // 종합(단기·장기 평균) 상위 5 — 현재 정렬·limit 과 무관, 필터 적용 후 전체에서 선정
    const topPicks = [...cleaned]
      .filter((i) => i.combinedScore != null)
      .sort((a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0))
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      data: {
        items: cleaned.slice(0, limit),
        topPicks,
        horizon,
        sort: sortDir,
        appliedRegion: region,
        appliedIndustryId,
        date: latestDate,
        limit,
        total: cleaned.length,
      },
    })
  } catch (error) {
    console.error('Rankings API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rankings' },
      { status: 500 }
    )
  }
}

function isSortKey(value: string | null): value is SortKey {
  return (
    value === 'short' ||
    value === 'long' ||
    value === 'name' ||
    value === 'rec' ||
    value === 'target' ||
    value === 'upside' ||
    value === 'roe' ||
    value === 'margin' ||
    value === 'pe' ||
    value === 'marketcap'
  )
}

function emptyResponse(
  horizon: RankingHorizon,
  sort: RankingSortDir,
  region: RegionFilter,
  appliedIndustryId: string | null,
  date: string | null,
  limit: number
): RankingsResponse {
  return {
    items: [],
    topPicks: [],
    horizon,
    sort,
    appliedRegion: region,
    appliedIndustryId,
    date,
    limit,
    total: 0,
  }
}

/**
 * 후보 ticker 들의 모멘텀 Δ(최신 smoothedScore − MOMENTUM_LOOKBACK 거래일 전) 를 일괄 조회.
 * score_history 를 ticker·date asc 로 받아 메모리에서 ticker별 마지막/lookback 지점을 계산한다.
 * 시계열이 lookback+1 미만이면(신규상장) 해당 ticker 는 맵에서 빠지고 → momentumDelta=null.
 */
async function loadMomentumDeltas(
  db: ReturnType<typeof getDb>,
  tickers: readonly string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (tickers.length === 0) return result

  const rows = await db
    .select({
      ticker: scoreHistory.ticker,
      date: scoreHistory.date,
      smoothed: scoreHistory.smoothedScore,
    })
    .from(scoreHistory)
    .where(inArray(scoreHistory.ticker, [...tickers]))
    .orderBy(sql`${scoreHistory.ticker} ASC, ${scoreHistory.date} ASC`)

  // ticker별 smoothedScore 시계열 누적 (null 도 그대로 유지 — 위젯과 동일한 배열 구성.
  // 행을 건너뛰면 인덱스 정렬이 어긋나 모멘텀이 두 화면에서 달라질 수 있다)
  const series = new Map<string, (number | null)[]>()
  for (const row of rows) {
    const arr = series.get(row.ticker) ?? []
    arr.push(row.smoothed)
    series.set(row.ticker, arr)
  }

  // 공유 함수로 Δ 계산(종목 상세와 동일 산식 → 동일 단기 점수)
  for (const [ticker, arr] of series) {
    const delta = computeMomentumDelta(arr)
    if (delta !== null) result.set(ticker, delta)
  }

  return result
}

/** sortKey 의 비교값 추출. null 은 정렬에서 항상 뒤로 보낸다. */
function sortValue(
  item: RankingItem & { _smoothedScore: number | null },
  key: SortKey
): number | string | null {
  switch (key) {
    case 'short':
      return item.shortScore
    case 'long':
      return item.longScore
    case 'name':
      return (item.nameKo ?? item.name ?? item.ticker).toLowerCase()
    case 'rec':
      return recommendationRank(item.recommendationKey)
    case 'target':
      return item.targetMeanPriceUsd
    case 'upside':
      return item.upsidePct
    case 'roe':
      return item.returnOnEquity
    case 'margin':
      return item.operatingMargin
    case 'pe':
      return item.peRatio
    case 'marketcap':
      return item.marketCapUsd
  }
}

function sortItems<T extends RankingItem & { _smoothedScore: number | null }>(
  items: T[],
  sortKey: SortKey,
  dir: RankingSortDir
): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const av = sortValue(a, sortKey)
    const bv = sortValue(b, sortKey)

    // null 은 항상 뒤(asc·desc 무관)
    if (av === null && bv === null) {
      // fall through to tiebreaker
    } else if (av === null) {
      return 1
    } else if (bv === null) {
      return -1
    } else if (typeof av === 'string' && typeof bv === 'string') {
      const cmp = av.localeCompare(bv)
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
    } else if (typeof av === 'number' && typeof bv === 'number') {
      if (av !== bv) return sign * (av - bv)
    }

    // 타이브레이커: smoothedScore desc → marketCap(USD) desc → ticker asc
    const as = a._smoothedScore ?? -Infinity
    const bs = b._smoothedScore ?? -Infinity
    if (as !== bs) return bs - as
    const am = a.marketCapUsd ?? -Infinity
    const bm = b.marketCapUsd ?? -Infinity
    if (am !== bm) return bm - am
    return a.ticker.localeCompare(b.ticker)
  })
}
