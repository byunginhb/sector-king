/**
 * 메인(`/`) 노출용 마켓 리포트 카드.
 * - 제목 + 30초 브리핑(line-clamp-3) + 한 줄 결론 + 발행일 + CTA "상세 보기"
 * - 발행 데이터 없으면 호출부에서 미노출 (이 컴포넌트는 데이터 받으면 항상 렌더)
 */
'use client'

import Link from 'next/link'
import { ArrowRight, Newspaper, HelpCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { NewsReportListItem, NoviceStockAction } from '@/drizzle/supabase-schema'
import { useLatestKoreanStocks } from '@/hooks/use-latest-korean-stocks'
import { resolveReportKind, reportKindLabel } from '@/lib/news/report-kind'
import { NewsSubscribeCta } from './news-subscribe-cta'
import { ReportKindBadge } from './report-kind-badge'

// action 별 chip 색상 토큰 (시맨틱 — 라이트/다크 자동 대응)
const PICK_CHIP_CLASS: Record<NoviceStockAction, string> = {
  사: 'border-success/40 text-success bg-success/10 group-hover:bg-success/20',
  '조심하면서 사':
    'border-warning/40 text-warning bg-warning/10 group-hover:bg-warning/20',
  지켜봐:
    'border-border-subtle text-muted-foreground bg-surface-2 group-hover:bg-surface-2/70',
  '안 사':
    'border-danger/40 text-danger bg-danger/10 group-hover:bg-danger/20',
}

// 표시용 라벨 (DB enum 값과 분리 — '안 사' 는 UI 에서 '사지마' 로 노출)
const PICK_LABEL: Record<NoviceStockAction, string> = {
  사: '사',
  '조심하면서 사': '조심하면서 사',
  지켜봐: '지켜봐',
  '안 사': '사지마',
}

interface NewsHomeCardProps {
  report: NewsReportListItem
  /** 30초 브리핑 (있으면 표시). API 응답이 ListItem 이라 기본은 결론만 노출 */
  brief?: string
  className?: string
}

export function NewsHomeCard({ report, brief, className }: NewsHomeCardProps) {
  const dateLabel = report.publishedAt
    ? format(new Date(report.publishedAt), 'yyyy-MM-dd')
    : report.reportDate
  const kind = resolveReportKind(report)

  // 같은 리포트의 한국 추천 종목 (없으면 미노출)
  const { data: koreanPicks } = useLatestKoreanStocks()
  const sameReport = koreanPicks?.reportId === report.id
  const teasers = sameReport ? (koreanPicks?.picks ?? []).slice(0, 3) : []

  return (
    <div
      className={cn(
        'group block rounded-2xl border border-border-subtle bg-surface-1 p-5 transition-[border-color,background-color,transform] duration-200 ease-out hover:border-primary/40 hover:bg-surface-2',
        className
      )}
    >
      <Link href={`/news/${report.id}`} className="block">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Newspaper
              className="h-5 w-5 text-primary shrink-0"
              aria-hidden
            />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              {reportKindLabel(kind)}
            </span>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground tabular-nums shrink-0">
            {kind !== 'daily' && <ReportKindBadge kind={kind} />}
            {dateLabel}
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-card-foreground leading-tight tracking-tight group-hover:text-primary transition-colors mb-2">
          {report.title}
        </h3>

        {report.oneLineConclusion && (
          <blockquote className="border-l-2 border-primary/60 pl-3 my-3 text-sm text-foreground/90 italic line-clamp-2">
            {report.oneLineConclusion}
          </blockquote>
        )}

        {brief && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 mt-2">
            {brief}
          </p>
        )}

        {teasers.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              오늘의 한국 종목 추천 · 이유 보러가기
            </p>
            <div className="flex flex-wrap gap-1.5">
              {teasers.map((p) => (
                <span
                  key={`${p.code}-${p.index}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    PICK_CHIP_CLASS[p.action] ?? PICK_CHIP_CLASS['지켜봐']
                  )}
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="opacity-80">‘{PICK_LABEL[p.action] ?? p.action}’ 이유는?</span>
                  <HelpCircle className="h-3 w-3 opacity-80" aria-hidden />
                </span>
              ))}
            </div>
          </div>
        )}

        {report.coverKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {report.coverKeywords.slice(0, 5).map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center text-[11px] text-muted-foreground rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-1.5 text-sm text-primary font-medium">
          상세 보기
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </Link>

      <div className="mt-3 pt-3 border-t border-border-subtle/60 flex items-center justify-between gap-3">
        <NewsSubscribeCta variant="compact" />
        <Link
          href="/news"
          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          이전 리포트 →
        </Link>
      </div>
    </div>
  )
}
