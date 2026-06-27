# 08_stock_insights — API/쿼리 설계 (sk-filter-architect)

작성: 2026-06-10 · 근거: 실측 라우트/쿼리 패턴 (아래 "검증 근거" 참조)

## 0. 결론 (권장안 1줄)

> **`/api/company/[ticker]` 는 가산적 확장(스칼라 인사이트만), 집계·시계열은 신규 `/api/company/[ticker]/insights` (peer/밸류에이션/시총점유율 + score_history 통합)로 분리한다.** 모달은 기존 응답만 쓰므로 무손상.

이유: ① 모달과 페이지가 **같은** `useCompany`/`/api/company/[ticker]` 를 공유(검증됨) → 무거운 집계를 base 응답에 넣으면 모달까지 느려짐. ② 페이지 전용 인사이트는 lazy 로드(스크롤·탭 진입 시)가 가능해야 함. ③ score_history(74일)와 섹터 peer 집계는 base 응답을 크게 비대하게 만들고 캐시 무효화 주기도 다름.

---

## 1. 인사이트별 데이터 조달 설계

| # | 인사이트 | 소스 테이블 | 조달 엔드포인트 | 쿼리 방식 | 통화 |
|---|----------|-------------|-----------------|-----------|------|
| 1 | score_history 추이/모멘텀 | `score_history` | **`/insights` 의 `scoreHistory` 필드** (기본 74일 전체) | `WHERE ticker=? ORDER BY date ASC` | 무관 (점수) |
| 2 | 섹터 peer/중앙값/시총점유율 | `sector_companies`+`daily_snapshots`+`company_scores` | **`/insights` 의 `peers`/`sectorContext`** | 주 섹터 단위 집계 (아래 §1-A) | toUsd 후 메모리 집계 |
| 3 | 원시 지표(매출성장·ROE·영업이익·베타·부채비율) | `company_scores` | **base `/api/company` 확장** (`score.beta`, `score.debtToEquity`, `score.freeCashflow`) | 기존 단일 select 에 컬럼 추가 | freeCashflow=toUsd, 나머지 무관 |
| 4 | 목표주가 상승여력·추천·analystCount | `company_scores` + 최신 snapshot | **base 확장** (`upside` 파생) | base 응답 내 계산 | targetMeanPrice/price = toUsd |
| 5 | 52주 위치% · 가격 모멘텀 | `daily_snapshots` | **base 확장** (`snapshot.week52Position`) | base 응답 내 계산 | 비율이므로 무관(단 분자/분모 동일 ticker → USD 일관) |
| 6 | 멀티섹터 패권 요약(몇 개 섹터 1위) | `sector_companies` | **base 확장** (기존 `sectors[]`에 `dominanceSummary` 파생) | 기존 sectors 조회 결과로 계산 | 무관 |
| 7 | 밸류에이션 percentile(PER/PEG/ROE vs 섹터) | `daily_snapshots`+`company_scores` | **`/insights` 의 `valuation`** | 섹터 종목 분포 메모리 집계 | PER/PEG/ROE 무차원 → toUsd 불요 |
| 8 | 시총 점유율(섹터 합계 대비) | `daily_snapshots` | **`/insights` 의 `sectorContext.marketShare`** | toUsd 후 합산 | **toUsd 필수** |

### §1-A 주 섹터(primary sector) 선정 규칙

종목이 여러 섹터에 속함(LMT = aircraft_mfg/prime_defense/space). peer/percentile/시총점유율의 **기준 섹터**:

- **주 섹터 = `rank` 가 가장 높은(=숫자 작은) 섹터.** 동률이면 `sectors.order ASC` → `sectorId ASC` 로 결정론적 tie-break.
- `/insights` 응답에 `primarySectorId` 와 `allSectorIds[]` 둘 다 포함 → UI가 "주 섹터 기준" 표기 + 다른 섹터 전환 토글 여지 확보.
- 패권 요약(#6)은 **전 섹터** 대상(몇 개 섹터에서 rank=1인가) — base 응답에서 처리.

---

## 2. 엔드포인트 계약

### 2-A. `/api/company/[ticker]` — 가산 확장 (비파괴)

기존 응답에 **필드 추가만**. 기존 필드 제거·의미변경 없음 → 모달 무손상.

`ScoreDetail` 에 추가:
```ts
export interface ScoreDetail extends ScoreSummary {
  // ...기존 유지...
  beta: number | null            // 신규 (무차원)
  debtToEquity: number | null    // 신규 (무차원)
  freeCashflow: number | null    // 신규 (toUsd 변환 필수)
}
```

`snapshot` 에 추가 (모두 옵셔널 → 구버전 소비자 무영향):
```ts
snapshot: {
  // ...기존 유지...
  week52Position?: number | null  // (price-low)/(high-low), 0~1. 동일 ticker 비율 → 변환 불요
  dayHigh?: number | null         // toUsd
  dayLow?: number | null          // toUsd
  avgVolume?: number | null       // 무차원
}
```

`score` 외 신규 파생 블록 (옵셔널):
```ts
analystUpside?: {
  targetMeanPriceUsd: number | null  // toUsd(targetMeanPrice)
  currentPriceUsd: number | null     // toUsd(price)
  upsidePct: number | null           // (target-current)/current, 둘 다 USD 환산 후 계산
} | null
```

`sectors` 옆에 패권 요약 (옵셔널):
```ts
dominance?: {
  sectorCount: number        // 소속 섹터 수
  topRankCount: number       // rank===1 인 섹터 수
  bestRank: number           // min(rank)
} | null
```

쿼리 변경: 기존 `companyScores` select 는 `.select()` 전체이므로 beta/debtToEquity/freeCashflow는 **이미 row에 존재** → 매핑만 추가. snapshot select 도 `.select()` 전체이므로 dayHigh/dayLow/avgVolume 매핑만 추가. **추가 쿼리 0건.**

### 2-B. `/api/company/[ticker]/insights` — 신규 집계 엔드포인트

```ts
export interface CompanyInsightsResponse {
  primarySectorId: string | null
  allSectorIds: string[]
  // 1) 점수 시계열 (기본 전체 74일, ?range= 로 절단)
  scoreHistory: {
    date: string
    total: number          // smoothed_score
    raw: number            // raw_total_score
    scale: number
    growth: number
    profitability: number
    sentiment: number
  }[]
  scoreMomentum: {
    deltaTotal: number | null      // 최신 - range시작
    deltaPct: number | null
    trend: 'up' | 'down' | 'flat'  // 임계값은 data-modeler/ui와 합의
  } | null
  // 2) 주 섹터 peer (rank 정렬, USD 정규화 후)
  peers: {
    ticker: string
    name: string
    nameKo: string | null
    rank: number
    isSelf: boolean
    marketCapUsd: number | null
    score: number | null           // smoothed_score
  }[]
  // 3) 섹터 컨텍스트 (주 섹터 기준)
  sectorContext: {
    sectorId: string
    sectorName: string
    peerCount: number
    marketCapTotalUsd: number       // toUsd 후 합산
    marketSharePct: number | null   // self / total, 둘 다 USD
    medianScore: number | null
    medianMarketCapUsd: number | null
  } | null
  // 4) 밸류에이션 percentile (주 섹터 분포 내 self 위치)
  valuation: {
    peRatio:  { value: number | null; percentile: number | null; median: number | null }
    pegRatio: { value: number | null; percentile: number | null; median: number | null }
    returnOnEquity: { value: number | null; percentile: number | null; median: number | null }
  } | null
  appliedRange: number              // 실제 적용된 일수
}
```

응답 래퍼는 기존 규약 `ApiResponse<CompanyInsightsResponse>` 유지.

### 2-C. `?range=` 파라미터 설계

- `/api/company/[ticker]/insights?range=<int>` — score_history 일수. **허용: 30 | 60 | 74(=전체) | 120.** 화이트리스트 외/누락 → 기본 **74**(보유 전체). 120 요청 시 보유분(74)으로 클램프.
- base `/api/company/[ticker]` 의 30일 history도 동일 패턴으로 `?range=` 추가 가능(옵셔널, 기본 30 → 모달 무영향). 페이지 차트가 60/120 필요 시 사용. **허용: 30 | 60 | 90 | 129(=전체).** movers 라우트의 `parseInt + clamp` 패턴 그대로 적용.

`?range` 파싱은 `lib/api-helpers.ts` 에 신규 헬퍼 `resolveRange(searchParams, { allowed, fallback })` 로 추출 → SSOT 유지(movers의 인라인 clamp 중복 제거).

---

## 3. 통화 정규화 가드 (CLAUDE.md 규칙)

### 변환 필요/불요 표

| 필드 | 변환 | 비고 |
|------|------|------|
| `marketCapUsd`, `medianMarketCapUsd`, `marketCapTotalUsd` | **toUsd 필수** | 시총 점유율·합산 전 각 행 toUsd |
| `peers[].marketCapUsd` | **toUsd 필수** | peer 행마다 자기 ticker로 변환 |
| `targetMeanPriceUsd`, `currentPriceUsd` | **toUsd 필수** | upside 계산 전 둘 다 변환 |
| `freeCashflow`, `dayHigh`, `dayLow` | **toUsd 필수** | 가격성 |
| `week52Position`, `marketSharePct`, `upsidePct` | 불요 | 비율(동일통화 분자/분모) — 단 입력값은 USD 환산 후 사용 권장(일관성) |
| `peRatio`, `pegRatio`, `returnOnEquity`, score 전부, `beta`, `debtToEquity`, `volume`, `avgVolume`, `priceChange`(%) | 불요 | 무차원/비율 |

### 메모리 집계 강제 지점 (혼합통화 SQL 금지)

- **시총 점유율/중앙값/합산**: peer 목록은 KR(.KS/.KQ)+US 혼재 → `SELECT ... ORDER BY market_cap` / `SUM(market_cap)` / SQL median **금지**. 반드시 **(a) 행별 `toUsd(marketCap, peerTicker)` → (b) 메모리 배열 합산/정렬/중앙값**. (sector route와 statistics/companies route가 이미 이 패턴: SQL은 raw 조회만, toUsd·sort·reduce는 JS에서 — 동일 적용.)
- **밸류에이션 percentile**: PER/PEG/ROE는 무차원이라 통화 무관이지만, percentile 계산은 어차피 분포 정렬이 필요하므로 메모리 집계로 통일.
- **score 중앙값/peer 정렬**: 무차원 → SQL 정렬 가능하나, 위 시총과 같은 패스에서 메모리 처리(쿼리 1회로 끝내기 위함).

---

## 4. 캐싱/성능

- **revalidate**: 두 라우트 모두 `export const revalidate = 3600` (기존 company/sector route와 동일, 일 1회 데이터 갱신과 정합).
- **N+1 회피**: `/insights` 의 peer 집계는 주 섹터 1개에 대해 **단일 조인 쿼리**로 모든 peer의 snapshot+score를 한 번에 가져온다. sector route의 `leftJoin ... date = (SELECT MAX(date) ...)` 상관 서브쿼리 패턴 재사용 — 종목 수만큼 반복 쿼리 금지.
- **score_history 쿼리**: `WHERE ticker=? AND date >= ? ORDER BY date ASC` 단일 쿼리. `idx_score_history_ticker` 인덱스 존재 확인됨.
- **queryKey 설계** (use-company 패턴 = `['company', ticker]` 확장):
  - base: `['company', ticker]` (range 추가 시 `['company', ticker, range]`)
  - insights: `['company-insights', ticker, range]` — range를 키에 포함해 캐시 격리(industry 필터의 region 캐시 격리 원칙 동일 적용).
  - 신규 hook: `useCompanyInsights(ticker, { range? })` — `enabled: !!ticker`, 페이지에서만 호출(모달은 미사용).
- **분리 이점**: 모달은 `/insights` 를 호출하지 않으므로 peer 집계 비용을 전혀 안 짊. 페이지는 base(즉시) + insights(병렬/지연) 2-쿼리 로드.

---

## 5. 하위호환 체크리스트

- [ ] base `/api/company/[ticker]` 응답은 **필드 추가만**, 기존 필드(`company/profile/snapshot/history/score/sectors`) 형태·의미 불변.
- [ ] 신규 필드는 전부 **옵셔널**(`?:`) 또는 nullable → 구버전 타입 소비자 컴파일 깨짐 없음.
- [ ] 모달(`components/company-detail.tsx`)은 `useCompany`만 사용 → 변경 없음, 회귀 없음.
- [ ] `?range=` 누락 시 base=30, insights=74(전체)로 기존 동작 보존.
- [ ] `ScoreDetail`/`PriceHistory`/`CompanyDetailResponse` 확장 시 기존 매핑 라인은 유지하고 추가 매핑만 append.
- [ ] `useCompany(ticker)` 시그니처 유지(범위 추가는 옵셔널 2번째 인자). 기존 호출부 `useCompany(ticker)` 무수정.
- [ ] 신규 `/insights` 가 score_history/sector 데이터 없을 때 빈 배열/null 반환(에러 아님) → 데이터 부족 종목에서 페이지 무중단.
- [ ] toUsd 누락 점검: peer marketCap, median, total, freeCashflow, target/current price, dayHigh/Low — 위 §3 표 전 항목.

---

## 검증 근거 (실측 파일)

- `app/api/company/[ticker]/route.ts` — 전체 `.select()` 조회, toUsd 매핑, 30일 history, sectors 조인, revalidate 3600.
- `app/api/sector/[sectorId]/route.ts` — peer 집계 패턴(상관 서브쿼리 MAX(date) 조인), toUsd 후 marketCapTotal reduce.
- `app/api/statistics/companies/route.ts` / `movers/route.ts` — 메모리 마스크/정렬, region 처리, parseInt+clamp 패턴.
- `lib/currency.ts` — toUsd/접미사. `lib/region.ts` — region SoT. `lib/api-helpers.ts` — resolveIndustryFilter.
- `drizzle/schema.ts` — score_history(74일 컬럼), company_scores(beta/debtToEquity/freeCashflow 존재), daily_snapshots(dayHigh/dayLow/avgVolume).
- `hooks/use-company.ts` — queryKey `['company', ticker]`. `components/{company-detail,stock/stock-detail-page}.tsx` — 둘 다 동일 useCompany 공유(분리 결정 근거).
