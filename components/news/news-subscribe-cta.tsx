/**
 * 뉴스(마켓 리포트) 메일 구독 CTA — 다양한 진입점에서 재사용.
 *
 * 동작:
 *   - 비로그인 → /login?redirect=/me/settings&intent=subscribe 로 push
 *   - 로그인 + 미구독 → 인라인 1-click subscribe (PATCH /api/me/email-subscription)
 *   - 로그인 + 구독 중 → "구독 중" 라벨 + 설정 페이지 링크
 *
 * variant:
 *   - 'compact'  : 텍스트 링크 (NewsHomeCard 보조)
 *   - 'banner'   : 배너 박스 (/news 목록 상단)
 *   - 'card'     : 큰 카드 (/news/[id] 하단)
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react'
import { useEmailSubscription } from '@/hooks/me/use-email-subscription'
import { useCurrentUser } from '@/hooks/use-current-user'
import { cn } from '@/lib/utils'

type Variant = 'compact' | 'banner' | 'card'

interface NewsSubscribeCtaProps {
  variant?: Variant
  className?: string
  /** banner 변종에서 dismiss 가능 여부. localStorage flag */
  dismissible?: boolean
}

const DISMISS_KEY = 'news_subscribe_banner_dismissed'

export function NewsSubscribeCta({
  variant = 'compact',
  className,
  dismissible = false,
}: NewsSubscribeCtaProps) {
  const router = useRouter()
  const { user, isLoading: userLoading } = useCurrentUser()
  const isLoggedIn = Boolean(user)

  const { subscription, update, isPending } = useEmailSubscription({
    enabled: isLoggedIn,
  })

  const [dismissed, setDismissed] = useState(false)
  const [justSubscribed, setJustSubscribed] = useState(false)

  useEffect(() => {
    if (!dismissible) return
    try {
      const v = localStorage.getItem(DISMISS_KEY)
      if (v === '1') setDismissed(true)
    } catch {
      // ignore
    }
  }, [dismissible])

  function handleDismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  async function handleSubscribe() {
    if (!isLoggedIn) {
      router.push(
        `/login?redirect=${encodeURIComponent('/me/settings?intent=subscribe')}`
      )
      return
    }
    if (subscription && !subscription.emailEnabled) {
      // 인프라 미설정 — 설정 페이지로 안내
      router.push('/me/settings')
      return
    }
    try {
      await update({ dailyReport: true })
      setJustSubscribed(true)
    } catch (err) {
      console.error('구독 실패', err)
    }
  }

  // dismiss 처리
  if (dismissible && dismissed) return null

  // 로그인 + 이미 구독 중
  const alreadySubscribed = Boolean(
    isLoggedIn && subscription?.dailyReport && subscription?.emailEnabled
  )

  if (userLoading) {
    if (variant === 'compact') return null
    return null
  }

  if (variant === 'compact') {
    if (alreadySubscribed || justSubscribed) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs text-success font-medium',
            className
          )}
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          메일 구독 중
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 underline-offset-4 hover:underline disabled:opacity-50',
          className
        )}
      >
        <Mail className="h-3 w-3" aria-hidden />
        매일 아침 메일로 받기
        <ArrowRight className="h-3 w-3" aria-hidden />
      </button>
    )
  }

  if (variant === 'banner') {
    if (alreadySubscribed) return null
    return (
      <div
        className={cn(
          'relative rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4',
          className
        )}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="shrink-0 rounded-full bg-amber-500/20 p-2">
            <Mail className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {justSubscribed
                ? '구독되었습니다 — 내일 아침 8시(KST) 메일이 도착해요'
                : '매일 아침 8시, 오늘의 마켓 리포트를 메일로 받아보세요'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {justSubscribed
                ? '발송 시각·해지는 /me/settings 에서 변경할 수 있습니다.'
                : '비로그인 사용자는 1초 만에 Google 로그인 후 자동 구독됩니다.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!justSubscribed && (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {isPending ? '처리 중...' : isLoggedIn ? '구독하기' : '로그인하고 구독'}
            </button>
          )}
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              aria-label="배너 닫기"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    )
  }

  // variant === 'card'
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface-1 p-5 flex flex-col sm:flex-row sm:items-center gap-4',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="shrink-0 rounded-full bg-amber-500/15 p-2.5">
          <Mail className="h-5 w-5 text-amber-600" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {alreadySubscribed
              ? '현재 일별 마켓 리포트를 구독 중입니다'
              : justSubscribed
                ? '구독되었습니다 — 내일 아침 메일이 도착해요'
                : '다음 리포트도 메일로 받아보시겠어요?'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {alreadySubscribed
              ? '발송 시각·해지는 /me/settings 에서 변경할 수 있습니다.'
              : '매일 아침 KST 기준으로 한 줄 요약 + 주목 종목 + 한국 주식 한마디를 보내드려요.'}
          </p>
        </div>
      </div>
      <div className="shrink-0">
        {alreadySubscribed ? (
          <a
            href="/me/settings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            구독 관리
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : justSubscribed ? (
          <a
            href="/me/settings"
            className="inline-flex items-center gap-1.5 text-sm text-success font-medium"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            구독 중
          </a>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {isPending ? '처리 중...' : isLoggedIn ? '구독하기' : '로그인하고 구독'}
          </button>
        )}
      </div>
    </div>
  )
}
