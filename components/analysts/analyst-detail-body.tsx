'use client'

import { useState, useMemo } from 'react'
import { FileText } from 'lucide-react'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { TargetLinesChart, type TargetSeries } from './target-lines-chart'
import { PALETTE, PRICE_COLOR, CONSENSUS_COLOR, pct, hitRateTone, achievementTone, AchievementHint, DIRECTION_META, STATUS_META } from './ui'
import type { AnalystDetailResponse, AnalystTickerSeries, AnalystTargetPoint } from '@/types'
import { cn } from '@/lib/utils'

/** 주인공 애널리스트 선 — 컨센서스와 같은 "기준선" 슬롯이라 색을 공유(팔레트와 미충돌). */
const ME_COLOR = CONSENSUS_COLOR

/**
 * 채점 구간(발간일 → 다음 리포트일)과 그 구간의 실제 등락률.
 *
 * 툴팁이 아니라 행에 그대로 둔다 — "몇 달 뒤를 예측한 것이냐"에 답하는 핵심
 * 정보라 숨길 값이 아니고, 툴팁은 터치 기기에서 열리지 않는 경우가 있다.
 * 데스크탑은 한 줄 안에, 모바일은 둘째 줄에 같은 조각을 쓴다.
 */
function ScoringWindow({ p, className }: { p: AnalystTargetPoint; className?: string }) {
  if (p.actualReturn == null) return null
  return (
    <span className={cn('shrink-0 items-center gap-1 text-[11px] text-muted-foreground', className)}>
      <span className="tabular-nums">
        {p.date.slice(5)}→{p.inProgress ? '현재' : p.endDate.slice(5)}
      </span>
      <span
        className={cn(
          'tabular-nums font-medium',
          p.actualReturn > 0 ? 'text-success' : p.actualReturn < 0 ? 'text-danger' : ''
        )}
      >
        {p.actualReturn > 0 ? '+' : ''}
        {(p.actualReturn * 100).toFixed(1)}%
      </span>
    </span>
  )
}

/** 리포트 이력 행 — 모바일 2줄(제목 오버플로우 방지), 데스크탑 1줄. */
function TargetRow({ p }: { p: AnalystTargetPoint }) {
  const fmt = useCurrencyFormat()
  const dir = DIRECTION_META[p.direction]
  const DirIcon = dir.icon
  const status = STATUS_META[p.status]
  return (
    <div className="py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">{p.date.slice(2)}</span>
        <span className="w-20 shrink-0 text-right tabular-nums font-medium">{fmt.price(p.target)}</span>
        <span className={cn('flex items-center gap-0.5 w-12 shrink-0 text-xs', dir.tone)}>
          <DirIcon className="h-3.5 w-3.5" />
          {dir.label}
        </span>
        {status && (
          <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium shrink-0', status.tone)}>
            {status.label}
            {p.inProgress && p.status !== 'unscorable' && ' · 진행중'}
          </span>
        )}
        {/*
          채점 구간과 그 구간의 실제 등락률. "몇 달 뒤를 예측한 것이냐"는 물음에
          답하는 정보라, 툴팁이 아니라 행에 그대로 둔다(툴팁은 모바일에서 안 열리는
          경우가 있고, 이 값은 숨겨둘 만큼 부차적이지 않다).
        */}
        <ScoringWindow p={p} className="hidden sm:inline-flex" />
        <span className="hidden sm:block min-w-0 flex-1 truncate text-xs text-muted-foreground">{p.reportTitle}</span>
        {p.pdfUrl && (
          <a
            href={p.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block shrink-0 text-muted-foreground/60 hover:text-foreground"
            aria-label="원문 리포트 PDF"
          >
            <FileText className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {(p.reportTitle || p.pdfUrl || p.actualReturn != null) && (
        <div className="sm:hidden flex items-center gap-1.5 mt-0.5 pl-16 text-xs text-muted-foreground">
          <ScoringWindow p={p} className="inline-flex" />
          <span className="min-w-0 truncate">{p.reportTitle}</span>
          {p.pdfUrl && (
            <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:text-foreground" aria-label="원문 리포트 PDF">
              <FileText className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function TickerPanel({ series }: { series: AnalystTickerSeries }) {
  const fmt = useCurrencyFormat()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const colorByOther = useMemo(() => {
    const m = new Map<number, string>()
    series.others.forEach((o, i) => m.set(o.analystId, PALETTE[i % PALETTE.length]))
    return m
  }, [series.others])

  const chartSeries: TargetSeries[] = useMemo(() => {
    const base: TargetSeries[] = [
      { key: 'me', label: '이 애널리스트', points: series.targets.map((t) => ({ date: t.date, target: t.target })), emphasis: true, color: ME_COLOR },
    ]
    for (const o of series.others) {
      if (selected.has(o.analystId)) {
        base.push({ key: `o${o.analystId}`, label: o.name, points: o.points, color: colorByOther.get(o.analystId) })
      }
    }
    return base
  }, [series, selected, colorByOther])

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        이 종목 적중률{' '}
        <span className={cn('font-semibold', hitRateTone(series.hitRate))}>{pct(series.hitRate)}</span>
        <span className="text-muted-foreground/70"> (표본 {series.scored}건)</span>
        {series.latestAchievement != null && (
          <>
            {' · '}목표가 도달률{' '}
            <span className={cn('font-medium', achievementTone(series.latestAchievement))}>
              {pct(series.latestAchievement)}
            </span>
            <AchievementHint className="ml-0.5 inline-flex align-middle text-muted-foreground/70 hover:text-foreground transition-colors" />
          </>
        )}
      </p>

      <TargetLinesChart prices={series.prices} series={chartSeries} height={280} showLegend={false} />

      {/* 다른 애널리스트 겹쳐보기 — 칩 개별 선택 */}
      {series.others.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5">다른 애널리스트 목표가 겹쳐보기 (누르면 선 추가)</p>
          <div className="flex flex-wrap gap-1.5">
            {series.others.map((o) => {
              const on = selected.has(o.analystId)
              const color = colorByOther.get(o.analystId)!
              return (
                <button
                  key={o.analystId}
                  onClick={() => toggle(o.analystId)}
                  aria-pressed={on}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 min-h-[32px] text-xs transition-colors',
                    on ? 'border-transparent text-white' : 'hover:bg-muted'
                  )}
                  style={on ? { backgroundColor: color } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? 'white' : color }} aria-hidden />
                  {o.name} <span className="text-[11px] opacity-70">{o.firm}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 목표가 이력 */}
      <div className="border-t pt-1 divide-y divide-border/50">
        {[...series.targets].reverse().map((p) => (
          <TargetRow key={p.date + p.target} p={p} />
        ))}
      </div>

      {/* 적중·빗나감·평가 불가 쉬운 설명 */}
      <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground space-y-1.5">
        <p className="flex items-start gap-1.5">
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 font-medium', STATUS_META.hit!.tone)}>적중</span>
          <span>목표가를 이전보다 <span className="font-medium text-foreground">올린 뒤(상향) 주가도 올랐거나</span>, <span className="font-medium text-foreground">내린 뒤(하향) 주가도 내린</span> 경우</span>
        </p>
        <p className="flex items-start gap-1.5">
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 font-medium', STATUS_META.miss!.tone)}>빗나감</span>
          <span>예측한 방향과 <span className="font-medium text-foreground">반대로</span> 주가가 움직인 경우</span>
        </p>
        <p className="flex items-start gap-1.5">
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 font-medium', STATUS_META.hold!.tone)}>유지</span>
          <span>목표가를 <span className="font-medium text-foreground">그대로 둔</span> 리포트. 방향 예측이 없어 채점 대상이 아닙니다.</span>
        </p>
        <p className="flex items-start gap-1.5">
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 font-medium', STATUS_META.new!.tone)}>첫 리포트</span>
          <span>이 종목에 대한 <span className="font-medium text-foreground">첫 목표가</span>라 직전과 비교할 대상이 없습니다.</span>
        </p>
        <p className="flex items-start gap-1.5">
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 font-medium', STATUS_META.unscorable!.tone)}>주가 없음</span>
          <span>보유한 주가 데이터 기간(위 차트 시작일) 이전이라 <span className="font-medium text-foreground">채점할 수 없는</span> 리포트.</span>
        </p>
        <p className="border-t border-border/50 pt-1.5">
          채점 구간은 <span className="font-medium text-foreground">리포트 발간일부터 같은 애널리스트가 그 종목에 대해 낸 다음 리포트 발간일까지</span>입니다.
          가장 최근 리포트는 <span className="font-medium text-foreground">진행중</span>으로 표시되며, 다음 리포트가 나올 때까지 적중률 계산(분모)에 들어가지 않습니다.
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground">
        최신가 {fmt.price(series.prices.at(-1)?.price ?? null)} ·{' '}
        <span className="font-medium" style={{ color: PRICE_COLOR }}>가장 굵은 선=실제 주가</span>,{' '}
        <span className="font-medium" style={{ color: ME_COLOR }}>다음 굵은 선=이 애널리스트 목표가</span>.
      </p>
    </div>
  )
}

/** 애널리스트 상세 — 종목 칩으로 하나씩(스크롤 폭주 방지). */
export function AnalystDetailBody({ data }: { data: AnalystDetailResponse }) {
  const [activeTicker, setActiveTicker] = useState<string>(() => data.tickers[0]?.ticker ?? '')

  if (data.tickers.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        추적 종목 중 목표가 리포트가 없어 표시할 차트가 없습니다.
      </p>
    )
  }

  const active = data.tickers.find((t) => t.ticker === activeTicker) ?? data.tickers[0]

  return (
    <div className="space-y-3">
      {/* 커버 종목 칩(하나 선택) */}
      {data.tickers.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {data.tickers.map((t) => {
            const on = t.ticker === active.ticker
            return (
              <button
                key={t.ticker}
                onClick={() => setActiveTicker(t.ticker)}
                aria-pressed={on}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 min-h-[34px] text-sm transition-colors',
                  on ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                )}
              >
                {t.businessName}
                <span className={cn('text-xs tabular-nums', on ? 'text-primary-foreground/80' : hitRateTone(t.hitRate))}>
                  {pct(t.hitRate)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <section className="rounded-md border bg-card p-4">
        <h3 className="font-semibold mb-2">
          {active.businessName}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{active.ticker}</span>
        </h3>
        <TickerPanel key={active.ticker} series={active} />
      </section>
    </div>
  )
}
