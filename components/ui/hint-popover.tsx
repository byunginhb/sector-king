'use client'

import * as React from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface HintPopoverProps {
  /** 트리거로 감쌀 요소(점수 숫자 등). */
  children: React.ReactNode
  /** 힌트 본문(한 줄 근거 등). */
  content: React.ReactNode
  /** 스크린리더/버튼 aria 라벨. */
  label: string
  /** 트리거 버튼 클래스. */
  className?: string
}

/**
 * 호버(데스크탑)와 탭(모바일) 모두에서 열리는 힌트 팝오버.
 *
 * 기존 InfoTip 은 Radix Tooltip(포인터 호버/포커스 전용) 기반이라 터치 기기에서
 * 열리지 않는다. 이 컴포넌트는 Radix Popover(클릭·탭으로 열림 = 모든 기기 동작)를
 * controlled 로 쓰면서, 마우스 진입/이탈로도 열고 닫아 데스크탑 호버 UX 를 더한다.
 * - 모바일: 탭 → 열림(Radix Trigger 클릭), 바깥 탭 → 닫힘(onOpenChange)
 * - 데스크탑: 호버 → 열림, 벗어남 → 닫힘 (+ 클릭 토글도 동작)
 *
 * 주의: onMouseEnter/Leave 는 터치에서도 합성 발생 → 탭 시 (mouseenter=열림)
 * 직후 (click=토글=닫힘)으로 즉시 닫히는 버그가 생긴다. 그래서 포인터 이벤트를
 * 쓰고 pointerType==='mouse' 일 때만 호버로 여닫는다. 터치는 클릭 경로만 탄다.
 */
export function HintPopover({ children, content, label, className }: HintPopoverProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') setOpen(true)
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setOpen(false)
          }}
          className={className}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        // 열릴 때 콘텐츠로 포커스가 튀지 않게(호버 UX 유지).
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-64 p-3 text-xs leading-relaxed text-popover-foreground"
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
