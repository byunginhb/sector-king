# 07_market_scope — UI/신규페이지 레인 진행 로그

> 레인: UI/신규페이지 · 담당: sk-implementer · 시작 2026-06-10
> 기획: `_workspace/07_market_scope/01_plan/{integrated-plan,ui-plan,filter-chain}.md`
> 파일 소유권: 라벨/카피 4파일 + lib/region.ts(주석만) + `/stock/[ticker]` 신규 + company-detail 추출 + json-ld + sitemap

## A. region 라벨 재정의 (값/키 불변, 라벨만)
- [x] `region-toggle.tsx` OPTIONS: `global` label '해외'→'미국', ariaLabel '미국 종목만 보기', icon Earth→DollarSign (value 'global' 불변)
- [x] `empty-region-state.tsx` regionLabel: '해외'→'미국'
- [x] `money-flow/sector-company-list.tsx`: 빈 종목 메시지 '해외'→'미국'
- [x] `design-system/components-section.tsx` hint "국내/해외/전체"→"국내/미국/전체"
- [x] `lib/region.ts` JSDoc 1줄: "global=INTL=미국(비US/KR 제거 후)" 명시 (로직/타입/매핑 불변)

## B. 신규 페이지 `/stock/[ticker]`
### B-1 company-detail 섹션 추출 (모달·페이지 공유)
- [x] `components/stock/stock-price-banner.tsx` (Last Price 배너 + region 배지 + 외부 링크)
- [x] `components/stock/stock-hegemony-badges.tsx` (패권 영역 뱃지)
- [x] `components/stock/stock-score-analysis.tsx` (점수 분석 + progressbar a11y)
- [x] `components/stock/stock-detail-sections.tsx` (공유 섹션 조립 + 로딩/에러)
- [x] `components/company-detail.tsx` 리팩토링 — 추출 컴포넌트 재사용 (모달용)

### B-2 페이지/메타/OG/404
- [x] `app/stock/[ticker]/page.tsx` (Server: 티커 검증 + generateMetadata + notFound + Suspense)
- [x] `components/stock/stock-detail-page.tsx` ('use client': 헤더 + 본문 조립)
- [x] `app/stock/[ticker]/opengraph-image.tsx` (종목명·티커·시총)
- [x] `app/stock/[ticker]/not-found.tsx` (검색/인기종목 + 제거 티커 안내 분기)

### B-3 SEO 통합
- [x] `json-ld.tsx` StockJsonLd (Corporation + tickerSymbol, toUsd 가격)
- [x] `sitemap.ts` active 티커 `/stock/${ticker}` 동적 등록

## a11y
- [x] 뒤로가기 aria-label
- [x] 워치토글 aria-pressed (WatchStarToggle 기보유)
- [x] 점수바 role="progressbar" + aria-valuenow/min/max
- [x] 외부링크 rel="noopener noreferrer"
- [x] 로딩 aria-busy / 에러 role="alert"
- [x] region 배지 텍스트 라벨 병기

## 검증
- [x] `pnpm exec tsc --noEmit` — 에러 0건 (exit 0)
- [x] `pnpm build` — 성공 (exit 0). `/stock/[ticker]`, `/stock/[ticker]/opengraph-image` 동적 라우트(ƒ) 등록 확인

## 추가 산출물 (owned)
- `lib/stock-server.ts` (server-only): `isValidTicker`, `getStockSummary`(toUsd 시총), `getAllStockTickers`(sitemap용). 메타데이터/OG/sitemap 공용 — 신규 API 라우트 미생성(기획 준수)
