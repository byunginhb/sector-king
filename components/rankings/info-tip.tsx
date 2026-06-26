'use client'

import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface InfoTipProps {
  /** 한 줄 쉬운 설명(초보자 친화 — 어려운 용어 금지). */
  text: string
  /** 스크린리더용 라벨(무엇에 대한 설명인지). */
  label: string
}

/**
 * 점수·용어 옆 물음표 아이콘 툴팁. 초보자 친화 1줄 설명을 노출한다.
 * 이모지 금지 — lucide HelpCircle 사용.
 */
export function InfoTip({ text, label }: InfoTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${label} 설명`}
          className="inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px] text-center leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
