'use client'

/**
 * 성적표 내부 좁히기 — 검색 입력 + 증권사 칩.
 *
 * ────────────────────────────────────────────────────────────────────
 *  전역 검색(Cmd+K)과 목적이 다르다
 * ────────────────────────────────────────────────────────────────────
 *
 * 전역 검색은 "다른 화면으로 이동"이고, 이 필터는 **지금 보고 있는 목록을
 * 좁히는 것**이다. 133명 중에서 특정 애널리스트를 찾으려고 스크롤로 헤매는
 * 상황이 실제로 있었고, 그건 전역 검색으로 해결되지 않는다.
 *
 * 데이터는 이미 전량 받아와 있으므로 필터는 전부 클라이언트에서 한다 —
 * API 왕복이 없어 입력 즉시 반응한다.
 */

import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ListFilterBar({
  query,
  onQueryChange,
  placeholder,
  firms,
  selectedFirms,
  onToggleFirm,
  onClearFirms,
  resultCount,
  unit,
}: {
  query: string
  onQueryChange: (q: string) => void
  placeholder: string
  /** 증권사 칩 목록. 비우면 칩 영역 자체가 렌더되지 않는다(종목 탭). */
  firms?: string[]
  selectedFirms?: ReadonlySet<string>
  onToggleFirm?: (firm: string) => void
  onClearFirms?: () => void
  resultCount: number
  unit: string
}) {
  const hasFirmFilter = (firms?.length ?? 0) > 0
  const selected = selectedFirms ?? new Set<string>()

  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full rounded-md border border-border-subtle bg-background py-1.5 pl-8 pr-3 text-sm text-foreground"
          />
        </span>
        <span className="text-xs text-muted-foreground tabular-nums" role="status">
          {resultCount.toLocaleString()}
          {unit}
        </span>
      </div>

      {hasFirmFilter && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">증권사</span>
          {/*
            칩이 20개를 넘어가면 줄이 길어지지만 접지 않는다 — 접으면 "내 증권사가
            목록에 있나"를 한 번 더 눌러야 알 수 있고, 그게 이 필터를 쓰는 이유다.
          */}
          {firms!.map((firm) => {
            const on = selected.has(firm)
            return (
              <button
                key={firm}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleFirm?.(firm)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] transition-colors',
                  on
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-surface-3'
                )}
              >
                {firm}
              </button>
            )
          })}
          {selected.size > 0 && (
            <button
              type="button"
              onClick={onClearFirms}
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" aria-hidden />
              해제
            </button>
          )}
        </div>
      )}
    </div>
  )
}
