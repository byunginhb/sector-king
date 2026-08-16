'use client'

/**
 * 데이터 기준 시점 표기 — 화면 곳곳이 같은 문구를 쓰게 하는 단일 컴포넌트.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 표기를 되살리는가
 * ────────────────────────────────────────────────────────────────────
 *
 * 실시간이 아니라는 이유로 표기를 일부러 뺐던 자리들이 있는데, 그 판단이
 * 오히려 불신을 만들었다 — 사용자는 실시간을 요구한 적이 없고 **"언제 기준인지"**
 * 를 물었다. 기준일이 없으면 "오늘 시총인가?" 를 화면이 답해주지 못한다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  1차 범위: 날짜 + 주기
 * ────────────────────────────────────────────────────────────────────
 *
 * `daily_snapshots` 는 **날짜 단위**라 "그날 몇 번째 수집분인지"는 지금 알 수
 * 없다. 회차까지 찍으려면 수집 시각 컬럼이 선행돼야 하므로, 여기서는 날짜와
 * 주기만 정직하게 말한다. 없는 정확도를 흉내 내지 않는다.
 *
 * 주기 문구는 `UPDATE_CADENCE` 하나만 참조한다 — 손으로 적으면 과거처럼
 * 화면마다 값이 갈라진다.
 */

import { Clock } from 'lucide-react'
import { HintPopover } from '@/components/ui/hint-popover'
import { UPDATE_CADENCE } from '@/lib/site-constants'
import { cn } from '@/lib/utils'

export type DataAsOfProps = {
  /** 데이터 기준일 `YYYY-MM-DD`. 없으면 **아무것도 렌더하지 않는다**(날짜를 지어내지 않는다). */
  date?: string | null
  /** 날짜 앞에 붙일 말 — 기본 "데이터". 예: "시총", "자금 흐름". */
  label?: string
  /** 아이콘 생략(이미 캡션 줄에 아이콘이 많은 자리). */
  hideIcon?: boolean
  className?: string
}

export function DataAsOf({ date, label = '데이터', hideIcon, className }: DataAsOfProps) {
  if (!date) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] text-muted-foreground',
        className
      )}
    >
      {!hideIcon && <Clock className="h-3 w-3 shrink-0" aria-hidden />}
      <span className="num-mono">{date}</span>
      <span>{label} 기준</span>
      <HintPopover
        label="데이터 기준 시점 설명"
        className="inline-flex align-middle text-muted-foreground/70 transition-colors hover:text-foreground"
        content={
          <span className="block space-y-1.5">
            <span className="block font-semibold text-foreground">언제 기준인가요?</span>
            <span className="block">
              마지막으로 수집된 <span className="font-medium text-foreground">{date}</span> 자료입니다.
            </span>
            <span className="block">
              수집 주기는 <span className="font-medium text-foreground">{UPDATE_CADENCE}</span> 이며,
              장중 시세를 그대로 따라가는 실시간 데이터가 아닙니다.
            </span>
          </span>
        }
      >
        <span
          aria-hidden
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[8px] leading-none"
        >
          ?
        </span>
      </HintPopover>
    </span>
  )
}
