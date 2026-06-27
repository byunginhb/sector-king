# 10_currency_toggle — 표시 지점 전수 인벤토리 + 토글 배치 설계 (sk-ui-planner)

실측 기준일: 2026-06-14. 조사 방법: `grep -rn` (format 함수 5종 + 하드코딩 `$` + `원` + `tickFormatter`) → 후보 파일 전수 read.

## TL;DR
- **DB·API·React Query 캐시 변경 불필요.** API는 이미 전부 USD. 이 작업은 순수 "표시 레이어 전환".
- 통화 전환 필요 표시 지점 = **포맷함수 호출 47곳 + 포맷함수 밖 하드코딩 15곳 + 차트 축/툴팁 3곳 = 총 65개 표시 지점**, 분포 **23개 파일**.
- 핵심 전환 레버는 `lib/format.ts`의 4함수(`formatMarketCap`/`formatPrice`/`formatPriceCompact`/`formatFlowAmount`)를 통화 인지로 만드는 것 — 이것만으로 47곳 중 대부분이 자동 전환.
- 별도 손봐야 하는 예외: **로컬 포맷 함수 2개**(`flow-river.tsx`, `sector-company-list.tsx`), **차트 직접 `$`**(`price-chart.tsx`), **이중병기 9곳(formatKrw)**.

---

## 1. 표시 지점 전수 표

범례 — 통화전환 필요: ✅필요 / ❌불요(% · 무단위 · 점수)
표시: 시총=시가총액, 가=주가, 흐름=자금흐름액, 목표가/52주/FCF 등 명시.

### 1-A. `lib/format.ts` 함수 호출 (코어 레버)

| 파일:라인 | 표시 내용 | 현재 포맷 | 전환 | 비고 |
|---|---|---|---|---|
| components/company-badge.tsx:96 | 시총 | formatMarketCap | ✅ | 섹터 카드 내 회사 배지. hegemony-map 자식 |
| components/dashboard/company-stats-card.tsx:95 | 시총 | formatMarketCap | ✅ | 대시보드 |
| components/dashboard/company-stats-card.tsx:99 | 시총(₩병기) | formatKrw | ✅ | **이중병기** |
| components/dashboard/industry-money-flow-card.tsx:236 | 흐름 순액 | formatFlowAmount | ✅ | 대시보드 |
| components/dashboard/industry-money-flow-card.tsx:244 | 흐름(₩병기) | formatKrw signed | ✅ | **이중병기** |
| components/dashboard/industry-money-flow-card.tsx:262 | 유입액 | formatFlowAmount | ✅ | |
| components/dashboard/industry-money-flow-card.tsx:269 | 유출액 | formatFlowAmount | ✅ | |
| components/dashboard/market-pulse-strip.tsx:184 | 핫섹터 흐름 | formatFlowAmount | ✅ | 대시보드 상단 스트립 |
| components/dashboard/market-pulse-strip.tsx:215 | 최대변동 순액 | formatFlowAmount | ✅ | |
| components/dashboard/market-pulse-strip.tsx:281 | 시총(애니 카운터 v) | formatMarketCap | ✅ | count-up 값 포맷 |
| components/dashboard/price-changes-card.tsx:196 | 가(compact) | formatPriceCompact | ✅ | **유일한 formatPriceCompact 사용처** |
| components/dashboard/price-changes-card.tsx:198 | 가(₩병기) | formatKrw | ✅ | **이중병기** |
| components/global-search.tsx:163 | 시총 | formatMarketCap | ✅ | 글로벌 검색 결과 행 |
| components/industry-dashboard.tsx:232 | 산업 총시총 | formatMarketCap | ✅ | 메인 산업 카드 |
| components/industry-dashboard.tsx:240 | 산업 총시총(₩병기) | formatKrw | ✅ | **이중병기** |
| components/industry-dashboard.tsx:305 | 자금1위 흐름(toast 텍스트) | formatFlowAmount | ✅ | 알림 문구 |
| components/money-flow/flow-card.tsx:151 | 섹터 흐름액 | formatFlowAmount | ✅ | money-flow |
| components/money-flow/flow-card.tsx:159 | 흐름(₩병기) | formatKrw | ✅ | **이중병기** |
| components/money-flow/flow-summary.tsx:36 | 총유입 | formatFlowAmount | ✅ | money-flow 요약 |
| components/money-flow/flow-summary.tsx:39 | 총유입(₩병기) | formatKrw | ✅ | **이중병기** |
| components/money-flow/flow-summary.tsx:52 | 총유출 | formatFlowAmount | ✅ | |
| components/money-flow/flow-summary.tsx:55 | 총유출(₩병기) | formatKrw | ✅ | **이중병기** |
| components/money-flow/flow-summary.tsx:93 | 순액 | formatFlowAmount | ✅ | |
| components/money-flow/flow-summary.tsx:102 | 순액(₩병기) | formatKrw signed | ✅ | **이중병기** |
| components/money-flow/sector-company-list.tsx:224 | 시총 | formatMarketCap(로컬!) | ✅ | **로컬 함수**, 1-C 참조 |
| components/money-flow/sector-company-list.tsx:203 | 가 | formatPrice(로컬!) | ✅ | **로컬 함수**, 1-C 참조 |
| components/price-changes/price-change-table.tsx:83 | 시작가 | formatPrice | ✅ | price-changes |
| components/price-changes/price-change-table.tsx:91 | 최신가 | formatPrice | ✅ | |
| components/price-changes/price-change-table.tsx:108 | 시총 | formatMarketCap | ✅ | |
| components/statistics/category-comparison-chart.tsx:77 | 시총(툴팁, $+₩병기) | formatMarketCap+formatKrw | ✅ | **이중병기**, 차트 툴팁 |
| components/statistics/company-ranking-table.tsx:150 | 시총 | formatMarketCap | ✅ | statistics |
| components/statistics/top-sectors-growth-chart.tsx:78 | 시총 start→end($+₩병기) | formatMarketCap+formatKrw | ✅ | **이중병기**, 차트 툴팁 |
| components/stock/insights/financial-analyst.tsx:64 | FCF | formatMarketCap | ✅ | 종목 인사이트 |
| components/stock/insights/financial-analyst.tsx:116 | 목표가 | formatPrice | ✅ | |
| components/stock/insights/insight-hero.tsx:65 | 52주 저가 | formatPrice | ✅ | |
| components/stock/insights/insight-hero.tsx:66 | 52주 고가 | formatPrice | ✅ | |
| components/stock/insights/insight-hero.tsx:118 | 컨센서스 목표가 | formatPrice | ✅ | |
| components/stock/insights/sector-position.tsx:127 | 섹터 합산 시총 | formatMarketCap | ✅ | "(USD 환산 기준)" 문구 동반 → 5절 |
| components/stock/stock-price-banner.tsx:81 | 주가 | formatPrice | ✅ | 종목 페이지+모달 공용 배너 |
| components/stock/stock-price-banner.tsx:85 | 주가(₩병기) | formatKrw | ✅ | **이중병기** |
| components/stock/stock-price-banner.tsx:104 | 시총 | formatMarketCap | ✅ | |
| components/stock/stock-price-banner.tsx:105 | 시총(₩병기) | formatKrw | ✅ | **이중병기** |
| app/stock/[ticker]/opengraph-image.tsx:39 | 시총(OG 이미지) | formatMarketCap | ⚠️ | 서버 렌더, 토글 불가 → 4절 |

소계: 함수 호출 표시 지점 **44곳** (formatKrw 이중병기 9곳 포함, OG 1곳 포함).
formatKrw 이중병기 9곳 = company-stats-card:99, industry-money-flow-card:244, price-changes-card:198, industry-dashboard:240, flow-card:159, flow-summary:39/55/102, stock-price-banner:85/105, category-comparison-chart:77, top-sectors-growth-chart:78 — (컨텍스트의 "9곳" 정의는 ₩만 카운트, 차트 2곳 포함 시 11 호출).

### 1-B. 차트 축/툴팁 직접 `$` 하드코딩 (포맷함수 밖)

| 파일:라인 | 표시 내용 | 현재 포맷 | 전환 | 비고 |
|---|---|---|---|---|
| components/price-chart.tsx:64 | Y축 가격눈금 | `` `$${value.toFixed(0)}` `` | ✅ | tickFormatter 직접 `$` |
| components/price-chart.tsx:72 | 툴팁 가격 | `` `$${numValue.toFixed(2)}` `` | ✅ | |

소계: **2곳**. (price-chart는 종목 페이지/모달 시계열 차트.)

### 1-C. 로컬 포맷 함수 (lib/format 미사용 — 별도 수정 필수)

| 파일:라인 | 표시 내용 | 현재 포맷 | 전환 | 비고 |
|---|---|---|---|---|
| components/money-flow/flow-river.tsx:17 | 흐름액 T | `` `$${(/1e12)}T` `` | ✅ | 자체 함수. lib formatFlowAmount로 교체 권장 |
| components/money-flow/flow-river.tsx:20 | 흐름액 B | `$..B` | ✅ | |
| components/money-flow/flow-river.tsx:23 | 흐름액 M | `$..M` | ✅ | |
| components/money-flow/flow-river.tsx:25 | 흐름액 raw | `$..toLocaleString` | ✅ | |
| components/money-flow/sector-company-list.tsx:20-24 | 가 (로컬 formatPrice) | `$..` 3분기 | ✅ | lib formatPrice로 교체 권장 |
| components/money-flow/sector-company-list.tsx:27-32 | 시총 (로컬 formatMarketCap) | `$..T/B/M` | ✅ | lib formatMarketCap로 교체 권장 |

소계: 로컬 함수 정의 라인 **13곳**(flow-river 4 + sector-company-list 9). 실제 표시 호출은 1-A에 카운트됨. **권장: 로컬 함수 삭제 후 통화 인지 lib 함수로 통일** → 누락 위험 제거.

### 1-D. 통화 무관 (변경 금지 — 오변환 방지)

| 패턴 | 파일 예 | 사유 |
|---|---|---|
| `% (priceChange/percentChange)` | company-badge:102/110, price-change-table:104, price-changes-card:193, company-ranking-table:163, global-search:177, ticker-tape:78, my-watchlist-card:170 | 비율 |
| 차트 `%` tickFormatter | price-change-chart:56/68, company-trend-chart:93/99, sector-trend-chart:92/101, top-sectors-growth-chart:57, sector-trend-section:257/268 | 등락율 축 |
| 점수 `점` | score-trend-chart:147, stock-score-analysis, scoring-diagram, sector-position:112(%점유율) | 패권 점수 |
| 무단위 K/B/M (주식수/흐름값 아님) | sector-trend-section:46-48 | **확인 필요**: sector-trend 차트는 시총 변화 절대액일 수 있음 → 1-E |
| volume/PER/PEG/ROE/beta/D&E | financial-analyst 등 | 무차원 |

### 1-E. 회색지대 — 추가 확인 권장 (구현 단계)

| 파일:라인 | 의심 표시 | 판단 |
|---|---|---|
| components/sector-trend/sector-trend-section.tsx:46-48 | `${(/1e9)}B/M/K` (`$` 없음) | sector-trend가 **시총 절대액**이면 통화전환 필요. 단 축 라벨이 %면 불요. 데이터 의미 확인 후 결정. **현재 `$`/통화기호 없음 → 단위만 표기 중이라 시각적 영향 적음.** |
| components/statistics/category-comparison-chart.tsx:60-63 | Y축 `${/1e12}T/B/M` (`$` 없음) | 시총 축. **₩ 모드 시 단위(조/억) 불일치** → 통화 인지 tickFormatter 필요. ✅ |

---

## 2. 이중표기 → 단일표기 정책

### 현황
9~11곳이 `$1.82M (1.8조원)` 형태로 USD 주표기 + ₩ 괄호 병기 중(1-A의 formatKrw 라인).

### 권장안: **(a) 선택 통화 단일 표기로 통일**
- 토글이 ₩면 `1.8조원`만, $면 `$1.82M`만 노출. 괄호 병기 제거.
- 근거:
  1. 사용자 요구사항 1·2 = "선호 표기로 전체를 본다" → 단일 표기가 의도에 부합.
  2. 이중병기는 토글의 존재 이유를 약화(둘 다 보이면 토글 무의미).
  3. 차트 툴팁(category-comparison:77, top-sectors-growth:78)의 `$X (Y조원)`은 모바일에서 가독성 저하 → 단일화가 레이아웃에도 유리.
  4. `_context.md` 공통 원칙 "선택 통화 1개만 노출"과 일치.

### 영향 화면(이중병기 제거 대상)
- 대시보드: company-stats-card, price-changes-card, industry-money-flow-card, industry-dashboard
- money-flow: flow-card, flow-summary(×4)
- statistics 차트 툴팁: category-comparison-chart, top-sectors-growth-chart
- 종목: stock-price-banner(주가·시총)

### 구현 함의 (sk-data-modeler `format-layer.md`와 정합)
- `formatKrw` 호출 라인은 **삭제**하고, 주표기 함수(formatMarketCap/Price/FlowAmount)가 현재 통화를 인지해 ₩/`$`를 알아서 출력하도록 한다.
- 즉 `formatMarketCap(usd, { currency })` 시그니처 → currency='krw'면 내부에서 `formatKrw` 로직 재사용. **단일 진입점화**로 9곳 개별 수정 불필요.

---

## 3. 토글 UI 배치

### 위치: `components/layout/global-top-bar.tsx`
- **데스크탑(149행 영역)**: 우측 액션군에서 `<ThemeToggle />`(155행) **바로 왼쪽**에 `<CurrencyToggle />` 삽입.
  - 순서 제안: `… HelpButton · CurrencyToggle · ThemeToggle · AuthButtonClient`
  - 통화/테마가 "표시 설정" 묶음으로 인접 → 인지적 그룹핑.
- **모바일(224~232행 "도구" 섹션)**: Sheet 내 도구 그룹에 `<ThemeToggle />`(230행) 옆에 `<CurrencyToggle />` 추가.
  - 모바일에서도 토글이 Sheet 안에 항상 존재해야 함(요구사항 3 "모든 화면").

### 토글 형태: **세그먼트 컨트롤 `[₩] [$]`** (드롭다운보다 우위)
- 근거:
  1. 옵션 2개뿐 → 세그먼트가 1탭 전환, 드롭다운은 2탭(열기+선택).
  2. 선례 `components/theme-toggle.tsx`(아이콘 토글)·`components/region-toggle.tsx`(세그먼트 `[전체][국내][해외]`)와 시각적 일관.
  3. 현재 선택 상태가 항상 보임(드롭다운은 닫힘 상태에서 라벨만).
- 라벨: 통화 기호 `₩`/`$` + a11y용 텍스트(`원화`/`달러`). 이모지 금지 — 기호는 텍스트 글리프라 허용. 보조 아이콘 필요 시 lucide `Coins`/`DollarSign`만.
- a11y: region-toggle 패턴 준용 — `role="group"` + `aria-label="표시 통화"`, 각 버튼 `aria-pressed`(또는 `aria-current`).
- 크기: 헤더 다른 액션과 정렬 — `px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm`, 높이 `h-9` 통일(모바일 메뉴 버튼과 동일).

### 상태 소스 (sk-filter-architect `state-arch.md`와 정합)
- next-themes 패턴 = Context + localStorage + SSR-safe. region(URL `?region=`)과 **달리** 통화는 전역·페이지 무관이므로 URL 비사용.
- 토글 컴포넌트는 `useCurrency()` 훅(신규)에서 `{ currency, setCurrency }` 구독.
- 기본값 **KRW**(요구사항 1).

### 와이어프레임
```
[데스크탑 헤더 우측]
 …  Share  Search  Help  | ₩ $ |  ☾  [로그인]
                          └ CurrencyToggle (ThemeToggle 왼쪽)

[모바일 Sheet > 도구]
 도구
 [검색] [도움말] [공유]
 통화  | ₩  $ |     테마  ☾
```

---

## 4. 비-클라이언트 / 특수 표시 처리 방침

| 대상 | 파일 | 현재 통화 | 토글 적용? | 방침 |
|---|---|---|---|---|
| **종목 OG 이미지** | app/stock/[ticker]/opengraph-image.tsx:39 | `$` (formatMarketCap) | ❌ 불가 | 서버에서 빌드 시 1회 렌더, 요청별 사용자 통화 불명 → **고정 통화 유지**. **권장: ₩로 고정**(기본값=KRW 일관) 또는 현행 $ 유지. 단 lib formatMarketCap가 통화 인지로 바뀌면 명시적으로 `formatMarketCap(v, { currency: 'krw' })` 같이 **인자 고정** 필요(전역 상태 없음). 결정 필요 항목. |
| **산업/사이트 OG** | app/opengraph-image.tsx:91, app/[industryId]/opengraph-image.tsx:112 | 정적 텍스트("시가총액 분석") | 무관 | 통화 숫자 없음 → 변경 불요. |
| **JSON-LD (종목)** | components/json-ld.tsx:136-141 | `currency: 'USD'`, value=marketCapUsd | ❌ 불가 | `MonetaryAmount.currency`는 **표준 식별자**로 USD 고정이 안전(구조화 데이터는 일관·기계판독용). 사용자 토글과 무관. **현행 USD 유지 권장.** 변경 시 currency 필드와 value 통화 정합 필수(₩로 바꾸면 value도 KRW여야 — 환산 추가 비용). → 변경하지 않음. |
| **이메일 (데일리 뉴스)** | lib/email/templates/daily-news.tsx, lib/email/render-daily-news.ts | 통화 숫자 **없음**(% 등락·지수 포인트만 렌더) | 무관 | 현재 마켓캡/주가 currency 표시 없음 → **영향 없음**. 향후 가격 추가 시 토글 불가(수신자별 상태 없음) → **고정 통화 정책(KRW) 명문화**. |
| **admin 미리보기** | app/admin/email-log/*, components/admin/email-log/* | 통화 숫자 없음(건수·%·날짜) | 무관 | 변경 불요. |
| **Server Component 가격 렌더** | (없음) | — | — | 가격·시총 표시는 전부 client 컴포넌트(hook 기반) 또는 OG/JSON-LD. 순수 SC 직접 통화 렌더 없음 확인. |

**핵심 결론**: 토글이 닿지 못하는 3개(OG·JSON-LD·이메일)는 모두 **고정 통화**. JSON-LD=USD(표준), OG=KRW 권장(기본값 일치), 이메일=가격 미표시(정책상 KRW 고정 예약).

---

## 5. /guide 문구 영향 (갱신 지점)

토글 도입으로 "달러로 환산 표시"라는 단정 문구가 부정확해짐 → 갱신 필요.

| 파일:라인 | 현재 문구 | 갱신 방향 |
|---|---|---|
| components/guide/number-glossary-data.ts:82 | `english: '$'` (시가총액 항목 단위) | 토글 통화 따름 → "₩ 또는 $" 또는 동적 |
| components/guide/number-glossary-data.ts:84 | "한국 종목도 달러($)로 환산해 보여줍니다." | "기본은 원화(₩), 상단 토글로 달러($) 전환 가능." |
| components/guide/number-glossary-data.ts:85 | "T=1조 달러, B=10억 달러, M=100만 달러." | $ 모드 한정 설명임을 명시 (₩ 모드는 조/억원) |
| components/guide/number-glossary-data.ts:88 | "한국 종목의 달러 환산은 고정 환율(약 1,450원)" | "달러 표시는 고정 환율(약 1,450원) 환산" — 유효, 미세 조정 |
| components/guide/number-glossary-data.ts:182 | "현재 $100, 목표 $120…" (목표가 예시) | $ 예시 유지 가능하나 ₩ 병기 검토 |
| components/guide/honest-limits.tsx:17 | "한국 종목의 USD 환산에 고정 환율…" | "달러 표시 시 고정 환율…" 조건부로 |
| components/stock/insights/sector-position.tsx:127 | "(USD 환산 기준)" 라벨 | ₩ 모드 시 "(원화 환산 기준)" 동적, 또는 통화 무관 문구로 |

---

## 6. 우선순위 (구현 순서 가이드)

### P0 — 주요 사용자 화면 (먼저, 회귀 시 영향 최대)
- **코어 레버**: `lib/format.ts` 4함수 통화 인지화 + `useCurrency` 훅 + `CurrencyToggle` + GlobalTopBar 배치.
- 대시보드: industry-dashboard, company-stats-card, price-changes-card, industry-money-flow-card, market-pulse-strip
- money-flow: flow-card, flow-summary, flow-river(로컬함수 교체), sector-company-list(로컬함수 교체)
- price-changes: price-change-table
- statistics: company-ranking-table, category-comparison-chart 축/툴팁
- stock: stock-price-banner(페이지+모달 공용), insight-hero, financial-analyst, sector-position
- hegemony-map: 직접 통화 렌더 없음 → 자식 company-badge:96 전환으로 커버
- global-search:163

### P1 — 모달·차트 축/툴팁
- company-detail 모달(= stock-price-banner 공유로 P0와 동시 해결)
- price-chart.tsx Y축·툴팁 `$` (시계열 차트)
- top-sectors-growth-chart 툴팁
- category-comparison-chart Y축 단위
- 회색지대 1-E 확인(sector-trend-section)

### P2 — 토글 미적용 고정 통화 + 문구
- OG 이미지 통화 고정 인자화(stock OG)
- JSON-LD USD 유지(무변경 확인)
- 이메일 고정 통화 정책 명문화(무변경)
- /guide·honest-limits 문구 갱신(5절)

---

## 부록: 파일별 영향 요약 (23개 파일)
P0/P1 코드 수정 대상 = **18개 컴포넌트 파일 + lib/format.ts + 신규 2개(useCurrency, CurrencyToggle) + GlobalTopBar**.
P2 = OG 1 + guide 2(number-glossary-data, honest-limits) + sector-position 문구.
무변경 확인 = JSON-LD, 이메일 템플릿, admin, 산업/사이트 OG.
