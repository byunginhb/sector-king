'use client'

/**
 * 랭킹 조건 스크리너 UI — 열고 닫는 패널 + 적용된 조건 칩.
 *
 * 패널은 **기본 접힘**이다. 랭킹의 1차 용도는 "점수 순으로 훑기"이고 필터는
 * 그다음 단계라, 입력칸 여덟 개가 처음부터 펼쳐져 있으면 화면이 도구함처럼
 * 보인다. 대신 조건이 걸리면 **칩은 접힌 상태에서도 계속 보인다** — 무엇을
 * 걸어놨는지 잊은 채 "왜 4종목밖에 없지" 하는 상황을 막는 게 칩의 존재 이유다.
 */

import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import {
  EMPTY_FILTER,
  NUMERIC_FIELDS,
  buildChips,
  hasAnyCondition,
  type NumericFieldKey,
  type RankingFilterState,
} from '@/lib/ranking-filter'
import { cn } from '@/lib/utils'

const INPUT_CLASS =
  'w-16 rounded-md border border-border-subtle bg-background px-1.5 py-1 text-xs text-foreground tabular-nums'

export function RankingScreener({
  filter,
  onChange,
  sectors,
  recommendations,
  recommendationLabel,
  matchedCount,
  totalCount,
}: {
  filter: RankingFilterState
  onChange: (next: RankingFilterState) => void
  /** 현재 목록에 등장하는 섹터. 필터로 사라지지 않도록 **필터 이전**에서 뽑아 넘긴다. */
  sectors: { id: string; name: string; count: number }[]
  recommendations: string[]
  recommendationLabel: (key: string) => string
  matchedCount: number
  totalCount: number
}) {
  const [open, setOpen] = useState(false)
  const active = hasAnyCondition(filter)
  const sectorNames = new Map(sectors.map((s) => [s.id, s.name]))
  const chips = buildChips(filter, sectorNames, recommendationLabel)

  const setRange = (key: NumericFieldKey, bound: 'min' | 'max', raw: string) => {
    const next = { ...filter.ranges }
    const cur = { ...(next[key] ?? {}) }
    if (raw === '') delete cur[bound]
    else {
      const n = Number(raw)
      if (!Number.isFinite(n)) return
      cur[bound] = n
    }
    if (cur.min === undefined && cur.max === undefined) delete next[key]
    else next[key] = cur
    onChange({ ...filter, ranges: next })
  }

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
            active
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border-subtle bg-background text-muted-foreground hover:bg-surface-2'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          조건 필터
          {active && <span className="tabular-nums">{chips.length}</span>}
        </button>

        {/*
          결과 건수는 **항상** 보인다. 4종목이면 "조금 넓혀볼까", 180종목이면
          "더 좁혀야겠다"는 판단이 즉시 되고, 이게 없으면 필터가 걸렸는지조차
          알 수 없다.
        */}
        <span className="text-xs text-muted-foreground tabular-nums" role="status">
          {active ? (
            <>
              <span className="font-semibold text-foreground">
                {matchedCount.toLocaleString()}
              </span>
              {' / '}
              {totalCount.toLocaleString()}종목
            </>
          ) : (
            <>{totalCount.toLocaleString()}종목</>
          )}
        </span>

        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTER)}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            전체 초기화
          </button>
        )}
      </div>

      {/* 칩은 패널을 접어도 남는다 — 걸어둔 조건을 잊지 않게. */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const key =
              chip.kind === 'range'
                ? `${chip.field}:${chip.bound}`
                : chip.kind === 'sector'
                  ? `s:${chip.sectorId}`
                  : `r:${chip.value}`
            const remove = () => {
              if (chip.kind === 'range') {
                const next = { ...filter.ranges }
                const cur = { ...(next[chip.field] ?? {}) }
                delete cur[chip.bound]
                if (cur.min === undefined && cur.max === undefined) delete next[chip.field]
                else next[chip.field] = cur
                onChange({ ...filter, ranges: next })
              } else if (chip.kind === 'sector') {
                onChange({
                  ...filter,
                  sectorIds: filter.sectorIds.filter((id) => id !== chip.sectorId),
                })
              } else {
                onChange({
                  ...filter,
                  recommendations: filter.recommendations.filter((v) => v !== chip.value),
                })
              }
            }
            return (
              <button
                key={key}
                type="button"
                onClick={remove}
                aria-label={`${chip.label} 조건 제거`}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
              >
                {chip.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            )
          })}
        </div>
      )}

      {open && (
        <div className="sk-card space-y-3 p-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              수치 범위
            </p>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {NUMERIC_FIELDS.map((f) => {
                const range = filter.ranges[f.key] ?? {}
                return (
                  <label key={f.key} className="flex items-center gap-1.5 text-xs">
                    <span className="w-20 shrink-0 text-muted-foreground">{f.label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={range.min ?? ''}
                      placeholder={f.hint}
                      onChange={(e) => setRange(f.key, 'min', e.target.value)}
                      aria-label={`${f.label} 최소`}
                      className={INPUT_CLASS}
                    />
                    <span className="text-muted-foreground">~</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={range.max ?? ''}
                      onChange={(e) => setRange(f.key, 'max', e.target.value)}
                      aria-label={`${f.label} 최대`}
                      className={INPUT_CLASS}
                    />
                    {f.unit === 'percent' && (
                      <span className="text-[11px] text-muted-foreground">%</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {sectors.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                섹터
              </p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {sectors.map((s) => {
                  const on = filter.sectorIds.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onChange({ ...filter, sectorIds: toggleIn(filter.sectorIds, s.id) })
                      }
                      className={cn(
                        'rounded-full px-2 py-1 text-[11px] transition-colors',
                        on
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-surface-3'
                      )}
                    >
                      {s.name} <span className="tabular-nums opacity-70">{s.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                투자의견
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recommendations.map((key) => {
                  const on = filter.recommendations.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onChange({
                          ...filter,
                          recommendations: toggleIn(filter.recommendations, key),
                        })
                      }
                      className={cn(
                        'rounded-full px-2 py-1 text-[11px] transition-colors',
                        on
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-surface-3'
                      )}
                    >
                      {recommendationLabel(key)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
