'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, Info, ChevronDown } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { useAnalysts } from '@/hooks/use-analysts'
import { useAnalystDetail } from '@/hooks/use-analyst-detail'
import { useAnalystStocks, useAnalystStockDetail } from '@/hooks/use-analyst-stocks'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { AnalystDetailBody } from './analyst-detail-body'
import { StockDetailBody } from './stock-detail-body'
import { pct, fmtScore, scoreTone, scoreBar, ScoreHint, RowsSkeleton, DetailSkeleton } from './ui'
import type { AnalystLeaderboardRow, AnalystStockListItem } from '@/types'
import { cn } from '@/lib/utils'

type Tab = 'analysts' | 'tickers'

/** 행 등장 스태거 — 첫 화면 몫만 지연을 주고 그 아래는 즉시(스크롤 시 이미 끝나 있어야 함). */
const RISE_STEP_MS = 28
const RISE_MAX_STEPS = 12
const riseStyle = (i: number) => ({ '--sk-rise-delay': `${Math.min(i, RISE_MAX_STEPS) * RISE_STEP_MS}ms` }) as React.CSSProperties

/** 상위 3위만 메달 색으로 강조(성적표 가독성). 그 외·표본부족(null)은 은은하게. */
function rankTone(rank: number | null): string {
  if (rank === 1) return 'text-primary'
  if (rank === 2) return 'text-muted-foreground dark:text-foreground'
  if (rank === 3) return 'text-warning'
  return 'text-muted-foreground'
}

/** 열림 시 부드럽게 높이 확장 + 행 헤더를 화면에 유지. */
function Expandable({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="px-3 sm:px-4 pb-4 pt-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── 애널리스트 탭 ────────────────────────────────────────────────
function AnalystExpanded({ analystId }: { analystId: number }) {
  const { data, isLoading, error } = useAnalystDetail(analystId)
  if (isLoading) return <DetailSkeleton height={280} />
  if (error || !data) return <p className="text-sm text-danger py-4">상세를 불러오지 못했습니다.</p>
  return <AnalystDetailBody data={data} />
}

function AnalystRow({
  row,
  rank,
  index,
  open,
  onToggle,
}: {
  row: AnalystLeaderboardRow
  rank: number | null
  index: number
  open: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const scored = row.scored > 0 // 채점 표본 0 → 점수는 0이 아니라 '—'
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])
  return (
    <div className={cn('sk-rise rounded-lg', open && 'bg-muted/30')} style={riseStyle(index)}>
      <button
        ref={ref}
        onClick={onToggle}
        aria-expanded={open}
        className="w-full grid grid-cols-[1.75rem_1fr_auto_1rem] sm:grid-cols-[2.5rem_1fr_9rem_6rem_4rem_4rem_1rem] items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
      >
        <span className={cn('text-sm font-semibold tabular-nums text-center', rankTone(rank))}>{rank ?? '—'}</span>
        <span className="min-w-0">
          <span className="block font-medium truncate">{row.name}</span>
          <span className="block text-xs text-muted-foreground truncate">{row.firm}</span>
        </span>
        <span className="hidden sm:flex items-center gap-2">
          <span className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <span className={cn('block h-full rounded-full', scoreBar(row.score))} style={{ width: `${scored ? row.score : 0}%` }} />
          </span>
          <span className={cn('text-sm font-semibold tabular-nums w-10 text-right', scored ? scoreTone(row.score) : 'text-muted-foreground')}>
            {scored ? fmtScore(row.score) : '—'}
          </span>
        </span>
        <span className={cn('sm:hidden text-sm font-semibold tabular-nums text-right', scored ? scoreTone(row.score) : 'text-muted-foreground')}>
          {scored ? fmtScore(row.score) : '—'}
        </span>
        <span className="hidden sm:block text-xs text-center tabular-nums text-muted-foreground">{pct(row.hitRate)} · {row.scored}건</span>
        <span className="hidden sm:block text-sm text-center tabular-nums text-muted-foreground">{row.tickersCovered}</span>
        <span className="hidden sm:block text-sm text-center tabular-nums text-muted-foreground">{row.reportCount}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground/60 transition-transform justify-self-end', open && 'rotate-180')} />
      </button>
      <Expandable open={open}>{open && <AnalystExpanded analystId={row.analystId} />}</Expandable>
    </div>
  )
}

type AnalystRank = 'score' | 'reports'

function AnalystTab() {
  const { data, isLoading, error } = useAnalysts()
  const [openId, setOpenId] = useState<number | null>(null)
  const [rankBy, setRankBy] = useState<AnalystRank>('score')
  const toggle = (id: number) => setOpenId((cur) => (cur === id ? null : id))

  // 정렬 칩·열 헤더는 데이터와 무관하니 로딩 중에도 그린다 — 나중에 끼어들면 목록이 통째로 밀린다(CLS).
  const rows = data ? (rankBy === 'score' ? data.ranked : (data.byReports ?? data.ranked)) : []
  const RANKS: { key: AnalystRank; label: string }[] = [
    { key: 'score', label: '예측력 점수' },
    { key: 'reports', label: '리포트 최다' },
  ]

  return (
    <>
      <div className="flex items-center gap-1.5 mb-2 text-xs">
        <span className="text-muted-foreground">순위 기준</span>
        {RANKS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRankBy(r.key)}
            className={cn('rounded-full px-2.5 py-1 transition-colors', rankBy === r.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        {rankBy === 'score'
          ? '적중률에 예측 횟수를 반영한 예측력 점수 순. 채점 표본이 있는 애널리스트만 포함합니다.'
          : '목표주가를 제시한 리포트를 가장 많이 낸 순. 아직 채점 표본이 없는 애널리스트도 포함합니다.'}
        <ScoreHint />
      </p>
      <div className="hidden sm:grid grid-cols-[2.5rem_1fr_9rem_6rem_4rem_4rem_1rem] gap-3 px-4 pb-2 text-xs font-medium text-muted-foreground border-b">
        <span className="text-center">순위</span>
        <span>애널리스트</span>
        <span className="flex items-center justify-center gap-1">
          예측력
          <ScoreHint />
        </span>
        <span className="text-center">적중률·표본</span>
        <span className="text-center">종목</span>
        <span className="text-center">리포트</span>
        <span />
      </div>
      {isLoading ? (
        <RowsSkeleton variant="analysts" />
      ) : error || !data ? (
        <p className="text-center text-sm text-danger py-10">랭킹을 불러오지 못했습니다.</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">아직 채점 가능한 애널리스트가 없습니다.</p>
      ) : (
        <div>
          {rows.map((row, i) => (
            <AnalystRow key={row.analystId} row={row} rank={i + 1} index={i} open={openId === row.analystId} onToggle={() => toggle(row.analystId)} />
          ))}
        </div>
      )}
    </>
  )
}

// ── 종목 탭 ──────────────────────────────────────────────────────
type StockSort = 'analysts' | 'reports' | 'upside' | 'name'

function upsideOf(s: AnalystStockListItem): number | null {
  if (s.latestPrice == null || s.consensusTarget == null || s.latestPrice === 0) return null
  return (s.consensusTarget - s.latestPrice) / s.latestPrice
}

function StockExpanded({ ticker }: { ticker: string }) {
  const { data, isLoading, error } = useAnalystStockDetail(ticker)
  if (isLoading) return <DetailSkeleton height={320} />
  if (error || !data) return <p className="text-sm text-danger py-4">종목 상세를 불러오지 못했습니다.</p>
  return <StockDetailBody data={data} />
}

function StockRow({ stock, index, open, onToggle }: { stock: AnalystStockListItem; index: number; open: boolean; onToggle: () => void }) {
  const fmt = useCurrencyFormat()
  const ref = useRef<HTMLButtonElement>(null)
  const up = upsideOf(stock)
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])
  return (
    <div className={cn('sk-rise rounded-lg', open && 'bg-muted/30')} style={riseStyle(index)}>
      <button
        ref={ref}
        onClick={onToggle}
        aria-expanded={open}
        className="w-full grid grid-cols-[1fr_auto_1rem] sm:grid-cols-[1fr_6rem_6rem_6rem_5rem_1rem] items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
      >
        <span className="min-w-0">
          <span className="block font-medium truncate">{stock.businessName}</span>
          <span className="block text-xs text-muted-foreground truncate">{stock.ticker}</span>
        </span>
        <span className="hidden sm:flex flex-col items-center leading-tight tabular-nums">
          <span className="text-sm">{stock.analystCount}명</span>
          <span className="text-[10px] text-muted-foreground">리포트 {stock.reportCount}</span>
        </span>
        <span className="hidden sm:block text-sm text-right tabular-nums text-muted-foreground">{fmt.price(stock.consensusTarget)}</span>
        <span className="hidden sm:block text-sm text-right tabular-nums text-muted-foreground">{fmt.price(stock.latestPrice)}</span>
        <span className="flex items-center justify-end gap-2">
          <span className="sm:hidden text-xs text-muted-foreground tabular-nums">{stock.analystCount}명 · 리포트 {stock.reportCount}</span>
          <span className={cn('text-sm font-semibold tabular-nums text-right', up == null ? 'text-muted-foreground' : up >= 0 ? 'text-success' : 'text-danger')}>
            {up == null ? '—' : `${up >= 0 ? '+' : ''}${Math.round(up * 100)}%`}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground/60 transition-transform justify-self-end', open && 'rotate-180')} />
      </button>
      <Expandable open={open}>{open && <StockExpanded ticker={stock.ticker} />}</Expandable>
    </div>
  )
}

function StockTab() {
  const { data, isLoading, error } = useAnalystStocks()
  const [openTickers, setOpenTickers] = useState<Set<string> | null>(null)
  const [sort, setSort] = useState<StockSort>('analysts')

  const stocks = useMemo(() => {
    if (!data) return []
    const arr = [...data.stocks]
    if (sort === 'name') arr.sort((a, b) => a.businessName.localeCompare(b.businessName, 'ko'))
    else if (sort === 'upside') arr.sort((a, b) => (upsideOf(b) ?? -Infinity) - (upsideOf(a) ?? -Infinity))
    else if (sort === 'reports') arr.sort((a, b) => b.reportCount - a.reportCount || b.analystCount - a.analystCount)
    return arr // 'analysts' = API 기본 정렬 유지
  }, [data, sort])

  // 미토글 상태(null)면 첫 종목만 기본 열림. 이후엔 각 종목 독립 토글(여러 개 동시 가능).
  const defaultOpen = useMemo(() => new Set(stocks[0] ? [stocks[0].ticker] : []), [stocks])
  const openSet = openTickers ?? defaultOpen
  const toggle = (t: string) =>
    setOpenTickers((prev) => {
      const next = new Set(prev ?? defaultOpen)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })

  // 정렬 칩·열 헤더는 데이터와 무관하니 로딩 중에도 그린다 — 나중에 끼어들면 목록이 통째로 밀린다(CLS).
  const SORTS: { key: StockSort; label: string }[] = [
    { key: 'analysts', label: '커버 애널 수' },
    { key: 'reports', label: '리포트 수' },
    { key: 'upside', label: '상승여력' },
    { key: 'name', label: '종목명' },
  ]

  return (
    <>
      <div className="flex items-center gap-1.5 mb-2 text-xs">
        <span className="text-muted-foreground">정렬</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={cn('rounded-full px-2.5 py-1 transition-colors', sort === s.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="hidden sm:grid grid-cols-[1fr_6rem_6rem_6rem_5rem_1rem] gap-3 px-4 pb-2 text-xs font-medium text-muted-foreground border-b">
        <span>종목</span>
        <span className="text-center">애널·리포트</span>
        <span className="text-right">컨센서스</span>
        <span className="text-right">현재가</span>
        <span className="text-right">상승여력</span>
        <span />
      </div>
      {isLoading ? (
        <RowsSkeleton variant="stocks" />
      ) : error || !data ? (
        <p className="text-center text-sm text-danger py-10">종목 목록을 불러오지 못했습니다.</p>
      ) : stocks.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">표시할 종목이 없습니다.</p>
      ) : (
        <div>
          {stocks.map((s, i) => (
            <StockRow key={s.ticker} stock={s} index={i} open={openSet.has(s.ticker)} onToggle={() => toggle(s.ticker)} />
          ))}
        </div>
      )}
    </>
  )
}

// ── 페이지 ────────────────────────────────────────────────────────
export function AnalystsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  // 종목 탭이 기본 활성 — 애널리스트 탭만 ?tab=analysts 로 표기.
  const tab: Tab = searchParams.get('tab') === 'analysts' ? 'analysts' : 'tickers'

  const setTab = useCallback(
    (t: Tab) => {
      const params = new URLSearchParams(searchParams.toString())
      if (t === 'tickers') params.delete('tab')
      else params.set('tab', t)
      router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  const TABS: { key: Tab; label: string }[] = [
    { key: 'tickers', label: '종목' },
    { key: 'analysts', label: '애널리스트' },
  ]
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  function onTabKey(e: React.KeyboardEvent, i: number) {
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next >= 0) {
      e.preventDefault()
      setTab(TABS[next].key)
      tabRefs.current[next]?.focus()
    }
  }

  return (
    <div className="min-h-screen">
      <GlobalTopBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <div className="flex items-start gap-3 mb-2">
          <ClipboardCheck className="h-7 w-7 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">애널리스트 성적표</h1>
            <p className="text-sm text-muted-foreground mt-1">
              애널리스트가 목표주가를 올렸는지 내렸는지, 그 방향대로 주가가 실제로 움직였는지로 예측력을 채점합니다.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground mb-4">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <span className="font-medium text-foreground">예측력 점수</span>는 방향 적중률(목표가를 올렸을 때 실제 주가도 올랐는가)에
            <span className="font-medium text-foreground"> 예측 횟수</span>를 함께 반영한 0~100 점수입니다.
            소수 예측으로 100% 적중한 경우보다, 수십 건을 쌓으며 꾸준히 맞힌 경우를 더 높게 평가합니다.
            점수 옆에 원래 적중률·표본 수를 함께 보여줍니다.
          </p>
        </div>

        {/* 언더라인 탭 */}
        <div role="tablist" aria-label="애널리스트 성적표 보기" className="grid grid-cols-2 sm:flex sm:gap-1 border-b mb-4">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              role="tab"
              id={`analysts-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`analysts-panel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                'relative px-4 py-2.5 text-sm transition-colors -mb-px border-b-2',
                tab === t.key
                  ? 'border-primary font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`analysts-panel-${tab}`} aria-labelledby={`analysts-tab-${tab}`}>
          {tab === 'analysts' ? <AnalystTab /> : <StockTab />}
        </div>
      </main>
    </div>
  )
}
