# 08_stock_insights 구현 진행

> 범위: P0 + P1 전부. 승인: 2026-06-10. 구현 완료: 2026-06-10.

## 단계 1 — base API 가산 확장 (모달 무손상) — 완료
- [x] `types/index.ts`: `ScoreDetail`에 beta/debtToEquity/freeCashflow, snapshot에 week52Position/dayHigh/dayLow/avgVolume, analystUpside, dominance 가산 (전부 옵셔널/nullable)
- [x] `app/api/company/[ticker]/route.ts`: 매핑 추가 (추가 쿼리 0, .select() 전체 조회 재사용)
- [x] 모달 회귀 없음 확인 (company-detail.tsx 무변경, base 응답만 사용)

## 단계 2 — insights 엔드포인트 — 완료
- [x] `lib/api-helpers.ts`: `resolveRange`(화이트리스트) + `clampIntParam`(연속 클램프) 헬퍼 신설
- [x] `app/api/statistics/movers/route.ts`: clampIntParam 적용(인라인 parseInt+clamp 중복 제거)
- [x] `types/index.ts`: `CompanyInsightsResponse` 외 보조 타입 추가
- [x] `app/api/company/[ticker]/insights/route.ts` 신규 (scoreHistory/scoreMomentum/peers/sectorContext/valuation, 주섹터 결정론적 선정, 행별 toUsd 메모리 집계, min-peer N≥4, range 화이트리스트, revalidate=3600)
- [x] `hooks/use-company-insights.ts` 신규 (queryKey ['company-insights', ticker, range])
- [x] `hooks/use-company.ts`: range 옵셔널 2번째 인자 (기존 호출부 무수정 유지)
- [x] base route `?range=` 화이트리스트(30/60/90/129, 기본 30 → 모달 무영향) history 확장

## 단계 3 — 페이지 재조립 (P0) + 시그널 룰 — 완료
- [x] `lib/chart-colors.ts`: 차트 색상/툴팁 상수 SoT
- [x] `lib/stock-signals.ts`: 룰 기반 시그널 순수함수 (P0 룰 + P1 밸류에이션 룰)
- [x] `components/stock/insights/insight-hero.tsx` (S1)
- [x] `components/stock/insights/signal-summary.tsx` (S2)
- [x] `components/stock/insights/score-trend-chart.tsx` (S3, Area+Line 토글)
- [x] `components/stock/insights/sector-position.tsx` (S4, 테이블+가로bar)
- [x] `components/stock/insights/financial-analyst.tsx` (S7)
- [x] `components/stock/insights/price-chart-section.tsx` (S8, 기간토글 30/74/전체)
- [x] `components/stock/stock-detail-page.tsx` 재조립 (StockDetailSections 제거, 2열 그리드, S6=DominanceCard+StockHegemonyBadges 재사용)

## 단계 4 — P1 — 완료
- [x] `components/stock/insights/valuation-compare.tsx` (S5, diverging bar + percentile)
- [x] `lib/stock-signals.ts`: 밸류에이션 기반 룰 (PER 저평가/고평가, ROE 중앙값 상회, 시총점유율)
- [x] stock-detail-page 사이드 컬럼에 S5 조립

## 폴백 처리 — 완료
- [x] score_history <5일 → "축적 중 N/74일" 안내 (ScoreTrendChart)
- [x] peer ≤1 → "비교 가능한 동종 종목 없음" (SectorPosition)
- [x] min-peer <4 → "비교 데이터 부족" + percentile/median null (ValuationCompare)
- [x] KR 애널 결측/recommendation='none' → 상승여력·투자의견 숨김 (InsightHero/FinancialAnalyst)
- [x] FCF·D/E null → 재무 행 숨김 (FinancialAnalyst)
- [x] score=null → "산출 중" 문구 (InsightHero)

## 검증 — 완료
- [x] `pnpm exec tsc --noEmit` exit 0
- [x] `pnpm build` exit 0 (/stock/[ticker], /api/company/[ticker]/insights 컴파일)
- [x] 모달 무변경·무회귀 확인 (company-detail.tsx → StockDetailSections → useCompany base 응답)
- [x] 통화: peer 시총 행별 toUsd 후 메모리 합산/정렬/중앙값 (battery·prime_defense DB 실측 검증)
- [x] 이모지 0 (lucide만), 코드 주석의 →/≥/≤ 만 비-UI 텍스트로 잔존
