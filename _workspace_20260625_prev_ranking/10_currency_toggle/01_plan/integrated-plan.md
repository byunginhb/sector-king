# 통합 기획서 — 10_currency_toggle (통화 표시 토글: 기본 ₩ + 원/달러 전역 전환)

> 라운드: `10_currency_toggle` · 작성: 메인 오케스트레이터 · 2026-06-14
> 입력: format-layer.md · state-arch.md · display-inventory.md · toggle-design.md
> 상태: **승인 대기** (APPROVED 마커 없음)

## 1. 요약 — 무엇을, 왜

사용자가 가격·시총을 **기본 원화(₩)**로 보고, **최상단 토글로 원/달러를 전환**해 전 화면을 선호 통화로 본다. 통화는 개인 선호로 **영속 저장**되고 모든 보고 화면 렌더 시 참조된다.

**핵심 발견(4개 에이전트 만장일치):** DB·API·React Query 캐시는 **전혀 건드리지 않는다.** API는 이미 전부 USD로 응답하고 `formatKrw(usd)`가 USD→KRW 변환을 지원하므로, 이 작업은 **순수 표시 레이어 전환**이다. 데이터 손실·마이그레이션·다운타임 가능성 0.

### 아키텍처 3줄 요약
1. **포맷 레이어 (2계층)**: `lib/format.ts` 4함수(`formatMarketCap/formatPrice/formatPriceCompact/formatFlowAmount`)에 `currency` 인자 추가(순수 코어) + `useCurrencyFormat()` 훅(현재 통화 자동 주입). 통화 무관 함수(%·주·점수)는 불변.
2. **상태 (Context+localStorage)**: `CurrencyProvider`+`useCurrency()` — next-themes 패턴. 기본 `KRW`, localStorage 영속, **queryKey에 절대 미포함**(표시 전용). region(URL)과 직교.
3. **토글 UI**: 세그먼트 컨트롤 `[₩ 원][$ 달러]`, GlobalTopBar의 ThemeToggle 인접(데스크탑+모바일 Sheet). region-toggle a11y 패턴 재사용.

## 2. 단계 정의 (입력 → 출력 → 변경 파일)

### 단계 1 — 통화 SoT + 상태 레이어
- `lib/currency.ts`: `Currency='KRW'|'USD'`, `DEFAULT_CURRENCY='KRW'`, `CURRENCY_STORAGE_KEY='sector-king-currency'`, `CURRENCY_ATTRIBUTE='data-currency'`, `isCurrency()` 추가(단일 SoT).
- `hooks/use-currency.tsx`(신규): `CurrencyProvider`(Context+localStorage+멀티탭 storage 동기화+Provider 밖 DEFAULT 폴백) + `useCurrency()`.
- `components/providers.tsx`: `CurrencyProvider`를 **ThemeProvider 안쪽 / SearchProvider 바깥쪽**에 삽입.
- `app/layout.tsx`: `<head>` inline script로 `<html data-currency>` 첫 페인트 전 선반영(flash 방지). `suppressHydrationWarning` 기존 재사용.

### 단계 2 — 포맷 레이어 통화 인지화
- `lib/format.ts`: 4함수에 `currency: Currency = 'USD'` 후행 인자(기존 호출 무수정 시 USD 유지 → 점진 안전). KRW 분기는 `formatKrw`/`getKrwRate()` 재사용. 주가 KRW=`₩` 원단위 정수 콤마, 시총/흐름 KRW=조/억/만원 압축.
- `hooks/use-currency-format.ts`(신규): `useCurrencyFormat()` → `{ marketCap, price, priceCompact, flowAmount, currency }`(useMemo[currency]).

### 단계 3 — 토글 컴포넌트 + 배치
- `components/currency-toggle.tsx`(신규): controlled 세그먼트(₩/$), region-toggle 구조 복제, 글리프+텍스트 라벨, a11y(role=group/radio, roving tabindex, 화살표 키), 중립 토큰(emerald/rose 금지), 이모지 금지.
- `components/layout/global-top-bar.tsx`: 데스크탑 ThemeToggle 인접 + 모바일 Sheet 도구 섹션에 연결 래퍼(`useCurrency()` 사용) 삽입.

### 단계 4 — 전 표시 지점 전환 (65개 지점/23개 파일)
- **P0**: 대시보드(industry-dashboard, company-stats-card, price-changes-card, industry-money-flow-card, market-pulse-strip), money-flow(flow-card, flow-summary, flow-river·sector-company-list 로컬함수 제거→lib 통일), price-changes(price-change-table), statistics(company-ranking-table, category-comparison-chart 축/툴팁), stock(stock-price-banner, insight-hero, financial-analyst, sector-position), global-search, company-badge.
- **P1**: price-chart Y축/툴팁, top-sectors-growth-chart 툴팁, category-comparison-chart Y축 단위, 회색지대 sector-trend-section 확인.
- **이중표기 단일화**: `$X (₩Y)` 9~11곳 → 선택 통화 1개만(formatKrw 병기 라인 삭제, 주표기 함수가 통화 인지).

### 단계 5 — 토글 미적용 지점 + 문구 (P2)
- OG 이미지(`app/stock/[ticker]/opengraph-image.tsx`): 훅 불가 → **고정 통화**. JSON-LD: `currency:'USD'` 유지(기계판독 표준). 이메일: 가격 미표시(정책 명문화).
- `/guide`(number-glossary-data, honest-limits), sector-position "USD 환산 기준" 문구 갱신.
- `/design-system` 카탈로그: Currency Toggle 서브섹션 + 통화 표기 규칙 표.

## 3. 결정 항목 (권장안 — 승인 시 채택)

| # | 결정 | 권장안 | 근거 |
|---|------|--------|------|
| D1 | 이중표기(`$ (₩)`) 처리 | **선택 통화 단일 표기**(병기 제거) | 4개 에이전트 만장일치. 토글의 존재 이유·요구사항 "선호 표기로 본다"에 부합 |
| D2 | OG 이미지 고정 통화 | **KRW 고정**(`formatMarketCap(v,'KRW')`) | 기본이 KRW라 일관. (대안: USD 고정 — format-layer 기본값) |
| D3 | JSON-LD 통화 | **USD 유지(무변경)** | 구조화 데이터는 기계판독·일관성 표준, value=marketCapUsd 정합 |
| D4 | flash 처리 | **inline script로 data-currency 선반영 + 가격 문자열 1프레임 수용** | 기본 KRW라 다수 무영향. cookie SSR은 과설계 |
| D5 | 토글 형태/위치 | **세그먼트 `[₩][$]`, GlobalTopBar ThemeToggle 인접** | region-toggle 패턴 일관, 2옵션 1탭 전환 |

## 4. 위험과 완화

| 위험 | 완화 |
|------|------|
| 이중 변환(KRW 입력에 또 ×rate) → 이중환산 버그(CLAUDE.md 재발 2회) | 입력은 **항상 USD** 불변식. 포맷 함수는 raw 원/엔 안 받음. 코드리뷰·verifier 체크 |
| 통화 무관 필드(%·주·점수) 오변환 | 화이트리스트 고정 — 해당 함수는 currency 인자 자체를 안 가짐 |
| queryKey에 currency 실수 추가 → 전환마다 전체 재요청 | `grep queryKey`에 currency 부재 검증, Network 신규요청 0건 확인 |
| SSR 하이드레이션 미스매치 | Provider 첫 렌더 항상 DEFAULT + 기존 suppressHydrationWarning. inline script는 DOM 속성만 |
| 표시 지점 누락(일부 화면만 안 바뀜) | 65개 전수 인벤토리 기준 verifier가 grep 재대조(`$` 하드코딩 잔존 0) |
| 차트 formatter 클로저 미갱신 | `useMemo([currency])`로 currency 변경 시 재구성 보장 |

## 5. 수락 기준
- [ ] 기본 표기 = 원화(₩). 첫 방문/localStorage 비움 시 ₩.
- [ ] 최상단 토글로 ₩↔$ 전환 시 **모든 화면**(대시보드/money-flow/price-changes/statistics/stock/hegemony-map/검색/모달/차트축) 즉시 반영.
- [ ] 선택값 새로고침·페이지 이동 후 유지(localStorage). 멀티탭 동기화.
- [ ] 통화 무관 항목(%·거래량·점수)은 토글과 무관하게 불변, 통화기호 미부착.
- [ ] 이중표기 제거 — 선택 통화 1개만 노출.
- [ ] `$`/`원` 하드코딩 잔존 0(로컬 포맷함수 제거). 차트 축/툴팁도 전환.
- [ ] queryKey에 currency 부재, 토글 시 Network 신규 요청 0.
- [ ] OG=고정통화, JSON-LD=USD 유지. /guide 문구 갱신.
- [ ] 이모지 0(글리프는 허용), a11y(role/aria/키보드), 토큰 일관.
- [ ] `pnpm exec tsc --noEmit` + `pnpm build` 통과, lint 신규 회귀 0.

## 6. 충돌 해결 로그
| 항목 | 차이 | 해결 |
|------|------|------|
| 포맷 API 구조 | 인자 추가(A) vs 신규함수(B) vs 훅(C) | **A 코어 + C 훅 래퍼 2계층**(data-modeler 제안, 만장일치) |
| 저장 방식 | Context+localStorage vs URL vs cookie | **Context+localStorage**(통화=표시 환경설정, region과 직교). URL 기각 |
| OG 통화 | USD(format/state) vs KRW(ui) | **KRW 고정**(D2) — 기본값 일관 채택 |
| 이중표기 | 단일화 vs 병기유지 | **단일화**(만장일치) |

## 7. 신설/수정 파일 요약
**신설:** `hooks/use-currency.tsx`, `hooks/use-currency-format.ts`, `components/currency-toggle.tsx`.
**수정(코어):** `lib/currency.ts`, `lib/format.ts`, `components/providers.tsx`, `app/layout.tsx`, `components/layout/global-top-bar.tsx`.
**수정(표시 ~20파일):** dashboard/* (5), money-flow/* (4, flow-river·sector-company-list 로컬함수 제거), price-changes/price-change-table, statistics/* (2~3), stock/* (4), price-chart, global-search, company-badge.
**수정(P2):** app/stock/[ticker]/opengraph-image, guide/number-glossary-data, guide/honest-limits, stock/insights/sector-position(문구), design-system/(components·foundations)-section.
**무변경 확인:** JSON-LD, 이메일 템플릿, admin, 산업/사이트 OG, React Query hooks(queryKey).
