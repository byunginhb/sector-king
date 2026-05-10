/**
 * 전문가용 전체 뷰 (8섹션 A~H).
 */
import { Quote, Activity, Compass, ListChecks, Map, MoveRight } from 'lucide-react'
import { HeadlineCard } from './headline-card'
import { ScenarioCardGroup } from './scenario-card-group'
import { TickerChip } from './ticker-chip'
import { LockedSection } from './locked-section'
import { cn } from '@/lib/utils'
import type {
  ExpertView,
  ActionIdeaItem,
  ThemeFlowItem,
  KoreanStockItem,
  KoreanStockOpinion,
  FundFlowMap,
} from '@/drizzle/supabase-schema'

interface ExpertReportViewProps {
  report: ExpertView
  /** 비로그인 시 후반부(E·F·G·H) fade 처리 */
  isLoggedIn?: boolean
}

const ACTION_LABELS: Record<ActionIdeaItem['label'], string> = {
  watchlist: 'Watchlist',
  report: '리포트',
  risk: '리스크',
  sector: '섹터',
  dividend: '배당',
}

const OPINION_META: Record<
  KoreanStockOpinion,
  { label: string; cls: string }
> = {
  buy: { label: '매수', cls: 'bg-success/15 text-success border-success/30' },
  buy_selective: {
    label: '선별 매수',
    cls: 'bg-primary/15 text-primary border-primary/30',
  },
  neutral: {
    label: '중립',
    cls: 'bg-surface-2 text-muted-foreground border-border-subtle',
  },
  reduce: {
    label: '비중 축소',
    cls: 'bg-danger/15 text-danger border-danger/30',
  },
}

export function ExpertReportView({ report, isLoggedIn = true }: ExpertReportViewProps) {
  // 후반부 (E·F·G·H) — 비로그인 시 fade 처리, 로그인 시 평소대로
  const restSections = (
    <>
      <Section id="section-scenarios" title="E. 반대 시나리오" icon={<Activity className="h-4 w-4" />}>
        <ScenarioCardGroup scenarios={report.scenarios} />
      </Section>

      <Section id="section-oneliner" title="F. 한 줄 결론" icon={<Quote className="h-4 w-4" />}>
        <blockquote className="rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6">
          <p className="text-base sm:text-lg font-semibold text-primary leading-relaxed italic">
            “{report.oneLiner}”
          </p>
        </blockquote>
      </Section>

      <Section id="section-fundflow" title="G. 자금 흐름 맵" icon={<Map className="h-4 w-4" />}>
        <FundFlowMapView flow={report.fundFlow} />
      </Section>

      <Section id="section-korea" title="H. 한국 주식 관계 분석" icon={<ListChecks className="h-4 w-4" />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {report.koreanStocks.map((k) => (
            <KoreanStockCard key={k.index} item={k} />
          ))}
        </div>
      </Section>
    </>
  )

  return (
    <div className="space-y-10">
      {/* A. 30초 브리핑 — 항상 노출 */}
      <Section id="section-brief" title="A. 30초 브리핑" icon={<Activity className="h-4 w-4" />}>
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 border-l-4 border-l-primary">
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-line">
            {report.thirtySecBrief}
          </p>
        </div>
      </Section>

      {/* B. 헤드라인 — 항상 노출 */}
      <Section id="section-headlines" title="B. 헤드라인 요약" icon={<ListChecks className="h-4 w-4" />}>
        <div className="space-y-3">
          {report.headlines.map((h) => (
            <HeadlineCard key={h.index} item={h} />
          ))}
        </div>
      </Section>

      {/* C. 테마 흐름 맵 — 항상 노출 */}
      <Section id="section-themes" title="C. 테마/섹터 흐름 맵" icon={<Compass className="h-4 w-4" />}>
        <div className="space-y-3">
          {report.themeFlows.map((t) => (
            <ThemeFlowCard key={t.index} item={t} />
          ))}
        </div>
      </Section>

      {/* D. 액션 아이디어 — 항상 노출 */}
      <Section id="section-actions" title="D. 액션 아이디어" icon={<MoveRight className="h-4 w-4" />}>
        <ul className="space-y-2">
          {report.actions.map((a, i) => (
            <li
              key={i}
              className="rounded-2xl border border-border-subtle bg-surface-1 p-4 flex gap-3"
            >
              <span className="shrink-0 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide text-primary border border-primary/30 bg-primary/10 rounded-md px-2 py-0.5 self-start">
                {ACTION_LABELS[a.label]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {a.body}
                </p>
                {a.tickers && a.tickers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {a.tickers.map((t) => (
                      <TickerChip
                        key={`${t.symbol}-${t.exchange ?? ''}`}
                        ticker={t}
                      />
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* E~H — 비로그인 시 fade + 잠금 */}
      {isLoggedIn ? (
        <div className="space-y-10">{restSections}</div>
      ) : (
        <LockedSection
          variant="fade"
          fadeHeight="280px"
          title="시나리오·자금흐름·한국주식은 로그인 후 공개돼요"
          description="Bear/Base/Bull 시나리오, 자금 흐름 맵, 한국 추천주식까지 — Google 로그인 한 번이면 무료로 열립니다."
        >
          <div className="space-y-10">{restSections}</div>
        </LockedSection>
      )}
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

function ThemeFlowCard({ item }: { item: ThemeFlowItem }) {
  return (
    <article className="rounded-2xl border border-border-subtle bg-surface-1 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary text-sm font-bold tabular-nums"
          aria-hidden
        >
          {item.index}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-card-foreground leading-tight tracking-tight mb-2">
            {item.title}
          </h3>
          <dl className="space-y-1.5 text-sm">
            <Row label="근거" value={item.evidence} />
            <Row label="해석" value={item.interpretation} />
            <Row label="다음" value={item.nextCheckpoint} />
          </dl>
        </div>
      </div>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-0.5 w-10">
        {label}
      </dt>
      <dd className="flex-1 text-foreground/90 leading-relaxed">{value}</dd>
    </div>
  )
}

function FundFlowMapView({ flow }: { flow: FundFlowMap }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FlowColumn
          title="빠져나가는 곳"
          tone="danger"
          items={flow.outflows}
        />
        <FlowColumn title="흘러가는 곳" tone="success" items={flow.inflows} />
      </div>
      {flow.driver && (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 sm:p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            흐름의 핵심 동력
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {flow.driver}
          </p>
        </div>
      )}
    </div>
  )
}

function FlowColumn({
  title,
  tone,
  items,
}: {
  title: string
  tone: 'danger' | 'success'
  items: FundFlowMap['outflows']
}) {
  const cls =
    tone === 'danger'
      ? 'border-danger/40 bg-danger/5'
      : 'border-success/40 bg-success/5'
  const accent = tone === 'danger' ? 'text-danger' : 'text-success'
  return (
    <div className={cn('rounded-2xl border p-4 sm:p-5', cls)}>
      <h4 className={cn('text-xs font-bold uppercase tracking-wide mb-3', accent)}>
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-card-foreground">{it.name}</span>
              {typeof it.ytdPct === 'number' && (
                <span className={cn('text-xs tabular-nums font-semibold', accent)}>
                  {it.ytdPct > 0 ? '+' : ''}
                  {it.ytdPct}%
                </span>
              )}
            </div>
            {it.note && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {it.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function KoreanStockCard({ item }: { item: KoreanStockItem }) {
  const meta = OPINION_META[item.opinion]
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
            'inline-flex items-center text-[11px] font-bold uppercase rounded-md border px-2 py-0.5 shrink-0',
            meta.cls
          )}
        >
          {meta.label}
        </span>
      </header>
      <dl className="space-y-1.5 text-sm">
        <Row label="근거" value={item.rationale} />
        {item.risk && <Row label="리스크" value={item.risk} />}
        {item.comment && <Row label="의견" value={item.comment} />}
      </dl>
    </article>
  )
}
