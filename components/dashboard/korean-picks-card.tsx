'use client'

import Link from 'next/link'
import { ArrowRight, Flag, ShieldAlert, Eye, Ban } from 'lucide-react'
import { useLatestKoreanStocks } from '@/hooks/use-latest-korean-stocks'
import { cn } from '@/lib/utils'
import type { NoviceStockAction } from '@/drizzle/supabase-schema'

// action 별 시각 토큰 (시맨틱 — 라이트/다크 자동 대응, 메일 템플릿과 동일한 의미 매핑)
const ACTION_STYLE: Record<
  NoviceStockAction,
  { label: string; chipClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  사: {
    label: '사',
    chipClass: 'bg-success/15 text-success border-success/30',
    icon: Flag,
  },
  '조심하면서 사': {
    label: '조심하면서 사',
    chipClass: 'bg-warning/15 text-warning border-warning/40',
    icon: ShieldAlert,
  },
  지켜봐: {
    label: '지켜봐',
    chipClass: 'bg-surface-2 text-muted-foreground border-border-subtle',
    icon: Eye,
  },
  '안 사': {
    label: '사지마',
    chipClass: 'bg-danger/15 text-danger border-danger/30',
    icon: Ban,
  },
}

export function KoreanPicksCard() {
  const { data, isLoading } = useLatestKoreanStocks()

  if (isLoading) return null
  if (!data || data.picks.length === 0) return null

  const detailUrl = `/news/${data.reportId}`

  return (
    <section aria-label="오늘의 한국 추천 종목">
      {/* 헤더 해부구조 — NewsHomeCard 와 동일하게 유지할 것.
          두 카드가 홈 TODAY 2열에 나란히 서므로 eyebrow 행(min-h-8) + 제목 행의
          높이가 어긋나면 상단 정렬이 즉시 깨진다. */}
      <div className="flex h-full flex-col overflow-hidden sk-card">
        <div className="px-5 pb-4 pt-5">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
            <p className="eyebrow eyebrow-accent">Today&apos;s Korea Picks</p>
          </div>
          <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-card-foreground sm:text-xl">
            오늘 추천하는 한국 종목
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            에디터가 고른 종목 — 메일에서도 매일 받아볼 수 있어요
          </p>
        </div>

        <ul className="divide-y divide-border-subtle border-t border-border-subtle">
          {data.picks.map((p) => {
            const style = ACTION_STYLE[p.action] ?? ACTION_STYLE['지켜봐']
            const Icon = style.icon
            return (
              <li key={`${p.code}-${p.index}`}>
                {/* 행 자체를 리포트 상세로 연결한다. hover 배경만 있고
                    클릭이 안 되면 눌리는 척하는 UI 가 된다. */}
                <Link
                  href={detailUrl}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:gap-4 sm:px-5 sm:py-4"
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
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-2/40 px-4 py-3 sm:px-5">
          <p className="text-[11px] text-muted-foreground">
            {data.reportDate} 발행 · {data.reportTitle}
          </p>
          <Link
            href={detailUrl}
            className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/60"
          >
            이유 보러가기
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
