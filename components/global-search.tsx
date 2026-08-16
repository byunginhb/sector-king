'use client'

/**
 * 전역 검색 (Cmd+K) — **종목**과 **기능** 두 축.
 *
 * ────────────────────────────────────────────────────────────────────
 *  둘을 한 입력창에서 받되 결과는 섞지 않는다
 * ────────────────────────────────────────────────────────────────────
 *
 * 검색어만 보고 "이건 종목 질의" / "이건 기능 질의" 를 미리 가르지 않는다.
 * `삼성` 은 종목이고 `시장` 은 기능이지만 `지수` 는 양쪽 다이며, 잘못 가르면
 * 사용자는 자기가 찾는 것이 왜 안 나오는지 알 방법이 없다. 대신 **두 축을 모두
 * 조회하고 결과를 구분된 섹션으로 보여준다** — 어느 쪽인지는 사용자가 0.2초 만에
 * 판단한다.
 *
 * 섹션 순서는 종목이 먼저다. 이 검색의 주 용도가 종목 조회이고, 기능은 상단
 * 메뉴로도 갈 수 있는 보조 경로다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  키보드 이동은 평탄화된 하나의 목록 위에서
 * ────────────────────────────────────────────────────────────────────
 *
 * 섹션이 둘이어도 ↑↓ 는 경계를 그냥 넘어간다. 섹션마다 커서를 따로 두면
 * "지금 어느 목록에 있는지" 를 사용자가 기억해야 한다.
 *
 * 종목 선택은 `/stock/{ticker}` 로 **이동**한다(모달 아님). 검색으로 종목을
 * 찾는 사람은 값 하나가 아니라 그 종목을 보러 온 것이고, 페이지는 공유·뒤로가기·
 * 새 탭이 전부 그대로 동작한다.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, TrendingUp } from 'lucide-react'
import { useSearch } from '@/hooks/use-search'
import { useIndustries } from '@/hooks/use-industries'
import { useSearchContext } from './search-provider'
import { formatPriceChange } from '@/lib/format'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import {
  SEARCHABLE_FEATURES,
  buildIndustryEntries,
  matchFeatures,
  type FeatureMatch,
} from '@/lib/site-search'
import { cn } from '@/lib/utils'
import type { SearchResultItem } from '@/types'

/** 평탄화된 커서가 가리키는 대상. 섹션이 둘이어도 이동은 한 줄로 흐른다. */
type Selectable =
  | { kind: 'stock'; item: SearchResultItem }
  | { kind: 'feature'; item: FeatureMatch }

export function GlobalSearch() {
  const { isOpen, close } = useSearchContext()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useSearch({ query })
  // 산업은 DB 에 있으므로 기능 목록에 합쳐 준다. 홈·산업 화면이 이미 쓰는
  // 쿼리라 대개 캐시가 살아 있고, 없더라도 정적 기능은 먼저 뜬다.
  const { data: industriesData } = useIndustries()
  const fmt = useCurrencyFormat()

  const stocks = useMemo(() => data?.results ?? [], [data])

  const features = useMemo(() => {
    const entries = [
      ...SEARCHABLE_FEATURES,
      ...buildIndustryEntries(industriesData?.industries ?? []),
    ]
    return matchFeatures(entries, query)
  }, [industriesData, query])

  /** 커서가 훑는 단일 목록. 렌더 순서(종목 → 기능)와 반드시 같아야 한다. */
  const selectables = useMemo<Selectable[]>(
    () => [
      ...stocks.map((item) => ({ kind: 'stock' as const, item })),
      ...features.map((item) => ({ kind: 'feature' as const, item })),
    ],
    [stocks, features]
  )

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [data, features])

  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-search-item]')
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const go = useCallback(
    (target: Selectable) => {
      close()
      router.push(
        target.kind === 'stock'
          ? `/stock/${encodeURIComponent(target.item.ticker)}`
          : target.item.href
      )
    },
    [close, router]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, selectables.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        const target = selectables[selectedIndex]
        if (!target) return
        e.preventDefault()
        go(target)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    },
    [selectables, selectedIndex, close, go]
  )

  if (!isOpen) return null

  const hasQuery = query.trim().length >= 1
  const nothingFound = hasQuery && !isLoading && selectables.length === 0

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="검색"
      onClick={close}
    >
      <div
        className="mx-auto mt-[12vh] w-full max-w-lg px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-md border border-border bg-background shadow-2xl">
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="종목 또는 기능 검색"
              aria-label="종목 또는 기능 검색"
              className="flex-1 bg-transparent px-3 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-2">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="검색어 지우기"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
              <kbd className="hidden h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                ESC
              </kbd>
            </div>
          </div>

          <div ref={listRef} className="max-h-[55vh] overflow-y-auto">
            {!hasQuery && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                종목명·티커를 입력하면 종목이, 화면 이름을 입력하면 기능이
                나옵니다.
              </p>
            )}

            {nothingFound && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                &quot;{query}&quot;에 대한 결과가 없습니다
              </p>
            )}

            {stocks.length > 0 && (
              <>
                <SectionHeader label="종목" count={stocks.length} />
                {stocks.map((item, i) => (
                  <StockRow
                    key={item.ticker}
                    item={item}
                    active={i === selectedIndex}
                    onSelect={() => go({ kind: 'stock', item })}
                    onHover={() => setSelectedIndex(i)}
                    marketCapLabel={
                      item.marketCap != null ? fmt.marketCap(item.marketCap) : null
                    }
                  />
                ))}
              </>
            )}

            {/* 종목이 아직 로딩 중이어도 기능은 즉시 뜬다 — 정적 목록이라 대기가 없다. */}
            {isLoading && hasQuery && stocks.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                종목 검색 중…
              </p>
            )}

            {features.length > 0 && (
              <>
                <SectionHeader label="기능" count={features.length} />
                {features.map((item, i) => {
                  const index = stocks.length + i
                  return (
                    <FeatureRow
                      key={item.href}
                      item={item}
                      active={index === selectedIndex}
                      onSelect={() => go({ kind: 'feature', item })}
                      onHover={() => setSelectedIndex(index)}
                    />
                  )
                })}
              </>
            )}
          </div>

          {selectables.length > 0 && (
            <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <Hint keys="↑↓" label="이동" />
              <Hint keys="Enter" label="열기" />
              <Hint keys="Esc" label="닫기" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <p className="sticky top-0 z-10 flex items-center gap-2 bg-surface-2 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {label}
      <span className="tabular-nums font-normal">{count}</span>
    </p>
  )
}

function StockRow({
  item,
  active,
  onSelect,
  onHover,
  marketCapLabel,
}: {
  item: SearchResultItem
  active: boolean
  onSelect: () => void
  onHover: () => void
  marketCapLabel: string | null
}) {
  return (
    <button
      type="button"
      data-search-item
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
        active ? 'bg-surface-3' : 'hover:bg-surface-2'
      )}
    >
      <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-foreground">
            {item.ticker}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {item.nameKo || item.name}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        {marketCapLabel && (
          <span className="block text-xs text-muted-foreground">
            {marketCapLabel}
          </span>
        )}
        {item.priceChange != null && (
          <span
            className={cn(
              'block text-xs font-medium tabular-nums',
              item.priceChange > 0
                ? 'text-success'
                : item.priceChange < 0
                  ? 'text-danger'
                  : 'text-muted-foreground'
            )}
          >
            {formatPriceChange(item.priceChange)}
          </span>
        )}
      </span>
    </button>
  )
}

function FeatureRow({
  item,
  active,
  onSelect,
  onHover,
}: {
  item: FeatureMatch
  active: boolean
  onSelect: () => void
  onHover: () => void
}) {
  return (
    <button
      type="button"
      data-search-item
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
        active ? 'bg-surface-3' : 'hover:bg-surface-2'
      )}
    >
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {item.label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.description}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {item.href}
      </span>
    </button>
  )
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[10px]">
        {keys}
      </kbd>
      {label}
    </span>
  )
}
