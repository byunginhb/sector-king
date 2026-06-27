# Region 필터링 — 데이터 모델 설계

> 작성자: `sk-data-modeler`
> 대상: sector-king 프로젝트 (Drizzle + better-sqlite3)
> 목표: 산업/섹터/티커 데이터에서 국내(.KS, .KQ) / 해외 / 전체를 명확히 구분하고, 섹터별 누락 티커 보완을 위한 데이터 모델 토대 마련

---

## 1. 현황 분석

### 1.1 관련 테이블 관계

```
industries (1) ──< industry_categories >── (1) categories (1) ──< sectors (1) ──< sector_companies >── (1) companies (1) ──< daily_snapshots
                                                                                                                          (1) ──< company_profiles
                                                                                                                          (1) ──< company_scores
```

### 1.2 region 식별 가능한 기존 컬럼 (실태)

| 위치 | 컬럼 | 신뢰도 | 비고 |
|------|------|--------|------|
| `companies.ticker` | 접미사 (`.KS`, `.KQ`, `.T`, `.TW`, `.HK`, `.PA`, …) | **높음** | yfinance 표준. 국내 종목은 `.KS`/`.KQ`만 |
| `company_profiles.country` | 자유 텍스트 | **낮음/Nullable** | 시드/마이그레이션에서 채워지지 않음. 빈 값이 다수 |
| `lib/currency.ts` `TICKER_SUFFIX_CURRENCY` | 접미사→통화 매핑 | **높음** | 이미 application 레이어 표준이며 region 분류와 1:1 호환 |

### 1.3 산업 단계의 국가성

`scripts/migrate-add-new-industries.ts`에는 **본질적으로 국가 종속적인** 카테고리가 이미 존재:

- `korea_bio` (한국 바이오)
- `korea_banks` (한국 은행)

또한 “섞여 있는” 카테고리도 다수:

- `memory`, `ddr`, `hbm` (KR + US + …)
- `mobile_device` (US + KR + HK)
- `foundry` (TW + KR + US)
- `battery` (CN + KR), `ev`, `autonomous`, `robot` 등

### 1.4 누락 티커 보완 필요 영역 (예시 — `sk-ticker-curator`와 합의)

| 카테고리/섹터 | 누락 영역 | 이유 |
|---|---|---|
| `apparel.fast_fashion` | Inditex(ITX.MC), 패스트리테일링(9983.T) 등 | 글로벌 1위 부재 |
| `oil_gas` | Shell(SHEL), BP, TotalEnergies(TTE.PA) | 비미국 메이저 부재 |
| `luxury_fashion` | Kering(KER.PA), Compagnie Financière Richemont(CFR.SW) | LVMH/Hermès 외 보완 |
| `korea_banks` | 하나금융(086790.KS), 우리금융(316140.KS) | 4대 금융지주 미완 |
| `korea_bio.cell_gene` | 한미약품(128940.KS), 유한양행(000100.KS) | 빈약 |
| `korea_bio.biosimilar` | 셀트리온헬스케어(091990.KS) | 셀트리온 그룹 보완 |
| `consumer/retail` | 이마트(139480.KS), GS리테일(007070.KS) | 한국 소매 전무 |
| `automotive`/`luxury_auto` | 기아(000270.KS), 포르쉐(P911.DE) | 한국 자동차 누락 |
| `clean_energy` | 한화솔루션(009830.KS), OCI홀딩스(010060.KS) | 한국 태양광 부재 |

> 정확한 보완 리스트는 `sk-ticker-curator`에서 별도 산출물로 확정.

### 1.5 핵심 관찰

- **`.KS`/`.KQ` 접미사는 100% 국내 식별자**로 이미 신뢰 가능 — 별도 컬럼 없이도 파생 가능.
- 그러나 “해외 — 미국 / 유럽 / 중화권 / 일본” 같은 **하위 분류**는 접미사만으로 부정확하고 (예: `BABA` ADR은 미국 상장이지만 사업지는 중국, `BYDDY`는 OTC ADR), 자유텍스트 `country`도 비어있다.
- 현 단계 요구사항은 “전체/국내/해외” 3-way 토글이므로 **2-구분(KR/INTL)으로 충분**하다.

---

## 2. 변경 제안 (DDL)

### 2.1 결정 — region 컬럼 vs 파생 계산

**권장: 하이브리드 — `companies.region` 컬럼 추가 + 접미사 기반 백필 함수 유지**

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 순수 파생** (`getRegion(ticker)` 함수만) | 추가 컬럼 0개, 항상 일관, 마이그레이션 불필요 | (1) SQL `WHERE region = ?` 불가 → 모든 region 필터가 application 레이어 후처리, 인덱스 활용 불가. (2) 향후 ADR(BABA, BYDDY) 같이 접미사로는 분류 안 되는 케이스 수동 오버라이드 불가 |
| **B. 컬럼 정규화** (`companies.region`) | 인덱스 + SQL 필터 가능, 예외 케이스 수동 오버라이드 가능, `company_profiles.country`와 분리해 의도 명확 | 백필/마이그레이션 1회 필요, 새 회사 추가 시 region 누락 가능성 |
| **C. 하이브리드 (권장)** | 컬럼은 SoT, 함수는 fallback (NULL이면 접미사로 도출 후 자동 백필) | 약간의 코드 복잡도 |

→ **C 채택**. `companies.region`을 추가하되, `lib/region.ts`에 `getRegionFromTicker()` 헬퍼를 두고 **마이그레이션·시드·런타임 fallback 모두 동일 함수**를 사용하여 일관성 보장.

### 2.2 Region 분류 정의

```typescript
// lib/region.ts (신규)
export type Region = 'KR' | 'INTL'

export function getRegionFromTicker(ticker: string): Region {
  if (ticker.endsWith('.KS') || ticker.endsWith('.KQ')) return 'KR'
  return 'INTL'
}
```

- 1차 릴리스는 **2-구분 (KR / INTL)**.
- 향후 미세분류가 필요하면 별도 `subregion` 컬럼 (`US`, `CN`, `JP`, `EU`, `TW`, `HK`)을 추가 — 현재 스코프 외.

### 2.3 위치 결정 — `companies` vs `sector_companies`

| 후보 | 장점 | 단점 |
|------|------|------|
| **`companies.region`** ✅ 권장 | (1) region은 회사의 **본질 속성**(상장 시장)이지 섹터 매핑의 속성이 아님. (2) 단일 SoT — 한 회사가 여러 섹터에 속해도 일관된 region 보장. (3) `dailySnapshots`/`companyScores` 등 다른 조인에서도 즉시 활용. | 새 회사 insert 시 region 입력 누락 가능 → CHECK 제약과 시드 헬퍼로 보완 |
| `sector_companies.region` | sector마다 다르게 필터링 가능 (불필요한 유연성) | 동일 ticker가 섹터마다 다른 region을 가질 수 있는 모순 발생, 중복 데이터 |
| `companyProfiles.country` 활용 | 추가 컬럼 0개 | 자유 텍스트, 현재 미채움, region 의미를 country로 오버로딩 |

→ **`companies.region` 채택.**

### 2.4 Drizzle 스키마 변경 (`drizzle/schema.ts`)

```typescript
import { sqliteTable, text, integer, real, unique, index, check } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const companies = sqliteTable(
  'companies',
  {
    ticker: text('ticker').primaryKey(),
    name: text('name').notNull(),
    nameKo: text('name_ko'),
    logoUrl: text('logo_url'),
    // ── 신규 ─────────────────────────────────────────────
    region: text('region').notNull().default('INTL'),
    // 'KR' | 'INTL' — see lib/region.ts
  },
  (table) => [
    index('idx_companies_region').on(table.region),
    check('companies_region_chk', sql`${table.region} IN ('KR', 'INTL')`),
  ]
)
```

**주의**: SQLite ALTER TABLE은 CHECK 제약을 직접 추가할 수 없으므로(컬럼 추가 시 동시 정의는 가능), 마이그레이션 단계에서는 컬럼만 추가 후 CHECK는 다음 메이저 버전에서 테이블 재작성으로 적용 — 또는 컬럼 정의에 인라인으로 포함하여 신규 환경에만 적용. 기존 환경은 application validation이 1차 방어선.

### 2.5 (옵션) `industries.is_country_specific`

`korea_bio`, `korea_banks`처럼 카테고리 자체가 국가 종속인 경우, region 필터 UI 충돌 처리를 위해 `categories.regionScope` 컬럼을 추가:

```typescript
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  order: integer('order').notNull(),
  // 신규
  regionScope: text('region_scope').notNull().default('ANY'),
  // 'ANY' | 'KR' | 'INTL'
})
```

값 권장:
- `korea_bio` → `KR`
- `korea_banks` → `KR`
- 그 외 → `ANY`

**필터 충돌 해결 규칙** (UI/필터 체인이 따라야 할 의미론):

| 사용자 토글 | 카테고리 `regionScope` | 동작 |
|---|---|---|
| 전체 | * | 정상 노출 |
| 국내 | `ANY` 또는 `KR` | 노출, 단 ticker는 `region='KR'`로 필터 |
| 국내 | `INTL` | 카테고리 자체 숨김 또는 “해외 전용” 배지 |
| 해외 | `ANY` 또는 `INTL` | 노출, 단 ticker는 `region='INTL'`로 필터 |
| 해외 | `KR` | 카테고리 자체 숨김 |

> 이 규칙은 `sk-filter-architect`에서 `getIndustryFilter()` 시그니처에 `region?: Region` 파라미터를 추가하는 형태로 연결.

---

## 3. 마이그레이션 전략

### 3.1 단계별 스크립트 시그니처

#### Step 1. `scripts/migrate-add-region.ts` (신규, 멱등)

```typescript
// 시그니처: async function migrate(): Promise<void>
// 효과:
//   1) companies.region 컬럼 추가 (없을 때만)
//   2) categories.region_scope 컬럼 추가 (없을 때만)
//   3) 모든 companies row에 대해 region NULL/'INTL' 디폴트 → 접미사 기반 백필
//   4) korea_bio, korea_banks 카테고리에 region_scope='KR' 백필
//   5) idx_companies_region 인덱스 생성 (없을 때만)
```

핵심 패턴 (기존 `migrate-add-revenue-weight.ts` 스타일 준수):

```typescript
// 1) 컬럼 존재 체크
const cols = sqlite.prepare("PRAGMA table_info('companies')").all() as { name: string }[]
const hasRegion = cols.some((c) => c.name === 'region')
if (!hasRegion) {
  sqlite.exec(`ALTER TABLE companies ADD COLUMN region TEXT NOT NULL DEFAULT 'INTL'`)
}

// 2) 인덱스
sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region)`)

// 3) 백필 (lib/region.ts의 getRegionFromTicker와 동일 로직)
const tickers = sqlite.prepare(`SELECT ticker FROM companies`).all() as { ticker: string }[]
const updateRegion = sqlite.prepare(`UPDATE companies SET region = ? WHERE ticker = ?`)
const tx = sqlite.transaction(() => {
  for (const { ticker } of tickers) {
    const region = ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? 'KR' : 'INTL'
    updateRegion.run(region, ticker)
  }
})
tx()

// 4) 카테고리 region_scope 컬럼 + 백필
const catCols = sqlite.prepare("PRAGMA table_info('categories')").all() as { name: string }[]
if (!catCols.some((c) => c.name === 'region_scope')) {
  sqlite.exec(`ALTER TABLE categories ADD COLUMN region_scope TEXT NOT NULL DEFAULT 'ANY'`)
}
const updateScope = sqlite.prepare(`UPDATE categories SET region_scope = ? WHERE id = ?`)
const KR_SCOPE_CATEGORIES = ['korea_bio', 'korea_banks']
const tx2 = sqlite.transaction(() => {
  for (const id of KR_SCOPE_CATEGORIES) updateScope.run('KR', id)
})
tx2()
```

#### Step 2. `scripts/migrate-fill-missing-tickers.ts` (신규, 멱등) — `sk-ticker-curator` 산출물 기반

- INSERT OR IGNORE로 누락 ticker/sectorCompanies 추가
- 신규 ticker는 region 필드 포함하여 명시적으로 insert (디폴트 의존 X)

```typescript
const insertCompany = sqlite.prepare(`
  INSERT OR IGNORE INTO companies (ticker, name, name_ko, region)
  VALUES (@ticker, @name, @nameKo, @region)
`)
```

### 3.2 실행 순서

1. `pnpm tsx scripts/migrate-add-region.ts`
2. `pnpm tsx scripts/migrate-fill-missing-tickers.ts`
3. (옵션) `pnpm tsx scripts/seed.ts`는 신규 환경 전용 — 기존 prod DB에는 적용 X

### 3.3 롤백 가능성

| 단계 | 롤백 방법 |
|---|---|
| 컬럼 추가 | SQLite는 `ALTER TABLE DROP COLUMN`을 3.35+ 부터 지원하나, 의존성 위해 권장 X. 대신 region 컬럼은 application 코드에서 무시 가능하도록 모든 read 경로에 fallback 구현 |
| 인덱스 추가 | `DROP INDEX IF EXISTS idx_companies_region` |
| 백필 데이터 | region 컬럼은 결정론적(접미사 → 값)이므로 재실행으로 복원 가능 → 별도 백업 불필요 |
| 누락 티커 추가 | `INSERT OR IGNORE`로 기존 데이터 무손상. 롤백 시 `DELETE FROM companies WHERE ticker IN (...)` 가능하나 daily_snapshots FK 영향 — 운영 후엔 비권장 |

→ **실질적 롤백은 “신규 코드를 region 무시 모드로 바꾸기”가 가장 안전**. DDL 자체는 forward-only로 운영.

### 3.4 멱등성 체크리스트

- [x] `PRAGMA table_info`로 컬럼 존재 확인 후 ALTER
- [x] `CREATE INDEX IF NOT EXISTS`
- [x] `INSERT OR IGNORE` (신규 row)
- [x] UPDATE는 결정론적 값으로 재실행 안전
- [x] 트랜잭션으로 원자성 보장

---

## 4. 시드 영향도

### 4.1 변경 필요 파일

| 파일 | 변경 내용 | 우선순위 |
|------|-----------|---------|
| `drizzle/schema.ts` | `companies.region`, `categories.regionScope` 컬럼 + 인덱스 추가, 타입 `Region` export | P0 |
| `lib/region.ts` (신규) | `Region` 타입, `getRegionFromTicker()`, `KR_SUFFIXES` 상수 export | P0 |
| `scripts/seed.ts` | (1) 신규 테이블 DDL에 `region`, `region_scope` 추가 (2) `COMPANIES` 배열에 `region` 필드 추가 — `getRegionFromTicker(ticker)` 호출로 자동화 (3) `CATEGORIES`에 `regionScope` 필드 추가, `korea_bio`/`korea_banks`는 `'KR'` | P0 |
| `scripts/migrate-add-region.ts` (신규) | 위 “3.1 Step 1” | P0 |
| `scripts/migrate-add-new-industries.ts` | 신규 환경 멱등 호환성 — 신규 회사 INSERT 시 region 필드 포함 (`getRegionFromTicker` 활용) | P1 |
| `scripts/migrate-add-industries.ts` | 변경 없음 (region 무관) | — |
| `scripts/migrate-fill-missing-tickers.ts` (신규) | `sk-ticker-curator` 산출물 기반 누락 ticker 보완 | P1 |
| `lib/industry.ts` | `getIndustryFilter(industryId, options?: { region?: Region })`로 시그니처 확장. `sectorCompanies` 조회 시 `companies` 조인 + `region` 필터 추가 | P0 (sk-filter-architect와 합의) |
| `types/index.ts` | `IndustryFilterResult`에 `region` 옵션 추가, `Region` 타입 re-export | P0 |
| `app/api/industries/route.ts` 등 | searchParams `region` 수용 (`'all' | 'kr' | 'intl'`) | P1 |
| `hooks/use-*.ts` | `region` 옵션 추가, queryKey에 포함 (cache isolation) | P1 |
| 시드 mock snapshots | 변경 없음 (region은 companies에만) | — |

### 4.2 시드 데이터 보강 (`sk-ticker-curator`와 인터페이스)

- 누락 티커 리스트는 다음 형식으로 합의:
  ```typescript
  type SeedCompany = {
    ticker: string
    name: string
    nameKo: string
    region: Region // 명시적 — 자동 도출과 검증용
  }
  type SeedSectorCompany = {
    sectorId: string
    ticker: string
    rank: number
    revenueWeight?: number
    notes?: string | null
  }
  ```
- `sk-ticker-curator`는 카테고리/섹터별로 “현재 KR + INTL 균형”을 평가해 누락 영역 보고서를 산출 → 이 모델 산출물의 1.4 절을 입력으로 받는다.

---

## 5. 리스크

### 5.1 데이터 손실 / 다운타임

| 리스크 | 가능성 | 영향 | 완화책 |
|--------|--------|------|--------|
| ALTER TABLE ADD COLUMN 실패 | 낮음 | 중 | `PRAGMA table_info` 사전 체크, 트랜잭션 |
| 신규 컬럼 NOT NULL DEFAULT가 일부 SQLite 버전에서 거부 | 매우 낮음 | 중 | better-sqlite3는 SQLite 3.35+ 번들 → 안전. 그래도 fallback으로 NULL 허용 후 백필 후 NOT NULL 재적용 옵션 보유 |
| 기존 row 백필 실패 (트랜잭션 중단) | 낮음 | 낮음 | 결정론적 함수라 재실행 안전. 트랜잭션 단위로 묶음 |
| `INSERT OR IGNORE`로 누락 ticker 추가 시 region 컬럼 미입력 | 중 | 중 | seed/migration 헬퍼 `buildCompanyRow(ticker, name, nameKo)`가 region 자동 주입. PR 리뷰 체크리스트에 “신규 회사는 region 검증” 추가 |
| 운영 DB 백업 없음 | 알 수 없음 | 높음 | 마이그레이션 실행 전 `cp data/hegemony.db data/hegemony.db.bak.$(date +%s)` 의무화 (실행 스크립트 헤드에 명시) |
| daily snapshots 갱신 cron이 region을 인지 못함 | 낮음 | 낮음 | snapshots는 region 무관 — 회사 추가 시점에만 region 입력하면 됨 |

### 5.2 의미론적 리스크

| 리스크 | 완화책 |
|--------|--------|
| ADR/OTC 종목(`BABA`, `BYDDY`, `ADDYY`)을 “해외”로 분류해도 사용자 멘탈 모델과 일치 — 1차 릴리스에서는 수용 | 향후 `subregion` 컬럼 추가 시 별도 PR |
| `korea_bio.cell_gene`, `korea_banks` 같이 본질적 KR 카테고리에 “해외” 토글 적용 시 빈 결과 | `categories.regionScope='KR'`로 마킹하여 UI 단계에서 카테고리 자체 숨김 처리 (sk-filter-architect 책임) |
| `LVMH`(MC.PA), `Hermès`(RMS.PA), `Adidas`(ADDYY) 등 유럽/OTC가 INTL로 묶여 “미국 중심” 사용자 기대와 차이 | 1차는 KR/INTL 2-구분으로 충분. 후속에 `subregion` 추가 |
| 신규 회사 추가 시 region 누락 → 디폴트 `'INTL'`로 잘못 분류될 위험 | (1) 시드/마이그레이션 헬퍼 통일 (2) 단위 테스트로 모든 `.KS`/`.KQ` 티커가 KR인지 검증 (3) CI에서 `pnpm tsx scripts/audit-region.ts` 추가 옵션 (선택) |

### 5.3 성능 리스크

- `companies.region` 인덱스 추가 → 약간의 write 오버헤드, read 성능은 개선.
- 회사 수가 100~200 수준이라 인덱스 효과는 미미하지만, sector_companies → companies JOIN 시 region 필터를 옵티마이저가 활용 가능.

---

## 부록 A. 협업 인터페이스 요약

### `sk-ticker-curator`에 전달
- 1.4절의 누락 티커 영역 표를 검증/확장 요청
- 산출물 형식: `_workspace/01_plan/missing-tickers.md` + `SeedCompany[]` / `SeedSectorCompany[]`

### `sk-filter-architect`에 전달
- `lib/industry.ts`의 `getIndustryFilter` 시그니처:
  ```typescript
  export type Region = 'KR' | 'INTL'
  export type RegionFilter = 'all' | Region

  export async function getIndustryFilter(
    industryId: string,
    opts?: { region?: RegionFilter }
  ): Promise<IndustryFilterResult | null>
  ```
- `IndustryFilterResult`에 `appliedRegion?: RegionFilter` 추가하여 응답 자기 기술화
- 카테고리 `regionScope` 충돌 규칙 (2.5절 표) 구현 책임

### `lib/region.ts` 단일 SoT
- `getRegionFromTicker()` 한 함수만 export — 마이그레이션·시드·런타임 모두 동일 로직 사용

---

## 부록 B. DDL 요약 (실행 순서)

```sql
-- Step 1: companies.region
ALTER TABLE companies ADD COLUMN region TEXT NOT NULL DEFAULT 'INTL';
CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region);
UPDATE companies SET region = 'KR'
  WHERE ticker LIKE '%.KS' OR ticker LIKE '%.KQ';

-- Step 2: categories.region_scope
ALTER TABLE categories ADD COLUMN region_scope TEXT NOT NULL DEFAULT 'ANY';
UPDATE categories SET region_scope = 'KR'
  WHERE id IN ('korea_bio', 'korea_banks');
```
