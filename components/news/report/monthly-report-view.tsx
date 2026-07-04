'use client'

/**
 * 월간 마켓 리포트 — 금융사/애널리스트 리포트 포맷.
 * 차트(recharts) + 전망(forecast) + PDF 다운로드. 발행 시점 박제 데이터만 사용.
 */
import { useRef, useState } from 'react'
import {
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Telescope,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NewsReportDTO, KoreanStockOpinion } from '@/drizzle/supabase-schema'
import { downloadReportPdf } from '@/lib/reports/download-pdf'
import { SectorFlowChart, MoversChart } from './monthly-charts'

const OPINION: Record<KoreanStockOpinion, { label: string; cls: string }> = {
  buy: { label: '매수', cls: 'bg-success/12 text-success border-success/30' },
  buy_selective: {
    label: '선별 매수',
    cls: 'bg-warning/12 text-warning border-warning/30',
  },
  neutral: {
    label: '중립',
    cls: 'bg-surface-2 text-muted-foreground border-border-subtle',
  },
  reduce: { label: '축소', cls: 'bg-danger/12 text-danger border-danger/30' },
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

function SectionHeader({ no, title, en }: { no: string; title: string; en?: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border-subtle pb-2 mb-4">
      <span className="text-xs font-bold tabular-nums text-primary">{no}</span>
      <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
        {title}
      </h2>
      {en && (
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {en}
        </span>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'up' | 'down' | 'neutral'
}) {
  const color =
    tone === 'up' ? 'text-success' : tone === 'down' ? 'text-danger' : 'text-foreground'
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2.5">
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      <div className={cn('text-lg font-bold tabular-nums leading-none', color)}>
        {value}
      </div>
    </div>
  )
}

const FORECAST_META = {
  base: { label: 'BASE · 기본', cls: 'border-primary/40', dot: 'bg-primary' },
  bull: { label: 'BULL · 상방', cls: 'border-success/40', dot: 'bg-success' },
  bear: { label: 'BEAR · 하방', cls: 'border-danger/40', dot: 'bg-danger' },
} as const

export function MonthlyReportView({ report }: { report: NewsReportDTO }) {
  const ev = report.expertView
  const m = ev.monthly
  const bodyRef = useRef<HTMLDivElement>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  if (!m) return null
  const { charts, outlook } = m

  async function handlePdf() {
    if (!bodyRef.current) return
    setPdfBusy(true)
    try {
      await downloadReportPdf(
        bodyRef.current,
        `sector-king-${charts.periodStart.slice(0, 7)}.pdf`
      )
    } catch (e) {
      console.error('PDF 생성 실패', e)
    } finally {
      setPdfBusy(false)
    }
  }

  const period = `${charts.periodStart} ~ ${charts.periodEnd} · ${charts.tradingDays}거래일`

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-10">
      {/* 액션 바 (PDF는 캡처 대상 밖) */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handlePdf}
          disabled={pdfBusy}
          className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 disabled:opacity-60"
        >
          {pdfBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          {pdfBusy ? '생성 중…' : 'PDF 다운로드'}
        </button>
      </div>

      <div ref={bodyRef} className="bg-background rounded-xl">
        {/* ── 리포트 헤더 ─────────────────────────────── */}
        <header className="border-b-2 border-foreground/80 pb-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Sector King Research
            </span>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Equity Strategy · Monthly
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight mb-2">
            {report.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
            <span>{period}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>기준일 {report.reportDate}</span>
          </div>
          {report.oneLineConclusion && (
            <p className="mt-3 text-[15px] text-foreground/90 font-medium leading-relaxed border-l-2 border-primary/60 pl-3">
              {report.oneLineConclusion}
            </p>
          )}
        </header>

        {/* ── 요약 지표 ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <StatTile
            label="추적 종목 시총 변화"
            value={fmtPct(charts.marketPct)}
            tone={charts.marketPct >= 0 ? 'up' : 'down'}
          />
          <StatTile
            label="상승 : 하락 종목"
            value={`${charts.breadthUp} : ${charts.breadthDown}`}
            tone={charts.breadthUp >= charts.breadthDown ? 'up' : 'down'}
          />
          <StatTile
            label="최대 자금 유입"
            value={charts.sectorFlows.find((f) => f.flowUsd > 0)?.name ?? '—'}
            tone="up"
          />
          <StatTile
            label="최대 자금 유출"
            value={
              [...charts.sectorFlows].sort((a, b) => a.flowUsd - b.flowUsd)[0]?.name ?? '—'
            }
            tone="down"
          />
        </div>

        {/* ── 1. 총평 ─────────────────────────────── */}
        <section className="mb-8">
          <SectionHeader no="01" title="총평" en="Executive Summary" />
          <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line">
            {ev.thirtySecBrief.replace(/\s*\[수집방법:[^\]]*\]/g, '')}
          </p>
        </section>

        {/* ── 2. 자금 흐름 ─────────────────────────── */}
        <section className="mb-8">
          <SectionHeader no="02" title="섹터 자금 흐름" en="Fund Flows" />
          <div className="rounded-lg border border-border-subtle bg-surface-1 p-3 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
              섹터별 시총 변화액 (USD, 유입 + / 유출 −)
            </div>
            <SectorFlowChart data={charts.sectorFlows} />
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            {ev.fundFlow.driver}
          </p>
        </section>

        {/* ── 3. 섹터 로테이션 ─────────────────────── */}
        {ev.themeFlows.length > 0 && (
          <section className="mb-8">
            <SectionHeader no="03" title="섹터 로테이션" en="Sector Rotation" />
            <div className="space-y-4">
              {ev.themeFlows.map((t) => (
                <div key={t.index} className="rounded-lg border border-border-subtle p-4">
                  <h3 className="font-semibold text-foreground mb-1.5">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2 tabular-nums">
                    {t.evidence}
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">
                    {t.interpretation}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">체크포인트 · </span>
                    {t.nextCheckpoint}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. 주요 종목 ─────────────────────────── */}
        <section className="mb-8">
          <SectionHeader no="04" title="주요 등락 종목" en="Key Movers" />
          <div className="rounded-lg border border-border-subtle bg-surface-1 p-3 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden />
              <TrendingDown className="h-3.5 w-3.5 text-danger" aria-hidden />
              월간 등락률 상·하위
            </div>
            <MoversChart gainers={charts.topGainers} losers={charts.topLosers} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {ev.headlines.slice(0, 6).map((h) => (
              <div key={h.index} className="rounded-lg border border-border-subtle p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {h.category}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">{h.title}</h4>
                <p className="text-xs text-foreground/75 leading-relaxed">{h.point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. 한국 주식 ─────────────────────────── */}
        {ev.koreanStocks.length > 0 && (
          <section className="mb-8">
            <SectionHeader no="05" title="한국 주식 커버리지" en="Korea Coverage" />
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">종목</th>
                    <th className="px-3 py-2 font-medium">의견</th>
                    <th className="px-3 py-2 font-medium">코멘트</th>
                  </tr>
                </thead>
                <tbody>
                  {ev.koreanStocks.map((k) => {
                    const op = OPINION[k.opinion]
                    return (
                      <tr key={k.code} className="border-b border-border-subtle/60 last:border-0">
                        <td className="px-3 py-2.5 align-top whitespace-nowrap">
                          <div className="font-medium text-foreground">{k.name}</div>
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            {k.code}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <span
                            className={cn(
                              'inline-block rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                              op.cls
                            )}
                          >
                            {op.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-top text-xs text-foreground/80 leading-relaxed min-w-[200px]">
                          {k.rationale}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── 6. 전망 (forecast) ───────────────────── */}
        <section className="mb-8">
          <SectionHeader no="06" title="전망" en="Outlook" />
          <div className="flex items-center gap-2 mb-3">
            <Telescope className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {outlook.horizon}
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90 mb-5">
            {outlook.summary}
          </p>
          <div className="grid gap-3 sm:grid-cols-3 mb-5">
            {(['base', 'bull', 'bear'] as const).map((k) => {
              const meta = FORECAST_META[k]
              const c = outlook[k]
              return (
                <div
                  key={k}
                  className={cn('rounded-lg border-l-4 border bg-surface-1 p-3', meta.cls)}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                    <span className="text-[11px] font-bold tracking-wide text-foreground/80">
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/85 leading-relaxed mb-2">
                    {c.body}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-medium">트리거 · </span>
                    {c.trigger}
                  </p>
                </div>
              )
            })}
          </div>
          {outlook.watchItems.length > 0 && (
            <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
              <div className="text-xs font-semibold text-foreground/80 mb-2">
                다음 달 체크리스트
              </div>
              <ul className="space-y-1.5">
                {outlook.watchItems.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/85">
                    <span className="text-primary font-bold tabular-nums">{i + 1}.</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── 면책 ─────────────────────────────── */}
        <footer className="border-t border-border-subtle pt-4 mt-8">
          <div className="flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
            <p>
              본 리포트는 Sector King 이 수집·집계한 데이터를 기반으로 자동 생성되었으며,
              투자 조언이 아닌 정보 제공 목적입니다. 모든 수치는 {charts.periodStart} ~{' '}
              {charts.periodEnd} 기간의 종가 기준이며, 가격·시총은 USD 로 환산·집계되었습니다.
              전망(Outlook)은 해당 기간 데이터의 추세에 근거한 시나리오이며 미래 수익을
              보장하지 않습니다. 모든 투자 판단과 책임은 투자자 본인에게 있습니다.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
