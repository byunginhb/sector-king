/**
 * 상세 페이지 본문 — 전문가/초보자 토글 + sticky TOC.
 */
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ExpertReportView } from './expert-report-view'
import { NoviceReportView } from './novice-report-view'
import { ViewToggle, type ReportView } from './view-toggle'
import { StickyToc } from './sticky-toc'
import type { NewsReportDTO } from '@/drizzle/supabase-schema'

interface NewsDetailContentProps {
  report: NewsReportDTO
  initialView?: ReportView
}

const EXPERT_TOC = [
  { id: 'section-brief', title: 'A. 30초 브리핑' },
  { id: 'section-headlines', title: 'B. 헤드라인 요약' },
  { id: 'section-themes', title: 'C. 테마 흐름 맵' },
  { id: 'section-actions', title: 'D. 액션 아이디어' },
  { id: 'section-scenarios', title: 'E. 시나리오' },
  { id: 'section-oneliner', title: 'F. 한 줄 결론' },
  { id: 'section-fundflow', title: 'G. 자금 흐름 맵' },
  { id: 'section-korea', title: 'H. 한국 주식' },
]

const NOVICE_TOC = [
  { id: 'section-novice-summary', title: '한 줄 요약' },
  { id: 'section-novice-events', title: '무슨 일이 있었어' },
  { id: 'section-novice-stocks', title: '주목 종목' },
  { id: 'section-novice-korea', title: '한국 주식' },
  { id: 'section-novice-closing', title: '한 줄 정리' },
]

export function NewsDetailContent({
  report,
  initialView = 'expert',
}: NewsDetailContentProps) {
  const [view, setView] = useState<ReportView>(initialView)
  const sections = view === 'expert' ? EXPERT_TOC : NOVICE_TOC

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground tabular-nums mb-1">
            {report.publishedAt
              ? format(new Date(report.publishedAt), 'yyyy-MM-dd HH:mm')
              : report.reportDate}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            {report.title}
          </h1>
          {report.coverKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {report.coverKeywords.map((kw) => (
                <span
                  key={kw}
                  className="text-[11px] text-muted-foreground rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5"
                >
                  #{kw}
                </span>
              ))}
            </div>
          )}
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 lg:gap-8">
        <div className="min-w-0 order-2 lg:order-1">
          {view === 'expert' ? (
            <ExpertReportView report={report.expertView} />
          ) : (
            <NoviceReportView report={report.noviceView} />
          )}

          <aside
            aria-label="투자 면책 조항"
            className="mt-12 rounded-md border border-border-subtle bg-surface-2 p-3 text-[11px] text-muted-foreground leading-relaxed"
          >
            본 리포트는 투자 조언이 아닌 정보 제공 목적입니다. 모든 투자 판단은
            본인의 책임하에 이루어져야 합니다.
          </aside>
        </div>

        <div className="order-1 lg:order-2">
          <StickyToc
            sections={sections}
            className="lg:sticky lg:top-20"
          />
        </div>
      </div>
    </div>
  )
}
