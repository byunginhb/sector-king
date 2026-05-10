/**
 * 비로그인 사용자에게 콘텐츠 일부를 보여주되 핵심 영역을 가리는 래퍼.
 *
 * 두 가지 variant:
 *  - 'blur' : 자식 전체를 blur 처리 (한국 추천주식 같은 단일 섹션용)
 *  - 'fade' : 자식의 위쪽 일부만 보이고 아래는 그라데이션으로 fade-out
 *             (전문가용처럼 길게 이어지는 구간 전체를 가릴 때)
 *
 * 잠금 영역에는 항상 로그인 CTA가 떠 있고, 클릭 시 로그인 후 같은 페이지로 돌아온다.
 */
'use client'

import { Lock, LogIn } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LockedSectionProps {
  children: React.ReactNode
  /** 잠금 영역 헤딩 라벨 (예: "로그인하면 전체 내용을 볼 수 있어요") */
  title?: string
  /** 부가 설명 */
  description?: string
  /** 'blur' = 전체 흐리게 / 'fade' = 위쪽만 보이고 그라데이션 */
  variant?: 'blur' | 'fade'
  /** fade variant 의 노출 높이 (rem 또는 px). 기본 240px */
  fadeHeight?: string
  className?: string
}

export function LockedSection({
  children,
  title = '로그인하면 전체 내용을 볼 수 있어요',
  description = 'Google 로그인 한 번이면 전체 리포트와 워치리스트 · 일별 메일이 무료로 열립니다.',
  variant = 'blur',
  fadeHeight = '240px',
  className,
}: LockedSectionProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const loginHref = useMemo(() => {
    const qs = searchParams?.toString()
    const here = qs ? `${pathname}?${qs}` : pathname
    return `/login?redirect=${encodeURIComponent(here ?? '/')}`
  }, [pathname, searchParams])

  if (variant === 'fade') {
    return (
      <div className={cn('relative', className)}>
        <div
          aria-hidden
          className="overflow-hidden"
          style={{ maxHeight: fadeHeight }}
        >
          <div className="select-none pointer-events-none">{children}</div>
        </div>
        {/* 페이드 그라데이션 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background via-background/90 to-transparent"
        />
        <LockedOverlay
          title={title}
          description={description}
          loginHref={loginHref}
          inline
        />
      </div>
    )
  }

  // blur variant — 전체를 흐리게 + 위에 오버레이
  return (
    <div className={cn('relative', className)}>
      <div
        aria-hidden
        className="select-none pointer-events-none"
        style={{ filter: 'blur(8px)' }}
      >
        {children}
      </div>
      <LockedOverlay
        title={title}
        description={description}
        loginHref={loginHref}
      />
    </div>
  )
}

function LockedOverlay({
  title,
  description,
  loginHref,
  inline = false,
}: {
  title: string
  description: string
  loginHref: string
  inline?: boolean
}) {
  return (
    <div
      className={cn(
        'absolute inset-x-0 z-10 flex items-center justify-center px-4',
        inline ? 'bottom-6' : 'inset-y-0'
      )}
    >
      <div className="rounded-2xl border border-border-subtle bg-surface-1/95 backdrop-blur-md shadow-lg p-5 sm:p-6 max-w-md text-center">
        <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary/15 text-primary mb-3">
          <Lock className="h-4 w-4" aria-hidden />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight mb-1">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
          {description}
        </p>
        <Link
          href={loginHref}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          로그인하고 전체 보기
        </Link>
      </div>
    </div>
  )
}
