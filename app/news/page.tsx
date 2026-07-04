/**
 * /news — 발행된 마켓 리포트 목록 (Server Component)
 */
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NEWS_LIST_COLUMNS, rowToListItem } from '@/lib/news/dto'
import { NewsSubscribeCta } from '@/components/news/news-subscribe-cta'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { ReportKindBadge } from '@/components/news/report-kind-badge'
import { resolveReportKind, type ReportKind } from '@/lib/news/report-kind'

const FILTERS: { key: 'all' | ReportKind; label: string; href: string }[] = [
  { key: 'all', label: '전체', href: '/news' },
  { key: 'monthly', label: '월별 리포트', href: '/news?kind=monthly' },
  { key: 'daily', label: '데일리', href: '/news?kind=daily' },
]

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '마켓 리포트',
  description: '일별 마켓 리포트 목록',
}

// 요일 라벨 매핑 (Date.getDay(): 0=일~6=토)
const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

/**
 * "YYYY-MM-DD" 문자열을 카드 헤더용 날짜 라벨 3종으로 변환한다.
 * - reportDate 는 KST 기준 일자이므로 로컬 Date 로 처리.
 */
function buildDateLabels(reportDate: string): {
  monthDay: string
  weekday: string
  korean: string
} {
  // "YYYY-MM-DD" 파싱 (실패 시 빈 라벨)
  const parts = reportDate.split('-')
  if (parts.length !== 3) {
    return { monthDay: reportDate, weekday: '', korean: reportDate }
  }
  const [y, m, d] = parts
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  // 로컬 기준 Date (KST 일자 그대로 매핑)
  const local = new Date(year, month - 1, day)
  const weekday = Number.isFinite(local.getDay()) ? WEEKDAY_LABELS[local.getDay()] : ''
  return {
    monthDay: `${m}.${d}`,
    weekday,
    korean: `${year}년 ${month}월 ${day}일`,
  }
}

export default async function NewsListPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const { kind: kindParam } = await searchParams
  const activeKind: 'all' | ReportKind =
    kindParam === 'monthly' || kindParam === 'daily' || kindParam === 'weekly'
      ? kindParam
      : 'all'
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('news_reports')
    .select(NEWS_LIST_COLUMNS)
    .eq('status', 'published')
    // 리포트 일자(report_date) 최신순. 같은 날짜 내 다중 발행이 있다면 발행 시각 desc 로 tie-break.
    .order('report_date', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(50)

  const items = error
    ? []
    : (data ?? []).map((row) =>
        rowToListItem(row as Parameters<typeof rowToListItem>[0])
      )

  const filtered =
    activeKind === 'all'
      ? items
      : items.filter((it) => resolveReportKind(it) === activeKind)

  return (
    <div className="min-h-screen">
      <GlobalTopBar subtitle="마켓 리포트" />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <NewsSubscribeCta variant="banner" dismissible />

        {/* 리포트 종류 필터 */}
        <nav
          role="tablist"
          aria-label="리포트 종류"
          className="flex flex-wrap gap-2"
        >
          {FILTERS.map((f) => {
            const active = f.key === activeKind
            return (
              <Link
                key={f.key}
                href={f.href}
                role="tab"
                aria-selected={active}
                className={
                  active
                    ? 'rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                    : 'rounded-lg border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-2'
                }
              >
                {f.label}
              </Link>
            )
          })}
        </nav>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              아직 발행된 리포트가 없습니다.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((it) => {
              const labels = buildDateLabels(it.reportDate)
              const kind = resolveReportKind(it)
              return (
                <li key={it.id}>
                  <Link
                    href={`/news/${it.id}`}
                    className="group block rounded-2xl border border-border-subtle bg-surface-1 p-5 transition-[border-color,background-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-primary/40 hover:bg-surface-2 h-full"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <time
                        dateTime={it.reportDate}
                        aria-label={`발행일 ${labels.korean}`}
                        className="flex items-baseline gap-2.5"
                      >
                        <span className="font-display font-bold tabular-nums tracking-tight text-amber-400 text-2xl sm:text-3xl leading-none">
                          {labels.monthDay}
                        </span>
                        <span className="text-amber-400/70 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                          {labels.weekday}
                        </span>
                      </time>
                      {kind !== 'daily' && <ReportKindBadge kind={kind} />}
                    </div>
                    <h2 className="text-base font-bold text-card-foreground leading-tight tracking-tight group-hover:text-primary transition-colors mb-2">
                      {it.title}
                    </h2>
                    {it.oneLineConclusion && (
                      <p className="text-sm text-foreground/80 line-clamp-3">
                        {it.oneLineConclusion}
                      </p>
                    )}
                    {it.coverKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {it.coverKeywords.slice(0, 4).map((kw) => (
                          <span
                            key={kw}
                            className="text-[11px] text-muted-foreground rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
