# 08_stock_insights — 공통 컨텍스트 (메인 오케스트레이터)

## 사용자 요구사항 (원문)
"전체 페이지로 보면 단순히 모달 내용이 그대로인 것 같다. 좀 더 기획이 필요하다. 이미 모여진 데이터를 기반으로 **인사이트를 만들어서 보여줄 수 있다.**"

→ `/stock/[ticker]` 전용 페이지를, 모달의 단순 복제가 아니라 **수집된 데이터로 가공한 인사이트 페이지**로 격상하는 기획.

## 핵심 제약
- 신규 데이터 수집(yfinance 컬럼 추가)은 범위 밖. **이미 DB에 쌓인 데이터만으로** 인사이트를 만든다.
- 미국·한국 종목만(07_market_scope 완료). region INTL=미국.
- 통화 규칙: 가격·시총은 `toUsd` 변환 후 표시/비교.

## 보유 데이터 (실측 2026-06-10)

### daily_snapshots (129일, 2026-01-27~06-10, 티커당 평균 73개)
`market_cap, price, price_change(%), week_52_high, week_52_low, day_high, day_low, volume, avg_volume, pe_ratio, peg_ratio` (가격성 필드는 native 통화 저장 → toUsd 필요)

### company_scores (티커당 1행, 최신)
- 점수 분해: `scale_score, growth_score, profitability_score, sentiment_score, raw_total_score, smoothed_score, data_quality`
- 원시 지표: `revenue_growth, earnings_growth, operating_margin, return_on_equity, beta, debt_to_equity, target_mean_price(native→toUsd), free_cashflow(native→toUsd), recommendation_key, analyst_count`

### score_history (74일, 2026-03-23~06-10) — **현재 어디에도 노출 안 됨 (미개발 금광)**
`raw_total_score, smoothed_score, scale_score, growth_score, profitability_score, sentiment_score` 일별 추이

### sector_companies / sectors
- `rank`(섹터 내 순위 1..N), 종목이 **여러 섹터에 속할 수 있음**(예: LMT = aircraft_mfg/prime_defense/space). 멀티섹터 패권 표현 가능.

## 현재 노출 범위 (격차 분석)
- `/api/company/[ticker]` 반환: profile, 최신 snapshot(USD), **30일** history, score(분해 포함), sectors(rank 포함).
- 페이지/모달이 쓰는 것: 가격 배너, 30일 차트, 패권 뱃지, 점수 분석.
- **미활용(인사이트 소재):**
  1. `score_history` 74일 점수 추이/모멘텀 (상승·하락 추세)
  2. 섹터 내 **peer 비교**(같은 섹터 다른 종목의 rank/score/시총) — `/api/sector/[sectorId]` 재사용 가능
  3. 원시 지표(매출성장·ROE·영업이익률·베타·부채비율) — 표시 안 됨
  4. **목표주가 상승여력**(target_mean_price vs 현재가), recommendation_key, analyst_count
  5. **52주 위치%**((price-low)/(high-low)), 가격 모멘텀
  6. **멀티섹터 패권 요약**(몇 개 섹터에서 1위인가)
  7. 밸류에이션 상대비교(PER/PEG/ROE vs 섹터 중앙값)
  8. 시총 점유율(섹터 합계 대비 이 종목 비중)

## 핵심 파일
- `app/stock/[ticker]/page.tsx`, `components/stock/*`, `components/company-detail.tsx`(모달)
- `app/api/company/[ticker]/route.ts`, `app/api/sector/[sectorId]/route.ts`
- `lib/stock-server.ts`, `lib/currency.ts`(toUsd), `lib/region.ts`
- `scripts/scoring.py`(점수 산식 — scale/growth/profitability/sentiment 정의 SoT)
- `drizzle/schema.ts`, `hooks/use-company.ts`, `components/price-chart.tsx`

## 산출물 경로
- sk-data-modeler → `_workspace/08_stock_insights/01_plan/insight-catalog.md`
- sk-filter-architect → `_workspace/08_stock_insights/01_plan/api-design.md`
- sk-ui-planner → `_workspace/08_stock_insights/01_plan/page-design.md`

## 모달 vs 페이지 차별화 원칙
- 모달 = 빠른 미리보기(현행 유지).
- 페이지 = **깊이 있는 분석**: 시계열 추이, peer 비교, 밸류에이션 맥락, 패권 포지션, 투자 시그널 요약.
