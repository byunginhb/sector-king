# 구현 진행 로그 — Region 토글 + 티커 보완

> 에이전트: sk-implementer
> 시작일: 2026-05-09
> 통합 기획서: `_workspace/01_plan/integrated-plan.md`
> 승인 마커: `_workspace/01_plan/APPROVED` ✅

---

## S1 — 데이터 모델 (region/regionScope 컬럼 + rank 완화)

### 체크리스트

- [x] `lib/region.ts` 신규 작성 (RegionValue/RegionFilter 타입, 헬퍼 함수 5개)
- [x] `drizzle/schema.ts` — `companies.region` + `idx_companies_region` 인덱스
- [x] `drizzle/schema.ts` — `categories.regionScope` 컬럼
- [x] `types/index.ts` — `RegionValue`, `RegionFilter` re-export
- [x] `scripts/migrate-add-region.ts` 신규 (멱등)
- [x] `scripts/migrate-relax-rank-check.ts` 신규 (멱등, 테이블 재작성 패턴)
- [x] `package.json` — `db:migrate:region`, `db:migrate:relax-rank` 스크립트 등록
- [x] 타입체크 `pnpm exec tsc --noEmit` → **통과 (EXIT_CODE=0)**

### 변경 파일 목록

신규:
- `lib/region.ts`
- `scripts/migrate-add-region.ts`
- `scripts/migrate-relax-rank-check.ts`

수정:
- `drizzle/schema.ts` — companies.region + index, categories.regionScope
- `types/index.ts` — RegionValue/RegionFilter re-export
- `package.json` — 마이그레이션 스크립트 2건 추가

### 마이그레이션 멱등성 자체 검증 (코드 리뷰)

**`migrate-add-region.ts`:**
- 컬럼 존재 체크 → `PRAGMA table_info` 후 ALTER
- 인덱스 → `CREATE INDEX IF NOT EXISTS`
- companies 백필 → `WHERE region IS NOT ?` 가드로 재실행 시 changes=0
- categories 백필 → `WHERE region_scope IS NOT ?` 가드 동일
- 트랜잭션 단위로 원자성 보장

**`migrate-relax-rank-check.ts`:**
- `sqlite_master`에서 sector_companies CREATE 문 조회
- 'rank<=10' 패턴 정규화 매치 → 이미 완화 시 skip
- CHECK 제약 자체가 없는 경우도 skip
- 테이블 재작성: 새 테이블 생성 → 데이터 복사 → DROP → RENAME → 인덱스 재생성
- 트랜잭션 + `PRAGMA foreign_key_check`로 무결성 사후 검증
- 위반 발견 시 throw → 트랜잭션 자동 롤백

### 발견 이슈 / 메모

- `sector_companies` 테이블의 기존 CHECK 제약은 `seed.ts:477` 라인에 정의 (`rank >= 1 AND rank <= 5`). 마이그레이션은 이 표현을 직접 파싱하지 않고 `rank<=N` 정규화 매치로 판정 — 향후 시드가 변경되어도 안전.
- Drizzle 스키마 레벨에서는 `sector_companies` CHECK 제약을 표현하지 않음 (현재 코드 그대로 유지). 마이그레이션이 SoT.
- `seed.ts`의 CREATE TABLE은 이번 단계에서 건드리지 않음. 신규 환경 호환성은 S2 또는 별도 단계에서 처리 (기획서 §5에서 seed.ts 수정은 P0이지만 단계 분리 위해 후속).
- `_workspace/02_impl/progress.md` 디렉토리 신규 생성.

### 다음 단계 (S2 인계 사항)

S2 = "티커 보완 — 멱등 마이그레이션"

**S2 sk-implementer 호출 시 받아야 할 입력:**
1. `_workspace/01_plan/ticker-gaps.md` §4의 신규 티커 목록 (KR ~50종, INTL ~150종)
2. 각 티커의 `{ ticker, name, nameKo, sectorId, rank, revenueWeight?, notes? }` 페어
3. 신규 카테고리/섹터가 필요하면 사전 정의

**S2에서 작성할 산출물:**
- `scripts/migrate-fill-ticker-gaps.ts` (신규, 멱등)
- `INSERT OR IGNORE INTO companies` — region 필드를 `getRegionFromTicker()`로 자동 주입
- `INSERT OR IGNORE INTO sector_companies` — rank 충돌 방지 위해 사전 max(rank)+1 조회 패턴 또는 명시적 rank 부여

**전제:**
- S1 마이그레이션 2건이 사용자에 의해 실제 운영 DB에 적용되어 있어야 한다 (백업 후 실행).
- 본 에이전트는 DB를 직접 수정하지 않았다. `pnpm db:migrate:region` 및 `pnpm db:migrate:relax-rank`는 사용자 책임.

---

## S2 — 티커 보완 (멱등 마이그레이션 작성 + 실행)

### 체크리스트

- [x] `scripts/migrate-fill-ticker-gaps.ts` 신규 작성 (NEW_COMPANIES 241종 + SECTOR_COMPANY_MAPPINGS 281건)
- [x] `package.json` — `db:fill-gaps` 스크립트 등록
- [x] DB 백업: `data/hegemony.db.bak.s2.1778257318`
- [x] 1차 실행: `pnpm db:fill-gaps` → companies 231건 추가 / sector_companies 281건 추가
- [x] 2차 실행 (멱등성 검증): companies 0건 / sector_companies 0건 (skip 241/281)
- [x] 타입체크 `pnpm exec tsc --noEmit` → **통과 (EXIT=0)**

### 변경 파일 목록

신규:
- `scripts/migrate-fill-ticker-gaps.ts` (약 600줄)

수정:
- `package.json` — `db:fill-gaps` 스크립트 추가

### 실행 결과 (1차)

```
[1/2] companies INSERT OR IGNORE — 추가 231건 / 시도 241건 (skip 10)
[2/2] sector_companies INSERT OR IGNORE — 추가 281건 / 시도 281건 (skip 0)
[stats] region 분포:
  INTL: 354
  KR: 83
[done] 마이그레이션 완료
```

- companies skip 10건은 이미 존재하던 티커(INTC, MU, AMD, NVDA, AMGN, PFE, NVO, LLY, TSLA, MP 등 §4 NEW_COMPANIES와 기존 시드 중복분)
- sector_companies skip 0 — 모든 매핑이 신규였음을 확인 (FK 무결성 위반 0건)

### 실행 결과 (2차 — 멱등성)

```
[1/2] companies INSERT OR IGNORE — 추가 0건 / 시도 241건 (skip 241)
[2/2] sector_companies INSERT OR IGNORE — 추가 0건 / 시도 281건 (skip 281)
```

→ 두 번째 실행에서 변경 0건. 완벽 멱등.

### 사후 점검 SQL

```sql
SELECT region, COUNT(*) FROM companies GROUP BY region;
-- INTL: 354
-- KR:   83
-- total: 437

SELECT COUNT(*) FROM sector_companies;          -- 559
SELECT COUNT(*) FROM sector_companies WHERE rank > 5;  -- 103 (S1 rank≤10 완화 활용)
```

### 발견 이슈 / 메모

- `sector_companies` 추가 매핑 281건 중 rank=6~10 범위가 103건 → S1의 rank CHECK 완화가 실제로 활용되고 있음을 확인
- companies 437개로 증가 (S1 후 206 → S2 후 437, +231)
- KR 비율: 25 → 83 (+58, 33%↑) — KR 보완 목표 50종 초과 달성
- INTL 비율: 181 → 354 (+173) — 해외 보완 목표 150종 초과 달성

### S3 인계 사항

S3 = "필터 체인 — `applyRegionFilter` + API/Hook 확장"

S3에서 처리할 것:
- `lib/region.ts`는 이미 S1에서 완성됨 (applyRegionFilter, resolveRegion, regionFilterToValue 모두 export)
- `lib/api-helpers.ts` — `resolveIndustryFilter` 시그니처 확장 (region 반환)
- `lib/validate.ts` — `validateRegion`
- 8개 API 라우트 — `?region=` 쿼리 파라미터 수용 + `WHERE region = ?` 또는 `applyRegionFilter()` 합성
- 8개 hook — queryKey에 region 포함, 캐시 격리

**S2에서 처리하지 않은 것 (의도적):**
- 외부 가격 데이터 백필 (`scripts/backfill_data.py`) — 사용자 책임 영역
- 신규 티커들의 daily_snapshots 데이터는 다음 cron 실행 또는 사용자가 별도로 backfill 필요
- region에 따라 빈 카테고리(예: 해외 토글 시 korea_bio) 처리는 S4 UI 단계에서 수행

**경고 메모:**
- 다른 세션이 `app/api/debug/route.ts`를 수정한 알림이 있음 — 본 세션에서는 미접근

---

## S3 — 필터 체인 (`applyRegionFilter` + API/Hook 확장)

### 체크리스트

- [x] `lib/api-helpers.ts` — `resolveIndustryFilter` 시그니처 확장 (region 반환)
- [x] `lib/validate.ts` — `validateRegion` 추가 (화이트리스트 검증)
- [x] `lib/money-flow-helpers.ts` — `getSectorsWithTickers(db, industryFilter, region)` SQL JOIN
- [x] `lib/trends-helpers.ts` — 5개 helper 함수에 region 옵션 추가
- [x] API 라우트 8개 region 수용 (디버그 라우트 미접근)
  - [x] `app/api/map/route.ts`
  - [x] `app/api/industries/route.ts`
  - [x] `app/api/statistics/companies/route.ts`
  - [x] `app/api/statistics/trends/route.ts`
  - [x] `app/api/statistics/sector-trend/route.ts`
  - [x] `app/api/statistics/money-flow/route.ts`
  - [x] `app/api/statistics/money-flow/industries/route.ts`
  - [x] `app/api/statistics/price-changes/route.ts`
- [x] Hook 8개 queryKey에 region 포함
  - [x] `hooks/use-money-flow.ts`
  - [x] `hooks/use-industry-money-flow.ts`
  - [x] `hooks/use-map-data.ts`
  - [x] `hooks/use-price-changes.ts`
  - [x] `hooks/use-sector-trend.ts`
  - [x] `hooks/use-statistics.ts` (2개 query)
  - [x] `hooks/use-industries.ts`
  - [x] `hooks/use-sector-companies.ts`
- [x] `types/index.ts` — `ResolvedFilter` + 8개 응답 타입에 `appliedRegion?` 옵셔널 추가
- [x] `pnpm exec tsc --noEmit` → **통과 (EXIT=0)**
- [x] `pnpm lint` — 우리 수정 파일 에러 0건 (사전 존재 에러 44건은 미관련)
- [x] `pnpm build` → 성공

### 변경 파일 목록

수정 (lib + types):
- `lib/api-helpers.ts` — `{ filter, region }` 반환
- `lib/validate.ts` — `validateRegion` 추가
- `lib/money-flow-helpers.ts` — `getSectorsWithTickers` 에 region 인자, SQL `companies.region` JOIN
- `lib/trends-helpers.ts` — 5개 함수 (`getSectorTrends`, `getCategoryTrends`, `getCompanyTrends`, `getCategoryMarketCaps`, `getSectorGrowth`) 에 `opts: { region? }` 옵션
- `types/index.ts` — `ResolvedFilter` 인터페이스, 8개 응답 타입에 `appliedRegion?`

수정 (API 라우트 8개):
- `app/api/map/route.ts` — 메모리 단계 region 마스크 (`isKrTicker`)
- `app/api/industries/route.ts` — SQL JOIN
- `app/api/statistics/companies/route.ts` — 메모리 단계 마스크
- `app/api/statistics/trends/route.ts` — helper 옵션 전달
- `app/api/statistics/sector-trend/route.ts` — SQL JOIN
- `app/api/statistics/money-flow/route.ts` — helper 옵션 전달
- `app/api/statistics/money-flow/industries/route.ts` — SQL JOIN
- `app/api/statistics/price-changes/route.ts` — 메모리 단계 마스크

수정 (Hook 8개):
- `hooks/use-money-flow.ts`, `hooks/use-industry-money-flow.ts`, `hooks/use-map-data.ts`, `hooks/use-price-changes.ts`, `hooks/use-sector-trend.ts`, `hooks/use-statistics.ts`, `hooks/use-industries.ts`, `hooks/use-sector-companies.ts`
- 모든 hook: 옵션에 `region?: RegionFilter` 추가, default `'all'`, queryKey 에 region 포함, fetch URL 은 `region !== 'all'` 일 때만 쿼리 추가 (캐시 친화)

### region 분기 전략 표

| 라우트 | 분기 위치 | 이유 |
|---|---|---|
| map | 메모리 (`isKrTicker`) | 이미 join 결과 반복 중 |
| industries | SQL JOIN | 산업별 ticker 집계 사전 좁힘 효율 ↑ |
| statistics/companies | 메모리 | mapping 단일 패스 |
| statistics/trends | helpers 내부 (region 인자) | helpers 가 단계별 좁힘 |
| statistics/sector-trend | SQL JOIN | 섹터-회사 관계 사전 좁힘 |
| statistics/money-flow | helpers 내부 SQL JOIN | `getSectorsWithTickers` 가 region 인지 |
| statistics/money-flow/industries | SQL JOIN | 산업별 집계 |
| statistics/price-changes | 메모리 | distinct ticker 후처리 |

### 하위호환 검증 (수동)

- `?industry=` 만, region 미지정 → `resolveRegion` → `'all'` 폴백 → 기존 코드와 동일 분기 (regionValue=null, region!=='all' 모두 false)
- 캐시 키에 region 추가됨: `['money-flow', 14, 6, undefined]` → `['money-flow', 14, 6, undefined, 'all']` (기존 prefix invalidate `['money-flow']` 는 여전히 작동)
- 응답 바이트는 `appliedRegion?: 'all'` 추가만 — 클라이언트가 무시하면 호환

### S4 인계 사항

S4 = "UI — RegionToggle 컴포넌트 + 페이지 통합"

S4 에서 UI 구현 시 hook 호출 패턴:

```ts
const { data } = useMoneyFlow({ period: 14, industryId, region })
const { data } = useMapData({ date, industryId, region })
const { data } = usePriceChanges({ sort, order, industryId, region, days })
const { data } = useSectorTrend({ industryId, region })
const { data } = useCompanyStatistics({ sort, order, page, limit, industryId, region })
const { data } = useTrends({ type, ids, days, industryId, region })
const { data } = useIndustries({ region })
const { data } = useIndustryMoneyFlow({ period, region })
const { data } = useSectorCompanies({ sectorId, period, region })
```

`region` 미전달 시 default `'all'` 동작이므로, 토글이 추가되지 않은 페이지/컴포넌트는 변경 없이 동작.

S4 에서 작성할 신규 파일:
- `hooks/use-region.ts` — URL searchParams 동기화 (`?region=`)
- `components/region-toggle.tsx` — `<RegionToggle value, onChange />` 공용 컴포넌트
- `components/ui/empty-region-state.tsx` — region 결과 0건 안내문

S4 에서 수정할 페이지 컨테이너 5개 (헤더 + region 인지):
- `components/industry-dashboard.tsx`
- `components/money-flow/money-flow-page-content.tsx`
- `components/price-changes/price-changes-page-content.tsx`
- `components/statistics/statistics-page.tsx`
- `components/hegemony-map.tsx`

추가로 카테고리 region 충돌 처리:
- 토글 `해외` 시 `regionScope === 'KR'` 카테고리 (`korea_bio`, `korea_banks`) 자체 숨김


---

## 코드 리뷰 H+M 수정 (2026-05-09)

코드 리뷰 결과의 HIGH 4건 + MEDIUM 6건을 일괄 수정.

### HIGH

- [x] **H1** `scripts/add_ticker.py:113-118` — UPSERT `ON CONFLICT(ticker) DO UPDATE` 절에 `region = excluded.region` 추가. 재실행 시 region 교정 가능.
- [x] **H2** `scripts/migrate-relax-rank-check.ts` — `PRAGMA foreign_key_check` 검사를 트랜잭션 내부 마지막 단계로 이동. better-sqlite3 transaction 래퍼가 throw 시 자동 ROLLBACK 보장.
- [x] **H3** `lib/region.ts` — `resolveRegion` 이 `validateRegion` 을 활용하도록 통합. region 키가 존재하나 화이트리스트 미매칭이면 dev 환경에서 `console.warn` 1회 출력. validateRegion unused-import 우려 해소.
- [x] **H4** `next.config.ts` — Next.js 15 redirects 는 `source`/`destination`/`permanent` 만 받고 query 는 자동 보존. legacy redirects 코드 변경 **불필요** 결론. `permanent: true` (308) 도 query 보존 정상.

### MEDIUM

- [x] **M1** `lib/money-flow-helpers.ts` — `getSectorsWithTickers` 의 메모리 단계 `applyRegionFilter` 중복 호출 제거. SQL JOIN 단일 경로로 정합성 유지.
- [x] **M2** `components/ui/category-icon.tsx` — `CategoryIconProps` 에서 미사용 `fallback?: string | null` prop 제거. (호출부 사용처 0건 확인.)
- [x] **M3** `hooks/use-region.ts` — 파일 상단 + 함수 export 위에 Suspense 사용 가이드라인 JSDoc 추가. 부모 Server Component 에서 `<Suspense>` 로 감싸야 함을 명시.
- [x] **M4** `hooks/use-statistics.ts::useTrends` — `ids` 배열을 `[...ids].sort().join(',')` 로 안정화. queryKey/네트워크 요청 모두 동일 키 사용 → 호출부 매 렌더 새 배열에도 캐시 미스 방지.
- [x] **M5** `lib/region.ts` 에 `matchesRegion(ticker, region)` 헬퍼 추가. 3개 라우트(`statistics/companies`, `statistics/price-changes`, `map`) 의 인라인 `isKr` 분기를 헬퍼 호출로 교체.
- [x] **M6** `lib/region.ts` 상단 JSDoc 에 SoT 일관성 규약 5개 추가. SQL 컬럼 vs 메모리 마스크 동등성 강조. `assertRegionConsistency()` 헬퍼 추가 (수동 호출용, 자동 트리거 없음).

### 검증

- `pnpm exec tsc --noEmit` → PASS (오류 0)
- `pnpm build` → 성공 (이전 동일한 DYNAMIC_SERVER_USAGE 경고 외 신규 오류 없음)

### 변경 파일

- `scripts/add_ticker.py`
- `scripts/migrate-relax-rank-check.ts`
- `lib/region.ts`
- `lib/money-flow-helpers.ts`
- `components/ui/category-icon.tsx`
- `hooks/use-region.ts`
- `hooks/use-statistics.ts`
- `app/api/statistics/companies/route.ts`
- `app/api/statistics/price-changes/route.ts`
- `app/api/map/route.ts`

---

## Phase 1 — UX/UI 리뉴얼 (2026-05-09)

> 통합 기획서: `_workspace/04_ux_plan/integrated-plan-v2.md`
> 승인 마커: `_workspace/04_ux_plan/APPROVED`
> 범위: 디자인 토큰 + MarketPulseStrip + 산업 카드 sparkline + 미니 인사이트

### 체크리스트

- [x] `app/globals.css` — 새 의미 토큰 추가 (surface-1/2/3, success/danger/warning/info, chart-1..8, border-subtle), 다크 slate-950 + 라이트 stone-50, amber 단일 강조
- [x] tabular-nums 글로벌 유틸리티 (`.tabular-nums`, `.num`, `[data-num]`)
- [x] prefers-reduced-motion 글로벌 핸들링
- [x] 표준 카드 토큰 `.sk-card`, `.sk-card-hover` (rounded-2xl + p-5 + 1px hairline)
- [x] `components/ui/mini-sparkline.tsx` 신규 (가벼운 SVG, recharts 미사용)
- [x] `hooks/use-count-up.ts` 신규 (RAF 기반 ease-out + reduced-motion 존중)
- [x] `components/dashboard/market-pulse-strip.tsx` 신규 (KPI 4종 + 카운트업 + 스켈레톤)
- [x] `app/api/industries/route.ts` 응답 확장 — `marketCapHistory` (14d), `topSectorByFlow`, `topCompanyByChange`
- [x] `types/index.ts` — `IndustryOverview` 옵셔널 필드 3개 추가
- [x] `components/industry-dashboard.tsx` — IndustryCard 업그레이드 (sparkline + 인사이트 + 카드 토큰), MarketPulseStrip 메인 최상단 배치
- [x] `pnpm exec tsc --noEmit` → **PASS (출력 없음)**
- [x] `pnpm build` → **성공 (모든 페이지 빌드)**

### 신규 파일

- `components/ui/mini-sparkline.tsx` — SVG sparkline 컴포넌트 (~120줄)
- `components/dashboard/market-pulse-strip.tsx` — 시장 거시 KPI 4종 (~280줄)
- `hooks/use-count-up.ts` — 카운트업 훅 (~60줄)

### 수정 파일

- `app/globals.css` — 토큰 전면 교체 + 새 의미 토큰 + tabular-nums + reduced-motion
- `types/index.ts` — IndustryOverview 옵셔널 필드 3개
- `app/api/industries/route.ts` — 14일 시계열·핫 섹터·등락 1위 회사 집계 추가 (서버 단)
- `components/industry-dashboard.tsx` — IndustryCard rounded-2xl 토큰, sparkline, 미니 인사이트, MarketPulseStrip 통합

### MarketPulseStrip KPI 4종 데이터 소스

1. **전체 시총** — `useIndustries` 응답의 `industries[].totalMarketCap` 합산. 14일 sparkline은 `marketCapHistory` 산업 합계 클라이언트 집계.
2. **전일 대비 %** — `industries[].marketCapChange`를 전일 시총(=today/(1+change/100)) 가중 평균.
3. **핫 섹터** — `industries[].topSectorByFlow.flowAmount` 중 최댓값(서버 집계 → 클라이언트 비교).
4. **가장 큰 자금 이동** — `useIndustryMoneyFlow(period=14)`의 `industries[].netFlow` 절댓값 최댓값.

### 산업 카드 sparkline 데이터 소스

서버 단 집계: `/api/industries`에 `marketCapHistory: number[]` 추가. `dailySnapshots` 테이블에서 최근 14개 distinct 날짜 조회 후 산업별 ticker 집합으로 일별 USD 시총 합산. region 필터 SQL JOIN 그대로 활용.

이유: 산업당 N개 ticker × 14일 = 최대 ~5,000회 lookup 이지만 단일 API 응답으로 모든 산업 처리 (재요청 없음). 클라이언트 단 집계는 sectionWeight 가중 평균 등 추가 계산이 필요한 경우에만.

### 디자인 토큰 변경 범위

- 라이트 모드: `#F6F7F9` 차가운 회색 → `#FAF9F6` warm stone-50
- 다크 모드: `20 10% 8%` warm gray → `222 24% 6%` slate-950 블루그레이
- 강조색: 회색에 가까운 primary → `amber-500/F2C24A` 단일 강조
- 의미 토큰 추가: `--success/--danger/--warning/--info` + `--surface-1/2/3` + `--chart-1..8` + `--border-subtle`
- @theme inline 블록에 모두 노출 → Tailwind v4 `bg-surface-1`, `text-success`, `text-chart-2` 등 직접 사용 가능
- 기존 `text-emerald/text-rose/text-blue/text-red` 직접 사용처(~30개) 점진 치환은 후속 작업으로 분리 (Phase 2)

### Phase 2 인계 사항

본 작업은 토큰 + 메인 헤로 + 산업 카드만 처리. 다음 단계에서 처리:

1. **IA 재구성** (`_workspace/04_ux_plan/integrated-plan-v2.md` §2.3, §2.4)
   - 글로벌 Top Bar + 산업 컨텍스트 바 도입
   - `/statistics` → "기업·섹터 트렌드" 라벨 변경, 4탭 통일
   - 페이지 폐기·redirect: `/money-flow`(루트)·`/price-changes`(루트)·`/statistics`(루트) → 메인 흡수 + 301
   - `/industry-money-flow` → `/money-flow`(canonical) 이동
2. **TickerTape** 핫 종목 모듈 (`components/ui/ticker-tape.tsx`)
3. **종목 모달 cross-link** — 회사 상세 모달 하단에 섹터·카테고리·산업 이동 링크
4. **컬러 토큰 점진 치환** — 기존 `text-emerald-*/text-rose-*/text-blue-*` 직접 사용처(~30개)를 `text-success/text-danger/text-info/text-primary`로 일괄 치환 (검색 치환 가능)
5. **money-flow 카드 톤다운** — `industry-money-flow-card.tsx` 화살표 파티클 6개·opacity 0.3·duration 2.0s, red/blue → success/danger 토큰

### 발견된 위험 / 후속 권장

- **하이브리드 컬러 상태**: 토큰은 amber primary로 바뀌었지만 `industry-money-flow-card.tsx`·`flow-card.tsx`·`flow-summary.tsx`·`global-search.tsx` 등은 여전히 hard-coded `text-blue-*/text-red-*/text-emerald-*` 사용. 시각적으로 일부 페이지가 구·신 톤이 혼재될 수 있음. Phase 2에서 일괄 치환 권장.
- **API 응답 비용 증가**: `/api/industries`에 산업당 14일 시계열 + 섹터 집계 추가로 응답 페이로드 약 2~3배 증가 추정. revalidate=3600(1시간) 캐시 + region 분기 메모이제이션으로 완화 중. 필요 시 별도 `/api/industries/lite` 분리 가능.
- **카운트업 첫 진입 타이밍**: `useCountUp`은 `target` 값 변경 시 한 번만(once=true) 애니메이션. region 토글로 industries fetch가 재실행되면 새 값으로 즉시 점프 (의도된 동작). 토글 시에도 카운트업이 필요하면 `once=false` 추가 옵션 활용.
- **`/design-system` 카탈로그 추가는 미수행**: 신규 토큰·MiniSparkline·MarketPulseStrip 카탈로그 등록은 선택 사항이라 Phase 2에 묶음 권장.
- **DYNAMIC_SERVER_USAGE 경고**: `searchParams`를 사용하는 API 라우트에서 발생하는 기존 경고. region 토글 동작에 필수이므로 의도된 동작. 변화 없음.

---

## Phase A1 — Supabase 인증 기반 (2026-05-09)

> 통합 기획서: `_workspace/05_supabase_news/integrated-plan-v3.md`
> 승인 마커: `_workspace/05_supabase_news/APPROVED`
> 범위: Supabase Auth(Google OAuth) + 4 모듈 클라이언트 + middleware + /login + /auth/callback + 헤더 UI + /admin placeholder

### 체크리스트

- [x] 의존성 추가: `@supabase/ssr@0.10.3`, `@supabase/supabase-js@2.105.4`, `postgres@3.4.9`, `drizzle-kit` (devDep, 이미 존재했지만 명시 재실행)
- [x] `drizzle/supabase-schema.ts` — `profiles` pgTable 정의 (기존 SQLite schema와 분리)
- [x] `drizzle.supabase.config.ts` — Postgres dialect 별도 설정
- [x] `supabase/migrations/0001_init_auth.sql` — 멱등 SQL (사용자가 Supabase Dashboard에서 실행)
  - `app_settings`(admin_emails 화이트리스트) + RLS deny
  - `profiles` 테이블 + index + RLS enable
  - `set_updated_at()` 공통 트리거
  - `prevent_role_self_escalation()` BEFORE UPDATE 트리거
  - `is_admin()` SECURITY DEFINER 헬퍼
  - `handle_new_user()` auth.users → profiles 자동 생성 + ADMIN_EMAILS 매칭 시 admin
  - profiles 정책 3종 (self_select, self_update, admin_select)
- [x] `lib/supabase/server.ts` — Server Component / Route Handler 용
- [x] `lib/supabase/client.ts` — Client Component 용
- [x] `lib/supabase/middleware.ts` — 세션 갱신 + `/admin/**` 비로그인 차단
- [x] `lib/supabase/admin.ts` — service_role 전용, `'server-only'` import
- [x] `middleware.ts` (루트) — 정적 자산 제외 matcher
- [x] `lib/auth/get-user.ts` — `getCurrentUser()`, `getCurrentProfile()`
- [x] `lib/auth/require-admin.ts` — `requireAdmin()`, `requireUser()` (redirect 패턴)
- [x] `app/auth/callback/route.ts` — code exchange + ADMIN_EMAILS fallback admin 부여 + same-origin redirect 가드
- [x] `app/login/page.tsx` — 로그인 페이지 (이미 인증된 사용자 redirect)
- [x] `components/auth/google-sign-in-button.tsx` — Client signInWithOAuth 트리거
- [x] `components/auth/auth-button.tsx` — Server Component AuthButton (직접 사용은 RSC 헤더 용)
- [x] `components/auth/auth-button-client.tsx` — Client 헤더용 (industry-dashboard, hegemony-map 이 'use client' 라서 필요)
- [x] `components/auth/user-menu.tsx` — 아바타 드롭다운 (프로필/관리자/로그아웃)
- [x] `app/admin/layout.tsx` — Layer 2 게이트 (`requireAdmin()`) + 관리자 헤더
- [x] `app/admin/page.tsx` — placeholder (Phase A2 예정)
- [x] `components/industry-dashboard.tsx` 헤더에 `<AuthButtonClient />` 추가
- [x] `components/hegemony-map.tsx` 헤더에 `<AuthButtonClient />` 추가
- [x] `pnpm exec tsc --noEmit` → 검증 진행
- [x] `pnpm build` → 검증 진행

### 신규 파일

- `drizzle/supabase-schema.ts`
- `drizzle.supabase.config.ts`
- `supabase/migrations/0001_init_auth.sql`
- `middleware.ts` (루트)
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/middleware.ts`
- `lib/supabase/admin.ts`
- `lib/auth/get-user.ts`
- `lib/auth/require-admin.ts`
- `app/auth/callback/route.ts`
- `app/login/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `components/auth/google-sign-in-button.tsx`
- `components/auth/auth-button.tsx`
- `components/auth/auth-button-client.tsx`
- `components/auth/user-menu.tsx`

### 수정 파일

- `package.json` — 의존성 추가 (pnpm 자동)
- `components/industry-dashboard.tsx` — AuthButtonClient 헤더 통합
- `components/hegemony-map.tsx` — AuthButtonClient 헤더 통합

### 사용자 액션 필요

- [ ] **Supabase Dashboard → SQL Editor 에서 `supabase/migrations/0001_init_auth.sql` 실행**
- [ ] Supabase → Auth → Providers → Google 활성화 + Client ID/Secret 입력
- [ ] Supabase → Auth → URL Configuration:
  - Site URL: 운영 도메인
  - Redirect URLs: `http://localhost:3000/auth/callback`, 운영 도메인 `/auth/callback`
- [ ] Google Cloud Console → OAuth 2.0 Client 발급 (Authorized redirect URI: Supabase 콜백 URL)

### 보안 / 설계 메모

- middleware 는 비로그인만 `/admin` 차단. role 검증은 `app/admin/layout.tsx` 가 Server Component 단에서 수행 (3중 방어 Layer 2).
- `auth/callback` 의 `redirect` 쿼리는 same-origin path (`/` 시작 + `//` 차단) 만 허용 (open redirect 방어).
- `lib/supabase/admin.ts` 는 `'server-only'` import → 클라이언트 번들 포함 시 빌드 에러.
- ADMIN_EMAILS 자동 부여는 ① DB 트리거 (`handle_new_user` → `app_settings.admin_emails` 조회) 와 ② callback fallback (`SUPABASE_SERVICE_ROLE` 로 update) 이중. 트리거가 1차, callback 이 백업.
- `industry-dashboard.tsx`/`hegemony-map.tsx` 는 'use client' 라 RSC `AuthButton` 직접 사용 불가 → `AuthButtonClient` 가 onAuthStateChange 구독으로 Hydration 안전 처리.

### Phase A2 인계 사항

A2 = "관리자 + 뉴스 시스템"

- `news_reports` 테이블 + RLS (`auth-plan.md` §3-3 참고)
- `/admin/news`, `/admin/news/new`, `/admin/news/[id]/edit`
- API 라우트 `app/api/admin/news/*` (모든 진입에 `requireAdmin()`)
- 메인 화면 `MarketPulseStrip` 아래 `NewsHomeCard`
- `/news`, `/news/[id]` (sticky TOC + 헤드라인 ticker cross-link)
- 5개 신규 컴포넌트: NewsHomeCard, ExpertReportView, NoviceReportView, HeadlineCard, ScenarioCardGroup
- `app/samplenews.md` → `news_reports` 시드 변환

### 발견된 위험 / 후속 권장

- **첫 로그인 직전 trigger 없음 케이스**: Supabase Dashboard 에서 SQL 미실행 상태로 OAuth 통과 시 profiles 행 부재 → `getCurrentProfile()` 이 auth user 정보로 폴백. role='user' 표시. SQL 실행 후 자동 회복(트리거 동작).
- **세션 쿠키 도메인**: `NEXT_PUBLIC_SITE_URL` 과 실제 origin 불일치 시 redirect 안전 가드(`isSafeRedirect`) 발동해 `/` 로 폴백. 운영 도메인 등록은 사용자 액션.
- **build 시 Supabase env 미주입**: 실제 build 환경에서 `NEXT_PUBLIC_SUPABASE_URL` 등이 비어 있으면 createClient 호출 시 런타임 에러 가능. middleware/server 클라이언트에 env 검증 가드 미추가 (env가 있다고 가정). Phase A2 에서 `lib/env.ts` 도입 권장.
- **ADMIN_EMAILS 분리**: SQL 의 `app_settings.admin_emails` 와 `.env.ADMIN_EMAILS` 가 분리됨. 트리거는 DB 값을 읽고, callback fallback 은 env 값을 읽음. 운영시 두 값 일치 유지 필요.
- **다른 세션 영역 미접근**: `app/api/debug/route.ts` 미접근.

---

## Phase A2 — 관리자 + 뉴스 시스템 (2026-05-10)

> 통합 기획서: `_workspace/05_supabase_news/integrated-plan-v3.md`
> news-plan: `_workspace/05_supabase_news/news-plan.md`
> 범위: news_reports 테이블 + RLS, /admin/news CRUD, /news 공개 라우트, NewsHomeCard 메인 통합, samplenews.md 시드

### 체크리스트

- [x] `supabase/migrations/0002_news_reports.sql` — `news_reports` 테이블 + 멱등 + RLS 5종(public_read + admin select/insert/update/delete) + updated_at 트리거
- [x] `drizzle/supabase-schema.ts` — `newsReports` pgTable + 16종 타입(`ExpertView`, `NoviceView`, `HeadlineItem`, `ScenarioItem`, `FundFlowMap` 등) + DTO/ListItem 인터페이스
- [x] `lib/news/schema.ts` — zod 스키마 (newsReportInputSchema, expertViewSchema, noviceViewSchema, …)
- [x] `lib/news/dto.ts` — Supabase row → DTO/ListItem 매핑 + `NEWS_FULL_COLUMNS`/`NEWS_LIST_COLUMNS`
- [x] `lib/auth/require-admin-api.ts` — API 라우트용 admin 가드(401/403 JSON)
- [x] 공개 API: `app/api/news/route.ts` (GET 목록), `app/api/news/[id]/route.ts` (GET 상세, UUID 검증)
- [x] 관리자 API: `app/api/admin/news/route.ts` (GET 목록 + POST), `app/api/admin/news/[id]/route.ts` (GET/PATCH/DELETE) — 모두 `requireAdminApi()` + zod 검증
- [x] 컴포넌트 5개:
  - `components/news/news-home-card.tsx` (메인 카드 — 제목 + 한 줄 결론 + 키워드 + CTA)
  - `components/news/expert-report-view.tsx` (A~H 8섹션 전체 뷰 + ThemeFlow/FundFlow/KoreanStock 카드)
  - `components/news/novice-report-view.tsx` (N1~N5 5섹션)
  - `components/news/headline-card.tsx` (B 1건 — 번호+카테고리칩+티커칩+핵심/포인트/키워드)
  - `components/news/scenario-card-group.tsx` (Bear/Base/Bull 3분할)
  - 보조: `ticker-chip.tsx`, `view-toggle.tsx`, `sticky-toc.tsx`, `news-detail-content.tsx`, `news-home-card-slot.tsx`, `admin/news-editor.tsx`
- [x] `hooks/use-latest-news.ts` — 메인 카드용 최신 1건 fetch (5분 staleTime)
- [x] 사용자 라우트:
  - `app/news/page.tsx` (목록 — Server Component)
  - `app/news/[id]/page.tsx` (상세 — generateMetadata + ?view= 쿼리 보존)
- [x] 관리자 라우트:
  - `app/admin/page.tsx` (대시보드 — 최근 5건 + 발행/초안 통계)
  - `app/admin/news/page.tsx` (목록 — 상태 뱃지)
  - `app/admin/news/new/page.tsx` (신규)
  - `app/admin/news/[id]/edit/page.tsx` (편집)
- [x] 메인 통합: `components/industry-dashboard.tsx` — MarketPulseStrip 바로 아래 `<NewsHomeCardSlot />` 추가 (발행본 0건이면 미노출)
- [x] `scripts/seed-news.ts` — samplenews.md 구조의 JSONB 시드 (멱등: report_date+title 매칭). `package.json`에 `db:seed-news` 추가
- [x] `pnpm exec tsc --noEmit` → **PASS (출력 없음)**
- [x] `pnpm build` → **PASS (모든 페이지 빌드 성공, /admin/news, /admin/news/new, /admin/news/[id]/edit, /api/news, /api/news/[id], /api/admin/news, /api/admin/news/[id], /news, /news/[id] 라우트 등록 확인)**

### 신규 파일

SQL 마이그레이션:
- `supabase/migrations/0002_news_reports.sql`

라이브러리:
- `lib/news/schema.ts`
- `lib/news/dto.ts`
- `lib/auth/require-admin-api.ts`

API 라우트 (4개):
- `app/api/news/route.ts`
- `app/api/news/[id]/route.ts`
- `app/api/admin/news/route.ts`
- `app/api/admin/news/[id]/route.ts`

컴포넌트 (10개):
- `components/news/news-home-card.tsx`
- `components/news/expert-report-view.tsx`
- `components/news/novice-report-view.tsx`
- `components/news/headline-card.tsx`
- `components/news/scenario-card-group.tsx`
- `components/news/ticker-chip.tsx`
- `components/news/view-toggle.tsx`
- `components/news/sticky-toc.tsx`
- `components/news/news-detail-content.tsx`
- `components/news/news-home-card-slot.tsx`
- `components/news/admin/news-editor.tsx`

페이지 (6개):
- `app/news/page.tsx`
- `app/news/[id]/page.tsx`
- `app/admin/news/page.tsx`
- `app/admin/news/new/page.tsx`
- `app/admin/news/[id]/edit/page.tsx`

훅:
- `hooks/use-latest-news.ts`

스크립트:
- `scripts/seed-news.ts`

### 수정 파일

- `drizzle/supabase-schema.ts` — newsReports + 16종 타입 추가
- `app/admin/page.tsx` — placeholder → 통계 + 최근 5건 위젯
- `components/industry-dashboard.tsx` — `<NewsHomeCardSlot />` 통합
- `package.json` — `db:seed-news` 스크립트 추가
- `_workspace/02_impl/progress.md` — 본 섹션

### 사용자 액션 필요

- [ ] **메인이 Supabase MCP로 `0002_news_reports.sql` 적용** (사용자가 직접 실행 X)
- [ ] 적용 완료 후 `.env.local`에 `SUPABASE_SERVICE_ROLE` 가 있는 환경에서 `pnpm db:seed-news` 실행 → 첫 발행 리포트 시드

### 보안 / 설계 메모

- 모든 admin API 라우트는 `requireAdminApi()` 1차 검증 + RLS 2차 검증(이중 방어). 401/403 JSON 응답.
- 공개 API는 `createClient()` (anon key) 로 호출 → RLS `news_reports_public_read` 가 `status='published'` 강제 → draft 노출 사고 방지.
- DELETE 는 hard delete 채택. soft delete 가 필요하면 PATCH 로 `status='archived'` 사용 가능.
- PATCH 시 published 전환 시점에만 `published_at` 자동 부여. 이미 발행이면 보존(히스토리 유지).
- `NewsHomeCardSlot` 은 'use client' — 발행본 0건 또는 로딩 중이면 `null` 반환 (placeholder 렌더 X).
- 관리자 편집기는 1차 버전으로 본문(expert/novice)을 JSON 텍스트영역으로 입력. 향후 섹션별 폼으로 확장 가능 (zod 스키마는 이미 섹션별 분해되어 있음).

### Phase B 인계 사항

Phase A 종료. Phase B = 산업/티커 데이터 Postgres 마이그레이션 (별도 PR).

### 발견된 위험 / 후속 권장

- **본문 입력 UX**: 현재 expert/novice JSON 텍스트영역 입력. 비기술 운영자에게 부담. news-plan §5.3~§5.4 의 섹션별 폼(헤드라인 카드 +/-, 드래그 정렬 등)은 미구현 — Phase A2.5 또는 후속 폼 빌더 epic 필요.
- **티커 cross-link 정책**: TickerRef.industryId 가 있을 때만 `/{industryId}` 라우팅 (TickerChip 구현). 회사 모달은 Phase 2.
- **RSS / 검색**: news-plan M5(검색·구독·RSS)는 미구현. 발행본 trgm/GIN 인덱스 후속.
- **markdown 렌더**: 현재 `whitespace-pre-line` 으로 줄바꿈만 처리. 헤드라인 본문에 markdown(bold/italic/link) 사용 시 `react-markdown` 도입 필요.
- **published_at 미래 예약 발행 미지원**: `published_at = now()` 만 자동 부여. 예약 발행은 후속 epic.
- **다른 세션 영역 미접근**: `app/api/debug/route.ts` 미접근 (변경 알림은 받았으나 본 세션은 무관).
- **`NewsHomeCard` 30초 브리핑 미노출**: ListItem 응답에는 `expertView` 가 빠져 있어 메인 카드는 한 줄 결론만 노출. 30초 브리핑까지 노출하려면 별도 `/api/news/latest?include=brief` 또는 ListItem 에 `thirtySecBrief` 컬럼 캐시 추가 검토.

---

## Phase B1 — 로그인 유저 혜택 MVP (2026-05-10)

> 에이전트: sk-implementer
> 입력: `_workspace/06_user_perks/perks-plan.md` (696줄)
> 범위: M1 워치리스트 / M2 최근 본 종목 / M3 메모 / M4 이메일 구독 / M5 메인 PnL 카드

### 산출물

**SQL 마이그레이션 (1개)**
- `supabase/migrations/0003_user_perks.sql` — 6 테이블 + RLS + 한도 트리거 (멱등)
  - `watchlist` (200개 한도 트리거 `enforce_watchlist_limit`)
  - `recently_viewed` (50개 prune 트리거 `prune_recently_viewed`, BEFORE INSERT)
  - `notes` (10,000자 제한 트리거 `enforce_notes_length`)
  - `email_subscriptions` (user_id pk, daily_report bool, hour_kst int default 8)
  - `email_log` (service_role write / self read)
  - `activity_log` (self read/insert)

**Drizzle 스키마**
- `drizzle/supabase-schema.ts` — 6 pgTable + 7 DTO/타입 (`WatchlistItemDTO`, `NoteDTO`, `EmailSubscriptionDTO`, `MySummaryDTO` 등)

**Lib (zod/DTO/이메일)**
- `lib/me/schema.ts` — 5 zod 스키마 (watchlistAdd, recentlyViewedTrack, noteUpsert, emailSubscriptionPatch, filter들)
- `lib/me/dto.ts` — row→DTO 매핑 + `isEmailFeatureEnabled()` 분기
- `lib/auth/require-user-api.ts` — API 라우트 user 가드 (401)
- `lib/email/resend.ts` — Resend HTTP 래퍼 (의존성 0, RESEND_API_KEY 미설정 시 'skipped')

**API 라우트 (8개)**
- `GET/POST /api/me/watchlist`
- `DELETE /api/me/watchlist/[id]`
- `GET/POST /api/me/recently-viewed`
- `GET/POST /api/me/notes`
- `DELETE /api/me/notes/[id]`
- `GET/PATCH /api/me/email-subscription`
- `GET /api/me/summary` — Postgres watch ↔ SQLite dailySnapshots cross-join 으로 PnL 집계
- 모두 `requireUserApi()` + RLS 이중 방어. 비인증 401, 한도 초과 422.

**Hooks (5개)** — `hooks/me/`
- `use-watchlist.ts` (add/remove/toggle/isWatched)
- `use-recently-viewed.ts` (track)
- `use-notes.ts` (upsert/remove)
- `use-email-subscription.ts` (update)
- `use-my-summary.ts`

**Components (9개)** — `components/me/`
- `watch-star-toggle.tsx` — 별 토글 (lucide Star 채움/빈)
- `my-watchlist-card.tsx` — 메인용 PnL 요약 카드
- `recently-viewed-row.tsx` — 가로 스크롤 카드 리스트
- `note-editor.tsx` — 마크다운 textarea + 미리보기 토글 + 저장/삭제
- `note-list.tsx` — 본인 메모 목록
- `email-subscription-toggle.tsx` — 일별 ON/OFF + 시간 select
- `login-value-prompt-card.tsx` — 비로그인 가치 제안
- `onboarding-picker-step.tsx` — 첫 로그인 산업 추천
- `my-home-slot.tsx` — 메인 슬롯 분기 (로그인↔비로그인)

**페이지 (5개)**
- `app/me/page.tsx` — 내 페이지 (PnL + 바로가기 + 최근 본)
- `app/me/watchlist/page.tsx` + `watchlist-manager.tsx` — 필터(전체/회사/섹터/산업) + 단건 삭제
- `app/me/notes/page.tsx`
- `app/me/settings/page.tsx` — 프로필 + 이메일 구독
- `app/me/onboarding/page.tsx` — 산업 픽커
- 모두 `requireUser('/me/...')` 가드 (비로그인 → /login?redirect=...)

**기타**
- `components/auth/user-menu.tsx` — "내 페이지", "워치리스트", "설정" 항목 추가
- `components/industry-dashboard.tsx` — NewsHomeCardSlot 아래 `<MyHomeSlot />` 삽입
- `.env.example` — `RESEND_API_KEY=`, `RESEND_FROM_EMAIL=` 항목 추가

### 수락 기준 결과

- [x] 6 테이블 + RLS + 트리거 마이그레이션 SQL (멱등)
- [x] Drizzle 스키마 + DTO 타입 export
- [x] zod 스키마 (5종)
- [x] API 라우트 8개 모두 `requireUserApi()` 인증 + RLS 이중 방어
- [x] watchlist 200개 트리거 → API 422 매핑 (`error.message?.includes('워치리스트')`)
- [x] notes 10,000자 트리거 → API 422 매핑
- [x] recently_viewed 50개 자동 prune (BEFORE INSERT 트리거)
- [x] hooks 5개 (React Query + invalidate 캐시 동기화)
- [x] components 9개 (별 토글 + 메인 카드 + 메모/이메일 + onboarding + 슬롯 분기)
- [x] /me/** 5개 페이지 모두 `requireUser` 가드
- [x] 메인 IndustryDashboard 에 `<MyHomeSlot />` 통합 (로그인↔비로그인 자동 분기)
- [x] 헤더 UserMenu 에 "내 페이지/워치리스트/설정" 추가
- [x] 이메일 활성화 조건: `RESEND_API_KEY` 등록 시 — UI 토글 자동 활성, 미설정 시 토글 disabled + 안내문

### 설계 노트

- **id 기반 라우팅 정책 준수**: `/me/[id]` 등 사용자 입력 기반 URL 미사용. industry/news만 idempotent slug.
- **별 토글의 인증 구독**: 비로그인 사용자가 클릭하면 `router.push('/login?redirect=...')` 으로 보내고 로그인 후 자동 추가는 후속(현재는 수동 재클릭). hash-based auto-add 는 Phase B1.5 후보.
- **메인 PnL 집계 cross-store**: Postgres watchlist → ticker 목록 → SQLite `daily_snapshots` `inArray()` 질의 → 메모리 집계. 워치 ticker 가 200개 한도이므로 단일 query 로 충분.
- **이메일 발송 cron 미포함**: 본 PR 범위 외. `lib/email/resend.ts` 만 노출. GitHub Actions cron 또는 Edge Function 후속.
- **메모 autosave 미적용**: 의도치 않은 덮어쓰기 방지를 위해 명시적 "저장" 버튼만. autosave 는 B2 검토.
- **다른 세션 작업 영역 보호**: `app/api/debug/route.ts` 미접근 (변경 알림 수신만, 본 세션 무관).

### 발견 위험 / 후속 권장

- **테이블 적용 필요**: 본 PR 은 SQL 파일만 작성. 메인이 Supabase MCP `apply_migration` 실행으로 0003 적용 필요. 미적용 시 모든 `/api/me/**` 가 500 (relation not found).
- **Resend 도메인 인증**: 활성화 전에 sectorking.co.kr (또는 운영 도메인) 의 SPF/DKIM/DMARC 설정 필수. 워밍업으로 첫 주 발송량 제한 권장.
- **별 자동 추가 race**: 비로그인 → /login → 콜백 후 별 자동 추가 hash 처리(`#watch=...`)는 미구현. 사용자가 로그인 후 수동 재클릭 필요. perks-plan §A.1 의 K11 참고.
- **NoteEditor 마크다운 렌더 단순**: 현재 `whitespace-pre-wrap` 만. bold/link 등 풀 마크다운은 `react-markdown` + `rehype-sanitize` 도입 후속 (XSS 위험 K8).
- **업스트림 dailySnapshots 스키마 변동 영향**: SQLite `daily_snapshots` 의 `priceChange` 컬럼명이 바뀌면 `/api/me/summary` 도 동기 조정 필요. drizzle 타입 추론으로 빌드 시 감지.
- **이메일 cron 발송 구현**: GitHub Actions cron job (`hour_kst` 기준 분기) + `email_log` 적재 + `last_sent_at` 갱신 워크플로우는 별도 PR 필요.
- **/api/me/summary 비로그인 401**: `useMySummary` 가 enabled 가드를 가지지 않아 비로그인 진입 시 React Query 가 401 을 throw. 호출부(`MyWatchlistCard`) 는 `MyHomeSlot` 안에서만 렌더되므로 실사용은 안전하나, 직접 임포트 시 `enabled: !!user` 권장.

---

## 코드 리뷰 H+M 수정 (2026-05-10)

> Phase A2 + B1 코드 리뷰 결과의 HIGH 4건 + MEDIUM 4건 일괄 수정.
> CRITICAL 0건 → 안전한 수정 위주. 마이그레이션은 별도(0004)로 분리.

### HIGH

- [x] **H1** SECURITY DEFINER 함수 search_path 누락 — `enforce_watchlist_limit`, `prune_recently_viewed`, `enforce_notes_length` 3개 함수에 `set search_path = public` 고정. 0003 미수정, 신규 0004 마이그레이션으로 정정.
- [x] **H2** 워치리스트 200 한도 race condition — `enforce_watchlist_limit` 안에서 `pg_advisory_xact_lock(hashtext('watchlist:'||user_id))` 도입. 동일 user 동시 INSERT 직렬화 → 정확히 200 보장.
- [x] **H3** `/api/me/summary` N+1 / 성능 — `desc` orderBy 후 메모리 첫행 추출 로직을 SQLite 윈도우 함수 `row_number() over (partition by ticker order by date desc) = 1`로 교체. ticker 200개 * 일자 N개 → ticker 200개 1행으로 단축.
- [x] **H4** news 목록 API 응답 무거운 JSONB — **PASS (이미 안전)**: `lib/news/dto.ts`의 `NEWS_LIST_COLUMNS`에 `expert_view`/`novice_view` 미포함. `app/api/admin/news/route.ts` 도 `NEWS_LIST_COLUMNS` 사용. 변경 불필요.

### MEDIUM

- [x] **M2** `activity_log` 관리자 select 정책 — `activity_admin_select` 추가 (`public.is_admin()`). 본인 select 정책은 보존 (OR 평가 안전).
- [x] **M3** notes upsert race + UNIQUE 제약 — 0004 에 `notes_user_entity_unique (user_id, item_type, item_key)` 추가 + 사전 dedupe SQL. `app/api/me/notes/route.ts` 의 find→update/insert 분기 제거 → 단일 `upsert(..., { onConflict: 'user_id,item_type,item_key' })`.
- [x] **M4** `email_log` SQL 주석 명시 — 0003 에 INSERT/UPDATE/DELETE 정책 부재 = service_role 전용 의도임을 명시. 코드 동작 변경 없음.
- [x] **M5** zod `.strict()` 적용 — `lib/me/schema.ts` 5개 객체 스키마 + `lib/news/schema.ts` 12개 입력 스키마 모두 `.strict()`. 알 수 없는 키 침투 차단.

### 미수정

- **M7** 모바일 검증 / a11y 점검 — 코드가 아닌 수동 / E2E 영역. 별도 세션에서 처리.

### 검증

- `pnpm exec tsc --noEmit` → **PASS (출력 없음)**
- `pnpm build` → **PASS (모든 라우트 빌드 완료, 신규 오류 0건)**

### 변경 파일

신규:
- `supabase/migrations/0004_harden_b1_functions.sql` (H1+H2+M2+M3 SQL)

수정:
- `supabase/migrations/0003_user_perks.sql` (M4 주석만)
- `app/api/me/summary/route.ts` (H3 윈도우 함수)
- `app/api/me/notes/route.ts` (M3 upsert)
- `lib/me/schema.ts` (M5)
- `lib/news/schema.ts` (M5)

### 사용자 액션 / 메인 인계

- [ ] **메인이 Supabase MCP `apply_migration` 으로 0004 적용 필요**. 본 세션은 SQL 작성만.
- 적용 후: `select proname, proconfig from pg_proc where proname in ('enforce_watchlist_limit','prune_recently_viewed','enforce_notes_length');` 로 search_path 확인 권장.
- `select conname from pg_constraint where conrelid='public.notes'::regclass and conname='notes_user_entity_unique';` 으로 UNIQUE 제약 확인 권장.

---

## Phase 2 IA 재구성 (2026-05-10)

> 통합 기획서: `_workspace/04_ux_plan/integrated-plan-v2.md`
> UX 상세: `_workspace/04_ux_plan/ux-plan.md`
> 디자인 비전: `_workspace/04_ux_plan/design-vision.md`
> 범위: 글로벌 Top Bar + 산업 컨텍스트 바 + 4탭 통일 + 폐기 라우트 redirect + TickerTape + 하드코딩 컬러 토큰화

### 체크리스트

- [x] `next.config.ts` redirects — 4개 폐기 라우트(`/money-flow`, `/price-changes`, `/statistics`, `/industry-money-flow`) → `/` 영구 301
- [x] 디렉토리 삭제: `app/money-flow`(이미 부재), `app/price-changes`, `app/statistics`, `app/industry-money-flow`
- [x] 산업 페이지 4탭 라벨 통일 — `패권지도 / 자금흐름 / 등락율 / 기업·섹터 트렌드`
- [x] `components/layout/global-top-bar.tsx` 신규 — 모든 페이지 공통 헤더 (로고 + Share + Search + Help + Theme + Auth)
- [x] `components/layout/industry-context-bar.tsx` 신규 — 브레드크럼 + 4탭 + active 상태 + rightActions slot
- [x] `components/dashboard/ticker-tape.tsx` 신규 — 핫 종목 marquee (등락률 절댓값 Top 20, 회사 모달 연결)
- [x] `app/globals.css` — `.ticker-tape`/`.ticker-track` keyframe 애니메이션, hover paused, reduced-motion 처리
- [x] 메인 `industry-dashboard.tsx` — GlobalTopBar 통합 + TickerTape 메인 KPI 아래 위치
- [x] `hegemony-map.tsx` — GlobalTopBar + IndustryContextBar로 헤더 교체, historical 배너 토큰화
- [x] `money-flow-page-content.tsx` — 동일 교체, period 셀렉터 토큰화 (`bg-blue-600` → `bg-primary`), inflow=success / outflow=danger
- [x] `price-changes-page-content.tsx` — 동일 교체, sort 버튼·차트 헤더 SVG → lucide + 토큰
- [x] `statistics-page.tsx` — 동일 교체, 4 차트 헤더 SVG → lucide + 토큰, days-filter 토큰화
- [x] `dashboard/industry-money-flow-card.tsx` — Period 버튼·바깥 카드 토큰화, IndustryFlowItem 색상 토큰화 (`red-*` → `danger`, `blue-*` → `info`)
- [x] `money-flow/flow-card.tsx` — 색상 토큰화, MFI 바 success/warning
- [x] `money-flow/flow-summary.tsx` — 전체 토큰화 (success/danger/info/warning)
- [x] `dashboard/price-changes-card.tsx` — 헤더 SVG → lucide, gainer/loser 토큰화, 폐기 라우트 링크 제거
- [x] `dashboard/company-stats-card.tsx` — 헤더 SVG → lucide, 폐기 라우트 링크 제거, 토큰화
- [x] `pnpm exec tsc --noEmit` → **PASS (출력 없음)**
- [x] `pnpm build` → **PASS — 폐기 4개 라우트가 출력에서 제거 확인, 4탭 라우트(`[industryId]`, `[industryId]/money-flow`, `[industryId]/price-changes`, `[industryId]/statistics`) 모두 등록**

### 신규 파일 (3개)

- `components/layout/global-top-bar.tsx` (~110줄)
- `components/layout/industry-context-bar.tsx` (~110줄)
- `components/dashboard/ticker-tape.tsx` (~115줄)

### 삭제 파일/디렉토리 (4개)

- `app/price-changes/page.tsx`
- `app/statistics/page.tsx` + `loading.tsx`
- `app/industry-money-flow/page.tsx`
- `components/industry-money-flow/industry-money-flow-page-content.tsx` (이제 호출처 0건)

### 수정 파일 (9개)

- `next.config.ts` — redirects 4건 추가, legacy `/money-flow → /tech/money-flow` 제거
- `app/globals.css` — TickerTape marquee CSS
- `components/industry-dashboard.tsx`
- `components/hegemony-map.tsx`
- `components/money-flow/money-flow-page-content.tsx`
- `components/price-changes/price-changes-page-content.tsx`
- `components/statistics/statistics-page.tsx`
- `components/dashboard/industry-money-flow-card.tsx`
- `components/money-flow/flow-card.tsx`
- `components/money-flow/flow-summary.tsx`
- `components/dashboard/price-changes-card.tsx`
- `components/dashboard/company-stats-card.tsx`

### TickerTape 데이터 소스

- `usePriceChanges({ sort: 'percentChange', order: 'desc', region, days: 1 })`
- region 토글 인지 (메인 `IndustryDashboard`에서 region prop 전달) ✓
- period: 1일 등락률 (의도). 향후 user 선택형 period 도입 가능
- 정렬: 절댓값 기준 Top 20 (상승·하락 모두 영향력 큰 종목)
- 클릭 → `<CompanyDetail>` Dialog 모달
- hover/focus 시 marquee 일시정지, reduced-motion 사용자에게는 정적 노출

### 폐기 라우트 redirect 동작 (수동 점검 가이드)

- `/money-flow` → `/` (301)
- `/price-changes` → `/` (301)
- `/statistics` → `/` (301)
- `/industry-money-flow` → `/` (301)
- query 파라미터는 Next.js 15 redirects가 자동 보존

### 하드코딩 컬러 grep 결과

- 시작: `text-{blue,emerald,rose,red,green}-* | bg-* | border-*` 직접 사용처 **254건** (28개 파일)
- Phase 2 처리 후: **81건 잔존** (주로 `design-system` 카탈로그, `methodology`, `onboarding` welcome-modal, `global-search` 등 보조 영역)
- **치환 건수: ~173건** (memory-flow, dashboard 카드, 헤더, 페이지 컨텐츠 핵심 영역 일소)

### 컬러 매핑 정책 (Phase 2에서 확립)

| 의미 | 토큰 | 비고 |
|------|------|------|
| 가격 상승 / 자금 유입 (한국 컨벤션 빨강) | `text-danger` / `bg-danger-bg` / `bg-danger/15` | flow-card, industry-money-flow-card |
| 가격 하락 / 자금 유출 (한국 컨벤션 파랑) | `text-info` / `bg-info/10` / `bg-info/15` | 동일 |
| 글로벌 Bloomberg 컨벤션 — 상승 | `text-success` | flow-summary, MarketPulseStrip 등 |
| 글로벌 — 하락 | `text-danger` | 동일 |
| 강조 / 1위 | `text-primary` (amber) | sort 버튼 active |
| 경고 / 워닝 | `text-warning` | historical 배너 |
| 정보 / 정보성 | `text-info` | 차트 헤더 등 |

> **주의:** 메인의 `IndustryMoneyFlowCard`와 `flow-card`는 한국 컨벤션(빨강=상승)을 보존했고, `flow-summary`는 Bloomberg 컨벤션(녹색=상승)을 사용 — 같은 페이지 내 혼재. UX 정책 결정 후 후속에서 통일 권장.

### 발견 위험 / 후속 권장

- **컬러 컨벤션 혼재**: 위 표대로 메인 자금 흐름 카드 = 한국식, 페이지 내 summary = Bloomberg식. `sk-design-system` / `sk-ui-planner`와 합의 후 통일 필요.
- **TickerTape `days=1` 데이터 부재**: 1일 백필이 없는 ticker 는 등락률이 null → 자동 제외(filter). 표시 종목 수가 limit 미달 가능.
- **잔존 하드코딩 컬러 81건**: `design-system`/`methodology`/`onboarding` 페이지에 분산. 카탈로그·문서 페이지라 시각 회귀 위험 낮음. Phase 3 마감 단계에서 처리 권장.
- **`/admin/news/[id]/edit/page.tsx` 같은 admin UI**: Phase 2 범위 외라 변경 없음. admin GlobalTopBar 도입은 Phase A2.5 (별도).
- **methodology / news / me / admin 페이지**: GlobalTopBar 미적용. 헤더 통일은 점진 적용 권장 (자체 헤더가 자체 layout에 포함되어 큰 영향).
- **모바일 햄버거 메뉴**: 본 세션 미구현 — `flex-wrap`으로 자동 줄바꿈 처리만. Phase 3 모바일 검수 epic 권장.
- **`app/sitemap.ts`**: 폐기 라우트가 원래 sitemap에 등재되지 않았음을 확인 (산업 페이지만 등록). 변경 불필요.
- **`useState/useEffect` import 누락 우려**: GlobalTopBar 내부에서 자체 사용. industry-dashboard 에서 unused 제거 완료.
- **다른 세션 영역 보호**: `app/api/debug/route.ts`, `types/index.ts` 변경 알림 수신했으나 본 세션 미접근 (Phase 2 범위 외).

### 검증

- `pnpm exec tsc --noEmit` → **PASS**
- `pnpm build` → **PASS**
  - 폐기 4개 라우트 `/money-flow`, `/price-changes`, `/statistics`, `/industry-money-flow` 출력 제거 확인 (모두 redirect로만 처리)
  - 4탭 라우트 `/{industryId}`, `/{industryId}/money-flow`, `/{industryId}/price-changes`, `/{industryId}/statistics` 정상 등록
  - DYNAMIC_SERVER_USAGE 경고는 region 토글 동작에 필수, 신규 오류 0건

---

## Phase 2 H+M 보강 (2026-05-10)

> 코드 리뷰 후속 — HIGH 4건 + MEDIUM 2건 일괄 정정.

### H1. 토큰 오타 `border-border-subtle-subtle` 치환

`grep -rn "border-border-subtle-subtle" components/ app/` 사전 결과 5건, 치환 후 0건 확인.

- [x] `components/dashboard/company-stats-card.tsx:33` — header 하단 border
- [x] `components/dashboard/price-changes-card.tsx:52` — 카드 외곽 border
- [x] `components/dashboard/price-changes-card.tsx:66` — period 필터 그룹 border
- [x] `components/dashboard/industry-money-flow-card.tsx:88` — 카드 외곽 border
- [x] `components/dashboard/industry-money-flow-card.tsx:98` — period 필터 그룹 border

치환 결과: **5/5건** 모두 `border-border-subtle` 로 정정. Tailwind 미해석으로 외곽선이 렌더 안 되던 시각 회귀 해소.

### H2. 자금흐름 컬러 컨벤션 글로벌 통일

**결정 (자동 채택):** 글로벌 Bloomberg 컨벤션으로 통일. 라벨(유입/유출)은 보존.
- 유입(inflow) = `success` (emerald, 양수, 긍정)
- 유출(outflow) = `danger` (rose, 음수, 부정)

수정 대상:
- [x] `components/dashboard/industry-money-flow-card.tsx`
  - `bg-danger-bg/40 border-danger/30` → `bg-success/5 border-success/30` (inflow)
  - `bg-info/5 border-info/30` → `bg-danger/5 border-danger/30` (outflow)
  - 아이콘 / 텍스트 / net flow / 배지 / dot 모두 통일 (`text-danger`/`text-info` → `text-success`/`text-danger`)
  - inset glow `boxShadow rgba(239,68,68,*)` → `rgba(16,185,129,*)` (4개 keyframe)
  - `RisingArrow` SVG fill `rgba(239,68,68,0.7)` → `rgba(16,185,129,0.7)`
  - `FallingArrow` SVG fill `rgba(59,130,246,0.7)` → `rgba(244,63,94,0.7)`
- [x] `components/money-flow/flow-card.tsx`
  - 동일 토큰 매핑 + `ring-danger/50`/`ring-info/50` ↔ `ring-success/50`/`ring-danger/50` 스왑 (isExpanded)
  - TrendingUp/TrendingDown 아이콘 색 통일
  - RisingArrow / FallingArrow SVG fill 동일 변경

이로써 `flow-summary` (글로벌)와 `industry-money-flow-card` / `flow-card` (구 한국식) 사이 컨벤션 충돌 해소.

### H3. sitemap 검토 — 변경 없음

폐기 라우트가 sitemap에 등재되지 않았음을 기존 단계에서 이미 확인. 코드 변경 불필요.

### H4. TickerTape 듀얼 → 트리플 트랙

- [x] `components/dashboard/ticker-tape.tsx:72` — `dualItems` 복제 횟수 동적화
  ```ts
  const dualItems = items.length < 6
    ? [...items, ...items, ...items, ...items]   // 4회 (적은 종목 데이)
    : [...items, ...items, ...items]              // 3회 (기본)
  ```
  와이드 데스크탑(≥1920px) + items 적을 때 우측 빈 영역 노출 방지.

### M5. TickerTape 항목 aria-label

- [x] `components/dashboard/ticker-tape.tsx` `<button>` 에 명시적 `aria-label` 추가
  - 형식: `${nameKo || name || ticker} 상세 보기, ±X.XX%`

### M6. TickerTape `aria-live="off"` 명시

- [x] marquee 컨테이너에 `aria-live="off"` 추가 — 스크린리더 무한 반복 읽기 방지.

### 검증

- `pnpm exec tsc --noEmit` → **PASS** (exit 0)
- `pnpm build` → **PASS** (exit 0)
- `grep -rn "border-border-subtle-subtle" components/ app/` → **0건**

### 수정 파일 (4)

- `components/dashboard/company-stats-card.tsx`
- `components/dashboard/price-changes-card.tsx`
- `components/dashboard/industry-money-flow-card.tsx`
- `components/money-flow/flow-card.tsx`
- `components/dashboard/ticker-tape.tsx`

## Phase 3 마감 + 모바일 햄버거 (2026-05-10)

### 작업 1 — 하드코딩 컬러 일괄 토큰화

- 시작 grep: **81건** (하드코딩 Tailwind 컬러 클래스)
- 사후 grep (예외 제거): **0건**
- 사후 grep (전체, design-system / opengraph-image 포함): **14건** — 모두 정당한 예외(카탈로그·OG 이미지)
- 토큰화 매핑:
  - `text-blue-*` (링크/정보) → `text-info`
  - `text-emerald-* / text-green-*` (상승/성공) → `text-success`
  - `text-rose-* / text-red-*` (하락/위험/오류) → `text-danger`
  - `text-amber-* / text-yellow-*` (경고) → `text-warning` 또는 `text-primary` (브랜드 강조 amber)
  - `bg-emerald-50 / bg-red-50` → `bg-success-bg / bg-danger-bg`
  - `border-blue-/red-* etc` → `border-info/30`, `border-danger/30` 등 alpha 토큰
  - 점수 dimension 컬러 (blue/emerald/amber/purple-500) → `bg-chart-{1..4}` (recharts 팔레트와 일관)
- 토큰화 파일 (24+):
  - 공용: `share-button`, `footer`, `global-search`, `date-selector`, `price-change-card`, `company-detail`, `company-statistics`, `company-badge`
  - statistics: `company-ranking-table`, `sector-trend-section`
  - money-flow: `flow-river`, `sector-company-list`
  - auth: `google-sign-in-button`, `user-menu`
  - news: `news-subscribe-cta`, `admin/news/preview-email-client`
  - me: `watch-star-toggle`, `email-subscription-toggle`, `onboarding-picker-step`, `login-value-prompt-card`
  - methodology: `scoring-diagram`
  - dashboard: `card-error`
  - onboarding: `welcome-modal`
  - 페이지: `app/not-found`, `app/methodology/page`, `app/admin/news/page`, `app/me/page`, `app/me/watchlist/watchlist-manager`, `app/login/page`

### 작업 2 — GlobalTopBar 점진 확산

자체 헤더 → GlobalTopBar 대체:
- `app/admin/layout.tsx` — `subtitle="관리자 · {email}"`
- `app/me/page.tsx` — `subtitle="내 페이지 · {email}"`
- `app/me/notes/page.tsx`
- `app/me/settings/page.tsx`
- `app/me/watchlist/page.tsx`
- `app/me/onboarding/page.tsx`
- `app/news/page.tsx` — `subtitle="마켓 리포트"`
- `app/news/[id]/page.tsx` — `extraActions`로 "목록" 백 링크 주입
- `app/methodology/page.tsx` — `subtitle="방법론 · 데이터 수집부터 점수 산출까지"`

총 9개 페이지가 글로벌 헤더로 통합됨. 산업 컨텍스트 바는 산업 페이지에만 노출.

### 작업 3 — 모바일 햄버거 + 4탭 가로 스크롤

#### 3-1. GlobalTopBar 모바일 햄버거
- 신규 컴포넌트 `components/ui/sheet.tsx` 추가 (Radix Dialog 기반, side prop 지원)
- `GlobalTopBar` 분기:
  - 데스크탑(sm+): 기존 우측 액션 군 노출
  - 모바일(<sm): `Menu` 아이콘 → Sheet (right slide) → 필터·도구·계정 섹션화
  - lastUpdated 만 모바일에서도 햄버거 옆에 노출 (정보 가시성 유지)
- 320px 폭 회귀 없음 — 액션 wrap 깨짐 제거

#### 3-2. IndustryContextBar 4탭 가로 스크롤
- `flex-wrap` → `overflow-x-auto scrollbar-thin -mx-4 px-4` (모바일)
- `sm` 이상에서는 기존 인라인 레이아웃 유지
- `whitespace-nowrap shrink-0` 으로 탭이 잘리지 않고 모두 접근 가능

### 작업 4 — Tailwind v4 토큰 추가

`app/globals.css` 에 보조 변형 추가:
- `--color-warning-bg` (light/dark) — 경고 배경
- `--color-info-bg` (light/dark) — 정보 배경
- 기존 `--color-success-bg`, `--color-danger-bg` 와 일관 패턴

### 검증

- `pnpm exec tsc --noEmit` → **PASS** (exit 0, 무출력)
- `pnpm build` → **PASS** (exit 0)
- 컬러 grep:
  - `text-blue|emerald|rose|red-N|green-N|amber|yellow|bg-blue-|bg-emerald-|bg-rose-|bg-red-N|border-blue|border-emerald|border-rose|border-red-N` 규모: 81 → 14 (모두 정당한 예외)
  - 예외 제거 후 grep: **0건**

### 위험 / 후속 권장

- design-system 카탈로그(`app/design-system/**`) 의 14건은 토큰 종류 데모 용도이므로 의도적 잔존
- 새로 만든 `Sheet` 컴포넌트는 다른 모바일 패널(예: 산업 컨텍스트 바 모바일 메뉴)에 재사용 가능
- amber → primary 매핑 시 일부 의미 차이(워치리스트 별 = 강조) 있어 시각적 검수 권장
- onboarding/welcome-modal 자금흐름 시각화는 한국식 컨벤션(유입=빨강) 유지하기 위해 `text-danger`(빨강), `text-info`(파랑) 매핑

### 수정 파일 (24+)

- `app/globals.css`
- `components/ui/sheet.tsx` (신규)
- `components/layout/global-top-bar.tsx`
- `components/layout/industry-context-bar.tsx`
- 컬러 토큰화 24개 파일 (위 작업 1 목록 참조)
- GlobalTopBar 적용 9개 페이지 (작업 2 목록)

## Phase 3 H+M 보강 (2026-05-10)

Phase 3 코드 리뷰의 HIGH 4건 + MEDIUM 핵심 2건을 즉시 수정.

### H1. 토큰 치환 잔여 6개 파일

- `components/me/onboarding-picker-step.tsx` (3 곳): `border/bg-amber-500` → `border/bg-primary`, `bg-amber-500 text-slate-950` → `bg-primary text-primary-foreground`, CTA `amber-500/600` → `primary` 토큰
- `components/me/login-value-prompt-card.tsx`: amber CTA → `bg-primary hover:bg-primary/90 text-primary-foreground`
- `components/me/email-subscription-toggle.tsx`: 토글 ON `bg-amber-500` → `bg-primary`
- `components/me/note-editor.tsx`: 저장 버튼 amber → primary
- `components/company-statistics.tsx`: 막대 그래프 light 색상 `bg-amber-500` → `bg-primary` (dark 그라데이션 유지)

사후 grep 결과: `grep -rn "bg-amber-500\|text-slate-950\|border-amber-500\|hover:bg-amber-600" components/` → **0건** (design-system 외 잔존 없음).

### H2. AuthButtonClient 중복 마운트 차단

`components/layout/global-top-bar.tsx`:
- `mounted` 상태 + `window.matchMedia('(min-width: 640px)')` 로 데스크탑/모바일 감지
- 동일 컴포넌트(`AuthButtonClient`, `SearchTrigger`, `HelpButton`, `ShareButton`, `ThemeToggle`)가 두 트리에 동시 마운트되어 hooks 가 2배 호출되던 문제 해결
- SSR/hydration 동안에는 데스크탑 트리를 기본 노출 → mismatch 회피
- `change` 이벤트 리스너 정리(removeEventListener)

### H3. 햄버거 aria-expanded / aria-controls

- `aria-expanded={open}`, `aria-controls="global-mobile-menu"` 추가
- `<SheetContent id="global-mobile-menu" ...>`

### H4. SheetContent aria-describedby 경고 차단

`components/ui/sheet.tsx` (라이브러리 레벨 처리):
- `aria-describedby` 가 명시되지 않으면 `undefined` 로 강제 → Radix Dialog warning 차단
- 호출부가 명시한 값이 있으면 그 값을 그대로 사용 (override 가능)

### M1. IndustryContextBar 활성 탭 자동 스크롤

`components/layout/industry-context-bar.tsx`:
- `useRef<HTMLAnchorElement>` + `useEffect([pathname])` 로 활성 탭에 `scrollIntoView({inline:'center', block:'nearest', behavior:'instant'})`
- 모바일 가로 스크롤에서 활성 탭이 화면 밖일 때 자동으로 가시 영역으로 이동

### M5. news/[id] 모바일 "목록" 링크 표면 노출

- `GlobalTopBarProps` 에 `mobileLeading?: ReactNode` 추가 — 모바일 햄버거 좌측에 표면 노출
- `app/news/[id]/page.tsx`: 모바일에서는 `mobileLeading` 으로 ArrowLeft 아이콘 버튼, 데스크탑은 기존 `extraActions` "목록" 링크 유지

### 검증

- `pnpm exec tsc --noEmit` → **PASS** (exit 0, 무출력)
- `pnpm build` → **PASS** (exit 0)
- 컬러 grep: design-system 외 amber/slate-950 잔존 0건

### 수정 파일 (8)

- `components/me/onboarding-picker-step.tsx`
- `components/me/login-value-prompt-card.tsx`
- `components/me/email-subscription-toggle.tsx`
- `components/me/note-editor.tsx`
- `components/company-statistics.tsx`
- `components/layout/global-top-bar.tsx`
- `components/layout/industry-context-bar.tsx`
- `components/ui/sheet.tsx`
- `app/news/[id]/page.tsx`

## NoteEditor 마크다운 풍부화 (2026-05-10)

### 목표

`notes.body` (10000자, Supabase Postgres) 를 풍부한 GFM 마크다운으로 입력·렌더하면서 XSS 를 방어한다.

### 추가 패키지

| 패키지 | 버전 | 용도 | 설치 사이즈 |
|--------|------|------|-------------|
| `react-markdown` | 10.1.0 | 마크다운 → React 엘리먼트 | ~80K |
| `remark-gfm` | 4.0.1 | GFM (테이블, 체크박스, 자동링크) | ~44K |
| `rehype-sanitize` | 6.0.0 | HTML XSS allowlist sanitize | ~44K |

총 ~168K (pnpm 스토어 기준). client-only 사용으로 RSC 번들에는 미포함.

### 신규 파일

- `components/ui/markdown-view.tsx` — 클라이언트 전용 마크다운 렌더 컴포넌트.
  - `dangerouslySetInnerHTML` 미사용
  - `rehype-sanitize` defaultSchema 기반 + `a` 태그에 `target/rel` 만 추가 허용
  - `<script>`, `<iframe>`, `on*=`, `javascript:` URL 차단 (defaultSchema 기본 동작)
  - 외부 링크는 `target="_blank" rel="noopener noreferrer nofollow"` 강제
  - prose 클래스 의존 없이 컴포넌트별 디자인 토큰(`bg-surface-2`, `border-border-subtle`, `text-foreground`, `text-muted-foreground`, `text-primary`) 직접 적용
  - h1/h2/h3, p, a, ul/ol/li, blockquote, code(인라인/블록), pre, hr, table/thead/th/td, strong/em 모두 커스텀 매핑

### 수정 파일

- `components/me/note-editor.tsx`
  - segment control 토글 (편집 / 미리보기) — `aria-pressed`, `role="group"`, `aria-label="편집 모드 전환"` 적용
  - 미리보기 탭: `<MarkdownView content={body} />` 로 풀 GFM 렌더
  - 편집 탭 하단: 마크다운 단축키 도움말 (굵게/기울임/링크/목록/인용/코드)
  - 글자 수 카운터 / 10000자 maxLength 유지
- `components/me/note-list.tsx`
  - 카드 본문을 `<MarkdownView>` 로 변경
  - 280자 초과 시 prefix slice + ellipsis 로 truncate, 종목 상세 안내 문구 노출
  - plain text → 마크다운 미리보기 전환에도 별도 hydration cost 없음 (클라이언트 컴포넌트)

### zod 스키마

`lib/me/schema.ts` 의 `noteUpsertSchema.body` 가 이미 `z.string().min(1).max(10000)` 으로 고정되어 있어 변경 불필요. 10001자 입력은 422 로 차단된다.

### 검증

- `pnpm exec tsc --noEmit` → **PASS** (exit 0)
- `pnpm build` → **PASS** (exit 0)
- 수동 sanitize 시나리오 (코드 리뷰):
  - `<script>alert(1)</script>` → defaultSchema 가 element 자체 제거
  - `<iframe src=...>` → element 미허용으로 제거
  - `[xss](javascript:alert(1))` → defaultSchema protocol allowlist 가 `javascript:` 차단 → 링크 href 에서 제외
  - `<img onerror="...">` → defaultSchema 가 `on*` 핸들러 속성 제거
- 외부 링크 클릭 시 `target=_blank rel=noopener noreferrer nofollow` 적용

### 디자인 일관성

- 다크/라이트 모두에서 `bg-surface-2`, `border-border-subtle`, `text-foreground`, `text-muted-foreground` 토큰만 사용
- 이모지 사용 0건, lucide-react 아이콘 (`Eye`, `EyeOff`, `Save`, `Trash2`, `NotebookPen`) 만 사용

## 일별 메일 cron (2026-05-10)

### 목표

매일 KST 8시(또는 사용자별 `email_subscriptions.hour_kst`) 에 발행된 최신 마켓
리포트(`news_reports.status='published'`) 를 구독자에게 자동 발송. GitHub Actions
가 매시 호출 → endpoint 가 현재 KST hour 와 매칭되는 구독자만 처리.

### 신규 파일

- `app/api/cron/daily-news-email/route.ts` — cron POST 엔드포인트
  - 인증: `requireApiKey(req, 'CRON_SECRET')` 재사용 (Bearer / X-API-Key, timing-safe)
  - 미설정 시 503, 인증 실패 401
  - body 옵션: `{ "hour_kst": "8" }` (디버그/수동) — 미지정 시 현재 KST hour 사용
  - 흐름:
    1. RESEND_API_KEY 검사 → 미설정 시 503
    2. `news_reports` 에서 `status='published'` 최신 1건 조회 (`published_at desc, report_date desc`)
       발행본 없으면 `{success:true, sent:0, reason:'no_published_report'}` 즉시 반환
    3. `email_subscriptions` 에서 `daily_report=true AND hour_kst=현재` 구독자 조회
       PostgREST 의 `profiles!inner(email, name)` 임베드로 email 동시 가져옴
    4. last_sent_at 을 KST date 로 환산 후 `lastDateKst < todayKst` 인 구독자만 타겟
    5. 직렬 발송 (`renderDailyNewsEmail` → `sendEmail` → `email_log` insert)
       성공 시에만 `email_subscriptions.last_sent_at = now()` 갱신
    6. 발송 사이 120ms 지연 (Resend free plan rate limit 보호)
  - 응답: `{ success, sent, skipped, failed, processedReportId, processedReportDate, processedAt, hourKst, candidates }`
- `.github/workflows/daily-news-email.yml` — GitHub Actions 워크플로우
  - schedule: `0 * * * *` (매시 0분 UTC)
  - workflow_dispatch: `hour_kst` input 으로 수동 디버그 호출
  - secret 가드: `CRON_SECRET`, `CRON_TARGET_URL` 둘 다 없으면 즉시 실패
  - curl 으로 endpoint POST → HTTP 4xx/5xx 시 step 실패

### 수정 파일

- `.env.example` — `CRON_SECRET=` 신규 항목 추가 + Vercel/GitHub Secrets 등록 가이드

### 인증 / 환경변수

- `CRON_SECRET` — `openssl rand -hex 32` 권장. Vercel + GitHub Secrets 양쪽에 동일 값 등록
- `CRON_TARGET_URL` — GitHub Secrets 만 (예: `https://sector-king.com`)
- `requireApiKey` 재사용으로 timing-safe compare 적용. `Authorization: Bearer <CRON_SECRET>` 또는 `X-API-Key` 둘 다 허용

### 멱등성 가드

- DB 조건: `email_subscriptions.daily_report=true AND hour_kst=<targetHour>`
- 코드 측 추가 가드: `last_sent_at` 을 KST date(`Asia/Seoul`) 로 환산해 `< todayKst` 만 타겟
- 발송 성공 시에만 `last_sent_at = now()` 업데이트 → 실패는 다음 실행에 재시도 가능
- Actions 가 매시 호출되더라도 동일 사용자에게 같은 KST 날짜에 중복 발송 안 함
- 동일 호출 2회 시 두 번째는 모두 skip (응답의 `candidates=0`)

### 사용자별 hour_kst 지원

- 매시 호출 + endpoint 가 현재 KST hour 만 매칭 → DB 의 `hour_kst` (0~23) 그대로 활용
- 디버그/수동 호출 시 body `{"hour_kst":"<n>"}` 로 override 가능

### Rate limit 보호

- 직렬 발송 + 사용자 사이 120ms delay
- Resend free plan: 100/day. 구독자 100명이라도 12s 내 처리 → Vercel function timeout 안전

### 검증

- 로컬 typecheck: `pnpm exec tsc --noEmit` 실행 (실시간 결과는 백그라운드 작업 참조)
- 실제 호출 검증은 운영 secret 등록 후 workflow_dispatch 로 수행 권장
- 로컬 수동 호출:
  ```bash
  curl -X POST http://localhost:3000/api/cron/daily-news-email \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json" -d '{"hour_kst":"8"}'
  ```

### 후속 권장

- B2: token 기반 1-click unsubscribe (메일 푸터 `unsubscribeUrl`)
- 환영 메일 (첫 구독 시) — 본 PR 스코프 외
- email_log 관리자 대시보드 (실패율 모니터링)
- Resend free plan 한도 초과 대비 — paid plan 전환 또는 sendgrid 폴백 검토


## email_log 대시보드 + Unsubscribe + Contact (2026-05-10)

### 작업 1 — email_log 관리자 대시보드
- [x] SQL: `email_log_admin_select` 정책 추가 (0006 마이그레이션 포함)
- [x] API: `app/api/admin/email-log/route.ts` (GET, requireAdminApi, status[]/kind/from/to/limit/offset, stats)
- [x] 컴포넌트: `email-log-stats.tsx`, `email-log-filter-bar.tsx`, `email-log-table.tsx` (오늘/최근 7일 통계 + 필터 + 테이블 + 페이지네이션)
- [x] 페이지: `app/admin/email-log/page.tsx` (requireAdmin, server 데이터 fetch)
- [x] admin 메인 dashboard 에 "메일 발송 로그" 진입 카드 추가

### 작업 2 — 1-click unsubscribe 토큰
- [x] SQL: `email_subscriptions.unsubscribe_token uuid not null default gen_random_uuid() unique` + 백필 + 인덱스
- [x] Drizzle 스키마 동기화 (`unsubscribeToken` 필드 추가)
- [x] API: `app/api/email/unsubscribe/route.ts` (GET 리다이렉트, POST One-Click 폼/JSON 처리, 정보 노출 차단)
- [x] 안내 페이지: `app/email/unsubscribed/page.tsx` (성공/실패 무관 동일 메시지)
- [x] `lib/email/render-daily-news.ts` — `unsubscribeToken` 입력 추가, URL 자동 생성
- [x] `lib/email/templates/daily-news.tsx` — 푸터 "메일 수신 해지 / 수신 시간 변경" 분리 링크
- [x] `lib/email/resend.ts` — `headers` 옵션 지원 (List-Unsubscribe RFC 8058)
- [x] cron `daily-news-email` — `unsubscribe_token` select + List-Unsubscribe / List-Unsubscribe-Post=One-Click 헤더 적용

### 작업 3 — 문의/제보 페이지
- [x] SQL: `contact_submissions` 테이블 + RLS (anon/auth INSERT, self/admin SELECT, admin UPDATE) + 길이 제한 트리거 + updated_at 트리거
- [x] Drizzle 스키마 (`contactSubmissions`, `ContactCategory`, `ContactStatus` 타입 export)
- [x] 사용자 페이지: `app/contact/page.tsx` (로그인/비로그인 모두), `components/contact/contact-form.tsx`
- [x] 관리자 페이지: `app/admin/contact/page.tsx` (status 탭 필터), `app/admin/contact/[id]/page.tsx`
- [x] 관리자 컴포넌트: `contact-list.tsx`, `contact-detail-form.tsx` (답변 메모 + 상태 변경 + 답변 메일 발송 토글)
- [x] API: `app/api/contact/route.ts` (POST anon/auth, GET admin), `app/api/admin/contact/route.ts` (GET 목록), `app/api/admin/contact/[id]/route.ts` (PATCH + 답변 메일 발송)
- [x] `components/footer.tsx` — Google Form 외부 링크를 내부 `/contact` 로 교체
- [x] admin dashboard 에 "문의/제보 관리" 진입 카드 추가

### 검증
- [x] `pnpm exec tsc --noEmit` 통과
- [x] `pnpm build` 통과 — 신규 라우트 9개(/admin/email-log, /admin/contact, /admin/contact/[id], /api/admin/email-log, /api/admin/contact, /api/admin/contact/[id], /api/contact, /api/email/unsubscribe, /contact, /email/unsubscribed) 빌드 출력에 등록 확인

### 위험 / 후속
- DB 변경은 본 작업 미적용 — 메인이 MCP `apply_migration` 실행 필요 (`0006_email_log_admin_unsubscribe_contact.sql`)
- contact 폼 rate-limit 미구현 — 1차 출시 후 Edge middleware 또는 Cloudflare Turnstile 도입 권장
- 답변 메일 템플릿은 인라인 HTML — React Email 템플릿 분리 고려
- `mailto:unsubscribe@sector-king.com` 은 placeholder — 실제 mailbox 가 없으면 헤더에서 제거 권장

---

## 2026-05-15 — UX 개선 3종 일괄 구현

### 작업 1: 메인 헤로 카피 재설계
- [x] `components/industry-dashboard.tsx` 헤로 섹션 한국어 메인 + 영문 보조 2단 구조로 교체
- [x] 디자이너 메모 문구 ("보라색 그라데이션과 보여주기식 애니메이션 없이…") 제거
- [x] eyebrow: "The Map of Capital · 자금 흐름 지도" (amber-400)
- [x] h1: "시장의 돈이 어디로 흐르는가." + italic "산업·섹터·종목 단위로."
- [x] 영문 보조 카피, 가치 제안, CTA(ArrowDown/Mail) 추가
- [x] industries 섹션에 `id="industries"` + `scroll-mt-24` 앵커 추가

### 작업 2: 온보딩 전략 변경
- [x] `hooks/use-page-tour.ts` 자동 startTour useEffect 삭제, startTour만 반환
- [x] 호출처(hegemony-map / money-flow / price-changes / statistics / industry-dashboard) 그대로 유지 — 자동 트리거 사라진 만큼 부수효과 없음
- [x] `components/onboarding/help-button.tsx` 기존 동작 유지
- [x] `components/onboarding/onboarding-hint-strip.tsx` 신규 작성 (localStorage 'sk:hint-strip-dismissed-v1', mounted flag, Sparkles/X)
- [x] industry-dashboard 헤로 직하 / MarketPulseStrip 위에 `<OnboardingHintStrip />` 노출

### 작업 3: /news 날짜 강화
- [x] `app/news/page.tsx` 에서 date-fns 의존 제거 (split 기반 buildDateLabels 유틸 도입)
- [x] `<time dateTime aria-label>` 시맨틱 + 한국어 풀라벨 aria
- [x] monthDay (MM.DD, amber-400 text-base sm:text-lg), weekday (3자 대문자, muted)

### 검증
- [x] `pnpm exec tsc --noEmit` PASS (출력 없음)
- [x] `pnpm build` PASS (.next 생성 완료)
