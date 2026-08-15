/**
 * 필터 바 + 대량 편집 액션 바.
 *
 * **URL 에 동기화하지 않는다.** `/admin/economic-calendar` 는 GET form 으로
 * 필터하지만 여기서 그 패턴을 쓰면 서버 컴포넌트가 다시 렌더되면서 미저장
 * draft 가 통째로 날아간다. 이 화면은 `robots: noindex` 이고 공유 대상이
 * 아니므로 URL 동기화를 포기해도 잃는 게 없다(UI 기획 §A-4).
 *
 * 대량 편집은 **draft 에만** 반영된다. 그래서 40개를 잘못 바꿔도 저장 전이면
 * "전체 되돌리기" 한 번으로 회수된다 — 즉시 저장이었다면 40번의 부분 배포다.
 */
'use client'

import { Search, RotateCcw, Undo2, X } from 'lucide-react'
import { TIER_LABEL, TIER_ORDER, type Tier } from '@/lib/permissions/tier'
import { GATE_MODE_LABEL, GATE_MODES, type GateMode } from '@/lib/permissions/types'
import { cn } from '@/lib/utils'
import type { ConsoleFilters } from './types'

const STATUS_OPTIONS: Array<{ value: ConsoleFilters['status']; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'unset', label: '미설정만' },
  { value: 'changed', label: '변경분만' },
  { value: 'nondefault', label: '기본값과 다른 것만' },
]

const SELECT_CLASS =
  'rounded-md border border-border-subtle bg-background px-2 py-1.5 text-sm text-foreground'

export function FilterBar({
  filters,
  onChange,
  onReset,
  resultCount,
}: {
  filters: ConsoleFilters
  onChange: (next: ConsoleFilters) => void
  onReset: () => void
  /** 필터가 걸린 상태에서 몇 개가 남았는지. 0이면 "왜 비었나" 를 즉시 답한다. */
  resultCount: number
}) {
  const dirty =
    filters.q !== '' ||
    filters.minTier !== 'all' ||
    filters.gateMode !== 'all' ||
    filters.status !== 'all'

  return (
    <div className="sk-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            검색
          </span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => onChange({ ...filters, q: e.target.value })}
              placeholder="기능명 · featureId · 페이지 · 경로"
              className="w-full rounded-md border border-border-subtle bg-background py-1.5 pl-8 pr-3 text-sm text-foreground"
            />
          </span>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            최소 등급
          </span>
          <select
            value={filters.minTier}
            onChange={(e) =>
              onChange({ ...filters, minTier: e.target.value as Tier | 'all' })
            }
            className={SELECT_CLASS}
          >
            <option value="all">전체</option>
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            상세제어
          </span>
          <select
            value={filters.gateMode}
            onChange={(e) =>
              onChange({
                ...filters,
                gateMode: e.target.value as GateMode | 'all',
              })
            }
            className={SELECT_CLASS}
          >
            <option value="all">전체</option>
            {GATE_MODES.map((g) => (
              <option key={g} value={g}>
                {GATE_MODE_LABEL[g]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            상태
          </span>
          <select
            value={filters.status}
            onChange={(e) =>
              onChange({
                ...filters,
                status: e.target.value as ConsoleFilters['status'],
              })
            }
            className={SELECT_CLASS}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onReset}
          disabled={!dirty}
          className="rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-2 disabled:opacity-40"
        >
          필터 초기화
        </button>
      </div>

      {dirty && (
        <p className="mt-2 text-xs text-muted-foreground tabular-nums" role="status">
          검색 결과 {resultCount.toLocaleString()}건
        </p>
      )}
    </div>
  )
}

/**
 * 선택 액션 바 — 표 헤더 자리를 **대체**한다(별도 레이어를 띄우지 않는다).
 * 화면에서 사라진 행의 선택은 호출부가 해제한다: 보이지 않는 행을 바꾸는 것이
 * 대량 편집 사고의 전형이다.
 */
export function BulkActionBar({
  count,
  onMinTier,
  onGateMode,
  onResetDefault,
  onClear,
}: {
  count: number
  onMinTier: (tier: Tier) => void
  onGateMode: (mode: GateMode) => void
  onResetDefault: () => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-2 px-4 py-2">
      <span className="text-sm font-semibold text-foreground tabular-nums">
        {count}개 선택
      </span>

      <select
        aria-label="선택 항목 최소 등급 일괄 변경"
        value=""
        onChange={(e) => {
          const v = e.target.value
          if (v) onMinTier(v as Tier)
          e.currentTarget.value = ''
        }}
        className={cn(SELECT_CLASS, 'py-1 text-xs')}
      >
        <option value="">최소 등급…</option>
        {TIER_ORDER.map((t) => (
          <option key={t} value={t}>
            {TIER_LABEL[t]}
          </option>
        ))}
      </select>

      <select
        aria-label="선택 항목 상세제어 일괄 변경"
        value=""
        onChange={(e) => {
          const v = e.target.value
          if (v) onGateMode(v as GateMode)
          e.currentTarget.value = ''
        }}
        className={cn(SELECT_CLASS, 'py-1 text-xs')}
      >
        <option value="">상세제어…</option>
        {GATE_MODES.map((g) => (
          <option key={g} value={g}>
            {GATE_MODE_LABEL[g]}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onResetDefault}
        className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-surface-3"
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        기본값
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onClear}
        aria-label="선택 해제"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-surface-3"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        선택 해제
      </button>
    </div>
  )
}

/** 액션 바의 "전체 되돌리기" — 미저장 변경 취소. 기본값 복귀(`Undo2`)와 구분된다. */
export function DiscardIcon() {
  return <RotateCcw className="h-4 w-4" aria-hidden />
}
