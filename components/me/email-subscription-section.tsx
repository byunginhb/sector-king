/**
 * /me/settings 의 "이메일 구독" 섹션 클라이언트 wrapper.
 *
 * URL 에 `?intent=subscribe` 가 있으면:
 *   1) emailEnabled 인 경우 → dailyReport=true 로 자동 set (1회)
 *   2) 사용자에게 "구독되었습니다" 안내 노출
 *   3) URL 에서 query 제거 (router.replace)
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { useEmailSubscription } from '@/hooks/me/use-email-subscription'
import { EmailSubscriptionToggle } from './email-subscription-toggle'

export function EmailSubscriptionSection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const intent = searchParams?.get('intent')

  const { subscription, update } = useEmailSubscription()
  const [autoMessage, setAutoMessage] = useState<string | null>(null)
  const handledRef = useRef(false)

  useEffect(() => {
    if (intent !== 'subscribe') return
    if (!subscription) return // 로딩 중
    if (handledRef.current) return
    handledRef.current = true

    ;(async () => {
      if (!subscription.emailEnabled) {
        setAutoMessage(
          '이메일 발송 인프라가 아직 등록되지 않았습니다. 등록 후 자동으로 활성화됩니다.'
        )
      } else if (subscription.dailyReport) {
        setAutoMessage('이미 일별 마켓 리포트를 구독 중입니다.')
      } else {
        try {
          await update({ dailyReport: true })
          setAutoMessage(
            '구독되었습니다. 내일 아침 8시(KST) 메일이 도착합니다.'
          )
        } catch {
          setAutoMessage('자동 구독에 실패했습니다. 아래 토글을 직접 켜주세요.')
        }
      }
      // URL 에서 intent 제거 — 새로고침 시 재실행 방지
      const next = new URLSearchParams(searchParams?.toString() ?? '')
      next.delete('intent')
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname ?? '/me/settings')
    })()
  }, [intent, subscription, update, router, pathname, searchParams])

  return (
    <div className="space-y-3">
      {autoMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
          <span>{autoMessage}</span>
        </div>
      )}
      <EmailSubscriptionToggle />
    </div>
  )
}
