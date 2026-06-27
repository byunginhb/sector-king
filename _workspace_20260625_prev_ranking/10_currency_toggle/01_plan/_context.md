# 10_currency_toggle — 공통 컨텍스트 (메인 오케스트레이터)

## 사용자 요구사항 (원문 요지)
1. 가격·시총 표기를 **기본 원화(₩)**로 보여준다.
2. **최상단**에 원/달러 선택 토글 → 사용자가 선호 표기로 전체를 본다.
3. **모든 표시 지점**에 전역 적용 — 꼼꼼히 전수.
4. 선택값은 **상태 관리**로 유지, 페이지(보고) 렌더 시 참조.
5. 구현 에이전트 + 검증 에이전트 협업으로 확실히 동작.

## 현재 통화 아키텍처 (실측 2026-06-14)

### 데이터 흐름
- DB는 **native 통화 저장** → API 응답 직전 `toUsd(value, ticker)` 변환 → **응답은 전부 USD**.
- 클라이언트는 USD 값을 받아 `$`로 표시하고, 일부 화면은 `formatKrw(usd)`로 **₩를 괄호 병기**.
- 환율 SoT: `lib/currency.ts::getKrwRate()` (NEXT_PUBLIC_KRW_USD_RATE → KRW_USD_RATE → 1450). 09라운드에서 단일화 완료.
- **핵심 함의: API는 이미 USD로 통일됐고 `formatKrw`가 USD→KRW 변환을 지원하므로, 이 작업은 "표시 레이어 전환"이다. DB·API·React Query 캐시 변경 불필요.**

### 포맷 함수 (`lib/format.ts`) — 전부 `$` 하드코딩
- `formatMarketCap(usd)` → `$1.82T/B/M` (14 파일 사용)
- `formatPrice(usd)` → `$108.77` (11 파일)
- `formatPriceCompact(usd)` → `$1.82M/$834K/...` (1 파일)
- `formatFlowAmount(usd)` → `$1.5T/B/M` (5 파일)
- `formatKrw(usd, {signed})` → `1.8조원/억원/만원/원` (USD→KRW, 9 파일) ← KRW 변환 이미 구현
- `formatPriceChange`(%), `formatPercent`(%), `formatVolume`(무단위), `formatScore` 등은 **통화 무관**(변경 불요)

### 포맷 함수 밖 하드코딩 `$` (별도 처리 필요)
- `components/price-chart.tsx:64,72` — YAxis tickFormatter + Tooltip `$`
- `components/money-flow/flow-river.tsx:17-25` — 자체 `$` 포맷
- `components/money-flow/sector-company-list.tsx:22-29` — 자체 price/cap `$` 포맷
- 차트 다수(통화축 가능성): company-trend-chart, category-comparison-chart, top-sectors-growth-chart, sector-trend-chart, price-change-chart, sector-trend-section, stock/insights/score-trend-chart(점수=통화무관)

### formatKrw 현재 사용처 (9곳 — ₩ 괄호 병기 중)
industry-dashboard:240, statistics/category-comparison-chart:77, statistics/top-sectors-growth-chart:78, money-flow/flow-card:159, money-flow/flow-summary:39/55/102, dashboard/company-stats-card:99, dashboard/price-changes-card:198, dashboard/industry-money-flow-card:244, stock/stock-price-banner:85/105

## 상태 관리 선례 (참고)
- **테마 = next-themes** (`components/providers.tsx`): 전역 Context + localStorage + SSR-safe, `ThemeProvider attribute="class" defaultTheme="dark"`. → **통화 토글의 황금 선례.** 동일하게 Context+localStorage 영속, 기본 KRW.
- **region 토글 = URL `?region=`** (`hooks/use-region.ts`): URL 기반(Suspense 필요). 통화는 산업/페이지 무관 전역이라 URL보다 Context+localStorage가 적합(모든 링크 전파 불필요).
- Provider 트리: `QueryClientProvider > ThemeProvider > SearchProvider > OnboardingProvider`.
- 토글 렌더 위치: `components/layout/global-top-bar.tsx` (ThemeToggle 데스크탑 155행 / 모바일 230행 — 통화 토글 인접 배치). `components/theme-toggle.tsx`가 토글 컴포넌트 선례.

## SSR/하이드레이션 주의
- localStorage는 서버에서 못 읽음 → 첫 페인트에 기본값(KRW)으로 그렸다가 클라에서 선택값으로 교정 시 **깜빡임(flash)** 가능. next-themes가 이걸 inline script로 해결하는 방식 참고. 기본이 KRW이고 대부분 사용자가 KRW면 flash 최소화. cookie 기반 SSR 주입도 옵션(검토).

## 통화 무관(변경 금지) — 오변환 방지
`formatPriceChange`/`formatPercent`(%), `formatVolume`(주), score 전부, PER/PEG/ROE/beta/D&E(무차원). 토글은 **가격·시총·자금흐름액(USD 금액)에만** 적용.

## 핵심 파일
`lib/format.ts`, `lib/currency.ts`(getKrwRate), `components/providers.tsx`, `components/layout/global-top-bar.tsx`, `components/theme-toggle.tsx`(선례), `components/region-toggle.tsx`(선례), `components/price-chart.tsx`, `components/money-flow/*`, `components/statistics/*`, `components/dashboard/*`, `components/stock/*`, `app/guide`(숫자 사전에 "USD 환산" 설명 — 토글 도입 시 문구 갱신 검토).

## 산출물 경로 (작업 특성에 맞게 에이전트 재배정)
- sk-data-modeler → `01_plan/format-layer.md` (통화 인지 포맷 API 설계)
- sk-filter-architect → `01_plan/state-arch.md` (전역 상태 아키텍처: Context/localStorage/SSR/캐시 무영향 검증)
- sk-ui-planner → `01_plan/display-inventory.md` (표시 지점 전수 인벤토리 + 토글 배치 + 차트 처리)
- sk-design-system → `01_plan/toggle-design.md` (토글 컴포넌트 디자인 + ₩/$ 표기 규칙 + a11y)

## 공통 원칙
- 이모지 금지(lucide), 불변성, 작은 파일. 표시 레이어만 — DB/API/캐시 무변경.
- 기본 KRW. ₩ 표기는 억/만원 한국식, $ 표기는 M/B/T. **선택 통화 1개만 노출**(기존처럼 "$ (₩병기)" 이중 표기를 유지할지/토글로 단일화할지는 ui-planner가 결정 제안).
