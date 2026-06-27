# 07_market_scope — 필터 체인·API·캐시 키·하위호환 기획 (sk-filter-architect)

> 작성: 2026-06-10 · 근거: 실제 grep/read 검증 (라인 번호 명시)
> 단일 진실 공급원(SoT): `lib/region.ts`, 직교 합성 헬퍼: `lib/api-helpers.ts::resolveIndustryFilter`

---

## 0. 핵심 결론 (TL;DR)

1. **`?region=global` 쿼리값·`'INTL'` DB값을 그대로 유지한다 (권장).** 비US/KR 제거 후 INTL이 "순수 미국"이 되므로, **의미만 재정의**하고 식별자는 바꾸지 않는다. 이렇게 하면 저장된 쿼리·북마크·React Query `queryKey` 캐시·8개 hook·11개 라우트가 **코드 변경 없이** 살아남는다.
2. 바뀌는 것은 **라벨뿐**: UI "해외" → "미국" (ui-planner 협의). 쿼리값 `global`, DB값 `INTL`은 불변.
3. 필터 체인(`industryId → categoryIds → sectorIds → tickers` × region)은 **구조 변경 없음**. 제거 22종목이 빠지면서 결과 수만 감소 → 빈 섹터/빈 결과 처리만 점검.
4. 시총 랭킹 도입 시 정렬은 **이미 모두 `toUsd` 변환 후 메모리에서 수행** 중 (검증 완료) — 신규 정렬 추가 시 동일 패턴 강제.

---

## 1. region 필터 의미 재정의 영향

### 1.1 현재 region 모델 (lib/region.ts 검증)

| 레이어 | 값 | 정의 |
|--------|-----|------|
| DB 컬럼 `companies.region` | `'KR' \| 'INTL'` (`RegionValue`, L40) | `getRegionFromTicker` 백필 캐시 |
| URL/UI/API 쿼리 `?region=` | `'all' \| 'kr' \| 'global'` (`RegionFilter`, L43) | 사용자 토글 |
| 매핑 | `regionFilterToValue` (L151-155) | `all→null`, `kr→'KR'`, `global→'INTL'` |
| 판정 SoT | `getRegionFromTicker` (L59-61) | `.KS/.KQ → KR`, 그 외 → INTL |

비US/KR 22종목(.T/.HK/.TW/.PA/.DE/.SW/.MC/.AX) 제거 후 → **INTL = 미국 only**가 자연 성립. `getRegionFromTicker`는 "KR 접미사가 아니면 INTL"이라 **제거 후에도 함수 로직 무수정으로 정확**하다 (남은 INTL = 모두 미국).

### 1.2 식별자 유지 vs 변경: 의사결정

| 옵션 | 쿼리값 | DB값 | 영향 | 평가 |
|------|--------|------|------|------|
| **A. 식별자 유지 (권장)** | `global` 유지 | `INTL` 유지 | 라벨만 "미국"으로. 코드 0줄 변경 | **하위호환 100%** |
| B. `us`로 rename | `global→us` | `INTL→US` | 8 hook + 11 라우트 + 토글 + 마이그레이션 + 저장된 북마크 깨짐 | 고비용·고위험 |

**옵션 A 채택 근거 (하위호환 분석):**
- **저장된 쿼리/북마크**: 사용자가 `?region=global`을 북마크했거나 공유 링크가 유포된 경우, B안은 404/빈결과 또는 `resolveRegion`의 silent fallback(`all`)로 의미가 바뀐다. A안은 그대로 동작.
- **queryKey 캐시**: 8개 hook 모두 `region`을 queryKey 멤버로 사용 (예: `['money-flow', period, limit, industryId, region]`, use-money-flow.ts L17). 값이 바뀌면 기존 캐시 전부 miss → 동일 데이터 재요청. A안은 캐시 연속성 유지.
- **`appliedRegion` 응답 필드**: types/index.ts에 9곳 (`appliedRegion?: RegionFilter`). 클라이언트가 이 값으로 토글 상태를 표시 → B안은 클라/서버 동시 배포 필요. A안은 무관.

### 1.3 변경 필요 지점 목록 (옵션 A 기준)

| 심볼/파일 | 변경 필요 | 내용 |
|-----------|-----------|------|
| `REGION_FILTERS` (region.ts:46) | **불변** | `['all','kr','global']` 순서·값 유지 |
| `regionFilterToValue` (region.ts:151) | **불변** | `global→'INTL'` 유지 |
| `applyRegionFilter` (region.ts:74) | **불변** | `!isKrTicker` = INTL = 미국. 로직 정확 |
| `matchesRegion` (region.ts:109) | **불변** | 동일 |
| `getRegionFromTicker` (region.ts:59) | **불변** | KR 접미사 기준. 제거 후 정확 |
| `RegionToggle` OPTIONS (region-toggle.tsx:32-36) | **라벨만** | `{ value:'global', label:'해외'→'미국', icon:Earth, ariaLabel:'해외..'→'미국 종목만 보기' }` (ui-planner 합의) |
| `EmptyRegionState` (empty-region-state.tsx:12) | **라벨만** | `region==='global' ? '해외'→'미국'` |
| `hegemony-map.tsx:48` | **검토** | `region==='global'`일 때 `KR_ONLY_CATEGORY_IDS` 숨김 → 미국 한정과 의미 동일, 무수정 |
| `lib/region.ts` JSDoc (L27,55,149) | **주석만** | "global→INTL(미국)" 의미 명시 추가 (선택) |
| 비US/KR 행 물리 제거 | **데이터** | sk-data-modeler/ticker-curator 영역 — INTL=미국 불변식이 데이터로 보장되어야 함 |

> **주의**: 식별자 유지 시, 향후 일본/유럽 재도입 가능성이 사라진 것이 아니라 "현재 INTL의 외연이 미국으로 좁혀진 것"임을 region.ts JSDoc에 1줄 명시. ADR(예: TSM, JD, LVMUY)은 미국 상장이므로 `getRegionFromTicker`상 INTL로 정확히 분류된다 (접미사 없음).

---

## 2. 제거 종목으로 인한 필터 결과 변화

### 2.1 결과 수 변화

- `?region=global`(미국) 결과에서 22종목이 사라짐. 일부 섹터는 글로벌 패권 기업(TSMC/LVMH/ASML류)이 사라져 **대표 종목 공백** 발생 가능 (컨텍스트 §27-40).
- `?region=kr` 결과: **무변화** (KR 종목은 제거 대상 아님).
- `?region=all` 결과: 22종목만큼 감소.
- **빈 섹터 가능성**: `.PA`(럭셔리/명품 섹터에 집중) 또는 `.T`(일본 반도체 장비)가 한 섹터를 독점했다면 해당 섹터가 0건이 됨 → ticker-curator의 ADR 대체 여부에 의존.

### 2.2 빈 섹터/빈 결과 처리 (이미 구현됨 — 검증 완료)

| 라우트 | 빈 결과 처리 | 근거 |
|--------|-------------|------|
| money-flow | `uniqueTickerList.length===0` → 빈 flows + `appliedRegion` 반환 | route.ts L58-72 |
| money-flow/[sectorId]/companies | region 필터 후 빈 → 빈 응답 | route.ts L118-137 |
| price-changes | tickers 0건 → `{ companies:[], total:0 }` | route.ts L49,95 |
| money-flow/industries | sectorCompanies 0건 → 빈 industries | route.ts L33,128,144 |
| map | sector별 tickers 0건이면 해당 섹터 빈 배열 | route.ts L128-140 |

UI 측: `EmptyRegionState` 컴포넌트(empty-region-state.tsx)가 빈 결과 표시 담당. 제거로 **빈 섹터가 늘어날 수 있으므로 ui-planner에게 "섹터 단위 빈 상태" 노출 정책 확인 요청** (현재는 페이지 단위 빈 상태만 존재).

### 2.3 industry × region 교차 적용 지점 재확인 (검증 완료)

`getIndustryFilter` (industry.ts:11-67)는 region을 모름 — **단일 책임 유지**. region 직교 합성은 호출부에서:

| 합성 방식 | 라우트 | 근거 |
|-----------|--------|------|
| **메모리 마스크** `applyRegionFilter(filter.tickers, region)` | map (industry 지정 시) | map/route.ts L34-36 |
| **메모리 마스크** `matchesRegion(ticker, region)` | map(industry 미지정), movers, price-changes, companies, money-flow/[sectorId]/companies | 각 route.ts |
| **SQL JOIN** `WHERE companies.region = regionValue` | money-flow(via getSectorsWithTickers), industries, money-flow/industries, sector-trend, trends helpers | money-flow-helpers.ts L75-81 외 |

> **SoT 일관성 규약(region.ts L18-24)**: 두 경로(SQL JOIN ↔ 메모리 마스크)는 항상 동등해야 함. 22종목 물리 제거 후 `companies.region` 백필이 누락되면 두 경로가 갈라진다 → **sk-data-modeler가 제거/대체 시 `companies.region` 재백필 + `assertRegionConsistency`(region.ts:126) 1회 실행 권장**.

---

## 3. 데이터 수집 기준이 필터에 주는 영향 (시총 랭킹)

### 3.1 정렬·상위 N 적용 위치 (쿼리 vs 메모리) — 전수 검증

| 라우트 | 정렬 키 | 위치 | toUsd 순서 | 근거 |
|--------|---------|------|-----------|------|
| price-changes | `percentChange\|name\|marketCap` | **메모리** `[...].sort` | marketCap을 **toUsd 변환 후** snapshotIndex/마지막에 저장 → 그 값으로 정렬 | route.ts L179(변환), L184-194(정렬) ✅ |
| statistics/companies | `count\|marketCap\|name` | **메모리** `[...].sort` | `latestSnapshot.marketCap`이 **toUsd 변환된 값** | route.ts L125(변환), L143-150(정렬) ✅ |
| money-flow | flowAmount 절댓값 | **메모리** `[...sectorFlows].sort` | flowAmount는 `toUsd(typicalPrice*volume)` 누적값 | route.ts L86-88; helpers L174,178 ✅ |
| movers | `priceChange` 절댓값(%) | **메모리** | %라 통화 무관, price만 toUsd | route.ts L92-101 ✅ |
| hegemony-map(클라) | marketCap desc | **클라 메모리** | API가 이미 toUsd한 marketCap 사용 | hegemony-map.tsx L53 ✅ |

### 3.2 시총 기준 데이터 수집/랭킹 도입 시 가드

- **불변식**: marketCap 정렬은 **반드시 `toUsd(marketCap, ticker)` 변환 후** 수행. 네이티브 통화(원/엔/유로)로 정렬 시 KR·일본·유럽 종목이 환율 차로 부풀려져 잘못된 상위 N이 나온다 (이중환산 버그 클래스, CLAUDE.md 통화 규칙).
- 현재 모든 marketCap 정렬은 메모리 단계라 toUsd 후 정렬이 자연스럽게 보장됨. **신규 "시총 상위 N 수집" 로직을 SQL `ORDER BY market_cap`로 구현하면 위반** → SQL 정렬 금지, 메모리 정렬 강제. (단 미국 only로 좁힌 region=global 한정이면 모두 USD라 SQL 정렬도 안전하지만, KR 혼재 `all`에서는 금지.)
- 데이터 수집 기준(시총 상위 N만 시드) 자체는 sk-data-modeler/ticker-curator 영역. **필터 레이어 영향은 "수집 모수가 줄면 region 필터 결과도 함께 줄어든다"는 종속성뿐** — 필터 코드 변경 불요.

---

## 4. 영향받는 API 라우트·hook 전수 목록

### 4.1 API 라우트

| 라우트 | region 사용 | 적용 방식 | 변경 필요 | 비고 |
|--------|:----------:|----------|:--------:|------|
| `statistics/money-flow` | O | getSectorsWithTickers(SQL JOIN) | X | 의미만 재정의 |
| `statistics/money-flow/industries` | O | SQL `region=` | X | L78 |
| `statistics/money-flow/[sectorId]/companies` | O | matchesRegion(메모리) | X | L121 |
| `statistics/price-changes` | O | matchesRegion(메모리) | X | L38 |
| `statistics/movers` | O | matchesRegion(메모리) | X | L89 |
| `statistics/trends` | O | helper opts `{region}`(SQL) | X | L64-79 |
| `statistics/sector-trend` | O | SQL `region=` | X | L90 |
| `statistics/companies` | O | matchesRegion(메모리) | X | L60 |
| `industries` | O | SQL `region=` | X | L71,110 |
| `map` | O | applyRegionFilter + matchesRegion | X | L34,137 |
| `search` | **X** | — | **검토** | region 미적용 — 4.3 참조 |
| `company/[ticker]` | **X** | — | X | 단일 티커 상세, region 무관 |
| `sector/[sectorId]` | **X** | — | 검토 | 섹터 내 회사 목록 — region 토글 영향 여부 ui-planner 확인 |

→ **region 로직 코드 변경이 필요한 라우트: 0개** (옵션 A). 모두 의미 재정의로 흡수.

### 4.2 Hooks (queryKey에 region 포함 — 전수 검증)

| hook | queryKey (region 포함) | 변경 필요 | 근거 |
|------|------------------------|:--------:|------|
| use-money-flow | `['money-flow', period, limit, industryId, region]` | X | L17 |
| use-price-changes | `['price-changes', sort, order, industryId, region, days]` | X | L18 |
| use-daily-movers | `['daily-movers', region, limit]` | X | L22 |
| use-map-data | `['map', date, industryId, region]` | X | L16 |
| use-statistics(companies) | `['statistics','companies', sort, order, page, limit, industryId, region]` | X | L33 |
| use-statistics(trends) | `['statistics','trends', type, idsKey, days, industryId, region]` | X | L74 |
| use-sector-trend | `['sector-trend', industryId, region]` | X | L15 |
| use-sector-companies | `['sector-companies', sectorId, period, region]` | X | L19 (서버 region 분기는 미구현, 캐시 격리만) |
| use-industry-money-flow | `['industry-money-flow', period, region]` | X | L16 |
| use-industries | `['industries', region]` | X | L14 |
| use-region (URL sync) | — | X | VALID_REGIONS `['all','kr','global']` 유지 (L43) |

→ **hook 코드 변경 필요: 0개** (옵션 A).

### 4.3 캐시 무효화 전략

- **옵션 A 채택 시 queryKey 무효화 불요** — 식별자 불변이므로 기존 캐시가 새 데이터(22종목 제거 반영)와 자연 정합. 단, 22종목 제거는 **DB 변경**이므로 클라이언트의 stale 캐시는 다음 fetch에서 갱신됨. `revalidate=3600`(서버 캐시, money-flow/map/movers 등)이라 **최대 1시간 stale** 가능 → 배포 직후 `revalidatePath`/`revalidateTag` 또는 재배포로 서버 캐시 즉시 무효화 권장.
- **search 라우트 검토(4.1)**: 검색은 전체 종목 대상이므로, 미국·한국 only 정책 적용 후에도 22종목이 검색 결과/모달(`CompanyDetail`)에 뜨면 안 됨. 22종목 물리 제거가 완료되면 search도 자동으로 빠짐 → **별도 region 필터 불요, 단 데이터 제거 완료가 전제**. ticker-curator/data-modeler에 "검색 인덱스 = sectorCompanies/companies 기준"임을 확인.

---

## 5. 하위호환 가드 (옵션 A)

### 5.1 검증 시나리오

| # | 시나리오 | 기대 | 검증법 |
|---|----------|------|--------|
| BC-1 | `GET /api/map?region=global` (기존 북마크) | 200 + 미국 종목만 (22 제외) + `appliedRegion:'global'` | curl/통합테스트 |
| BC-2 | `GET /api/statistics/movers?region=global` | 미국 종목, KR·22종목 없음 | 응답 ticker 검사 |
| BC-3 | `?region=jp` 같은 알 수 없는 값 | `resolveRegion` → `'all'` fallback (region.ts L90-98) | 단위테스트 |
| BC-4 | region 미지정 (`?industry=tech`) | `region='all'`, 기존 동작 동일 | api-helpers L36 |
| BC-5 | queryKey 캐시 연속성 | `region='global'` 캐시가 배포 후에도 같은 키로 hit | React Query devtools |
| BC-6 | `appliedRegion` 응답 | 9개 응답 타입 모두 `'global'` 그대로 | types/index.ts |
| BC-7 | SQL 경로 ↔ 메모리 경로 동등 | `region=global` 결과가 두 경로에서 동일 종목 집합 | `assertRegionConsistency` + 라우트 교차검증 |

### 5.2 회귀 위험

- **유일한 깨짐 후보 = `companies.region` 백필 누락**. 22종목 삭제 시 남은 INTL이 모두 미국임을 데이터로 보장해야 SQL 경로(`WHERE region='INTL'`)와 메모리 경로(`!isKrTicker`)가 일치. data-modeler가 삭제/대체 후 일관성 검사 필수.
- ADR 대체 종목(TSM, JD, LVMUY 등)은 접미사 없음 → `getRegionFromTicker`상 INTL → SQL/메모리 양쪽 자동 일치. **추가 region 매핑 불요**.

---

## 6. 다른 영역 의존

| 협업 대상 | 합의 필요 사항 | 필터 레이어 영향 |
|-----------|----------------|------------------|
| **sk-data-modeler** | region 모델 A/B안 중 **A(식별자 유지)** 채택 합의. 22종목 삭제/ADR 대체 후 `companies.region` 재백필 + `assertRegionConsistency` 실행. INTL=미국 불변식 보장 | 백필 누락 시 SQL↔메모리 경로 분기(§2.3, §5.2) |
| **sk-ticker-curator** | ADR 대체 종목의 region 분류 = INTL(접미사 없음) 자동. 빈 섹터 발생 섹터 목록 제공 | 빈 섹터/대표공백(§2.1) |
| **sk-ui-planner** | RegionToggle 라벨 "해외→미국", ariaLabel·EmptyRegionState 라벨 합의. **토글이 보내는 쿼리값은 `global` 유지**(라벨만 변경). 섹터 단위 빈 상태 노출 정책 | region-toggle.tsx L35, empty-region-state.tsx L12 |

### 6.1 ui-planner에 보내는 명시적 계약
- 토글 3옵션 값 = `'all' | 'kr' | 'global'` (불변). 라벨만 `전체 / 국내 / 미국`.
- `setRegion`은 URL `?region=global`을 그대로 생성 (use-region.ts L74-86 무수정).
- `appliedRegion` 응답값으로 토글 활성 표시 (현행 유지).

---

## 부록: 수정 대상 파일 요약 (옵션 A)

**코드 로직 변경 0건.** 라벨/주석만:
- `components/region-toggle.tsx:35` — `label:'해외'→'미국'`, `ariaLabel` 동반 수정 (ui-planner 주도)
- `components/ui/empty-region-state.tsx:12` — `'해외'→'미국'`
- `lib/region.ts` JSDoc L27,55,149 — "INTL=미국(비KR)" 의미 1줄 명시 (선택)
- (데이터) 22종목 제거 + `companies.region` 백필 — data-modeler 영역
