import { Fragment } from 'react'

interface PipelineStep {
  icon: string
  label: string
  description: string
}

const STEPS: PipelineStep[] = [
  {
    icon: '📡',
    label: 'yfinance',
    description: 'Yahoo Finance API에서 주가·재무 데이터 수집',
  },
  {
    icon: '🗄️',
    label: 'SQLite',
    description: '로컬 데이터베이스에 일별 스냅샷 저장',
  },
  {
    icon: '⚙️',
    label: '점수 산출',
    description: '4차원 패권 점수 계산 + EMA 스무딩',
  },
  {
    icon: '🚀',
    label: '자동 배포',
    description: 'GitHub Actions → Vercel 자동 배포',
  },
  {
    icon: '📊',
    label: 'API → 화면',
    description: '사용자에게 최신 데이터 제공',
  },
]

export function DataPipeline() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-1 sm:gap-0">
      {STEPS.map((step, i) => (
        <Fragment key={step.label}>
          <div className="flex-1 min-w-0 rounded-lg border border-border p-3 text-center bg-card hover:bg-accent/50 transition-colors">
            <div className="text-2xl mb-1" aria-hidden="true">{step.icon}</div>
            <p className="text-xs font-semibold text-foreground truncate">{step.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{step.description}</p>
          </div>
          {i < STEPS.length - 1 && (
            <>
              <div className="text-muted-foreground px-1 shrink-0 hidden sm:flex items-center" aria-hidden="true">→</div>
              <div className="text-muted-foreground py-0.5 shrink-0 flex sm:hidden justify-center" aria-hidden="true">↓</div>
            </>
          )}
        </Fragment>
      ))}
    </div>
  )
}
