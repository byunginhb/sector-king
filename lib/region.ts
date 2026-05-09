/**
 * region 분류 단일 SoT (Single Source of Truth)
 *
 * ────────────────────────────────────────────────────────────────────
 *  region 일관성 규약 (반드시 준수)
 * ────────────────────────────────────────────────────────────────────
 *
 * 1. **`getRegionFromTicker(ticker)` 가 region 판정의 SoT 함수다.**
 *    - 결정론적 (입력 → 출력 1:1).
 *    - 마이그레이션·시드·`scripts/add_ticker.py`·런타임 fallback 모두 이 함수의 결과만 사용한다.
 *    - Python 측 동등 함수: `scripts/add_ticker.py::get_region_from_ticker`.
 *
 * 2. **DB 컬럼 `companies.region` 은 위 함수 결과의 백필 캐시다.**
 *    - 신규 INSERT/UPSERT 시 반드시 함수 결과로 채운다 (`add_ticker.py`, 마이그레이션).
 *    - ADR/OTC 등 거래소 ≠ 본사 케이스의 수동 오버라이드는 향후 `subregion` 으로 분리.
 *      현재는 거래소 기준 (CPNG/BABA = INTL) 을 유지한다.
 *
 * 3. **두 경로(SQL JOIN vs 메모리 마스크) 결과가 항상 동등해야 한다.**
 *    - SQL JOIN 경로: `WHERE companies.region = ?` 또는
 *      `INNER JOIN companies ON ticker WHERE companies.region = ?`.
 *    - 메모리 마스크 경로: `applyRegionFilter(tickers, region)` /
 *      `matchesRegion(ticker, region)` (`isKrTicker` 기반).
 *    - 두 경로가 다른 결과를 내면 = `companies.region` 이 backfill 누락이거나
 *      수동 오버라이드 정책 변경의 신호다.
 *
 * 4. **DB 컬럼 값과 URL/UI 값의 표기 분리:**
 *    - DB 컬럼 (`companies.region`): `'KR' | 'INTL'` (대문자 2값).
 *    - URL/UI/API 쿼리 (`?region=`): `'all' | 'kr' | 'global'` (소문자 3값).
 *    - 매핑은 `regionFilterToValue` 가 유일.
 *
 * 5. **dev 환경 일관성 점검 헬퍼 (`assertRegionConsistency`)** 는 필요 시 호출 가능하나
 *    health endpoint / startup hook 에 자동 연결하지 않는다 (현재 PR 범위 외).
 *
 * 통합 기획서: `_workspace/01_plan/integrated-plan.md` §4.1
 */

import { validateRegion } from './validate'

/** DB 컬럼 값 — `companies.region` */
export type RegionValue = 'KR' | 'INTL'

/** URL/UI/API 쿼리 값 */
export type RegionFilter = 'all' | 'kr' | 'global'

/** 사용자 토글이 노출하는 필터 옵션 (순서 SoT) */
export const REGION_FILTERS: readonly RegionFilter[] = ['all', 'kr', 'global'] as const

/** 한국 거래소(KOSPI, KOSDAQ) 티커 접미사 */
export const KR_TICKER_SUFFIXES = ['.KS', '.KQ'] as const

/**
 * 티커로부터 region 값을 도출한다.
 *
 * - `.KS`(KOSPI), `.KQ`(KOSDAQ) 접미사 → `'KR'`
 * - 그 외(NYSE, NASDAQ, ADR, 유럽/일본 등) → `'INTL'`
 *
 * 이 함수는 결정론적이며, 마이그레이션과 런타임에서 동일한 결과를 보장한다.
 */
export function getRegionFromTicker(ticker: string): RegionValue {
  return KR_TICKER_SUFFIXES.some((suffix) => ticker.endsWith(suffix)) ? 'KR' : 'INTL'
}

/** 편의 함수 — 티커가 한국 종목인지 여부 */
export function isKrTicker(ticker: string): boolean {
  return getRegionFromTicker(ticker) === 'KR'
}

/**
 * 티커 배열을 region 필터로 거른다.
 *
 * - 불변성 유지: 입력 배열을 mutate 하지 않고 새 배열을 반환한다.
 * - `'all'`은 전체 사본을 반환한다.
 */
export function applyRegionFilter<T extends string>(
  tickers: readonly T[],
  region: RegionFilter
): T[] {
  if (region === 'all') return [...tickers]
  if (region === 'kr') return tickers.filter(isKrTicker)
  return tickers.filter((ticker) => !isKrTicker(ticker))
}

/**
 * `URLSearchParams`에서 `region` 값을 관대하게 해석한다.
 *
 * - 알 수 없는 값은 `'all'`로 폴백한다.
 * - dev 환경에서 region 키가 존재하나 화이트리스트(`validateRegion`)에 없는 경우
 *   1회성 console.warn 으로 silent fallback 을 가시화한다.
 */
export function resolveRegion(searchParams: URLSearchParams): RegionFilter {
  const value = searchParams.get('region')
  if (value === null) return 'all'
  if (validateRegion(value)) return value
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[region] 알 수 없는 region 값 "${value}" — 'all' 로 폴백`)
  }
  return 'all'
}

/**
 * 티커가 주어진 region 필터에 매치되는지 판정한다.
 *
 * - `'all'` → 항상 true
 * - `'kr'` → 티커가 KOSPI/KOSDAQ 접미사를 갖는 경우 true
 * - `'global'` → 그 외 true
 *
 * 라우트 인라인 분기를 단일 함수로 통합 (M5).
 */
export function matchesRegion(ticker: string, region: RegionFilter): boolean {
  if (region === 'all') return true
  if (region === 'kr') return isKrTicker(ticker)
  return !isKrTicker(ticker)
}

/**
 * dev 환경 region 일관성 점검 헬퍼 (수동 호출용, 자동 트리거 없음).
 *
 * SQL 컬럼(`companies.region`) 과 SoT 함수(`getRegionFromTicker(ticker)`) 결과가
 * 일치하지 않는 행을 찾는다. 불일치는 마이그레이션 누락 또는 향후 수동 오버라이드 정책 변경의 신호.
 *
 * @example
 *   if (process.env.NODE_ENV === 'development') {
 *     assertRegionConsistency(rows) // rows: { ticker, region }[]
 *   }
 */
export function assertRegionConsistency(
  rows: readonly { ticker: string; region: RegionValue }[]
): void {
  const mismatches: { ticker: string; column: RegionValue; computed: RegionValue }[] = []
  for (const row of rows) {
    const computed = getRegionFromTicker(row.ticker)
    if (row.region !== computed) {
      mismatches.push({ ticker: row.ticker, column: row.region, computed })
    }
  }
  if (mismatches.length > 0) {
    console.warn(
      `[region] 일관성 위반 ${mismatches.length}건 (DB 컬럼 ≠ getRegionFromTicker):`,
      mismatches.slice(0, 10)
    )
  }
}

/**
 * UI 필터 값을 DB 컬럼 값으로 변환한다.
 *
 * - `'all'` → `null` (필터 미적용)
 * - `'kr'`  → `'KR'`
 * - `'global'` → `'INTL'`
 */
export function regionFilterToValue(filter: RegionFilter): RegionValue | null {
  if (filter === 'kr') return 'KR'
  if (filter === 'global') return 'INTL'
  return null
}
