# 통합 기획서 — Region(전체/국내/해외) 토글 + 티커 보완

> 작성: sk-orchestrator (메인 통합)
> 일자: 2026-05-09
> 입력: data-model.md, ticker-gaps.md, filter-chain.md, ui-plan.md
> 상태: **사용자 승인 대기 중**

---

## 1. 요약 (TL;DR)

**무엇을 한다:**
1. 산업/섹터/티커 데이터에 region 축(전체/국내/해외)을 추가하여 페이지 헤더의 토글로 필터링한다.
2. 누락된 섹터의 대표 티커를 약 200종 보강한다 (KR 약 50, 해외 약 150).

**왜 한다:**
- 현재 `.KS`/`.KQ`(국내)와 해외 종목이 한 화면에 섞여 보기 어렵다.
- 86개 섹터 중 거의 전부가 KR≥3 또는 해외≥5 권장 기준 미달이다.

**어떻게 한다:**
- **데이터 모델**: `companies.region` 컬럼 추가(SoT) + `lib/region.ts` 접미사 fallback (하이브리드). `categories.regionScope`로 KR 전용 카테고리(`korea_bio`, `korea_banks`) 충돌 해소.
- **필터 체인**: `getIndustryFilter`는 시그니처 보존. `applyRegionFilter()`로 직교 합성. 모든 API에 `?region=` 추가, 모든 hook의 queryKey에 region 추가.
- **UI**: 신규 `<RegionToggle>` 공용 컴포넌트 + `useRegion()` 훅. URL `?region=` 동기화. 5개 주요 페이지에 일관 적용. 빈 상태는 페이지별 정책 적용.
- **티커 보완**: 새 멱등 마이그레이션 `migrate-fill-ticker-gaps.ts`로 약 200종 INSERT OR IGNORE.
- **rank 제약 완화**: `sector_companies.rank` CHECK ≤5 → ≤10.

---

## 2. 4개 기획 산출물 간 충돌 해결 로그

### 충돌 1 — region 분류 소스: DB 컬럼 vs 접미사 파생

| 에이전트 | 입장 |
|---|---|
| sk-data-modeler | 하이브리드 — `companies.region` 컬럼 + 접미사 fallback |
| sk-filter-architect | 시나리오 A 권장 — 접미사 파생만 (DB 마이그레이션 0건) |
| sk-ticker-curator | DB 컬럼 강하게 요구 — ADR/특수 케이스(CPNG, BABA) 명시 분류 |
| sk-ui-planner | 무관, 함수만 호출 |

**해결 — 하이브리드 채택 (data-modeler 안 + ticker-curator 보강):**
- `companies.region` 컬럼을 SoT로 추가 (값: `'KR' | 'INTL'`)
- `lib/region.ts`의 `getRegionFromTicker(ticker)`가 마이그레이션·시드·런타임 fallback에서 동일 로직 사용
- 향후 ADR/OTC 수동 오버라이드 가능
- filter-architect가 우려한 "마이그레이션 비용"은 멱등 단일 스크립트로 해소

### 충돌 2 — 값 표기 통일

| 출처 | 값 |
|---|---|
| sk-data-modeler | `'KR' | 'INTL'` (DB 컬럼) |
| sk-filter-architect | `'all' | 'kr' | 'global'` (URL/UI) |
| sk-ui-planner | `'all' | 'kr' | 'global'` (URL/UI) |
| sk-ticker-curator | `KR|US|CN|JP|EU|OTHER` (세분화 제안) |

**해결 — 2층 분리:**
- **DB 컬럼 (`companies.region`)**: `'KR' | 'INTL'` 대문자 2값
- **URL/UI/API 쿼리**: `'all' | 'kr' | 'global'` 소문자 3값
- 매핑:
  - `'all'` → region 필터 미적용
  - `'kr'` → `region = 'KR'`
  - `'global'` → `region = 'INTL'`
- ticker-curator의 세분화(US/CN/JP/EU)는 후속 PR (`subregion` 컬럼)로 연기

### 충돌 3 — `getIndustryFilter` 시그니처 변경 여부

| 에이전트 | 입장 |
|---|---|
| sk-data-modeler | `(industryId, opts?: { region }) => ...` 변경 권장 |
| sk-filter-architect | 시그니처 보존 + `applyRegionFilter` 합성 권장 |

**해결 — filter-architect 안 채택:**
- `getIndustryFilter(industryId)` 시그니처 보존 (단일 책임)
- region은 `lib/region.ts`의 `applyRegionFilter(tickers, region)` 또는 SQL 라우트 내 `WHERE region = ?` 별도 합성
- 이유: 외부 호출이 region 인지 없이도 안전, 라우트별로 합성 시점 자유로움

### 충돌 4 — `categories.regionScope` 컬럼

- data-modeler가 제안 (KR 전용 카테고리 처리)
- ui-planner도 빈 카테고리 숨김 정책 일치
- 다른 에이전트는 무관

**해결 — 채택.** `korea_bio`, `korea_banks` → `regionScope='KR'`로 마킹. 토글 `해외` 선택 시 카테고리 자체 숨김. 그 외는 `'ANY'`.

### 충돌 5 — `sector_companies.rank` CHECK 제약

- ticker-curator가 ≤5 → ≤10 완화 요청 (섹터당 6종 이상 필요한 경우 발생)
- data-modeler 산출물에는 누락

**해결 — 완화 채택.** `migrate-relax-rank-check.ts` 신규 작성. SQLite는 CHECK 변경 시 테이블 재작성이 필요 — 단계적 마이그레이션.

---

## 3. 단계 정의 (구현 순서 SSOT)

| 단계 | 명칭 | 주요 변경 파일 | 입력 | 출력/검증 |
|------|------|---------------|------|----------|
| **S1** | 데이터 모델 — region/regionScope 컬럼 + rank 완화 | `drizzle/schema.ts`, `lib/region.ts`(신규), `scripts/migrate-add-region.ts`(신규), `scripts/migrate-relax-rank-check.ts`(신규), `types/index.ts` | data-model.md §2-§3 | 마이그레이션 2회 실행 동일, `companies.region` 모든 row 채워짐, `categories.region_scope` 백필 완료, rank CHECK ≤10 |
| **S2** | 티커 보완 — 멱등 마이그레이션 | `scripts/migrate-fill-ticker-gaps.ts`(신규), 데이터 인입 스크립트(`scripts/backfill_data.py` 사전 실행) | ticker-gaps.md §4 | INSERT OR IGNORE로 신규 회사·매핑 추가. 시드 영향 0. region 자동 백필 |
| **S3** | 필터 체인 — `applyRegionFilter` + API/Hook 확장 | `lib/region.ts` 확장, `lib/api-helpers.ts`, `lib/validate.ts`, 8개 API 라우트, 8개 hooks | filter-chain.md §3-§5 | 모든 라우트가 `?region=` 수용, queryKey에 region 포함, 캐시 격리 |
| **S4** | UI — RegionToggle 컴포넌트 + 페이지 통합 | `components/region-toggle.tsx`(신규), `hooks/use-region.ts`(신규), `components/ui/empty-region-state.tsx`(신규), 5개 페이지 컨테이너 | ui-plan.md §2-§7 | 헤더에 토글 노출, URL 동기화, 빈 상태 처리, a11y 통과 |
| **S5** | 통합 검증 | (코드 변경 없음) | 위 4단계 산출물 | 빌드/타입/lint 통과, 기존 URL 100% 호환, e2e 시나리오 6가지 통과 |

### 단계별 의존성

```
S1 ──▶ S2 ──▶ S3 ──▶ S4 ──▶ S5
  │           │
  └──▶ S3 (S2 없이도 가능 — 시드 데이터로 검증)
```

S1 완료 후 S2와 S3는 병렬 진행 가능. 하지만 단순화를 위해 직렬로 진행 권장 (단계별 검증 명확성).

---

## 4. 핵심 결정 사항 SSOT

### 4.1 타입 정의 (`lib/region.ts`, `types/index.ts`)

```typescript
// lib/region.ts (신규)

/** DB 컬럼 값 — companies.region */
export type RegionValue = 'KR' | 'INTL'

/** URL/UI/API 쿼리 값 */
export type RegionFilter = 'all' | 'kr' | 'global'

export const REGION_FILTERS: readonly RegionFilter[] = ['all', 'kr', 'global'] as const
export const KR_TICKER_SUFFIXES = ['.KS', '.KQ'] as const

export function getRegionFromTicker(ticker: string): RegionValue {
  return KR_TICKER_SUFFIXES.some((s) => ticker.endsWith(s)) ? 'KR' : 'INTL'
}

export function isKrTicker(ticker: string): boolean {
  return getRegionFromTicker(ticker) === 'KR'
}

export function applyRegionFilter<T extends string>(
  tickers: readonly T[],
  region: RegionFilter
): T[] {
  if (region === 'all') return [...tickers]
  if (region === 'kr') return tickers.filter(isKrTicker)
  return tickers.filter((t) => !isKrTicker(t))
}

export function resolveRegion(searchParams: URLSearchParams): RegionFilter {
  const v = searchParams.get('region')
  if (v === 'kr' || v === 'global' || v === 'all') return v
  return 'all'
}

export function regionFilterToValue(r: RegionFilter): RegionValue | null {
  if (r === 'kr') return 'KR'
  if (r === 'global') return 'INTL'
  return null // 'all' = 필터 없음
}
```

`types/index.ts`에 `Region` (= `RegionFilter`) re-export.

### 4.2 DB 스키마 변경

```typescript
// drizzle/schema.ts

export const companies = sqliteTable('companies', {
  ticker: text('ticker').primaryKey(),
  name: text('name').notNull(),
  nameKo: text('name_ko'),
  logoUrl: text('logo_url'),
  region: text('region').notNull().default('INTL'), // 'KR' | 'INTL'
}, (table) => [
  index('idx_companies_region').on(table.region),
])

export const categories = sqliteTable('categories', {
  // ... 기존 필드
  regionScope: text('region_scope').notNull().default('ANY'), // 'ANY' | 'KR' | 'INTL'
})

// sector_companies.rank CHECK: ≥1 AND ≤10 (기존 ≤5에서 완화)
```

### 4.3 카테고리 region 충돌 처리 매트릭스

| 사용자 토글 | 카테고리 `regionScope` | 동작 |
|---|---|---|
| 전체 | * | 정상 노출 |
| 국내 | `ANY` 또는 `KR` | 노출, ticker는 `region='KR'` 필터 |
| 국내 | `INTL` | 카테고리 자체 숨김 |
| 해외 | `ANY` 또는 `INTL` | 노출, ticker는 `region='INTL'` 필터 |
| 해외 | `KR` | 카테고리 자체 숨김 (`korea_bio`, `korea_banks`) |

### 4.4 페이지별 토글 위치 / 빈 상태 정책

ui-plan.md §3, §5의 결정을 그대로 채택. 핵심:
- 헤더 우측, 기간 필터 옆 — 반응형 표준 패턴 (`flex flex-col sm:flex-row ...`)
- 모바일은 줄바꿈 허용
- 빈 상태:
  - 산업 카드: **숨김**
  - 자금 흐름/통계 카드: **카드 유지 + 안내문**
  - 패권 지도 카테고리: 0개 섹터 시 숨김
  - 섹터 카드: 0개 회사 시 dim
  - 테이블: 0개 시 빈 행 + 안내문

### 4.5 URL 쿼리 규약

- 키: `region`
- 값: `all` (default, URL에서 생략) | `kr` | `global`
- 잘못된 값: `'all'`로 폴백 (관대 파싱)
- `router.replace({ scroll: false })` — 토글이 history 오염하지 않음

---

## 5. 영향 파일 전수

### 신규
- `lib/region.ts`
- `hooks/use-region.ts`
- `components/region-toggle.tsx`
- `components/ui/empty-region-state.tsx`
- `scripts/migrate-add-region.ts`
- `scripts/migrate-relax-rank-check.ts`
- `scripts/migrate-fill-ticker-gaps.ts`

### 수정
- `drizzle/schema.ts` — companies.region, categories.regionScope, sector_companies CHECK
- `types/index.ts` — Region re-export, ResolvedFilter 추가
- `lib/api-helpers.ts` — `resolveIndustryFilter` 시그니처 (region 반환)
- `lib/validate.ts` — `validateRegion`
- `scripts/seed.ts` — 신규 컬럼 + 회사 region 자동 주입
- `scripts/migrate-add-new-industries.ts` — 신규 회사에 region 필드 포함
- API 라우트 8개: `app/api/{map,industries,statistics/{companies,trends,sector-trend,money-flow,money-flow/industries,price-changes}}/route.ts`
- Hooks 8개: `use-{money-flow,industry-money-flow,map-data,price-changes,sector-trend,statistics,industries,sector-companies}.ts`
- 컴포넌트 약 16개 (ui-plan.md §1 매트릭스)

---

## 6. 위험과 완화

| 위험 | 가능성 | 영향 | 완화 |
|------|--------|------|------|
| 운영 DB 마이그레이션 실패 | 낮음 | 높음 | 실행 전 `cp data/*.db data/*.db.bak.$(date +%s)` 의무화. 멱등 스크립트로 부분 재실행 가능 |
| 신규 회사 region 누락 → 'INTL' 디폴트 오분류 | 중 | 중 | 시드/마이그레이션 헬퍼 `buildCompanyRow()` 통일. CI에 region 감사 스크립트(선택) |
| `?region=` 미지정 시 응답이 기존과 다름 | 낮음 | 높음 | E2E 스냅샷 비교 — region 미지정 = 기존과 100% 동일 |
| React Query 캐시 폭증 (3배) | 낮음 | 낮음 | 회사 수 200~400 수준으로 메모리 영향 미미. staleTime 점검 |
| ADR/OTC 분류 사용자 멘탈 모델 차이 (CPNG는 한국 기업이지만 NYSE) | 중 | 낮음 | 1차는 거래소 기준 (해외). `notes` 필드에 사업 본거지 표기. 후속에서 `subregion` 도입 |
| `korea_bio`/`korea_banks` 토글 충돌 | 낮음 | 중 | `regionScope='KR'` 마킹으로 해외 토글 시 숨김 |
| rank ≤5 CHECK 완화 시 기존 코드가 rank=6+를 처리 못 함 | 낮음 | 중 | UI/API에서 rank로 정렬만 사용. 정렬 ASC로 자연 처리 |
| 마이그레이션 다운타임 | 매우 낮음 | 낮음 | better-sqlite3 임베디드 — 다운타임 무관. 단 cron 충돌 시 실행 직전 `node scripts/lock-cron.ts` 권장 |

---

## 7. 수락 기준 (Acceptance)

S5 검증 단계에서 다음을 모두 충족해야 한다:

1. `pnpm exec tsc --noEmit` 통과
2. `pnpm lint` 에러 0
3. `pnpm build` 성공
4. 마이그레이션 3개를 순차 2회 실행 시 두 번째는 변경 0
5. `companies.region` 모든 row 채워짐 (`KR` 또는 `INTL`)
6. `categories.regionScope` 백필 완료 (`korea_bio`, `korea_banks` = `KR`)
7. region=all/kr/global 각각 6개 주요 API 200 응답
8. region=all 응답 = (region=kr) ∪ (region=global) 합집합 일치 (sample 검증)
9. `?region=` 미지정 응답 = 기존 응답 바이트 일치 (스냅샷)
10. 5개 주요 페이지에 토글 노출, URL 동기화, 새로고침 보존
11. `korea_bio` 카테고리는 토글 `해외` 시 숨겨짐
12. 토글이 키보드만으로 조작 가능 (axe-core 통과)
13. 모바일 320px 폭에서 토글 깨지지 않음
14. 신규 티커 약 200종 DB에 존재

---

## 8. 사용자 결정이 필요한 항목

다음 항목은 자동 결정하지 않고 사용자 승인을 받는다:

### Q1. region 컬럼 도입 여부
- **A. 권장 — 하이브리드 (컬럼 + 접미사 fallback)** — 명시적이고 향후 확장(ADR 오버라이드, subregion) 용이
- B. 시나리오 A — 접미사 파생만, DB 마이그레이션 0건 (filter-architect 1차안). 빠르지만 ADR 처리 약함

### Q2. 신규 티커 200종 모두 추가 vs 단계적 추가
- **A. 권장 — 모두 추가 (멱등 INSERT OR IGNORE)** — 한번에 보강
- B. 산업별 단계적 추가 (Tech → Healthcare → ...)

### Q3. rank CHECK 제약
- **A. 권장 — ≤10으로 완화** — 섹터당 6+종 허용 (현실적)
- B. ≤5 유지 — 섹터당 6번째 이후는 별도 테이블/플래그로 처리

### Q4. 산업 대시보드 카드 처리
- **A. 권장 — 빈 region 산업 카드는 숨김** (인지 부하 감소)
- B. 카드 노출 + 비활성 안내 (시야 보존)

### Q5. 사업 본거지 vs 거래소 기준
- **A. 권장 — 거래소 기준** (`CPNG`는 해외, `BABA`는 해외) — 통화/거래시간 일관성
- B. 사업 본거지 기준 (`CPNG`는 국내) — 사용자 직관

---

## 9. 다음 단계

이 문서를 사용자가 검토 후 다음 중 하나를 선택한다:

1. **승인** → `_workspace/01_plan/APPROVED` 마커 생성 → S1부터 구현 시작 (`sk-implementer` 호출)
2. **부분 수정** → 해당 영역 에이전트 재호출 (sk-data-modeler / sk-ticker-curator / sk-filter-architect / sk-ui-planner) → 통합 기획서 갱신 → 재승인
3. **추가 질문** → 메인 또는 sk-orchestrator에게 질의

---

## 부록 A. 4개 산출물 위치
- `_workspace/01_plan/data-model.md` (365줄)
- `_workspace/01_plan/ticker-gaps.md` (942줄)
- `_workspace/01_plan/filter-chain.md` (335줄)
- `_workspace/01_plan/ui-plan.md` (621줄)

## 부록 B. 변경 이력
| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-05-09 | sk-orchestrator | 초안 통합 (4개 산출물 → 1개 통합 기획서) |
