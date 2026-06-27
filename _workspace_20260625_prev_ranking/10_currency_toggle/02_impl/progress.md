# 10_currency_toggle 구현 진행 (sk-implementer)

라운드: 통화 표시 토글(기본 ₩ + 원/달러 전역 전환) · 순수 표시 레이어 전환(DB/API/캐시 무변경)

## 단계 체크박스

### 단계 1 — 통화 SoT + 상태 레이어 [완료]
- [x] `lib/currency.ts`: `Currency`, `DEFAULT_CURRENCY='KRW'`, `CURRENCY_STORAGE_KEY='sector-king-currency'`, `CURRENCY_ATTRIBUTE='data-currency'`, `isCurrency()` 추가 + "inline script 동기화" 주석
- [x] `hooks/use-currency.tsx`(신규): `CurrencyProvider`+`useCurrency()` (Context+localStorage+멀티탭 storage+Provider 밖 DEFAULT 폴백+isHydrated)
- [x] `components/providers.tsx`: `CurrencyProvider`를 ThemeProvider 안쪽 / SearchProvider 바깥쪽 삽입
- [x] `app/layout.tsx`: `<head>` inline script — localStorage 통화를 `<html data-currency>` 선반영(키/기본값 하드코딩+주석). 기존 `suppressHydrationWarning` 재사용 확인

### 단계 2 — 포맷 레이어 [완료]
- [x] `lib/format.ts`: `formatMarketCap/formatPrice/formatPriceCompact/formatFlowAmount`에 `currency: Currency = 'USD'` 후행 인자. KRW 분기는 formatKrw/getKrwRate 재사용. 주가 KRW=`₩`+원단위정수 콤마, 시총/흐름 KRW=formatKrw 압축
- [x] 통화 무관 함수(formatPriceChange/formatPercent/formatVolume/formatScore 등) 무변경 확인
- [x] `hooks/use-currency-format.ts`(신규): `useCurrencyFormat()` → `{marketCap, price, priceCompact, flowAmount, currency}`, useMemo([currency])

### 단계 3 — 토글 컴포넌트 + 배치 [완료]
- [x] `components/currency-toggle.tsx`(신규): region-toggle 구조 복제. role=group/radio, aria-checked/aria-label, roving tabindex, ArrowLeft/Right/Home/End. 옵션 2개(₩ 원/$ 달러), 글리프 aria-hidden+텍스트 라벨, glyphOnly prop. 중립 토큰(bg-muted/active=bg-background+shadow/focus=ring-primary, emerald/rose 미사용). 이모지 0(글리프만)
- [x] `components/layout/global-top-bar.tsx`: `CurrencyToggleConnected`(useCurrency 래퍼) — 데스크탑 ThemeToggle 왼쪽, 모바일 Sheet 도구 섹션 ThemeToggle 옆

### 단계 4 — 전 표시 지점 전환 [완료]
- [x] 4함수 호출처 전부 `fmt.marketCap/price/priceCompact/flowAmount`로 교체
- [x] 이중표기(formatKrw 병기) 9곳 삭제 → 주표기 함수가 선택 통화 단일 출력(D1)
- [x] 로컬 포맷함수 제거: flow-river `formatAmount`, sector-company-list `formatPrice`/`formatMarketCap` → lib 통화인지 함수로 통일
- [x] 차트 통화축: price-chart YAxis/Tooltip, category-comparison-chart Y축+툴팁, top-sectors-growth-chart 툴팁 → `fmt` 클로저
- [x] 회색지대 sector-trend-section: 차트 축은 %(전환 제외), `formatAmount` title(시총 변화 절대액)만 `fmt.marketCap`로 전환·로컬함수 제거
- [x] 통화 무관(%·주·점수·MFI·percentile) 무변경 확인

### 단계 5 — 미적용 지점 + 문구 [완료]
- [x] `app/stock/[ticker]/opengraph-image.tsx`: `formatMarketCap(v, 'KRW')` 고정(D2)
- [x] JSON-LD(`components/json-ld.tsx`): `currency: 'USD'` 무변경 확인(D3)
- [x] `/guide` number-glossary-data.ts(시가총액 항목 english/howToRead/analogy/caution), honest-limits.tsx(환율 고정), sector-position.tsx("USD/원화 환산 기준" 동적) 문구 갱신
- [x] `/design-system`: components-section Currency Toggle 서브섹션, foundations-section 통화 표기 규칙 표

## 전환한 표시 지점 목록 (✅ 통화 전환)

| 파일 | 전환 내용 |
|------|----------|
| components/company-badge.tsx | 시총 → fmt.marketCap |
| components/dashboard/company-stats-card.tsx | 시총 → fmt.marketCap + 이중병기 삭제 |
| components/dashboard/industry-money-flow-card.tsx | 순액/유입/유출 → fmt.flowAmount + 이중병기 삭제 |
| components/dashboard/market-pulse-strip.tsx | 핫섹터 흐름·최대이동 → fmt.flowAmount, count-up 시총 → fmt.marketCap |
| components/dashboard/price-changes-card.tsx | 주가 compact → fmt.priceCompact + 이중병기 삭제 |
| components/global-search.tsx | 검색결과 시총 → fmt.marketCap |
| components/industry-dashboard.tsx | 산업 총시총 → fmt.marketCap + 이중병기 삭제, 자금1위 인사이트 → fmt.flowAmount |
| components/money-flow/flow-card.tsx | 섹터 흐름액 → fmt.flowAmount + 이중병기 삭제 |
| components/money-flow/flow-summary.tsx | 총유입/총유출/순액 → fmt.flowAmount + 이중병기 3곳 삭제 |
| components/money-flow/flow-river.tsx | 로컬 formatAmount 제거 → fmt.flowAmount |
| components/money-flow/sector-company-list.tsx | 로컬 formatPrice/formatMarketCap 제거 → fmt.price/fmt.marketCap |
| components/price-changes/price-change-table.tsx | 시작가/최신가 → fmt.price, 시총 → fmt.marketCap |
| components/statistics/company-ranking-table.tsx | 시총 → fmt.marketCap (미사용 useState import 제거) |
| components/statistics/category-comparison-chart.tsx | X축 단위 + 툴팁 → fmt.marketCap, 툴팁 이중병기 삭제 |
| components/statistics/top-sectors-growth-chart.tsx | 툴팁 시총 start→end → fmt.marketCap, 이중병기 삭제 (X축 %는 무변경) |
| components/price-chart.tsx | YAxis tickFormatter + Tooltip → fmt.price (KRW 시 width 64) |
| components/sector-trend/sector-trend-section.tsx | 셀 title "시총 변화" → fmt.marketCap, 로컬 formatAmount 제거 (차트 %축 무변경) |
| components/stock/stock-price-banner.tsx | 주가 → fmt.price, 시총 → fmt.marketCap + 이중병기 2곳 삭제 |
| components/stock/insights/insight-hero.tsx | 52주 저/고가·컨센서스 목표가 → fmt.price |
| components/stock/insights/financial-analyst.tsx | FCF → fmt.marketCap, 목표주가 → fmt.price |
| components/stock/insights/sector-position.tsx | 섹터 합산 시총 → fmt.marketCap + "환산 기준" 동적 문구 |
| app/stock/[ticker]/opengraph-image.tsx | 시총 → formatMarketCap(v,'KRW') 고정(서버 렌더, D2) |
| components/design-system/components-section.tsx | Currency Toggle 카탈로그 서브섹션 추가 |
| components/design-system/foundations-section.tsx | 통화 표기 규칙 표(USD/KRW 라이브 예시 + 통화무관 행) 추가 |
| components/guide/number-glossary-data.ts | 시가총액 항목 토글 반영 문구 |
| components/guide/honest-limits.tsx | 환율 고정 항목 토글 반영 문구 |

## 미전환(통화 무관 — 의도적 제외)
- 등락률/percentChange/priceChange(%)·formatPriceChange·formatPercent — 비율
- 거래량 formatVolume(주 수) — 무차원
- 점수 formatScore·패권점수·MFI·시총점유율(%)·percentile — 무차원/비율
- 차트 %축: price-change-chart, company-trend-chart, sector-trend-chart(전체 %), top-sectors-growth-chart X축(성장률 %), sector-trend-section 차트(% flowPercent)
- 점수 차트: score-trend-chart(점)
- flow-river SVG 애니메이션 글리프 `$`/`$-` — 장식용 코인 파티클(통화값 아님)
- JSON-LD currency:'USD'(D3, 기계판독 표준) — 무변경
- 이메일/admin/산업·사이트 OG — 통화 숫자 없음(무변경)
- region-toggle/stock-price-banner의 DollarSign lucide 아이콘 — region(미국) 표시용(통화값 아님)

## 검증 결과
- `pnpm exec tsc --noEmit`: exit 0 (에러 0)
- `pnpm build`: exit 0 (성공 — 전 라우트 컴파일, OG 서버렌더 포함)
- `grep queryKey hooks/` + currency: 부재 확인(캐시 무영향)
- formatKrw 이중병기: 표시 레이어 0건(lib 정의만 잔존)
- 하드코딩 통화값 `$`: 표시 레이어 잔존 0(나머지는 %·점·width·키)
