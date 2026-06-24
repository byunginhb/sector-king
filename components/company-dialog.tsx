'use client'

import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { CompanyDetail } from './company-detail'

interface CompanyDialogProps {
  ticker: string
  children: ReactNode
  /**
   * 다른 모달 위에 중첩될 때 z-index 를 올리기 위한 content 클래스 override.
   * (예: z-[60] 커스텀 모달 안에서 열 때 'z-[70]'). 기본 단독 사용 시 불필요.
   */
  contentClassName?: string
}

/**
 * 종목 리스트의 한 행(또는 종목명)을 감싸 클릭 시 종목 상세 모달을 여는 공용 트리거.
 * Radix Dialog 가 open 상태를 자체 관리하므로 호출부에 별도 state/Dialog 보일러플레이트가 없다.
 * children 은 ref/props 를 전달받을 단일 엘리먼트여야 한다(button 권장).
 */
export function CompanyDialog({ ticker, children, contentClassName }: CompanyDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn('sm:max-w-[600px] max-h-[90vh] overflow-y-auto', contentClassName)}
      >
        <CompanyDetail ticker={ticker} />
      </DialogContent>
    </Dialog>
  )
}
