'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, Info, ChevronDown, CalendarRange } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { useAnalysts } from '@/hooks/use-analysts'
import { useAnalystDetail } from '@/hooks/use-analyst-detail'
import { useAnalystStocks, useAnalystStockDetail } from '@/hooks/use-analyst-stocks'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { AnalystDetailBody } from './analyst-detail-body'
import { StockDetailBody } from './stock-detail-body'
import { pct, fmtScore, scoreTone, scoreBar, ScoreHint, RowsSkeleton, DetailSkeleton } from './ui'
import type { AnalystLeaderboardRow, AnalystStockListItem, FirmLeaderboardRow } from '@/types'
import { useListView } from '@/hooks/use-list-view'
import { ListViewFooter } from '@/components/ui/list-view-footer'
import { ListFilterBar } from './list-filter-bar'
import { cn } from '@/lib/utils'

type Tab = 'analysts' | 'tickers' | 'firms'

/**
 * 목록 상태를 URL 쿼리에 실어 **공유·새로고침·뒤로가기**가 성립하게 한다.
 *
 * `router.replace` 를 쓰는 이유: 필터를 한 글자 칠 때마다 히스토리가 쌓이면
 * 뒤로가기가 타이핑을 되감는 버튼이 된다. 이 화면은 `force-dynamic` 이라
 * `useSearchParams` 가 정적 프리렌더를 깨뜨리지 않는다.
 */
function useQueryState(): {
  get: (key: string, fallback?: string) => string
  set: (patch: Record<string, string | null>) => void
} {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const get = useCallback(
    (key: string, fallback = '') => searchParams.get(key) ?? fallback,
    [searchParams]
  )

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        // 빈 값은 키를 지운다 — `?q=&firm=` 같은 껍데기가 공유 링크에 남지 않게.
        if (value == null || value === '') params.delete(key)
        else params.set(key, value)
      }
      router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  return { get, set }
}

/** 검색어 정규화 — 공백·대소문자 차이로 놓치지 않게. */
function norm(v: string): string {
  return v.trim().toLowerCase()
}

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
  const query = useQueryState()

  const q = query.get('q')
  const firmParam = query.get('firm')
  const selectedFirms = useMemo(
    () => new Set(firmParam ? firmParam.split(',').filter(Boolean) : []),
    [firmParam]
  )

  // 매 렌더 새 배열이 되면 아래 useMemo 들이 전부 무효화된다(빈 배열 리터럴 포함).
  const all = useMemo(
    () => (data ? (rankBy === 'score' ? data.ranked : (data.byReports ?? data.ranked)) : []),
    [data, rankBy]
  )

  /** 증권사 칩 목록 — 현재 순위 기준에 실제로 등장하는 곳만. */
  const firms = useMemo(() => {
    const set = new Set(all.map((r) => r.firm).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [all])

  const rows = useMemo(() => {
    const needle = norm(q)
    return all.filter((r) => {
      if (selectedFirms.size > 0 && !selectedFirms.has(r.firm)) return false
      if (!needle) return true
      return norm(r.name).includes(needle) || norm(r.firm).includes(needle)
    })
  }, [all, q, selectedFirms])

  // 133명을 한 번에 그리면 이름으로 사람을 찾을 수 없다 — PC 페이징 / 모바일 무한.
  const view = useListView({
    items: rows,
    pageSize: 20,
    resetKey: `${rankBy}|${q}|${firmParam}`,
    page: Math.max(1, Number(query.get('page', '1')) || 1),
    onPageChange: (p) => query.set({ page: p === 1 ? null : String(p) }),
  })

  const toggleFirm = (firm: string) => {
    const next = new Set(selectedFirms)
    if (next.has(firm)) next.delete(firm)
    else next.add(firm)
    query.set({ firm: [...next].join(','), page: null })
  }
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

      <ListFilterBar
        query={q}
        onQueryChange={(v) => query.set({ q: v, page: null })}
        placeholder="애널리스트 이름 · 증권사"
        firms={firms}
        selectedFirms={selectedFirms}
        onToggleFirm={toggleFirm}
        onClearFirms={() => query.set({ firm: null, page: null })}
        resultCount={rows.length}
        unit="명"
      />

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
        <p className="py-10 text-center text-sm text-muted-foreground">
          {q || selectedFirms.size > 0
            ? '조건에 맞는 애널리스트가 없습니다. 검색어나 증권사 선택을 바꿔보세요.'
            : '아직 채점 가능한 애널리스트가 없습니다.'}
        </p>
      ) : (
        <div>
          {view.visible.map((row, i) => {
            // 순위는 **필터 이전 전체 랭킹 기준**이다. 페이지마다 1위부터 다시
            // 시작하거나 필터 결과 안에서 다시 매기면, 특정 증권사만 걸러본
            // 사용자에게 그 증권사 1등이 전체 1위처럼 보인다.
            const rank = all.indexOf(row) + 1
            return (
              <AnalystRow
                key={row.analystId}
                row={row}
                rank={rank}
                index={i}
                open={openId === row.analystId}
                onToggle={() => toggle(row.analystId)}
              />
            )
          })}
          <ListViewFooter view={view} unit="명" />
        </div>
      )}
    </>
  )
}

// ── 종목 탭 ──────────────────────────────────────────────────────
type StockSort = 'analysts' | 'reports' | 'upside' | 'name'

/** 한 페이지 종목 수. 순위 오프셋 계산이 같은 값을 봐야 한다. */
const PAGE_SIZE = 20

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

/**
 * 종목 한 줄.
 *
 * `rank` 를 찍는 이유: 정렬 칩만으로는 "지금 무슨 순서인지"가 화면에 안 남는다.
 * 앞서 섹터 그룹핑이 순서를 흩어 놓았을 때 아무도 알아채지 못한 것도 같은 이유다.
 * 순위가 1,2,3… 으로 이어지면 정렬이 깨지는 순간 바로 눈에 띈다.
 */
function StockRow({ stock, index, rank, open, onToggle }: { stock: AnalystStockListItem; index: number; rank: number; open: boolean; onToggle: () => void }) {
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
        className="w-full grid grid-cols-[1.75rem_1fr_auto_1rem] sm:grid-cols-[2.25rem_1fr_6rem_6rem_6rem_5rem_1rem] items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-xs tabular-nums text-muted-foreground">{rank}</span>
        <span className="min-w-0">
          <span className="block font-medium truncate">{stock.businessName}</span>
          {/* 섹터는 그룹 헤더 대신 여기 붙는다 — 행이 버튼이라 링크를 넣으면
              중첩 인터랙티브가 되므로 텍스트로만 둔다(섹터 이동은 위 셀렉트). */}
          <span className="block text-xs text-muted-foreground truncate">
            {stock.ticker}
            {stock.sector ? ` · ${stock.sector.sectorName}` : ''}
          </span>
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
  const query = useQueryState()
  const q = query.get('q')
  /** 빈 문자열 = 전체. 특정 섹터를 고르면 그 섹터 종목만 남는다. */
  const sectorFilter = query.get('sector')

  const stocks = useMemo(() => {
    if (!data) return []
    const needle = norm(q)
    const arr = data.stocks.filter((s) => {
      if (sectorFilter && s.sector?.sectorId !== sectorFilter) return false
      if (!needle) return true
      return norm(s.businessName).includes(needle) || norm(s.ticker).includes(needle)
    })
    if (sort === 'name') arr.sort((a, b) => a.businessName.localeCompare(b.businessName, 'ko'))
    else if (sort === 'upside') arr.sort((a, b) => (upsideOf(b) ?? -Infinity) - (upsideOf(a) ?? -Infinity))
    else if (sort === 'reports') arr.sort((a, b) => b.reportCount - a.reportCount || b.analystCount - a.analystCount)
    else arr.sort((a, b) => b.analystCount - a.analystCount || b.reportCount - a.reportCount)
    // 이 배열 순서가 곧 화면 순서다. 중간에 다시 묶거나 흩는 단계를 두지 않는다 —
    // 예전엔 여기서 섹터별로 재배열해 "리포트 43, 42, 41, 42" 처럼 정렬이 깨져 보였다.
    return arr
  }, [data, sort, q, sectorFilter])

  /**
   * 셀렉트 선택지 — **필터 이전 전체**에서 뽑는다.
   *
   * 현재 결과에서 뽑으면 섹터를 하나 고르는 순간 나머지 선택지가 목록에서
   * 사라져 다른 섹터로 갈아탈 수 없다(전체로 되돌린 뒤 다시 골라야 한다).
   */
  const sectorOptions = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; n: number }>()
    for (const s of data?.stocks ?? []) {
      if (!s.sector) continue
      const cur = counts.get(s.sector.sectorId)
      if (cur) cur.n += 1
      else counts.set(s.sector.sectorId, { id: s.sector.sectorId, name: s.sector.sectorName, n: 1 })
    }
    return [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'ko'))
  }, [data])

  const view = useListView({
    items: stocks,
    pageSize: PAGE_SIZE,
    resetKey: `${sort}|${q}|${sectorFilter}`,
    page: Math.max(1, Number(query.get('page', '1')) || 1),
    onPageChange: (p) => query.set({ page: p === 1 ? null : String(p) }),
  })

  /**
   * 화면에 찍을 순위의 시작값. 페이지 모드는 현재 페이지 구간만 보여주므로
   * 2페이지 첫 줄이 21위여야 한다(무한 모드는 누적이라 항상 1부터).
   */
  const rankOffset = view.mode === 'pages' ? (view.page - 1) * PAGE_SIZE : 0

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
      {/*
        섹터 선택 — on/off 토글이 아니라 목록이다. 토글은 "묶기/풀기" 두 상태뿐이라
        "방산만 보고 싶다"에 답하지 못했다. 전체를 고르면 섹터별로 묶여 나오고,
        하나를 고르면 그 섹터만 남는다.
      */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">섹터</span>
        <select
          value={sectorFilter}
          onChange={(e) => query.set({ sector: e.target.value, page: null })}
          aria-label="섹터 선택"
          className="rounded-md border border-border-subtle bg-background px-2 py-1 text-xs text-foreground"
        >
          <option value="">전체 ({data?.stocks.length ?? 0}종목)</option>
          {sectorOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.n})
            </option>
          ))}
        </select>
        {sectorFilter && (
          <button
            type="button"
            onClick={() => query.set({ sector: null, page: null })}
            className="rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            전체 보기
          </button>
        )}
      </div>

      <ListFilterBar
        query={q}
        onQueryChange={(v) => query.set({ q: v, page: null })}
        placeholder="종목명 · 티커"
        resultCount={stocks.length}
        unit="종목"
      />

      <div className="hidden sm:grid grid-cols-[2.25rem_1fr_6rem_6rem_6rem_5rem_1rem] gap-3 px-4 pb-2 text-xs font-medium text-muted-foreground border-b">
        <span>#</span>
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
        <p className="py-10 text-center text-sm text-muted-foreground">
          {q ? '조건에 맞는 종목이 없습니다. 검색어를 바꿔보세요.' : '표시할 종목이 없습니다.'}
        </p>
      ) : (
        <div>
          <div className="divide-y divide-border-subtle">
            {view.visible.map((s, i) => (
              <StockRow
                key={s.ticker}
                stock={s}
                index={i}
                rank={rankOffset + i + 1}
                open={openSet.has(s.ticker)}
                onToggle={() => toggle(s.ticker)}
              />
            ))}
          </div>
          <ListViewFooter view={view} unit="종목" />
        </div>
      )}
    </>
  )
}

// ── 증권사 탭 ────────────────────────────────────────────────────

/**
 * 채점 표본 하한 — 이 미만은 순위에서 빼고 "표본 부족" 구역에 따로 담는다.
 *
 * 개인 랭킹의 취지(소표본 고적중률을 1위로 올리지 않는다)를 기관 단위로 옮긴
 * 값이다. Wilson 하한이 이미 벌점을 주지만, 기관 비교는 "어느 증권사가 낫다"로
 * 읽히기 때문에 얇은 표본을 아예 섞지 않는 편이 정직하다.
 */
const FIRM_MIN_SCORED = 10

function FirmTab() {
  const { data, isLoading, error } = useAnalysts()
  const query = useQueryState()
  const q = query.get('q')
  // 회의 요청: "가장 점수 낮은 것부터" 볼 수 있어야 한다.
  const asc = query.get('order') === 'asc'

  const { ranked, thin } = useMemo(() => {
    const all = data?.firms ?? []
    const needle = norm(q)
    const matched = needle ? all.filter((f) => norm(f.firm).includes(needle)) : all
    const ranked = matched.filter((f) => f.scored >= FIRM_MIN_SCORED)
    const thin = matched.filter((f) => f.scored < FIRM_MIN_SCORED)
    return { ranked: asc ? [...ranked].reverse() : ranked, thin }
  }, [data, q, asc])

  const view = useListView({
    items: ranked,
    pageSize: 20,
    resetKey: `${q}|${asc}`,
    page: Math.max(1, Number(query.get('page', '1')) || 1),
    onPageChange: (p) => query.set({ page: p === 1 ? null : String(p) }),
  })

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">순위</span>
        <button
          type="button"
          aria-pressed={!asc}
          onClick={() => query.set({ order: null, page: null })}
          className={cn(
            'rounded-full px-2.5 py-1 transition-colors',
            !asc ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          점수 높은 순
        </button>
        <button
          type="button"
          aria-pressed={asc}
          onClick={() => query.set({ order: 'asc', page: null })}
          className={cn(
            'rounded-full px-2.5 py-1 transition-colors',
            asc ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          낮은 순
        </button>
      </div>
      <p className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        소속 애널리스트의 예측을 합산해 기관 단위로 채점합니다. 점수 산식은 개인과 같습니다.
        <ScoreHint />
      </p>

      <ListFilterBar
        query={q}
        onQueryChange={(v) => query.set({ q: v, page: null })}
        placeholder="증권사"
        resultCount={ranked.length}
        unit="곳"
      />

      <div className="hidden sm:grid grid-cols-[2.5rem_1fr_9rem_6rem_4rem_4rem] gap-3 border-b px-4 pb-2 text-xs font-medium text-muted-foreground">
        <span className="text-center">순위</span>
        <span>증권사</span>
        <span className="flex items-center justify-center gap-1">
          예측력
          <ScoreHint />
        </span>
        <span className="text-center">적중률·표본</span>
        <span className="text-center">애널</span>
        <span className="text-center">리포트</span>
      </div>

      {isLoading ? (
        <RowsSkeleton variant="analysts" />
      ) : error || !data ? (
        <p className="py-10 text-center text-sm text-danger">증권사 랭킹을 불러오지 못했습니다.</p>
      ) : ranked.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {q ? '조건에 맞는 증권사가 없습니다.' : '아직 채점 가능한 증권사가 없습니다.'}
        </p>
      ) : (
        <div>
          {view.visible.map((f, i) => (
            <FirmRow key={f.firm} row={f} rank={ranked.indexOf(f) + 1} index={i} />
          ))}
          <ListViewFooter view={view} unit="곳" />
        </div>
      )}

      {thin.length > 0 && (
        <section className="mt-4 rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="mb-1.5 text-[11px] text-muted-foreground">
            표본 부족 — 채점 표본 {FIRM_MIN_SCORED}건 미만이라 순위에 넣지 않습니다.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {thin.map((f) => (
              <span
                key={f.firm}
                className="rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground tabular-nums"
              >
                {f.firm} · 표본 {f.scored}건
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function FirmRow({ row, rank, index }: { row: FirmLeaderboardRow; rank: number; index: number }) {
  /**
   * 증권사 행 → 그 증권사 소속 애널리스트 목록.
   *
   * 기관 점수를 본 다음 궁금한 것은 언제나 "그래서 누구 때문인가"다. 별도
   * 상세 페이지를 만들지 않고 **애널리스트 탭의 기존 증권사 필터**(#43)로
   * 보낸다 — 같은 목록·같은 정렬·같은 필터 UI 를 쓰므로 화면이 하나 늘지 않고,
   * 도착한 뒤 필터를 풀거나 다른 증권사를 더하는 조작도 그대로 이어진다.
   *
   * `<Link>` 라서 새 탭·주소 복사가 기본 동작 그대로 살아 있다.
   */
  return (
    <Link
      href={`/analysts?tab=analysts&firm=${encodeURIComponent(row.firm)}`}
      aria-label={`${row.firm} 소속 애널리스트 보기`}
      className="sk-rise grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50 sm:grid-cols-[2.5rem_1fr_9rem_6rem_4rem_4rem] sm:gap-3 sm:px-4"
      style={riseStyle(index)}
    >
      <span className={cn('hidden text-center text-sm font-semibold tabular-nums sm:block', rankTone(rank))}>
        {rank}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">
          <span className="mr-1.5 text-xs text-muted-foreground tabular-nums sm:hidden">{rank}</span>
          {row.firm}
        </span>
        <span className="block text-xs text-muted-foreground tabular-nums sm:hidden">
          애널 {row.analystCount}명 · 리포트 {row.reportCount}
        </span>
      </span>
      <span className="hidden items-center gap-2 sm:flex">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <span className={cn('block h-full rounded-full', scoreBar(row.score))} style={{ width: `${row.score}%` }} />
        </span>
        <span className={cn('w-8 text-right text-sm font-semibold tabular-nums', scoreTone(row.score))}>
          {fmtScore(row.score)}
        </span>
      </span>
      <span className="text-right text-sm tabular-nums text-muted-foreground sm:text-center">
        <span className={cn('font-semibold sm:hidden', scoreTone(row.score))}>
          {fmtScore(row.score)}{' '}
        </span>
        {pct(row.hitRate)} · {row.scored}건
      </span>
      <span className="hidden text-center text-sm tabular-nums sm:block">{row.analystCount}</span>
      <span className="hidden text-center text-sm tabular-nums sm:block">{row.reportCount}</span>
    </Link>
  )
}

// ── 페이지 ────────────────────────────────────────────────────────
export function AnalystsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  // 종목 탭이 기본 활성 — 애널리스트 탭만 ?tab=analysts 로 표기.
  const tabParam = searchParams.get('tab')
  const tab: Tab = tabParam === 'analysts' || tabParam === 'firms' ? tabParam : 'tickers'

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
    { key: 'firms', label: '증권사' },
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

        {/*
          채점 구간 정의 — "몇 달 뒤를 예측한 걸로 점수를 매기느냐"에 대한 답.
          국내 리서치 리포트는 목표주가 달성 시점을 명시하지 않으므로(실제 리포트
          대조로 확인), 시점 대신 다음 리포트까지의 방향으로 평가한다.
          이 문장이 없어서 생긴 불신이라 화면에 상시 노출한다.
        */}
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground mb-4">
          <CalendarRange className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <span className="font-medium text-foreground">채점 구간</span>은 리포트 발간일부터, 같은 애널리스트가 그 종목에 대해 낸
            <span className="font-medium text-foreground"> 다음 리포트 발간일</span>까지입니다. 목표주가에는 달성 시점이 명시되지
            않기 때문에, 시점 대신 다음 리포트까지의 방향으로 평가합니다. 가장 최근 리포트는 아직 구간이 닫히지 않아
            <span className="font-medium text-foreground"> 진행중</span>으로 표시되며 적중률 계산에 들어가지 않습니다.
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
          {tab === 'analysts' ? <AnalystTab /> : tab === 'firms' ? <FirmTab /> : <StockTab />}
        </div>
      </main>
    </div>
  )
}
