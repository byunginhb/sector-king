import { SCORING } from '@/lib/scoring-methodology'
import { cn } from '@/lib/utils'

interface DimensionBar {
  label: string
  maxScore: number
  color: string
  subMetrics: { label: string; maxScore: number }[]
}

const DIMENSIONS: DimensionBar[] = [
  {
    label: '규모 (Scale)',
    maxScore: SCORING.scale.maxScore,
    color: 'bg-chart-3',
    subMetrics: [
      { label: '시가총액 비중', maxScore: SCORING.scale.marketCapShare.maxScore },
      { label: '거래량 비율', maxScore: SCORING.scale.volumeRatio.maxScore },
    ],
  },
  {
    label: '성장성 (Growth)',
    maxScore: SCORING.growth.maxScore,
    color: 'bg-chart-2',
    subMetrics: [
      { label: '매출 성장률', maxScore: SCORING.growth.revenueGrowth.maxScore },
      { label: '수익 성장률', maxScore: SCORING.growth.earningsGrowth.maxScore },
    ],
  },
  {
    label: '수익성 (Profitability)',
    maxScore: SCORING.profitability.maxScore,
    color: 'bg-chart-1',
    subMetrics: [
      { label: '영업이익률', maxScore: SCORING.profitability.operatingMargin.maxScore },
      { label: 'ROE', maxScore: SCORING.profitability.returnOnEquity.maxScore },
    ],
  },
  {
    label: '시장 평가 (Sentiment)',
    maxScore: SCORING.sentiment.maxScore,
    color: 'bg-chart-4',
    subMetrics: [
      { label: '애널리스트 의견', maxScore: SCORING.sentiment.recommendation.maxScore },
      { label: '목표주가 괴리율', maxScore: SCORING.sentiment.targetUpside.maxScore },
    ],
  },
]

export function ScoringDiagram() {
  return (
    <div className="space-y-4">
      {DIMENSIONS.map((dim) => {
        const widthPercent = (dim.maxScore / SCORING.totalMaxScore) * 100
        return (
          <div key={dim.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{dim.label}</span>
              <span className="text-sm font-bold text-foreground">{dim.maxScore}점</span>
            </div>
            <div
              className="bg-muted rounded-full h-4 overflow-hidden"
              role="progressbar"
              aria-valuenow={dim.maxScore}
              aria-valuemin={0}
              aria-valuemax={SCORING.totalMaxScore}
              aria-label={`${dim.label}: ${dim.maxScore}점 / ${SCORING.totalMaxScore}점`}
            >
              <div
                className={cn('h-4 rounded-full transition-all', dim.color)}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-1">
              {dim.subMetrics.map((sub) => (
                <span key={sub.label} className="text-xs text-muted-foreground">
                  {sub.label} ({sub.maxScore}점)
                </span>
              ))}
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm font-semibold text-foreground">합계</span>
        <span className="text-sm font-bold text-foreground">{SCORING.totalMaxScore}점</span>
      </div>
    </div>
  )
}
