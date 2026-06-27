# audit-display.md — API 응답 ↔ 화면 표시 일관성 감사

감사일: 2026-06-11 / 대상: 유료 서비스 전환 전 "사용자 눈에 보이는 숫자가 정확한가"
범위: D1 환율 SoT, D2 toUsd 전수, D3 priceChange 의미론, D4 라벨 정직성, D5 캐시/시점 표시
심각도: CRITICAL(틀린 숫자가 사용자에 노출) / HIGH(조건부로 틀림·오해) / MEDIUM(문서화·라벨) / LOW

---

## D1. 환율 SoT 분열 (S1 — 확정 이슈)

### D1-1. format.ts 하드코딩 vs currency.ts env — SoT 이원화
- **판정: 확정 결함 (CRITICAL, 조건부 발현)**
- **증거:**
  - `lib/format.ts:135` `const KRW_RATE = 1450` (하드코딩, env 무시)
  - `lib/format.ts:138` `formatKrw` 내부에서 `usdAmount * KRW_RATE` 사용
  - `lib/currency.ts:2` `KRW: Number(process.env.KRW_USD_RATE) || 1450` (env 기반)
- **메커니즘:** API는 `toUsd`로 USD 환산(env rate 사용) → 클라이언트는 그 USD에 `formatKrw`로 ×1450(하드코딩)을 곱해 ₩ 병기. `KRW_USD_RATE` env를 1450이 아닌 값(예: 1300)으로 바꾸면 **$ 표시는 env로 계산되고 ₩ 병기는 1450 고정** → 같은 카드의 $와 ₩가 서로 다른 환율을 의미. 환율을 절대 안 바꾸면 잠복하지만, 유료 서비스에서 환율 갱신은 필수 운영(S2)이라 발현 보장.
- **영향 화면(formatKrw 사용처 전수, 9개 컴포넌트):**
  | 파일:라인 | 표시 위치 |
  |---|---|
  | `components/industry-dashboard.tsx:240` | 산업 카드 총시총 ₩ 병기 |
  | `components/statistics/category-comparison-chart.tsx:77` | 카테고리 시총 차트 툴팁 |
  | `components/statistics/top-sectors-growth-chart.tsx:78` | 섹터 성장 차트 시총 |
  | `components/money-flow/flow-card.tsx:159` | 섹터 자금흐름 카드 ₩ |
  | `components/money-flow/flow-summary.tsx:36,52,99` | 총유입/총유출/순유입 ₩ |
  | `components/dashboard/price-changes-card.tsx:198` | 등락 카드 최신가 ₩ |
  | `components/dashboard/company-stats-card.tsx:99` | 기업 시총 ₩ |
  | `components/dashboard/industry-money-flow-card.tsx:241` | 산업 net flow ₩ |
  | `components/stock/stock-price-banner.tsx:85,105` | 종목 상세 가격·시총 ₩ |
- **권고 수정:** `lib/format.ts`가 환율을 직접 갖지 말고 `lib/currency.ts`에서 KRW rate를 export하여 import. 예: currency.ts에 `export function getKrwRate(): number { return CURRENCY_RATES.KRW }` 추가 → format.ts `const KRW_RATE = getKrwRate()`. 단일 SoT 확립. (`lib/currency.ts`는 `process.env` 평가가 모듈 로드 시 1회 → 서버 컴포넌트/번들 환경에서 NEXT_PUBLIC 노출 여부 확인 필요. 클라이언트 번들이면 `NEXT_PUBLIC_KRW_USD_RATE`로 노출하거나, 환율을 API 응답 meta에 실어 내려보내는 방식이 더 안전.)

### D1-2. 그 외 1450/환율 하드코딩 잔존
- **판정: 잔존 없음(코드) / 1곳(format.ts) (위 D1-1과 동일)**
- **증거:** `grep -rn "1450"` 전수 → `lib/currency.ts:2`(env 기본값), `lib/format.ts:135`(하드코딩) 2곳만. 클라이언트 컴포넌트에 별도 환율 리터럴 없음.
- **권고:** D1-1 수정으로 해소. `scripts/currency.py`(파이썬, env 기반)는 별개 SoT지만 수집 파이프라인 전용이므로 표시 일관성과 분리 — 단 env 키(`KRW_USD_RATE`)를 TS/Python이 공유하는지 운영 문서에 명시.

---

## D2. toUsd 전수 재검 (재발 2회 이력 — CLAUDE.md 체크리스트 기준)

### 라우트별 가격성 필드 × toUsd 적용 표

| 라우트 | 가격성 필드 | toUsd | 판정 |
|---|---|---|---|
| `app/api/company/[ticker]/route.ts` | marketCap, price, week52High/Low, dayHigh/Low, history.price, targetMeanPrice, freeCashflow, upsidePct(파생) | ✅ (146-210), 비율은 변환불요 주석 | PASS |
| `app/api/company/[ticker]/insights/route.ts` | peer marketCapUsd, marketCapTotalUsd, marketSharePct(파생), valuation percentile(무차원) | ✅ 행별 toUsd 후 메모리 집계(204-261), SQL SUM/ORDER BY market_cap 금지 주석 | PASS (혼합통화 집계 정석) |
| `app/api/sector/[sectorId]/route.ts` | marketCap, price, marketCapTotal(파생) | ✅ (85-113), priceChange=% 주석 | PASS |
| `app/api/search/route.ts` | price, marketCap | ✅ (86-88), priceChange=% | PASS |
| `app/api/me/summary/route.ts` | marketCap, price (워치 PnL) | ✅ (102-104) → snap은 byTicker(이미 USD) 재사용(132-134) | PASS (※주의: 아래 D2-주석) |
| `app/api/me/watchlist/route.ts` | (가격성 필드 없음 — id/key만) | — | N/A |
| `app/api/me/recently-viewed/route.ts` | (가격성 필드 없음) | — | N/A |
| `app/api/statistics/companies/route.ts` | marketCap, price | ✅ (125-126) | PASS |
| `app/api/statistics/price-changes/route.ts` | firstPrice, latestPrice, priceChange(절댓값 차이!), marketCap | ✅ 양쪽 USD 변환 후 차(155-179) | PASS (절댓값 차 정석) |
| `app/api/statistics/movers/route.ts` | price, percentChange(=%) | ✅ price만 toUsd(103), percentChange는 % | PASS |
| `app/api/statistics/sector-trend/route.ts` | marketCap(집계) | ✅ 행별 toUsd 후 집계(131) | PASS |
| `app/api/statistics/money-flow/route.ts` | flowAmount(시총델타), MFI | ✅ helper(`lib/money-flow-helpers.ts`)에서 toUsd | PASS (계산 정확, 라벨은 D4) |
| `app/api/statistics/money-flow/industries/route.ts` | startCap/endCap/netFlow(파생) | ✅ (166-167) 행별 toUsd 후 차 | PASS |
| `app/api/statistics/money-flow/[sectorId]/companies/route.ts` | startPrice, endPrice, marketCap, series price | ✅ (186-202) | PASS |
| `app/api/map/route.ts` | price, marketCap, currentSnapshot.price, priceChangeFromSnapshot(파생) | ✅ 양쪽 USD 후 비율(120,145-157) | PASS |
| `app/api/statistics/trends/route.ts` | (가격성 필드 없음 — score 추이) | — | N/A |
| `app/api/industries/route.ts` | totalMarketCap | ✅ toUsd import 확인 | PASS |
| `app/api/news/**`, `app/api/admin/**`, `app/api/cron/**`, `app/api/contact/**`, `app/api/email/**`, `app/api/debug/**` | 가격성 응답 없음 | — | N/A |

**총평: toUsd 누락(CRITICAL) 라우트 0건.** 과거 2회 재발 이슈는 현재 코드에서 전 라우트 방어됨. `lib/money-flow-helpers.ts`(174,178,266-267)도 toUsd 일관 적용.

### D2-주석. me/summary 잠재 혼란 (LOW, 버그 아님)
- **판정: 현재 PASS, 가독성 위험 LOW**
- **증거:** `app/api/me/summary/route.ts:101-106`에서 `byTicker` 맵을 USD로 정규화 → 124-135에서 `snap = byTicker.get()` 재사용. 132-134 `snap?.marketCap`는 **이미 USD**라 정상. 단, 동일 인터페이스 이름(`marketCap`)이 한 파일에서 raw→USD 변환 전후로 쓰여 향후 편집 시 raw 재대입 위험.
- **권고:** 변수/필드명에 `Usd` 접미사 권장(예: `marketCapUsd`) — 신규 작업 시 컨벤션화.

### D2-2. 클라이언트 이중변환/raw 재변환
- **판정: 없음 (PASS)**
- **증거:** `formatKrw` 호출처 9곳 모두 API의 USD 응답값을 전달(formatKrw 시그니처가 `usdAmount`). raw native를 formatKrw에 넘기는 곳 없음. 단 **D1-1의 ₩ 환율 SoT 분열**이 사실상 "이중 통화 환율 혼용"으로 발현 — D1에서 다룸.

---

## D3. priceChange 의미론 (S5)

### D3-1. daily_snapshots.price_change = % 일관성
- **판정: 일관 (PASS)**
- **증거:**
  - 스키마 `drizzle/schema.ts:59` `priceChange: real('price_change')` (= `regularMarketChangePercent`, %)
  - `app/api/statistics/movers/route.ts:34` 주석 "priceChange 는 percent 단위", 102 `percentChange: row.priceChange` (toUsd 미적용 — 정상), 표시 `formatPriceChange`(%)
  - `sector/[sectorId]/route.ts:104`, `search/route.ts:87`, `map/route.ts:121,176`, `me/summary:105` 모두 priceChange에 toUsd 미적용 + "% 통화 무관" 주석
  - 컴포넌트: `price-changes-card.tsx:193` `formatPriceChange(company.percentChange)` (% 포맷)
- **결론:** 어디서도 daily_snapshots.price_change에 toUsd를 잘못 씌우거나 절댓값 차이로 오용하는 곳 없음.

### D3-2. 파생 priceChange(첫/끝 가격 차) 이름 충돌
- **판정: 의미 분리됨, 명명 혼동 위험 MEDIUM**
- **증거:**
  - `statistics/price-changes/route.ts:160-177`: `priceChange = latestPriceUsd - firstPriceUsd` (**절댓값 USD 차이**, % 아님!) + `percentChange`(별도 %) 동시 응답
  - `daily_snapshots.priceChange`(=%)와 **같은 이름 `priceChange`가 한쪽은 %, 한쪽은 USD 절댓값 차**로 공존
  - 표시: 카드는 `percentChange`만 사용(`price-changes-card.tsx:193`)하므로 현재 화면 오류는 없음. 그러나 `priceChange`(USD 차)를 향후 `formatPriceChange`(%로 가정)에 넘기면 즉시 오표시.
- **권고:** price-changes 응답의 절댓값 차 필드를 `priceChangeAbs`(또는 `priceDeltaUsd`)로 개명하여 %형 `priceChange`와 명확히 구분. types/index.ts의 `PriceChangeItem` 동기화.

### D3-3. 표시 포맷 교차 확인
- **판정: PASS**
- **증거:** `formatPriceChange`(`format.ts:32`)=`+X.XX%`, `formatPercent`(`format.ts:91`)=`value*100` 후 `+X.X%`. **두 함수의 입력 스케일이 다름**: formatPriceChange는 이미 %인 값(예: 2.5→"+2.50%"), formatPercent는 비율(0.025→"+2.5%"). movers/price-changes의 percentChange는 이미 % → formatPriceChange 사용(정상). insights의 upsidePct/revenueGrowth 등은 비율 → formatPercent 사용(정상, `insight-hero.tsx:114`, `financial-analyst.tsx:119`).
- **잠재 위험 MEDIUM:** 같은 "퍼센트"를 두 가지 스케일·두 함수로 다루므로, 신규 필드 추가 시 ×100 누락/중복 오류 가능. types에 스케일 컨벤션 주석 권장.

---

## D4. 라벨 정직성

### D4-1. "자금 유입/유출" = 실제로는 시가총액 변화량 (S4) — HIGH
- **판정: 라벨 오해 소지 HIGH**
- **증거:**
  - `lib/money-flow-helpers.ts:206-241`: `flowAmount = endMarketCap - startMarketCap`, `flowDirection = flowAmount >= 0 ? 'in':'out'` → **표시되는 "자금 유입/유출액"은 기간 시총 차이**(거래대금/순매수 아님). MFI(177-199)는 별도 계산하나 표시 flowAmount엔 미반영.
  - `industries/route.ts:178` `netFlow = totalInflow - totalOutflow` 도 시총 델타 합.
  - UI 라벨: `flow-summary.tsx:29/45/80` "총 유입/총 유출/순 유입", `flow-card.tsx:181` "유입 ↑/유출 ↓", `industry-money-flow-card.tsx:257/264` "유입/유출", `money-flow-page-content.tsx:120/147` "자금 유입/유출 섹터", `market-pulse-strip.tsx:195` "가장 큰 자금 이동"
  - **반례(정직한 케이스):** `industry-dashboard.tsx:136` "시가총액 변화로 본 산업 단위 유입·유출" — 유일하게 정의를 밝힘.
- **이론 근거(S4):** 모든 거래는 매수=매도라 "순유입"은 측정 불가. 시총 변화는 가격 변동×주식수로, 외부 자금 유입과 다름.
- **권고:** (a) 용어를 "시총 증감"으로 바꾸거나, (b) 각 페이지에 `industry-dashboard.tsx:136`식 부제/툴팁으로 "시가총액 변화 기준" 명시. 설명 페이지(guide)에 정확한 정의 필수. 최소한 money-flow 페이지·flow-summary에 1줄 정의 추가.

### D4-2. formatKrw(netFlow) 음수 부호 소실 — MEDIUM
- **판정: 부호 혼동 MEDIUM**
- **증거:** `format.ts:138` `formatKrw`는 `Math.abs(usdAmount)*rate`. `flow-summary.tsx:99` `({formatKrw(netFlow)})` — netFlow가 음수여도 ₩는 양수로 표기. 상단 $ 표기는 `{isNetPositive ? '+':'-'}`로 부호 처리하나 ₩ 병기는 부호 없음 → "순 유입 -$X (₩Y)"에서 ₩Y가 유입처럼 읽힘.
- **권고:** formatKrw에 부호 옵션 추가하거나 호출부에서 부호 접두. 같은 패턴 `industry-money-flow-card.tsx:241`도 점검.

### D4-3. 시총 점유율 소표본 컨텍스트 (S8) — MEDIUM
- **판정: 부분 표기 (PASS-with-caveat)**
- **증거:** `sector-position.tsx:43-47` "본 종목 시총 점유율 X%" + Header에 `peerCount` 표시(132), 126 "섹터 합산 시총 ... (USD 환산 기준)". valuation-compare는 N≥4 표본에서만 percentile 산출, 부족 시 안내(`valuation-compare.tsx:45,61`). → insights 페이지는 컨텍스트 양호.
- **잔여 위험:** marketSharePct 자체는 peer N=2~3에서도 노출. "점유율" 옆에 "(섹터 N개 종목 기준)"을 점유율 라인에 직접 병기하면 더 정직(현재는 Header에 분리).
- **권고:** `sector-position.tsx:45` 점유율 라인에 peerCount 인라인 병기.

### D4-4. "패권 점수" / "상승여력" 라벨 — LOW
- **판정: PASS (정의는 /methodology 존재)**
- **증거:** "패권 점수"=scale/growth/profitability/sentiment 가중합(EMA). "목표주가 상승여력"(`insight-hero.tsx:109`)=`(targetMeanPriceUsd-currentPriceUsd)/currentPriceUsd`(`company/route.ts:116`). 라벨이 계산과 일치. 단 "상승여력"은 애널리스트 목표가 기반임을 1줄 명시 권장(financial-analyst는 이미 컨텍스트 제공).
- **권고:** 설명 페이지에 "상승여력=애널리스트 평균 목표주가 대비" 명시.

### D4-5. 단위/포맷 일관성 — MEDIUM
- **판정: 대체로 일관, 미세 불일치 MEDIUM**
- **증거:**
  - M/B/T 축약: `formatMarketCap`/`formatFlowAmount`/`formatPriceCompact` 모두 $T/$B/$M 일관. 단 `formatMarketCap`은 소수 2자리(`.toFixed(2)`), `formatFlowAmount`는 1자리(`.toFixed(1)`) → 같은 시총류 값이 페이지마다 자릿수 다름.
  - % 자릿수: `formatPriceChange` 2자리, `formatPercent` 1자리 → 등락률 표기 자릿수가 화면마다 다를 수 있음.
  - $/₩ 병기: $ 주표기 + ₩ 괄호 병기 규칙은 일관되나 D1-1로 ₩ 정확도 위험.
- **권고:** 시총류 축약 자릿수 통일(권장 2자리 또는 컨텍스트별 규칙 문서화). % 자릿수 정책 1개로.

---

## D5. 캐시/시점 표시

### D5-1. revalidate=3600 (최대 1시간 stale) + 데이터 기준일 표기 누락 — HIGH
- **판정: 주요 페이지 시점 미표기 HIGH**
- **증거:**
  - 전 statistics/map/company/sector/industries 라우트 + `app/stock/[ticker]/page.tsx` 모두 `revalidate = 3600`(코드 14곳). 데이터 자체도 일 1회 수집(cron) → 화면 숫자는 "오늘 실시간"이 아니라 "최근 스냅샷".
  - **표기 있는 화면:** `industry-dashboard.tsx:67` `lastUpdated · KST`, `hegemony-map.tsx:108` "{날짜} 기준 데이터를 보고 있습니다."
  - **표기 없는 화면(전수 grep 결과):**
    - `components/money-flow/money-flow-page-content.tsx` — 기준일/업데이트 표기 없음
    - `components/price-changes/price-changes-page-content.tsx` — 없음(line 84는 "정렬 기준" aria-label, 무관)
    - `components/statistics/*.tsx` (category-comparison-chart, top-sectors-growth-chart 등) — 없음
    - 종목 상세 banner는 snapshot.date 표시 여부 추가 확인 필요(현재 grep 미검출)
- **권고:** 데이터 기준일(daily_snapshots latest date)을 money-flow·price-changes·statistics 페이지 헤더에 "YYYY-MM-DD 기준" 1줄 표기. 유료 서비스 신뢰 필수. dashboard·hegemony-map 패턴 재사용.

### D5-2. 스냅샷 시점 시차(KR 15:30 KST vs US 16:00 ET 동일 date 저장, S7) — MEDIUM
- **판정: 화면 미설명 MEDIUM (이론 감사와 연계)**
- **증거:** 같은 `date`로 KR/US 저장 → cron 시점에 따라 한쪽이 장중 가격일 수 있음. 화면엔 단일 "기준일"만 표기 예정이라 시장별 시차 안내 없음.
- **권고:** 설명 페이지에 "한국/미국 시장 마감 시각 차이로 같은 날짜라도 수집 시점이 다를 수 있음" 명시. (코드 수정보다 문서화 우선.)

---

## 수정 필요 목록 (파일:라인, 우선순위순 — 구현자 즉시 집행용)

### P0 (CRITICAL — 틀린 숫자 노출 가능)
1. **환율 SoT 일원화** — `lib/format.ts:135` `const KRW_RATE = 1450` 제거 → `lib/currency.ts`의 KRW rate를 import.
   - `lib/currency.ts`에 `export function getKrwRate()` 추가, 클라이언트 번들 노출 위해 `NEXT_PUBLIC_KRW_USD_RATE` 도입 또는 API meta로 rate 전달 검토. (sk-data-modeler와 env 키 합의)
   - 영향 검증 대상 9개 컴포넌트(D1-1 표) 표시값 회귀 확인.

### P1 (HIGH — 오해 유발)
2. **money-flow 라벨 정직화** — `components/money-flow/money-flow-page-content.tsx:120,147`, `components/money-flow/flow-summary.tsx:29,45,80`, `components/money-flow/flow-card.tsx:181`, `components/dashboard/industry-money-flow-card.tsx:257,264`, `components/dashboard/market-pulse-strip.tsx:195`: "시가총액 변화 기준" 부제/툴팁 추가(=`industry-dashboard.tsx:136` 패턴).
3. **데이터 기준일 표기 추가** — `components/money-flow/money-flow-page-content.tsx`, `components/price-changes/price-changes-page-content.tsx`, `components/statistics/*.tsx` 헤더에 "YYYY-MM-DD 기준" 1줄. (dashboard:67 / hegemony-map:108 재사용)

### P2 (MEDIUM — 명명·부호·일관성)
4. **priceChange 절댓값 차 필드 개명** — `app/api/statistics/price-changes/route.ts:169-177` `priceChange`(USD 절댓값 차) → `priceChangeAbs`/`priceDeltaUsd`, `types/index.ts` `PriceChangeItem` 동기화. (%형 priceChange와 충돌 제거)
5. **formatKrw 음수 부호** — `lib/format.ts:137-143` 부호 처리 옵션 추가 또는 호출부(`flow-summary.tsx:99`, `industry-money-flow-card.tsx:241`) 부호 접두.
6. **시총 점유율 소표본 인라인 표기** — `components/stock/insights/sector-position.tsx:45` 점유율 라인에 `(섹터 {peerCount}개 종목 기준)` 병기.
7. **축약 자릿수 통일** — `lib/format.ts` `formatMarketCap`(2자리) vs `formatFlowAmount`(1자리), `formatPriceChange`(2자리) vs `formatPercent`(1자리) 정책 통일.

### P3 (LOW — 문서/가독성)
8. me/summary 등 USD 정규화 필드 `Usd` 접미사 컨벤션화(`app/api/me/summary/route.ts:124-135`).
9. 설명 페이지(guide)에 명시: 자금흐름 정의(시총 변화·순유입 측정 불가, S4), 환율 고정값, 데이터 일 1회+시장별 시차(S7), 상승여력=애널리스트 목표가 기반, 점유율 소표본.

---

## 총평
- **toUsd 적용은 전 라우트에서 누락 0건(D2 PASS)** — 과거 2회 재발 버그는 현재 코드에서 방어됨.
- **단일 확정 CRITICAL은 D1 환율 SoT 분열** — env 환율 갱신 순간 $·₩ 불일치 발현. P0 즉시 수정.
- 나머지는 "숫자는 맞으나 의미가 오해될" 라벨/시점 표기 문제(D4-1 자금흐름, D5-1 기준일) — 유료 신뢰의 핵심이므로 P1.
