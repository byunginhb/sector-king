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
import type { AnalystLeaderboardRow, AnalystStockListItem } from '@/types'
import { useListView } from '@/hooks/use-list-view'
import { ListViewFooter } from '@/components/ui/list-view-footer'
import { ListFilterBar } from './list-filter-bar'
import { cn } from '@/lib/utils'

type Tab = 'analysts' | 'tickers'

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
  const query = useQueryState()
  const q = query.get('q')
  // 기본 켜짐 — 섹터로 묶여 있으면 초기 스크롤 길이가 크게 줄어든다.
  const grouped = query.get('group', 'sector') !== 'off'

  const stocks = useMemo(() => {
    if (!data) return []
    const needle = norm(q)
    const arr = needle
      ? data.stocks.filter(
          (s) => norm(s.businessName).includes(needle) || norm(s.ticker).includes(needle)
        )
      : [...data.stocks]
    if (sort === 'name') arr.sort((a, b) => a.businessName.localeCompare(b.businessName, 'ko'))
    else if (sort === 'upside') arr.sort((a, b) => (upsideOf(b) ?? -Infinity) - (upsideOf(a) ?? -Infinity))
    else if (sort === 'reports') arr.sort((a, b) => b.reportCount - a.reportCount || b.analystCount - a.analystCount)
    return arr // 'analysts' = API 기본 정렬 유지
  }, [data, sort, q])

  /**
   * 그룹 모드에서는 **같은 섹터가 인접하도록 재배열**한다.
   *
   * 정렬만 적용하면 섹터가 흩어져 "종목 1개짜리 그룹"이 줄줄이 생기고, 그러면
   * 헤더만 늘어나 오히려 목록이 길어진다(그룹핑을 넣은 이유와 정반대).
   *
   * 그룹 순서는 **그룹 안 최상위 종목의 정렬 순위**를 따른다 — 커버 애널 수로
   * 정렬했다면 가장 많이 커버되는 종목이 속한 섹터가 맨 위다. 정렬의 의미가
   * 그룹 축에서도 보존된다.
   */
  const ordered = useMemo(() => {
    if (!grouped) return stocks
    const buckets = new Map<string, AnalystStockListItem[]>()
    for (const s of stocks) {
      const key = s.sector?.sectorId ?? '__none__'
      const bucket = buckets.get(key)
      if (bucket) bucket.push(s)
      else buckets.set(key, [s])
    }
    // Map 은 삽입 순서를 보존하므로, 최상위 종목이 먼저 나온 섹터가 앞선다.
    return [...buckets.values()].flat()
  }, [stocks, grouped])

  const view = useListView({
    items: ordered,
    pageSize: 20,
    resetKey: `${sort}|${q}|${grouped ? 'g' : 'f'}`,
    page: Math.max(1, Number(query.get('page', '1')) || 1),
    onPageChange: (p) => query.set({ page: p === 1 ? null : String(p) }),
  })

  /**
   * 섹터 그룹 — **현재 페이지에 보이는 종목만** 묶는다.
   *
   * 전체를 묶고 그룹 단위로 페이징하면 그룹 크기가 제각각이라 한 페이지가
   * 2종목이었다 40종목이었다 한다. 페이지 크기를 일정하게 두고 그 안에서
   * 섹터 헤더를 얹으면 "끝없이 내려가는" 문제와 "무엇이 뭉쳐 있는지"가
   * 동시에 해결된다.
   */
  const groups = useMemo(() => {
    const out: { key: string; sector: AnalystStockListItem['sector']; items: AnalystStockListItem[] }[] = []
    const index = new Map<string, number>()
    for (const s of view.visible) {
      const key = s.sector?.sectorId ?? '__none__'
      let at = index.get(key)
      if (at == null) {
        at = out.length
        index.set(key, at)
        out.push({ key, sector: s.sector, items: [] })
      }
      out[at].items.push(s)
    }
    return out
  }, [view.visible])

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
      <div className="mb-2 flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">보기</span>
        {/*
          그룹핑은 정렬과 독립이다 — 그룹 안에서 선택한 정렬이 그대로 적용된다.
          끄면 순수 목록이 되므로 "상승여력 상위 20"처럼 섹터를 가로지르는
          탐색이 가능하다.
        */}
        <button
          type="button"
          aria-pressed={grouped}
          onClick={() => query.set({ group: grouped ? 'off' : null, page: null })}
          className={cn(
            'rounded-full px-2.5 py-1 transition-colors',
            grouped ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          섹터로 묶기
        </button>
      </div>

      <ListFilterBar
        query={q}
        onQueryChange={(v) => query.set({ q: v, page: null })}
        placeholder="종목명 · 티커"
        resultCount={stocks.length}
        unit="종목"
      />

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
        <p className="py-10 text-center text-sm text-muted-foreground">
          {q ? '조건에 맞는 종목이 없습니다. 검색어를 바꿔보세요.' : '표시할 종목이 없습니다.'}
        </p>
      ) : (
        <div>
          {grouped
            ? groups.map((g) => (
                <section key={g.key}>
                  <SectorGroupHeader group={g} />
                  {g.items.map((s, i) => (
                    <StockRow
                      key={s.ticker}
                      stock={s}
                      index={i}
                      open={openSet.has(s.ticker)}
                      onToggle={() => toggle(s.ticker)}
                    />
                  ))}
                </section>
              ))
            : view.visible.map((s, i) => (
                <StockRow key={s.ticker} stock={s} index={i} open={openSet.has(s.ticker)} onToggle={() => toggle(s.ticker)} />
              ))}
          <ListViewFooter view={view} unit="종목" />
        </div>
      )}
    </>
  )
}

/**
 * 섹터 그룹 헤더 — 종목 수·커버 애널 수 요약 + 섹터 상세 링크.
 *
 * 섹터 단위 **집계 적중률은 내지 않는다.** 섹터별 표본이 얇아(종목 3~5개 ×
 * 애널 몇 명) 숫자가 우연에 휘둘리고, 그 숫자가 "이 섹터 애널들은 못 맞힌다"로
 * 읽히면 근거 없는 낙인이 된다. 1차는 탐색·그룹핑 목적으로만 쓴다.
 */
function SectorGroupHeader({
  group,
}: {
  group: { sector: AnalystStockListItem['sector']; items: AnalystStockListItem[] }
}) {
  const { sector, items } = group
  const analystTotal = items.reduce((sum, s) => sum + s.analystCount, 0)
  // 상세 페이지가 없는 섹터는 링크하지 않는다(404 방지) — 서버가 실은 종목 수로 판단.
  const linkable = sector != null && sector.companyCount >= 3

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 bg-background/95 px-3 pb-1 pt-3 backdrop-blur sm:px-4">
      {linkable ? (
        <Link
          href={`/sectors/${sector!.sectorId}`}
          className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
        >
          {sector!.sectorName}
        </Link>
      ) : (
        <span className="text-sm font-semibold text-foreground">
          {sector?.sectorName ?? '미분류'}
        </span>
      )}
      <span className="text-[11px] text-muted-foreground tabular-nums">
        종목 {items.length} · 커버 애널 {analystTotal}명
      </span>
    </div>
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
          {tab === 'analysts' ? <AnalystTab /> : <StockTab />}
        </div>
      </main>
    </div>
  )
}
