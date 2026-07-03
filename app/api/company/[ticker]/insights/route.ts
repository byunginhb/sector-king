import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  companies,
  companyProfiles,
  companyScores,
  dailySnapshots,
  scoreHistory,
  sectorCompanies,
  sectors,
} from '@/drizzle/schema'
import { asc, eq, sql } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import { resolveRange } from '@/lib/api-helpers'
import { keyMetricForSector } from '@/lib/valuation-guide'
import type {
  ApiResponse,
  CompanyInsightsResponse,
  InsightPeer,
  InsightValuation,
  PeBand,
  ScoreHistoryPoint,
  ScoreMomentum,
  ValuationMetric,
} from '@/types'

export const revalidate = 3600 // 1 hour cache

/**
 * score_history 조회 일수 화이트리스트(클램프 상한).
 * 실제 반환 일수는 보유 거래일 수에 따라 더 적을 수 있다(주말·휴장일 제외).
 * 74 는 상한값으로만 의미가 있으며 "정확히 74일"을 보장하지 않는다.
 */
const ALLOWED_RANGES = [30, 60, 74, 120] as const
const DEFAULT_RANGE = 74
/** percentile/median 산출 최소 표본 (소형 섹터 보호). */
const MIN_PEER_SAMPLE = 4
/** PER 밴드 최소 이력 포인트 (미만이면 밴드 null). */
const MIN_BAND_POINTS = 5
/** 모멘텀 trend 판정 임계 (점/range). */
const TREND_DELTA_THRESHOLD = 1.0

/** 정렬된 숫자 배열의 중앙값. 빈 배열이면 null. */
function median(sortedAsc: number[]): number | null {
  const n = sortedAsc.length
  if (n === 0) return null
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (sortedAsc[mid - 1] + sortedAsc[mid]) / 2 : sortedAsc[mid]
}

/**
 * 분포(values) 내에서 self 값의 백분위(0~100).
 * "내 값 이하인 표본 수 / 전체 수 × 100". null self 또는 빈 분포면 null.
 */
function percentileOf(self: number | null, values: number[]): number | null {
  if (self == null || values.length === 0) return null
  const atOrBelow = values.filter((v) => v <= self).length
  return (atOrBelow / values.length) * 100
}

/** 메모리 분포에서 ValuationMetric 산출 (min-peer 미만이면 percentile/median null). */
function buildValuationMetric(
  self: number | null,
  values: number[],
  hasSample: boolean
): ValuationMetric {
  if (!hasSample) {
    return { value: self, percentile: null, median: null }
  }
  const sorted = [...values].sort((a, b) => a - b)
  return {
    value: self,
    percentile: percentileOf(self, values),
    median: median(sorted),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
): Promise<NextResponse<ApiResponse<CompanyInsightsResponse>>> {
  try {
    const { ticker } = await params

    if (!ticker || ticker.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Invalid ticker' },
        { status: 400 }
      )
    }

    const db = getDb()

    // 종목이 속한 섹터 목록 (rank + sectors.order 로 결정론적 정렬)
    const memberSectors = await db
      .select({
        sectorId: sectorCompanies.sectorId,
        rank: sectorCompanies.rank,
        sectorName: sectors.name,
        sectorOrder: sectors.order,
      })
      .from(sectorCompanies)
      .leftJoin(sectors, eq(sectorCompanies.sectorId, sectors.id))
      .where(eq(sectorCompanies.ticker, ticker))

    const allSectorIds = memberSectors
      .map((s) => s.sectorId)
      .filter((id): id is string => !!id)

    // 주 섹터 = rank 최상위(숫자 작은 값). 동률이면 sectors.order ASC → sectorId ASC.
    const primary =
      [...memberSectors]
        .filter((s) => s.sectorId)
        .sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank
          const ao = a.sectorOrder ?? Number.MAX_SAFE_INTEGER
          const bo = b.sectorOrder ?? Number.MAX_SAFE_INTEGER
          if (ao !== bo) return ao - bo
          return (a.sectorId ?? '').localeCompare(b.sectorId ?? '')
        })[0] ?? null

    const primarySectorId = primary?.sectorId ?? null

    // 1) score_history 시계열 — 보유분으로 클램프 후 최근 N일
    const requestedRange = resolveRange(request.nextUrl.searchParams, {
      allowed: ALLOWED_RANGES,
      fallback: DEFAULT_RANGE,
    })

    const historyRows = await db
      .select({
        date: scoreHistory.date,
        raw: scoreHistory.rawTotalScore,
        smoothed: scoreHistory.smoothedScore,
        scale: scoreHistory.scaleScore,
        growth: scoreHistory.growthScore,
        profitability: scoreHistory.profitabilityScore,
        sentiment: scoreHistory.sentimentScore,
      })
      .from(scoreHistory)
      .where(eq(scoreHistory.ticker, ticker))
      .orderBy(asc(scoreHistory.date))

    // 보유 전체 → 최근 requestedRange 일만 절단. appliedRange = 실제 반환 일수.
    const clamped =
      historyRows.length > requestedRange
        ? historyRows.slice(historyRows.length - requestedRange)
        : historyRows
    const appliedRange = clamped.length

    const scoreHistoryPoints: ScoreHistoryPoint[] = clamped.map((h) => ({
      date: h.date,
      total: h.smoothed ?? 0,
      raw: h.raw ?? 0,
      scale: h.scale ?? 0,
      growth: h.growth ?? 0,
      profitability: h.profitability ?? 0,
      sentiment: h.sentiment ?? 0,
    }))

    let scoreMomentum: ScoreMomentum | null = null
    if (scoreHistoryPoints.length >= 2) {
      const first = scoreHistoryPoints[0].total
      const last = scoreHistoryPoints[scoreHistoryPoints.length - 1].total
      const deltaTotal = last - first
      const deltaPct = first !== 0 ? deltaTotal / first : null
      const trend: ScoreMomentum['trend'] =
        deltaTotal > TREND_DELTA_THRESHOLD
          ? 'up'
          : deltaTotal < -TREND_DELTA_THRESHOLD
            ? 'down'
            : 'flat'
      scoreMomentum = { deltaTotal, deltaPct, trend }
    }

    // 2) 주 섹터 peer 집계 — 단일 조인 쿼리(상관 서브쿼리 MAX(date), N+1 금지)
    let peers: InsightPeer[] = []
    let sectorContext: CompanyInsightsResponse['sectorContext'] = null
    let valuation: InsightValuation | null = null
    let insufficientPeerSample = true

    if (primarySectorId) {
      const peerRows = await db
        .select({
          ticker: sectorCompanies.ticker,
          rank: sectorCompanies.rank,
          name: companies.name,
          nameKo: companies.nameKo,
          marketCap: dailySnapshots.marketCap,
          peRatio: dailySnapshots.peRatio,
          pegRatio: dailySnapshots.pegRatio,
          priceToBook: dailySnapshots.priceToBook,
          evToEbitda: dailySnapshots.evToEbitda,
          smoothedScore: companyScores.smoothedScore,
          returnOnEquity: companyScores.returnOnEquity,
        })
        .from(sectorCompanies)
        .leftJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
        .leftJoin(
          dailySnapshots,
          sql`${sectorCompanies.ticker} = ${dailySnapshots.ticker} AND ${dailySnapshots.date} = (
            SELECT MAX(date) FROM daily_snapshots WHERE ticker = ${sectorCompanies.ticker}
          )`
        )
        .leftJoin(
          companyScores,
          eq(sectorCompanies.ticker, companyScores.ticker)
        )
        .where(eq(sectorCompanies.sectorId, primarySectorId))
        .orderBy(asc(sectorCompanies.rank))

      // peer 행별 toUsd 환산 후 메모리 집계 (혼합통화 섹터: SQL SUM/ORDER BY market_cap 금지)
      const normalized = peerRows.map((p) => {
        const peerTicker = p.ticker ?? ''
        const marketCapUsd =
          p.marketCap != null ? toUsd(p.marketCap, peerTicker) : null
        return {
          ticker: peerTicker,
          rank: p.rank,
          name: p.name ?? '',
          nameKo: p.nameKo ?? null,
          isSelf: peerTicker === ticker,
          marketCapUsd,
          score: p.smoothedScore ?? null,
          peRatio: p.peRatio ?? null,
          pegRatio: p.pegRatio ?? null,
          priceToBook: p.priceToBook ?? null,
          evToEbitda: p.evToEbitda ?? null,
          returnOnEquity: p.returnOnEquity ?? null,
        }
      })

      peers = normalized.map(
        ({ ticker: t, rank, name, nameKo, isSelf, marketCapUsd, score }) => ({
          ticker: t,
          name,
          nameKo,
          rank,
          isSelf,
          marketCapUsd,
          score,
        })
      )

      const peerCount = normalized.length
      insufficientPeerSample = peerCount < MIN_PEER_SAMPLE
      const hasSample = !insufficientPeerSample

      // 시총점유율·median: USD 환산 값으로만 메모리 합산/정렬
      const marketCaps = normalized
        .map((p) => p.marketCapUsd)
        .filter((v): v is number => v != null)
      const marketCapTotalUsd = marketCaps.reduce((sum, v) => sum + v, 0)

      const self = normalized.find((p) => p.isSelf) ?? null
      const selfMarketCapUsd = self?.marketCapUsd ?? null
      const marketSharePct =
        selfMarketCapUsd != null && marketCapTotalUsd > 0
          ? (selfMarketCapUsd / marketCapTotalUsd) * 100
          : null

      const scores = normalized
        .map((p) => p.score)
        .filter((v): v is number => v != null)
      const medianScore = hasSample ? median([...scores].sort((a, b) => a - b)) : null
      const medianMarketCapUsd = hasSample
        ? median([...marketCaps].sort((a, b) => a - b))
        : null

      sectorContext = {
        sectorId: primarySectorId,
        sectorName: primary?.sectorName ?? '',
        peerCount,
        marketCapTotalUsd,
        marketSharePct,
        medianScore,
        medianMarketCapUsd,
      }

      // 4) 밸류에이션 percentile (무차원 → toUsd 불요, 메모리 분포 집계)
      const peValues = normalized
        .map((p) => p.peRatio)
        .filter((v): v is number => v != null)
      const pegValues = normalized
        .map((p) => p.pegRatio)
        .filter((v): v is number => v != null)
      const roeValues = normalized
        .map((p) => p.returnOnEquity)
        .filter((v): v is number => v != null)
      const pbrValues = normalized
        .map((p) => p.priceToBook)
        .filter((v): v is number => v != null)
      const evValues = normalized
        .map((p) => p.evToEbitda)
        .filter((v): v is number => v != null)

      valuation = {
        peRatio: buildValuationMetric(self?.peRatio ?? null, peValues, hasSample),
        pegRatio: buildValuationMetric(self?.pegRatio ?? null, pegValues, hasSample),
        returnOnEquity: buildValuationMetric(
          self?.returnOnEquity ?? null,
          roeValues,
          hasSample
        ),
        priceToBook: buildValuationMetric(
          self?.priceToBook ?? null,
          pbrValues,
          hasSample
        ),
        evToEbitda: buildValuationMetric(
          self?.evToEbitda ?? null,
          evValues,
          hasSample
        ),
      }
    }

    // 5) PER 밴드 — 종목 자체 PER 이력(양수만) 분포 대비 현재 위치. 무차원 → toUsd 불요.
    const peRows = await db
      .select({ date: dailySnapshots.date, pe: dailySnapshots.peRatio })
      .from(dailySnapshots)
      .where(eq(dailySnapshots.ticker, ticker))
      .orderBy(asc(dailySnapshots.date))

    const peHistory = peRows
      .filter((r): r is { date: string; pe: number } => r.pe != null && r.pe > 0)
      .map((r) => ({ date: r.date, pe: r.pe }))

    // current 는 "최신 스냅샷의 PER" 이어야 ValuationCompare(self.peRatio)와 일치한다.
    // 최신 PER 이 null/음수(적자)면 밴드를 숨겨 과거값을 "현재"로 오표기하는 걸 막는다.
    const latestPe = peRows.length ? peRows[peRows.length - 1].pe : null
    let peBand: PeBand | null = null
    if (peHistory.length >= MIN_BAND_POINTS && latestPe != null && latestPe > 0) {
      const values = peHistory.map((p) => p.pe)
      const sorted = [...values].sort((a, b) => a - b)
      const current = latestPe
      peBand = {
        history: peHistory,
        min: sorted[0],
        low: sorted[Math.floor(sorted.length * 0.25)],
        median: median(sorted)!,
        high: sorted[Math.floor(sorted.length * 0.75)],
        max: sorted[sorted.length - 1],
        current,
        percentile: percentileOf(current, values)!,
      }
    }

    // 6) 핵심 밸류에이션 지표 — company_profiles.sector(GICS) 기반. 미보유 시 PER 기본값.
    const [profile] = await db
      .select({ sector: companyProfiles.sector })
      .from(companyProfiles)
      .where(eq(companyProfiles.ticker, ticker))
      .limit(1)
    const keyValuationMetric = keyMetricForSector(profile?.sector ?? null)

    return NextResponse.json({
      success: true,
      data: {
        primarySectorId,
        allSectorIds,
        scoreHistory: scoreHistoryPoints,
        scoreMomentum,
        peers,
        sectorContext,
        valuation,
        peBand,
        keyValuationMetric,
        insufficientPeerSample,
        appliedRange,
      },
    })
  } catch (error) {
    console.error('Company Insights API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company insights' },
      { status: 500 }
    )
  }
}
