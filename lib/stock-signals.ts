import type {
  CompanyDetailResponse,
  CompanyInsightsResponse,
} from '@/types'

/**
 * 룰 기반 종목 시그널 추출 (순수 함수).
 *
 * 원칙:
 * - 과장 금지·중립 카피. 각 시그널에 근거 데이터(`evidence`)를 병기한다.
 * - 데이터 결손 룰은 조용히 건너뛴다(없는 시그널은 만들지 않음).
 * - P0 룰: percentile 불필요(점수추세·52주위치·멀티섹터·상승여력·data_quality·커버리지).
 * - P1 룰: 섹터 밸류에이션 percentile/median 기반(PER 저평가·ROE 중앙값 상회 등).
 */

export type SignalKind = 'strength' | 'caution' | 'neutral'

export interface StockSignal {
  kind: SignalKind
  /** 룰 식별자 (테스트/디버그용) */
  id: string
  /** 사용자 표시 문구 (중립적, 단정 금지) */
  label: string
  /** 근거 데이터 한 줄 (예: "섹터 시총 점유율 31.2%") */
  evidence: string
}

export interface SignalResult {
  strengths: StockSignal[]
  cautions: StockSignal[]
}

interface BuildSignalsInput {
  detail: Pick<CompanyDetailResponse, 'score' | 'snapshot' | 'analystUpside' | 'dominance'>
  insights?: Pick<
    CompanyInsightsResponse,
    'scoreMomentum' | 'sectorContext' | 'valuation' | 'insufficientPeerSample'
  > | null
}

const UPSIDE_STRONG = 0.15 // +15% 이상 상방 여력
const UPSIDE_DOWNSIDE = -0.05 // -5% 이하 괴리(현재가가 목표가 상회)
const WEEK52_HIGH = 0.8 // 52주 위치 ≥80% → 신고가 근접
const WEEK52_LOW = 0.15 // 52주 위치 ≤15% → 저점권
const DATA_QUALITY_WARN = 0.71 // ≤0.71 → 데이터 신뢰도 주의
const PERCENTILE_HIGH = 75 // 섹터 상위 25% (밸류·ROE 상회)
const PERCENTILE_LOW = 25

function pct(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

/**
 * P0 + P1 룰을 적용해 강점/주의 시그널을 추출한다.
 * insights 가 없으면(로딩/실패) P0 중 base 데이터만으로 가능한 룰만 적용된다.
 */
export function buildStockSignals({ detail, insights }: BuildSignalsInput): SignalResult {
  const strengths: StockSignal[] = []
  const cautions: StockSignal[] = []

  const { score, snapshot, analystUpside, dominance } = detail

  // --- P0: 점수 추세 (score_history 모멘텀) ---
  const momentum = insights?.scoreMomentum ?? null
  if (momentum && momentum.deltaTotal != null) {
    if (momentum.trend === 'up') {
      strengths.push({
        kind: 'strength',
        id: 'score-trend-up',
        label: '패권 점수 우상향',
        evidence: `최근 점수 ${momentum.deltaTotal >= 0 ? '+' : ''}${momentum.deltaTotal.toFixed(1)}점`,
      })
    } else if (momentum.trend === 'down') {
      cautions.push({
        kind: 'caution',
        id: 'score-trend-down',
        label: '패권 점수 하락세',
        evidence: `최근 점수 ${momentum.deltaTotal.toFixed(1)}점`,
      })
    }
  }

  // --- P0: 52주 위치 극단 ---
  const pos = snapshot?.week52Position ?? null
  if (pos != null) {
    if (pos >= WEEK52_HIGH) {
      strengths.push({
        kind: 'strength',
        id: 'week52-high',
        label: '52주 신고가 근접',
        evidence: `52주 밴드 ${(pos * 100).toFixed(0)}% 지점`,
      })
    } else if (pos <= WEEK52_LOW) {
      cautions.push({
        kind: 'caution',
        id: 'week52-low',
        label: '52주 저점권',
        evidence: `52주 밴드 ${(pos * 100).toFixed(0)}% 지점`,
      })
    }
  }

  // --- P0: 멀티섹터 1위 ≥2 ---
  if (dominance && dominance.topRankCount >= 2) {
    strengths.push({
      kind: 'strength',
      id: 'multi-sector-leader',
      label: '멀티섹터 1위',
      evidence: `${dominance.sectorCount}개 섹터 중 ${dominance.topRankCount}개 1위`,
    })
  }

  // --- P0: 애널리스트 상승여력 / 괴리 ---
  const upside = analystUpside?.upsidePct ?? null
  if (upside != null) {
    if (upside >= UPSIDE_STRONG) {
      strengths.push({
        kind: 'strength',
        id: 'analyst-upside',
        label: '애널리스트 상방 여력',
        evidence: `목표주가 대비 ${pct(upside)}`,
      })
    } else if (upside <= UPSIDE_DOWNSIDE) {
      cautions.push({
        kind: 'caution',
        id: 'analyst-downside',
        label: '목표주가 상회(상방 제한적)',
        evidence: `목표주가 대비 ${pct(upside)}`,
      })
    }
  }

  // --- P0: 애널리스트 커버리지 없음 (recommendation='none') ---
  if (score && (score.recommendationKey === 'none' || score.recommendationKey == null)) {
    cautions.push({
      kind: 'caution',
      id: 'no-coverage',
      label: '애널리스트 커버리지 없음',
      evidence: '투자의견 미수집',
    })
  }

  // --- P0: 데이터 신뢰도 주의 ---
  if (score && score.dataQuality <= DATA_QUALITY_WARN) {
    cautions.push({
      kind: 'caution',
      id: 'low-data-quality',
      label: '데이터 신뢰도 주의',
      evidence: `데이터 커버리지 ${Math.round(score.dataQuality * 100)}%`,
    })
  }

  // --- P1: 시총 점유율 (섹터 1위 규모) ---
  const ctx = insights?.sectorContext ?? null
  if (ctx && ctx.marketSharePct != null && ctx.marketSharePct >= 30) {
    strengths.push({
      kind: 'strength',
      id: 'market-share-lead',
      label: '섹터 시총 점유율 상위',
      evidence: `${ctx.sectorName} 점유율 ${ctx.marketSharePct.toFixed(1)}%`,
    })
  }

  // --- P1: 밸류에이션 percentile/median (min-peer N≥4 표본 있을 때만) ---
  const valuation = insights?.valuation ?? null
  const hasSample = insights ? !insights.insufficientPeerSample : false
  if (valuation && hasSample) {
    // ROE 섹터 중앙값 상회 (높을수록 좋음)
    const roe = valuation.returnOnEquity
    if (roe.value != null && roe.median != null && roe.percentile != null) {
      if (roe.percentile >= PERCENTILE_HIGH && roe.value > roe.median) {
        strengths.push({
          kind: 'strength',
          id: 'roe-above-median',
          label: 'ROE 섹터 중앙값 상회',
          evidence: `ROE ${pct(roe.value)} (중앙값 ${pct(roe.median)})`,
        })
      }
    }

    // PER 저평가 (낮을수록 저평가 → percentile 낮음이 강점)
    const pe = valuation.peRatio
    if (pe.value != null && pe.median != null && pe.percentile != null && pe.value > 0) {
      if (pe.percentile <= PERCENTILE_LOW && pe.value < pe.median) {
        strengths.push({
          kind: 'strength',
          id: 'per-undervalued',
          label: 'PER 섹터 대비 저평가',
          evidence: `PER ${pe.value.toFixed(1)} (중앙값 ${pe.median.toFixed(1)})`,
        })
      } else if (pe.percentile >= PERCENTILE_HIGH && pe.value > pe.median) {
        cautions.push({
          kind: 'caution',
          id: 'per-overvalued',
          label: 'PER 섹터 대비 고평가',
          evidence: `PER ${pe.value.toFixed(1)} (중앙값 ${pe.median.toFixed(1)})`,
        })
      }
    }
  }

  return { strengths, cautions }
}
