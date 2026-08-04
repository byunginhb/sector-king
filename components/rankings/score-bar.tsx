'use client'

import { cn } from '@/lib/utils'

interface ScoreBarProps {
  /** 0~100 점수. null 이면 "—" 표기(결손). */
  score: number | null
  /** 토글이 부각하는 점수면 강조(굵게·진하게 + 막대 진하게). */
  emphasized?: boolean
  /** 점수 라벨(예: "단기 점수") — aria 용. */
  label: string
  className?: string
}

/**
 * 점수 막대 + 숫자(progressbar). 점수가 주인공이므로 숫자를 먼저·또렷하게.
 *
 * 색은 크기를 인코딩하지 않는다 — 길이가 이미 크기다.
 * 예전엔 ≥75=amber / 40~75=teal / <40=회색 이라 같은 '단기' 컬럼 안에서도
 * 값에 따라 색이 바뀌었다. 읽는 사람에겐 컬럼별로 색이 다른 것처럼 보여
 * 의미를 찾게 만드는데 실제로는 아무 의미가 없었고, 무엇보다 표의 막대 대부분이
 * amber 로 칠해져 globals.css 가 "signal only, not decorative" 로 못박은
 * 단일 액센트가 장식으로 소모됐다.
 *
 * 그래서 막대는 잉크 단색으로 두고, amber 는 선택된 축(emphasized = 종합점수)
 * 하나에만 남긴다. 그러면 표에서 amber 가 다시 "여기를 보라"는 신호가 된다.
 */
export function ScoreBar({ score, emphasized, label, className }: ScoreBarProps) {
  if (score === null) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-1.5 w-full max-w-[88px] rounded-full bg-muted/60" aria-hidden />
        <span
          className="num-mono shrink-0 text-sm text-muted-foreground/70"
          aria-label={`${label} 없음`}
        >
          —
        </span>
      </div>
    )
  }

  const rounded = Math.round(score)
  // 선택된 축만 amber(신호). 나머지는 잉크 단색 — 크기는 길이가 말한다.
  const fillTone = emphasized ? 'bg-primary' : 'bg-foreground/30'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'h-1.5 w-full max-w-[88px] overflow-hidden rounded-full',
          emphasized ? 'bg-muted' : 'bg-muted/70'
        )}
        role="progressbar"
        aria-label={label}
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', fillTone)}
          style={{ width: `${Math.max(Math.min(rounded, 100), 3)}%` }}
        />
      </div>
      <span
        className={cn(
          'num-mono shrink-0 tabular-nums',
          emphasized
            ? 'text-[15px] font-semibold text-foreground'
            : 'text-sm text-muted-foreground'
        )}
      >
        {rounded}
      </span>
    </div>
  )
}
