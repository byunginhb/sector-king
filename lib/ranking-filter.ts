/**
 * 랭킹 조건 스크리너 — 여러 조건을 **동시에(AND)** 걸어 종목을 좁힌다. 순수 함수.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 정렬로는 안 되는가
 * ────────────────────────────────────────────────────────────────────
 *
 * 열 클릭 정렬은 순서만 바꾸고 **개수를 줄이지 못한다.** ROE 로 정렬하면
 * 상승여력이 낮은 종목이 상위에 섞이고, 상승여력으로 다시 정렬하면 ROE 순서가
 * 흐트러진다. "ROE 20% 이상 + 상승여력 30% 이상 + 반도체"처럼 조건을 겹치는
 * 것이 실제로 종목을 추리는 방식이다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  값이 없는 종목은 통과시키지 않는다
 * ────────────────────────────────────────────────────────────────────
 *
 * `null`(미수집·산출 불가)은 조건 통과가 아니다. "PER 15 이하"를 건 사람은
 * PER 을 아는 종목 중에서 고르려는 것이지, PER 을 모르는 종목까지 담으려는 게
 * 아니다. 조건을 걸지 않으면 그 필드는 아예 검사하지 않으므로 결손 종목이
 * 부당하게 사라지지도 않는다.
 *
 * 데이터는 전부 `/api/rankings` 응답에 이미 있다 — **API 변경 없이** 화면
 * 단계에서 거른다(단, 섹터 필드는 이 작업에서 응답에 추가했다).
 */

import type { RankingItem } from '@/app/api/rankings/route'

/** 비율 필드는 소수(0.2 = 20%)로 저장돼 있고, 입력은 % 로 받는다. */
export type NumericFieldKey =
  | 'returnOnEquity'
  | 'operatingMargin'
  | 'revenueGrowth'
  | 'upsidePct'
  | 'peRatio'
  | 'beta'
  | 'marketCapUsd'
  | 'shortScore'
  | 'longScore'

export type NumericFieldDef = {
  key: NumericFieldKey
  label: string
  /** 입력 단위. `percent` 는 사용자가 20 을 넣으면 0.2 로 환산한다. */
  unit: 'percent' | 'ratio' | 'score' | 'trillionKrwUsd'
  /** 입력칸 placeholder 예시. */
  hint?: string
}

/**
 * 필터 가능한 수치 필드.
 *
 * 목록에 없는 필드를 추가하려면 여기 한 줄이면 된다 — 화면은 이 배열을 map 해서
 * 그린다. 순서가 곧 화면 순서이며, 실무에서 자주 쓰는 순으로 둔다.
 */
export const NUMERIC_FIELDS: readonly NumericFieldDef[] = [
  { key: 'returnOnEquity', label: 'ROE', unit: 'percent', hint: '20' },
  { key: 'operatingMargin', label: '영업이익률', unit: 'percent', hint: '15' },
  { key: 'revenueGrowth', label: '매출성장률', unit: 'percent', hint: '10' },
  { key: 'upsidePct', label: '상승여력', unit: 'percent', hint: '30' },
  { key: 'peRatio', label: 'PER', unit: 'ratio', hint: '15' },
  { key: 'beta', label: '베타', unit: 'ratio', hint: '1.2' },
  { key: 'longScore', label: '장기 점수', unit: 'score', hint: '70' },
  { key: 'shortScore', label: '단기 점수', unit: 'score', hint: '70' },
]

/** 한 필드의 범위 조건. 둘 다 undefined 면 조건 없음. */
export type Range = { min?: number; max?: number }

export type RankingFilterState = {
  /** 필드별 범위. **입력 단위 그대로** 담는다(퍼센트는 20 = 20%). */
  ranges: Partial<Record<NumericFieldKey, Range>>
  /** 섹터 id. 비어 있으면 전체. */
  sectorIds: string[]
  /** 투자의견(`recommendationKey`). 비어 있으면 전체. */
  recommendations: string[]
}

export const EMPTY_FILTER: RankingFilterState = {
  ranges: {},
  sectorIds: [],
  recommendations: [],
}

/** 입력값(사용자 단위) → 비교값(저장 단위). */
function toCompareValue(def: NumericFieldDef, input: number): number {
  return def.unit === 'percent' ? input / 100 : input
}

function fieldValue(item: RankingItem, key: NumericFieldKey): number | null {
  const v = item[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

const FIELD_BY_KEY = new Map(NUMERIC_FIELDS.map((f) => [f.key, f]))

/** 조건이 하나라도 걸려 있는가 — 안내 문구·초기화 버튼 노출 판단. */
export function hasAnyCondition(filter: RankingFilterState): boolean {
  if (filter.sectorIds.length > 0 || filter.recommendations.length > 0) return true
  return Object.values(filter.ranges).some(
    (r) => r && (r.min !== undefined || r.max !== undefined)
  )
}

/** 한 종목이 전 조건을 통과하는가(AND). */
export function matchesFilter(item: RankingItem, filter: RankingFilterState): boolean {
  if (filter.sectorIds.length > 0) {
    const id = item.sector?.sectorId
    if (!id || !filter.sectorIds.includes(id)) return false
  }

  if (filter.recommendations.length > 0) {
    const key = item.recommendationKey
    if (!key || !filter.recommendations.includes(key)) return false
  }

  for (const [key, range] of Object.entries(filter.ranges)) {
    if (!range || (range.min === undefined && range.max === undefined)) continue
    const def = FIELD_BY_KEY.get(key as NumericFieldKey)
    if (!def) continue

    const value = fieldValue(item, key as NumericFieldKey)
    // 값이 없으면 통과가 아니다(위 주석 참조).
    if (value == null) return false

    if (range.min !== undefined && value < toCompareValue(def, range.min)) return false
    if (range.max !== undefined && value > toCompareValue(def, range.max)) return false
  }

  return true
}

export function applyFilter(
  items: readonly RankingItem[],
  filter: RankingFilterState
): RankingItem[] {
  if (!hasAnyCondition(filter)) return [...items]
  return items.filter((item) => matchesFilter(item, filter))
}

/** 적용된 조건을 칩으로 그리기 위한 목록. `onRemove` 가 이 key 로 조건을 지운다. */
export type FilterChip =
  | { kind: 'range'; field: NumericFieldKey; bound: 'min' | 'max'; label: string }
  | { kind: 'sector'; sectorId: string; label: string }
  | { kind: 'recommendation'; value: string; label: string }

export function buildChips(
  filter: RankingFilterState,
  sectorNameById: ReadonlyMap<string, string>,
  recommendationLabel: (key: string) => string
): FilterChip[] {
  const chips: FilterChip[] = []

  for (const def of NUMERIC_FIELDS) {
    const range = filter.ranges[def.key]
    if (!range) continue
    const unit = def.unit === 'percent' ? '%' : ''
    if (range.min !== undefined) {
      chips.push({
        kind: 'range',
        field: def.key,
        bound: 'min',
        label: `${def.label} ≥ ${range.min}${unit}`,
      })
    }
    if (range.max !== undefined) {
      chips.push({
        kind: 'range',
        field: def.key,
        bound: 'max',
        label: `${def.label} ≤ ${range.max}${unit}`,
      })
    }
  }

  for (const id of filter.sectorIds) {
    chips.push({ kind: 'sector', sectorId: id, label: sectorNameById.get(id) ?? id })
  }
  for (const value of filter.recommendations) {
    chips.push({ kind: 'recommendation', value, label: recommendationLabel(value) })
  }

  return chips
}
