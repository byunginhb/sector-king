/**
 * 비로그인 사용자에게 가치 제안을 노출하는 카드.
 * 메인 화면 워치리스트 자리에 노출.
 */
'use client'

import Link from 'next/link'
import { Star, Bell, NotebookPen, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoginValuePromptCardProps {
  className?: string
  redirect?: string
}

export function LoginValuePromptCard({
  className,
  redirect,
}: LoginValuePromptCardProps) {
  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login'

  return (
    <div
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface-1 p-6',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            로그인하면 더 빠르게 흐름을 따라잡습니다
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            관심 종목·섹터·산업을 한 번에 모아 보고, 매일 아침 마켓 리포트를
            이메일로 받아보세요.
          </p>
        </div>
        <Link
          href={loginHref}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-semibold whitespace-nowrap transition-colors"
        >
          시작하기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Feature
          icon={<Star className="h-4 w-4 text-amber-500" aria-hidden />}
          title="워치리스트"
          desc="별 한 번으로 관심 종목 추적"
        />
        <Feature
          icon={<Bell className="h-4 w-4 text-amber-500" aria-hidden />}
          title="일별 리포트"
          desc="매일 아침 한 줄 마켓 요약"
        />
        <Feature
          icon={
            <NotebookPen className="h-4 w-4 text-amber-500" aria-hidden />
          }
          title="개인 메모"
          desc="투자 근거를 마크다운으로 저장"
        />
      </ul>
    </div>
  )
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-border-subtle bg-surface-2/50 p-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
    </li>
  )
}
