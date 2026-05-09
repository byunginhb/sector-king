/**
 * 메인(`/`) 노출용 마켓 리포트 카드.
 * - 제목 + 30초 브리핑(line-clamp-3) + 한 줄 결론 + 발행일 + CTA "상세 보기"
 * - 발행 데이터 없으면 호출부에서 미노출 (이 컴포넌트는 데이터 받으면 항상 렌더)
 */
'use client'

import Link from 'next/link'
import { ArrowRight, Newspaper } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { NewsReportListItem } from '@/drizzle/supabase-schema'

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

  return (
    <Link
      href={`/news/${report.id}`}
      className={cn(
        'group block rounded-2xl border border-border-subtle bg-surface-1 p-5 transition-[border-color,background-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-primary/40 hover:bg-surface-2',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Newspaper
            className="h-5 w-5 text-primary shrink-0"
            aria-hidden
          />
          <span className="text-xs font-medium text-primary uppercase tracking-wide">
            오늘의 마켓 리포트
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums shrink-0">
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
  )
}
