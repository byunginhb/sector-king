'use client'

import Link from 'next/link'
import { ArrowRight, Flag, ShieldAlert, Eye, Ban } from 'lucide-react'
import { useLatestKoreanStocks } from '@/hooks/use-latest-korean-stocks'
import { SectionHeader } from '@/components/ui/section-header'
import { cn } from '@/lib/utils'
import type { NoviceStockAction } from '@/drizzle/supabase-schema'

// action 별 시각 토큰 (메일 템플릿과 동일한 의미 매핑)
const ACTION_STYLE: Record<
  NoviceStockAction,
  { label: string; chipClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  사: {
    label: '사',
    chipClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    icon: Flag,
  },
  '조심하면서 사': {
    label: '조심하면서 사',
    chipClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    icon: ShieldAlert,
  },
  지켜봐: {
    label: '지켜봐',
    chipClass: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
    icon: Eye,
  },
  '안 사': {
    label: '안 사',
    chipClass: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    icon: Ban,
  },
}

export function KoreanPicksCard() {
  const { data, isLoading } = useLatestKoreanStocks()

  if (isLoading) return null
  if (!data || data.picks.length === 0) return null

  const detailUrl = `/news/${data.reportId}`

  return (
    <section className="mt-8" aria-label="오늘의 한국 추천 종목">
      <SectionHeader
        eyebrow="Today's Korea Picks"
        title="오늘 추천하는 한국 종목"
        description="에디터가 고른 종목 — 메일에서도 매일 받아볼 수 있어요"
      />

      <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden">
        <ul className="divide-y divide-border-subtle">
          {data.picks.map((p) => {
            const style = ACTION_STYLE[p.action] ?? ACTION_STYLE['지켜봐']
            const Icon = style.icon
            return (
              <li
                key={`${p.code}-${p.index}`}
                className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 transition-colors hover:bg-surface-2"
              >
                <span className="num-mono text-xs text-muted-foreground/80 mt-1 w-6 shrink-0 tabular-nums">
                  {String(p.index).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold text-foreground truncate">
                      {p.name}
                    </span>
                    <span className="num-mono text-[11px] text-muted-foreground">
                      {p.code}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        style.chipClass
                      )}
                    >
                      <Icon className="h-3 w-3" aria-hidden />
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-foreground/75 line-clamp-2">
                    {p.body}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-border-subtle bg-surface-2/40">
          <p className="text-[11px] text-muted-foreground">
            {data.reportDate} 발행 · {data.reportTitle}
          </p>
          <Link
            href={detailUrl}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            이유 보러가기
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
