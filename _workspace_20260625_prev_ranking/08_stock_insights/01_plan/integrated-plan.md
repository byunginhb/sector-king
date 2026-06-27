# 통합 기획서 — `/stock/[ticker]` 인사이트 페이지

> 라운드: `08_stock_insights` · 작성: 메인 오케스트레이터 · 2026-06-10
> 입력: insight-catalog.md(데이터) · api-design.md(API) · page-design.md(UI)
> 상태: **승인 대기**

---

## 1. 요약 — 무엇을, 왜

`/stock/[ticker]`가 지금은 **모달 내용을 그대로 렌더**(둘 다 `StockDetailSections` 호출)해서 전용 페이지의 가치가 없다. **이미 4.5개월치 쌓인 데이터**(일별 시계열 129일·점수 추이 74일·점수 분해·섹터 rank·원시 재무지표)로 **인사이트 페이지**로 격상한다.

**핵심 원칙:** 모달 = 스냅샷(현행 유지, 무변경). 페이지 = **시계열·상대비교·룰 기반 시그널**. 페이지는 `StockDetailSections` 호출을 멈추고 인사이트 섹션을 직접 조립(공통 원자는 재사용).

### 1.1 미활용 데이터(= 인사이트 소재)
- `score_history` 74일 점수 추이 — **어디에도 노출 안 됨(금광)**
- 섹터 peer 비교(rank·시총점유율·점수 백분위)
- 원시 지표: ROE·영업이익률·부채비율·베타·목표주가 상승여력·투자의견
- 52주 위치%, 멀티섹터 패권(예: GOOGL 10섹터 / LMT 3섹터 중 1위 2개)

### 1.2 실측 정정 (data-modeler)
- **KR 애널리스트 데이터는 양호**(_context 가정과 다름): KR target/analyst 76~78/78 가용 → 상승여력·투자의견 KR도 표시.
- `recommendation_key`는 NULL이 아니라 **`'none'`**(미수집). null 체크 대신 `'none'`="커버리지 없음".
- `score_history` 길이 편차: 200종목만 74일, 215는 27일, 5는 1일 → **최소 데이터 임계** 필요.
- 진짜 폴백 대상: `free_cashflow`(KR 13 null)·`debt_to_equity`(KR 11 null).
- 소형 섹터: ≤2멤버 24개 → **min-peer N≥4**일 때만 median/percentile.

---

## 2. API 설계 (확정안)

**원칙: 모달이 쓰는 base 응답은 가산 확장(비파괴), 무거운 집계는 신규 엔드포인트로 분리.**

### 2-A. `/api/company/[ticker]` — 가산 확장 (모달 무손상)
기존 `.select()` 전체 조회라 **추가 쿼리 0건**, 매핑만 추가:
- `score`에 `beta`, `debtToEquity`, `freeCashflow`(toUsd) 추가
- `snapshot`에 `week52Position`((price−low)/(high−low)), `dayHigh`/`dayLow`(toUsd), `avgVolume` 추가
- `analystUpside`: `{ targetMeanPriceUsd, currentPriceUsd, upsidePct }` (비율은 변환 불요, 표시가는 USD)
- `dominance`: `{ sectorCount, topRankCount, bestRank }`
- 전부 옵셔널/nullable → 구버전 소비자 무손상

### 2-B. `/api/company/[ticker]/insights` — 신규 집계 (페이지 전용, lazy)
- `scoreHistory[]`: 74일 smoothed + raw + 4구성요소
- `scoreMomentum`: `{ deltaTotal, deltaPct, trend: up|down|flat }`
- `peers[]`: 주 섹터 멤버 `{ ticker, rank, marketCapUsd, score, isSelf }`
- `sectorContext`: `{ peerCount, marketCapTotalUsd, marketSharePct, medianScore, medianMarketCapUsd }`
- `valuation`: PER/PEG/ROE 각 `{ value, percentile, median }`
- `primarySectorId`(=rank 최상위 섹터, 결정론적 tie-break) + `allSectorIds[]`
- `?range=30|60|74|120` (화이트리스트, 기본 74). `lib/api-helpers.ts`에 `resolveRange` 헬퍼 신설.
- `revalidate=3600`, 신규 hook `useCompanyInsights(ticker, {range?})`, queryKey `['company-insights', ticker, range]`.

### 2-C. 통화 가드 (필수)
- **시총점유율·median·합산·FCF·목표가는 toUsd 후.** peer 시총 합산은 SQL `SUM(market_cap)` 금지 → 행별 `toUsd(mc, peerTicker)` 후 메모리 reduce(혼합통화 섹터 다수). scoring.py의 native 합산 버그 답습 금지.
- 비율(상승여력·52주위치·수익률·percentile)은 변환 불요.

---

## 3. 페이지 섹션 (P0/P1)

데스크탑 2열 그리드(`grid lg:grid-cols-[1fr_360px]`), 모바일 1열. 반응형 표준 헤더 유지. **카드 단위 graceful degradation**(한 데이터 결손이 페이지 전체를 막지 않음).

| # | 섹션 | 인사이트 | 시각화 | 우선순위 |
|---|------|---------|--------|:--------:|
| S1 | 요약 히어로 | 현재가·시총 + 52주 위치 게이지 + 패권점수 + 상승여력 | progressbar 게이지 + 큰 숫자 | **P0** |
| S2 | 종합 시그널 요약 | 룰 기반 강점/주의 불릿(근거 병기, 과장 금지) | lucide 아이콘 불릿 | **P0(경량)** |
| S3 | 점수 추이 | 74일 smoothed + 4구성요소 토글 | recharts AreaChart+Line | **P0** |
| S4 | 섹터 내 포지션 | peer rank·시총점유율·점수 백분위 | 미니 테이블 + 가로 bar | **P0** |
| S6 | 패권 포지션 | 멀티섹터 rank 요약(N섹터 중 1위 m개) | 뱃지 확장 | **P0** |
| S7 | 재무·애널리스트 | ROE·영업이익률·부채비율·베타 / 목표주가·추천·애널수 | 라벨-값 그리드 + 배지 | **P0** |
| S8 | 가격 차트 | 가격 추이(기간 토글 30/74/전체) | AreaChart 재사용 | **P0** |
| S5 | 밸류에이션 상대비교 | PER/PEG/ROE vs 섹터 중앙값 | diverging bar | **P1** |

**S2 시그널 합의(충돌 해결):** data-modeler는 H(종합시그널)를 P1(밸류에이션 percentile 의존), ui-planner는 S2를 P0로 봄. → **P0에서는 percentile 불필요한 룰만**(점수추세 up/down, 52주위치 극단, 멀티섹터 1위, 상승여력, data_quality 경고), 밸류에이션 기반 룰(PER/ROE vs 중앙값)은 **P1로** S5와 함께. 경량 P0 시그널로 출시.

### 컴포넌트 (신규 `components/stock/insights/*`, 각 200~400줄)
`insight-hero.tsx`(S1), `signal-summary.tsx`(S2)+`lib/stock-signals.ts`(룰 순수함수), `score-trend-chart.tsx`(S3), `sector-position.tsx`(S4), `financial-analyst.tsx`(S7), `price-chart-section.tsx`(S8 기간토글), `valuation-compare.tsx`(S5, P1). 재사용: `StockPriceBanner`, `StockHegemonyBadges`, `PriceChart`, score progressbar 패턴, `EmptyRegionState`. 차트 색상 리터럴(#10b981 등)을 **상수 모듈로 통일**(기존 부채 정리 겸).

---

## 4. 단계 정의

- **단계 1 — API base 확장**: `/api/company/[ticker]`에 score/snapshot 필드 + analystUpside + dominance 매핑 추가(쿼리 0). types 확장(가산). 모달 회귀 없음 확인.
- **단계 2 — insights 엔드포인트**: `/api/company/[ticker]/insights` 신규(scoreHistory·peers·sectorContext·valuation). `resolveRange` 헬퍼. `useCompanyInsights` 훅. toUsd 메모리 집계.
- **단계 3 — 페이지 재조립(P0)**: `stock-detail-page.tsx`에서 `StockDetailSections` 제거 → S1/S2/S3/S4/S6/S7/S8 조립. 신규 insight 컴포넌트 + `lib/stock-signals.ts`. 폴백 UX.
- **단계 4 — P1**: S5 밸류에이션 + 밸류에이션 기반 시그널 룰 추가.

---

## 5. 위험과 완화

| 위험 | 완화 |
|------|------|
| 혼합통화 섹터 시총점유율 오염 | 행별 toUsd 후 메모리 집계, scoring.py 재사용 금지 |
| score_history 짧은 신규 종목 | N≥8(7일변화)/≥31(30일추세) 임계, 미만 시 "축적 중 N/74일" 폴백 |
| 소형 섹터 percentile 무의미 | min-peer N≥4 미만 median/percentile 생략, 순위만 |
| KR FCF/D&E null | 카드 숨김 + 시그널 제외(애널은 KR도 양호) |
| `recommendation='none'` 오판 | 'none'="커버리지 없음" 처리, 강점 룰 제외 |
| base 응답 비대→모달 저하 | 집계는 별도 `/insights`로 분리(모달 미호출) |
| 시그널 과장(AI슬롭) | 룰 기반·근거 병기·중립 카피, percentile 룰은 P1 |

---

## 6. 수락 기준

- [ ] 모달(`company-detail.tsx`) 무변경·무회귀(기존 base 응답만 사용).
- [ ] `/api/company/[ticker]` 신규 필드 전부 옵셔널, 기존 필드 형태 불변.
- [ ] `/api/company/[ticker]/insights` 정상(scoreHistory/peers/sectorContext/valuation), `?range=` 화이트리스트 클램프.
- [ ] 시총점유율·median·FCF·목표가가 모두 USD 기준(toUsd 체크리스트). 혼합통화 섹터에서 KR 과대 없음.
- [ ] P0 섹션(S1·S2·S3·S4·S6·S7·S8) 렌더, 카드별 폴백 동작(신규 종목/소형 섹터/KR 결측).
- [ ] 이모지 0(lucide만), a11y(progressbar aria·차트 대체텍스트·아이콘+텍스트 시그널).
- [ ] `pnpm exec tsc --noEmit` + `pnpm build` 통과.

---

## 7. 충돌 해결 로그

| 항목 | 차이 | 해결 |
|------|------|------|
| 종합 시그널 우선순위 | data-modeler P1(percentile 의존) vs ui-planner S2 P0 | **경량 P0**(percentile 불요 룰만) + 밸류에이션 룰 P1 분리 |
| KR 애널리스트 가용성 | _context "결측 빈번" vs 실측 "양호" | **실측 채택** — KR도 상승여력/투자의견 표시 |
| score_history 균일성 가정 | "모든 종목 74일" vs 실측 길이 편차 | min-data 임계 + 폴백 |
| API 구조 | 단일 확장 vs 분리 | **base 가산 + /insights 분리**(모달 보호) |

---

## 8. 신설/수정 파일

**신설:** `app/api/company/[ticker]/insights/route.ts`, `hooks/use-company-insights.ts`, `lib/stock-signals.ts`, `components/stock/insights/{insight-hero,signal-summary,score-trend-chart,sector-position,financial-analyst,price-chart-section,valuation-compare}.tsx`, 차트 색상 상수 모듈.
**수정:** `app/api/company/[ticker]/route.ts`(가산 매핑), `types/index.ts`(가산), `lib/api-helpers.ts`(resolveRange), `hooks/use-company.ts`(range 옵션), `components/stock/stock-detail-page.tsx`(재조립). **무변경:** `components/company-detail.tsx`(모달).
