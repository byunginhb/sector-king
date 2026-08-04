'use client'

import {
  RECOMMENDATION_GRADES,
  summarizeTrend,
} from '@/lib/analyst-recommendation'
import { cn } from '@/lib/utils'
import type { RecommendationTrendPoint } from '@/types'

interface RecommendationTrendProps {
  points: RecommendationTrendPoint[]
}

/**
 * issue#33 — 투자의견 분포 추이.
 * 합의 라벨(적극 매수/매수) 하나로는 "몇 명이 보유·매도를 냈는지"가 안 보인다.
 * 기간별(이번 달 ~ 3개월 전) 등급 인원수를 100% stacked bar 로 쌓아
 * 의견이 어느 쪽으로 이동 중인지 보이게 한다.
 *
 * recharts 미사용 — 세그먼트 폭만 필요해 div 로 충분하다(페이지 경량 유지,
 * market-size-metric-bars 와 동일 판단).
 */
export function RecommendationTrend({ points }: RecommendationTrendProps) {
  const rows = summarizeTrend(points)

  if (rows.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">의견 분포 추이</p>
        <span className="text-[11px] text-muted-foreground">단위: 명</span>
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.period} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] text-muted-foreground">
              {row.periodLabel}
            </span>
            <div
              className="flex h-3 flex-1 overflow-hidden rounded-sm bg-muted"
              role="img"
              aria-label={`${row.periodLabel} 투자의견 ${row.total}명 — ${row.segments
                .filter((s) => s.count > 0)
                .map((s) => `${s.label} ${s.count}명`)
                .join(', ')}`}
            >
              {row.segments
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div
                    key={s.key}
                    className={cn('h-full', s.colorClass)}
                    style={{ width: `${s.pct}%` }}
                    title={`${s.label} ${s.count}명`}
                  />
                ))}
            </div>
            <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
              {row.total}
            </span>
          </div>
        ))}
      </div>

      {/* 범례 — 색은 보조이므로 라벨을 항상 함께 노출 */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
        {RECOMMENDATION_GRADES.map((g) => (
          <li
            key={g.key}
            className="flex items-center gap-1 text-[11px] text-muted-foreground"
          >
            <span
              className={cn('h-2 w-2 shrink-0 rounded-[2px]', g.colorClass)}
              aria-hidden
            />
            {g.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
