# Filter Chain 확장 설계 — Industry × Region 직교 축

작성: sk-filter-architect
대상: sector-king
관련: `sk-data-modeler`(데이터 소스), `sk-ticker-curator`(분류 규칙), `sk-ui-planner`(토글 UX)

---

## 1. 현재 필터 체인 다이어그램

현행 단일 축(Industry) 체인:

```
?industry=<id>
   │
   ▼
[lib/api-helpers.ts] resolveIndustryFilter(searchParams)
   │  - validateIndustryId
   ▼
[lib/industry.ts] getIndustryFilter(industryId)
   │
   ├─ 1) industries 테이블 존재 확인
   │
   ├─ 2) industryCategories(M:N) → categoryIds[]
   │
   ├─ 3) sectors WHERE categoryId IN (categoryIds) → sectorIds[]
   │
   └─ 4) sectorCompanies WHERE sectorId IN (sectorIds) → tickers[]
   │
   ▼
IndustryFilterResult { categoryIds, sectorIds, tickers }
   │
   ▼
API 라우트가 dailySnapshots / sectorCompanies를 categoryIds·sectorIds·tickers 중 하나로 추가 필터링
   │
   ▼
응답 (toUsd로 KRW(.KS/.KQ) 등 환산은 currency.ts)
```

특징:
- `industryId` 미지정 시 `filter=null` → 전체 데이터(기존 하위호환).
- 캐시 키에는 industryId만 포함되어 있어 region 격리 불가.
- 환율 변환은 응답 직전 단계에서 티커 접미사 기반으로 동작 → region 분기에 활용 가능한 신호가 이미 코드에 존재.

---

## 2. 확장 후 체인 (Industry × Region 직교)

```
?industry=<id|omit>&region=<all|kr|global|omit>
   │
   ▼
[lib/api-helpers.ts] resolveIndustryFilter(searchParams)
   │  - validateIndustryId  (기존)
   │  - resolveRegion(searchParams)        ← 신규
   ▼
[lib/industry.ts] getIndustryFilter(industryId)        ← 시그니처 미변경 (권장안)
   │
   ▼
IndustryFilterResult { categoryIds, sectorIds, tickers }
   │
   ▼
[lib/region.ts] applyRegionFilter(tickers, region)     ← 신규 (직교 합성)
   │  - region === 'all'    → tickers 그대로
   │  - region === 'kr'     → KR_SUFFIXES(.KS,.KQ)로 endsWith 매칭
   │  - region === 'global' → KR_SUFFIXES 비매칭
   ▼
ResolvedFilter { categoryIds, sectorIds, tickers, region }
   │
   ▼
API 라우트가 (a) tickers 화이트리스트로 1차 좁힘
            (b) industry 미지정 + region 지정 케이스는
                applyRegionFilter(allTickers, region) 또는
                SQL LIKE '%.KS' / NOT LIKE 로 처리
```

분기 포인트:
- **App 레이어 분기 (권장 시작점)**: industryId가 있을 때는 `tickers[]`가 이미 좁혀져 있으므로 거기에 region 마스크를 합성. industryId가 없을 때(`filter=null`)는 라우트 내부에서 region을 sectorCompanies/dailySnapshots 쿼리의 `LIKE` 조건으로 변환.
- **DB 레이어 분기 (sk-data-modeler가 컬럼화 결정 시)**: `companies.region` 또는 `companies.market`(또는 `country`) 컬럼을 추가하고 위 합성 단계를 SQL inArray + eq로 치환. 이 경우 `applyRegionFilter`는 deprecated 가능.

---

## 3. 함수 시그니처 변경안

### 3.1 신규 모듈

| 파일 | 심볼 | 시그니처 | 비고 |
|---|---|---|---|
| `lib/region.ts` (신규) | `Region` | `export type Region = 'all' \| 'kr' \| 'global'` | types/index.ts에서 re-export |
| `lib/region.ts` | `KR_TICKER_SUFFIXES` | `export const KR_TICKER_SUFFIXES = ['.KS', '.KQ'] as const` | currency.ts와 SSOT 일치 |
| `lib/region.ts` | `isKrTicker` | `export function isKrTicker(ticker: string): boolean` | 접미사 검사 단일 함수 |
| `lib/region.ts` | `applyRegionFilter` | `export function applyRegionFilter<T extends string>(tickers: T[], region: Region): T[]` | 순수 함수, 불변 (`filter`로 새 배열) |
| `lib/region.ts` | `resolveRegion` | `export function resolveRegion(searchParams: URLSearchParams): Region` | 누락/잘못된 값 → `'all'` |
| `lib/validate.ts` | `validateRegion` | `export function validateRegion(v: string): v is Region` | 화이트리스트 검사 |

### 3.2 수정 대상

| 파일:라인 | 현재 | 변경 후 | 사유 |
|---|---|---|---|
| `lib/api-helpers.ts:21` | `resolveIndustryFilter(searchParams): { filter \| errorResponse }` | `resolveIndustryFilter(searchParams): { filter, region \| errorResponse }` | API 라우트가 industry+region을 한 번에 받도록 |
| `lib/api-helpers.ts:39` | `getIndustryFilter(industryId)` | (변경 없음) — region은 호출부에서 합성 | **단일 책임 유지** |
| `lib/industry.ts:11` | `getIndustryFilter(industryId)` | (변경 없음) | 권장안 채택 — 아래 §3.3 참고 |
| `types/index.ts:351` | `IndustryFilterResult { categoryIds, sectorIds, tickers }` | (변경 없음) + 별도 `ResolvedFilter` 추가 | 기존 타입 보존, 합성 결과는 새 타입 |

### 3.3 두 시나리오 시그니처 (sk-data-modeler 합의용)

#### 시나리오 A — 파생(접미사 기반, 즉시 가능, 권장 1단계)

```ts
// lib/industry.ts (변경 없음)
export async function getIndustryFilter(industryId: string): Promise<IndustryFilterResult | null>

// lib/region.ts (신규)
export function applyRegionFilter<T extends string>(tickers: T[], region: Region): T[]

// lib/api-helpers.ts (변경)
export async function resolveIndustryFilter(searchParams: URLSearchParams):
  Promise<{ filter: IndustryFilterResult | null; region: Region; errorResponse?: never }
        | { errorResponse: NextResponse<ApiResponse<never>>; filter?: never; region?: never }>
```

장점: DB 마이그레이션 0건, `getIndustryFilter` 단일책임 유지, 라우트 수정만으로 도입.
단점: industryId 미지정 + region 지정 케이스에서 SQL 단(段)에 `LIKE '%.KS'` 분기 필요.

#### 시나리오 B — DB 컬럼화(`companies.region`)

```ts
// lib/industry.ts (시그니처 변경)
export async function getIndustryFilter(
  industryId: string,
  region: Region = 'all'
): Promise<IndustryFilterResult | null>
```

내부에서 4단계 ticker 조회 시 `inArray(sectorCompanies.sectorId, ...)`에 `companies.region = ?` join 조건 추가.

장점: 모든 라우트가 region 인지 없이도 자동 필터링, 인덱스 최적화 가능.
단점: 마이그레이션 + 백필 + 데이터 거버넌스 필요. sk-data-modeler 결정 대기.

> **권장: 시나리오 A로 출시 → 트래픽/요구 확인 후 B로 점진 이행**. A에서 노출된 `applyRegionFilter`는 B 도입 후에도 클라이언트 측 후처리에 재사용 가능.

---

## 4. API 라우트 변경안

### 4.1 공통 사양 (`?region=`)

| 항목 | 사양 |
|---|---|
| 키 | `region` |
| 값 | `all` \| `kr` \| `global` |
| 미지정 | `'all'`로 해석 (하위호환) |
| 잘못된 값 | `'all'`로 폴백 (관대 파싱) — sk-ui-planner가 strict 요청 시 400으로 변경 가능 |
| 검증 | `validateRegion` (화이트리스트) |
| 캐시 | URL 그대로 캐시 키에 반영됨 |

### 4.2 영향 라우트 (전수)

| 라우트 | 현재 industry 처리 | region 처리 추가 |
|---|---|---|
| `app/api/map/route.ts:27` | `resolveIndustryFilter` 사용 | filter.tickers에 `applyRegionFilter` 합성. `filter=null` 케이스는 sectorCompanies 조회 후 합성. |
| `app/api/statistics/companies/route.ts:34` | `resolveIndustryFilter` | 동일. ranking/sort 전에 합성. |
| `app/api/statistics/sector-trend/route.ts:22` | `resolveIndustryFilter` | sectorIds 기반 집계 → 후처리에서 ticker 단위 region 마스크. |
| `app/api/statistics/trends/route.ts:34` | `resolveIndustryFilter` | trend 계산용 ticker 풀에 합성. |
| `app/api/statistics/money-flow/route.ts:26` | `resolveIndustryFilter` | flow 계산 ticker 풀에 합성. |
| `app/api/statistics/price-changes/route.ts:26` | `resolveIndustryFilter` | tickers에 합성. |
| `app/api/statistics/money-flow/industries/route.ts` | 자체 industry join | industry별 카드도 region 토글 영향 → 같은 합성 적용 |
| `app/api/industries/route.ts` | 산업 카드 메타 (count/marketCap) | region 토글 시 카드 수치도 region 인지하도록 합성 |
| `app/api/sector/[id]/route.ts` | (path param) | sector 내부 회사 목록에 region 마스크 |
| `app/api/company/[ticker]/route.ts` | 단건 | 영향 없음 (티커 자체 단건 조회) |
| `app/api/search/route.ts` | 검색 | 검색 결과에 region 필터 옵션 추가 검토 |
| `app/api/debug/*` | 디버그 | 변경 없음 |

### 4.3 라우트 패치 패턴 (시나리오 A)

```ts
// before
const { filter: industryFilter, errorResponse } = await resolveIndustryFilter(searchParams)
if (errorResponse) return errorResponse
const tickers = industryFilter?.tickers // optional

// after
const { filter: industryFilter, region, errorResponse } = await resolveIndustryFilter(searchParams)
if (errorResponse) return errorResponse
const tickers = industryFilter
  ? applyRegionFilter(industryFilter.tickers, region)
  : undefined  // industry 미지정 → 라우트 내부 SQL에서 region 분기
```

---

## 5. Hook / QueryKey 변경안

### 5.1 변경 원칙

- 모든 산업 인지 hook의 options에 `region?: Region` 추가, 기본값 `'all'`.
- queryKey 끝에 `region`을 **항상** 포함(생략하면 `'all'` 캐시와 충돌). 예: `['money-flow', period, limit, industryId, region]`.
- fetch URL: region이 `'all'`이면 쿼리 생략(서버 default와 일치 → 캐시 친화), 아니면 `params.set('region', region)`.

### 5.2 영향 Hook 전수

| 파일 | 현재 queryKey | 변경 후 queryKey |
|---|---|---|
| `hooks/use-money-flow.ts:16` | `['money-flow', period, limit, industryId]` | `['money-flow', period, limit, industryId, region]` |
| `hooks/use-industry-money-flow.ts` | `['industry-money-flow', ...]` | `[..., region]` |
| `hooks/use-map-data.ts:15` | `['map', date, industryId]` | `['map', date, industryId, region]` |
| `hooks/use-price-changes.ts:17` | `['price-changes', sort, order, industryId, days]` | `['price-changes', sort, order, industryId, region, days]` |
| `hooks/use-sector-trend.ts:14` | `['sector-trend', industryId]` | `['sector-trend', industryId, region]` |
| `hooks/use-statistics.ts:24` | `['statistics', 'companies', sort, order, page, limit, industryId]` | `[..., region]` |
| `hooks/use-statistics.ts:59` | `['statistics', 'trends', type, ids, days, industryId]` | `[..., region]` |
| `hooks/use-industries.ts` | `['industries']` | `['industries', region]` (산업 카드 수치도 region 영향) |
| `hooks/use-sector-companies.ts` | `['sector-companies', sectorId, period]` | sector 내부에서 region 마스크가 필요한가? sk-ui-planner 결정 — 일단 추가 예정 |
| `hooks/use-search.ts` | `['search', query]` | `['search', query, region]` (검색에 region 적용 시) |
| `hooks/use-company.ts` | 단건 | **변경 없음** (개별 티커) |
| `hooks/use-debounce.ts` / `use-onboarding.ts` / `use-page-tour.ts` / `use-share.ts` | 비도메인 | 변경 없음 |

### 5.3 옵션 인터페이스 패턴

```ts
import type { Region } from '@/types'

interface UseMoneyFlowOptions {
  period?: number
  limit?: number
  industryId?: string
  region?: Region   // 신규, default 'all'
}

const { period = 14, limit = 6, industryId, region = 'all' } = options
queryKey: ['money-flow', period, limit, industryId, region],
```

### 5.4 컴포넌트 측 region 상태

- `components/industry-dashboard.tsx`, `components/money-flow/money-flow-page-content.tsx`, `components/price-changes/price-changes-page-content.tsx`, `components/statistics/statistics-page.tsx`, `components/hegemony-map.tsx`에 region 토글 UI 배치(sk-ui-planner와 합의).
- region 상태는 URL 쿼리스트링과 동기화(SSR + 공유 URL 일관성). `useSearchParams` + `router.replace` 패턴 권장.

---

## 6. 타입 정의

### 6.1 `lib/region.ts`

```ts
export type Region = 'all' | 'kr' | 'global'

export const REGIONS: readonly Region[] = ['all', 'kr', 'global'] as const

export const KR_TICKER_SUFFIXES = ['.KS', '.KQ'] as const

export function isKrTicker(ticker: string): boolean {
  return KR_TICKER_SUFFIXES.some((s) => ticker.endsWith(s))
}

export function applyRegionFilter<T extends string>(
  tickers: readonly T[],
  region: Region
): T[] {
  if (region === 'all') return [...tickers]
  if (region === 'kr') return tickers.filter(isKrTicker)
  return tickers.filter((t) => !isKrTicker(t))
}

export function resolveRegion(searchParams: URLSearchParams): Region {
  const v = searchParams.get('region')
  if (v === 'kr' || v === 'global' || v === 'all') return v
  return 'all'
}
```

### 6.2 `types/index.ts` 추가

```ts
// 기존 IndustryFilterResult는 보존
export type { Region } from '@/lib/region'

export interface ResolvedFilter {
  industryId: string | null
  region: Region
  categoryIds: string[] | null   // null = 전 산업
  sectorIds: string[] | null
  tickers: string[] | null       // null = 전 티커
}
```

### 6.3 응답 메타 (선택)

API 응답 메타에 적용된 region을 명시(클라이언트가 stale toggle을 구분):

```ts
interface MoneyFlowResponse {
  // 기존 필드들...
  appliedRegion?: Region
  appliedIndustryId?: string | null
}
```

---

## 7. 하위호환 체크리스트

기존 호출이 깨지지 않는지 출시 전 확인할 항목:

- [ ] `?industry=` 만 보낸 기존 클라이언트 호출이 region 미지정 시 `'all'`로 동작 (기존과 동일 응답).
- [ ] `?region=` 만 보낸 호출이 industry 미지정 시 전 산업 × region 마스크로 동작.
- [ ] `?industry=` `?region=` 모두 미지정 시 현재와 100% 동일한 응답 바이트 일치 (스냅샷 테스트).
- [ ] `getIndustryFilter(industryId)` 시그니처 변경 없음 → 외부 호출(있다면) 무영향.
- [ ] `IndustryFilterResult` 타입 변경 없음 → 기존 import 무영향.
- [ ] `validateIndustryId` 동작 동일 (region 검증은 별도 함수).
- [ ] queryKey 끝에 region 추가만 — 기존 prefix 일치하는 invalidate 패턴(`['money-flow']`)이 여전히 작동.
- [ ] 컴포넌트가 region prop 없이 hook 호출해도 default `'all'`로 빌드/런타임 OK.
- [ ] 잘못된 `region=foo` 입력 시 500이 아니라 `'all'` 폴백(관대 파싱) — strict 모드 옵션은 sk-ui-planner와 합의.
- [ ] `currency.ts` `TICKER_SUFFIX_CURRENCY`와 `KR_TICKER_SUFFIXES`가 SSOT 일치 (`.KS`, `.KQ` 두 곳에 동일하게 존재) — 한쪽 변경 시 다른 쪽 동기화하는 단위 테스트 추가.
- [ ] `industry-dashboard.tsx`의 산업 카드 수치(`/api/industries`)가 region 토글에 따라 갱신되는지 확인 (or 의도적으로 region 무관하게 유지할지 결정).
- [ ] 기존 redirect (`/money-flow → /tech/money-flow` 등)에 region 쿼리 보존되는지 next.config.ts 점검.
- [ ] `app/[industryId]/layout.tsx`의 `generateStaticParams`는 region과 직교 → 변경 없음 확인.
- [ ] React Query `staleTime`/`gcTime`이 region 추가 키 폭증을 견디는지 (3배 캐시 — 메모리 점검).
- [ ] 디버그 라우트(`app/api/debug/*`)에 region 인자 없음 → 의도된 무영향 확인.
- [ ] e2e 시나리오: industry+region 조합 6가지(2 industries × 3 regions) 스냅샷 테스트.
- [ ] `applyRegionFilter`가 빈 배열·중복·undefined 안전 처리 (단위 테스트).

---

## 부록 — 영향 파일 전수 (실측)

API 라우트 (8): `app/api/map/route.ts`, `app/api/industries/route.ts`, `app/api/statistics/companies/route.ts`, `app/api/statistics/trends/route.ts`, `app/api/statistics/sector-trend/route.ts`, `app/api/statistics/money-flow/route.ts`, `app/api/statistics/money-flow/industries/route.ts`, `app/api/statistics/price-changes/route.ts`.

Hooks (8 변경 + 4 무관): use-money-flow, use-industry-money-flow, use-map-data, use-price-changes, use-sector-trend, use-statistics, use-industries, use-sector-companies (검토). 무관: use-company, use-debounce, use-onboarding, use-page-tour, use-share.

Components (region 토글 UI 추가 검토): industry-dashboard, money-flow-page-content, price-changes-page-content, statistics-page, hegemony-map, industry-money-flow-card, industry-money-flow-page-content, sector-trend-section, company-statistics, price-change-card, industry-title.

Lib (변경): `lib/api-helpers.ts`(시그니처), `lib/validate.ts`(validateRegion 추가), `lib/region.ts`(신규).

Lib (무변경, 단 SSOT 동기화 의무): `lib/industry.ts`, `lib/currency.ts`.
