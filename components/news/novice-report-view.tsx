/**
 * 초보자용 전체 뷰 (N1~N5).
 */
import { Activity, ListChecks, BookOpen, Quote } from 'lucide-react'
import { TickerChip } from './ticker-chip'
import { LockedSection } from './locked-section'
import { cn } from '@/lib/utils'
import type {
  NoviceView,
  NoviceStockBucket,
  NoviceStockTable,
  NoviceKoreanStockItem,
  NoviceStockAction,
} from '@/drizzle/supabase-schema'

interface NoviceReportViewProps {
  report: NoviceView
  /** 비로그인 시 한국 주식 섹션을 blur 처리 */
  isLoggedIn?: boolean
}

const BUCKET_META: Record<
  NoviceStockBucket,
  { label: string; tone: 'success' | 'danger' | 'info' }
> = {
  will_rise: { label: '상승 확률 높은 종목', tone: 'success' },
  will_fall: { label: '하락 확률 높은 종목', tone: 'danger' },
  buy_on_dip: { label: '하락 시 담아야 할 종목', tone: 'info' },
}

const ACTION_META: Record<
  NoviceStockAction,
  { label: string; cls: string }
> = {
  사: { label: '사', cls: 'bg-success/15 text-success border-success/30' },
  '조심하면서 사': {
    label: '조심하면서 사',
    cls: 'bg-primary/15 text-primary border-primary/30',
  },
  지켜봐: {
    label: '지켜봐',
    cls: 'bg-surface-2 text-muted-foreground border-border-subtle',
  },
  '안 사': {
    label: '안 사',
    cls: 'bg-danger/15 text-danger border-danger/30',
  },
}

export function NoviceReportView({ report, isLoggedIn = true }: NoviceReportViewProps) {
  return (
    <div className="space-y-10">
      {/* N1 */}
      <Section id="section-novice-summary" title="오늘 시장 한 줄 요약" icon={<Quote className="h-4 w-4" />}>
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
            {report.oneLineSummary}
          </p>
        </div>
      </Section>

      {/* N2 */}
      <Section id="section-novice-events" title="무슨 일이 있었어?" icon={<BookOpen className="h-4 w-4" />}>
        <ul className="space-y-3">
          {report.events.map((e) => (
            <li
              key={e.index}
              className="rounded-2xl border border-border-subtle bg-surface-1 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold tabular-nums"
                  aria-hidden
                >
                  {e.index}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-card-foreground leading-tight mb-1.5">
                    {e.title}
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {e.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* N3 */}
      <Section id="section-novice-stocks" title="주목해야 할 종목" icon={<ListChecks className="h-4 w-4" />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {report.stockTables.map((t) => (
            <NoviceStockTableView key={t.bucket} table={t} />
          ))}
        </div>
      </Section>

      {/* N4 — 비로그인 시 blur */}
      <Section id="section-novice-korea" title="한국 주식은 뭘 봐야 해?" icon={<Activity className="h-4 w-4" />}>
        {isLoggedIn ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {report.koreanStocks.map((k) => (
              <NoviceKoreanCard key={k.index} item={k} />
            ))}
          </div>
        ) : (
          <LockedSection
            variant="blur"
            title="한국 추천주식은 로그인 후 공개돼요"
            description="Google 로그인 한 번이면 한국 추천주식과 워치리스트, 일별 메일 모두 무료로 열립니다."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {report.koreanStocks.map((k) => (
                <NoviceKoreanCard key={k.index} item={k} />
              ))}
            </div>
          </LockedSection>
        )}
      </Section>

      {/* N5 */}
      <Section id="section-novice-closing" title="한 줄 정리" icon={<Quote className="h-4 w-4" />}>
        <blockquote className="rounded-2xl border border-border-subtle bg-surface-1 border-l-4 border-l-primary p-5">
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
            {report.closing}
          </p>
        </blockquote>
      </Section>
    </div>
  )
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <header className="flex items-center gap-2 mb-3">
        <span className="text-primary" aria-hidden>
          {icon}
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}

function NoviceStockTableView({ table }: { table: NoviceStockTable }) {
  const meta = BUCKET_META[table.bucket]
  const cls =
    meta.tone === 'success'
      ? 'border-success/40 bg-success/5'
      : meta.tone === 'danger'
        ? 'border-danger/40 bg-danger/5'
        : 'border-primary/40 bg-primary/5'
  const accentCls =
    meta.tone === 'success'
      ? 'text-success'
      : meta.tone === 'danger'
        ? 'text-danger'
        : 'text-primary'
  return (
    <div className={cn('rounded-2xl border p-4', cls)}>
      <h3 className={cn('text-sm font-bold uppercase tracking-wide mb-3', accentCls)}>
        {meta.label}
      </h3>
      <ul className="space-y-2">
        {table.rows.map((row, i) => (
          <li
            key={i}
            className="rounded-md border border-border-subtle bg-surface-1 p-2.5"
          >
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <TickerChip ticker={row.ticker} />
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {row.reason}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NoviceKoreanCard({ item }: { item: NoviceKoreanStockItem }) {
  const meta = ACTION_META[item.action]
  return (
    <article className="rounded-2xl border border-border-subtle bg-surface-1 p-4 sm:p-5">
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-card-foreground leading-tight">
            {item.name}
          </h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {item.code}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center text-[11px] font-bold rounded-md border px-2 py-0.5 shrink-0',
            meta.cls
          )}
        >
          {meta.label}
        </span>
      </header>
      <p className="text-sm text-foreground/90 leading-relaxed">{item.body}</p>
    </article>
  )
}
