# `/stock/[ticker]` 인사이트 페이지 재설계 (page-design)

작성: sk-ui-planner · 2026-06-10
전제: `_context.md`(보유 데이터·격차) / data-modeler `insight-catalog.md`(계산 가능 인사이트) / filter-architect `api-design.md`(API 계약) — 두 산출물은 아직 미작성이므로 **본 문서는 가정(assumption) 으로 표기**하고 의존 지점(§7)에 명시한다.

검증한 실제 코드:
- `components/stock/stock-detail-page.tsx`(현 페이지 본문), `stock-detail-sections.tsx`(모달·페이지 공유 조립부), `stock-price-banner.tsx`, `stock-score-analysis.tsx`, `stock-hegemony-badges.tsx`
- `components/company-detail.tsx`(모달), `components/price-chart.tsx`(area, 30일)
- `components/statistics/company-trend-chart.tsx`(멀티 area + Legend 패턴), `components/ui/empty-region-state.tsx`, `components/ui/card.tsx`/`badge.tsx`/`tooltip.tsx`
- `hooks/use-company.ts`, `types/index.ts`(`CompanyDetailResponse`/`ScoreDetail`/`SectorDetailResponse`), `lib/format.ts`/`lib/region.ts`/`lib/scoring-methodology.ts`
- `hegemony-map.tsx`(반응형 헤더 패턴 + `RegionToggle`), `app/design-system`(토큰·안티패턴)

---

## 1. 모달 vs 페이지 차별화 정의

현재 문제: 모달(`CompanyDetail`)과 페이지(`StockDetailPage`)가 **둘 다 `StockDetailSections`를 렌더**한다. 차이는 페이지에 `showChart`만 켜진 것뿐 → "전체 페이지가 모달 그대로"라는 사용자 지적의 근본 원인.

해결 원칙: **모달은 현행 유지(`StockDetailSections` 그대로 = 빠른 미리보기), 페이지는 `StockDetailSections`를 더 이상 호출하지 않고 인사이트 섹션을 직접 조립**한다. 공통 원자(배너·점수바·뱃지)는 재사용하되, 페이지 전용 분석 섹션을 추가한다.

| 항목 | 모달 (현행 유지) | 페이지 (재설계) |
|------|------------------|------------------|
| 목적 | 지도/리스트에서 즉시 미리보기 | 깊이 있는 단독 분석 화면 |
| 가격 | 현재가·누적변동·시총 배너 | 동일 배너 + **52주 위치 게이지** + **목표주가 상승여력** 요약 |
| 점수 | 4차원 정적 브레이크다운 | 동일 + **74일 score_history 추이 차트**(모멘텀) |
| 차트 | 없음 | 30일 → **기간 토글(30/74/전체)** 가격 차트 |
| 패권 | 섹터별 rank 뱃지 | 뱃지 + **멀티섹터 패권 요약**(N개 섹터 중 1위 m개) |
| Peer | 없음 | **섹터 내 peer 비교 미니 테이블**(rank·시총점유율·점수) |
| 밸류에이션 | 없음 | **PER/PEG/ROE vs 섹터 중앙값** 상대비교 bar |
| 재무 | 점수 메트릭 안에 일부 | **ROE·영업이익률·부채비율·베타** 독립 카드 |
| 시그널 | 없음 | **룰 기반 강점/주의 요약 카드**(데이터 근거 표기) |
| 레이아웃 | 1열 세로 스크롤 | **데스크탑 2열 그리드**, 모바일 1열 |

차별화 한 줄: **모달=스냅샷, 페이지=시계열·상대비교·룰 기반 시그널.**

---

## 2. 페이지 섹션 구조 (인사이트 카드 단위)

각 섹션은 `<Card>`(`components/ui/card.tsx`) 또는 `surface-1` 패널 1개 단위. P0=출시 필수, P1=후속.

| # | 제목 | 보여줄 인사이트 | 시각화 | 데이터 출처 | 우선순위 |
|---|------|------------------|--------|-------------|----------|
| S1 | 요약 히어로 | 현재가·누적변동·시총 + 52주 위치 게이지 + 종합 패권점수(smoothed) + 상승여력 한눈 | 배너 + 가로 progressbar 게이지 + 점수 큰 숫자 | `snapshot`(toUsd), `score.total/smoothed`, `score.targetMeanPrice`, `week52High/Low` | **P0** |
| S2 | 종합 시그널 요약 | 룰 기반 강점/주의 불릿(예: "섹터 시총 1위", "ROE 섹터 중앙값 상회", "목표주가 -12% 괴리 주의"). **각 불릿에 근거 데이터 병기, 과장 표현 금지** | 아이콘 불릿 리스트(강점=ArrowUp/주의=AlertTriangle, lucide) | data-modeler 룰셋(가정) + score/snapshot/peer | **P0** |
| S3 | 점수 추이 | 74일 `smoothed_score` 추세 + 4구성요소 선택 토글 | recharts `AreaChart`(smoothed 메인 area) + 4 라인 토글 | `score_history`(신규 API 필드, §7 의존) | **P0** |
| S4 | 섹터 내 포지션 | 같은 섹터 peer 목록: rank·시총점유율·점수, 본 종목 하이라이트 | 미니 테이블 + 시총점유율 가로 bar | `/api/sector/[sectorId]`(재사용, `companies`+`marketCapTotal`) | **P0** |
| S5 | 밸류에이션 상대비교 | PER/PEG/ROE를 섹터 중앙값과 대비 | 3행 bullet/diverging bar (본값 vs 중앙값 마커) | snapshot.peRatio/pegRatio + score.returnOnEquity + 섹터 집계(가정) | P1 |
| S6 | 패권 포지션 | 멀티섹터 rank 요약(몇 개 섹터 1위/Top3), 기존 뱃지 확장 | `StockHegemonyBadges` 재사용 + 요약 한 줄 | `sectors[]`(rank 포함) | **P0** |
| S7 | 재무·애널리스트 | ROE·영업이익률·부채비율·베타 / 목표주가·추천·애널리스트 수 | 라벨-값 그리드 + 추천 배지 | `score.*`(targetMeanPrice toUsd), snapshot | **P0** |
| S8 | 가격 차트 | 가격 추이(기간 확장) | `PriceChart` 재사용 + 기간 토글 | `history`(현 30일 → 확장, §7) | **P0**(차트), 기간확장 P1 |

P0 섹션: **S1 요약 히어로 / S2 시그널 요약 / S3 점수 추이 / S4 섹터 포지션 / S6 패권 / S7 재무·애널리스트 / S8 가격 차트**.

---

## 3. 와이어프레임 (ASCII)

### 데스크탑 (lg: 2열, `grid lg:grid-cols-[1fr_360px]` — 좌 메인 / 우 사이드)

```
┌──────────────────────────────────────────────────────────────┐
│ GlobalTopBar (공유/검색)                                       │
├──────────────────────────────────────────────────────────────┤
│ < 홈                                                           │  ← 반응형 표준 헤더
│ Lockheed Martin (LMT)  [미국]        [공유] [★ 워치]           │     flex flex-col sm:flex-row
│ Lockheed Martin Corp.                                          │     sm:items-center sm:justify-between
├───────────────────────────────────┬──────────────────────────┤
│ ┌── S1 요약 히어로 ──────────────┐ │ ┌── S6 패권 포지션 ─────┐ │
│ │ $452.10  +8.4%  시총 $108B     │ │ │ 3개 섹터 중 1위 2개    │ │
│ │ 52주 위치 [████████░░] 82%     │ │ │ [방산:1위★][우주:2위]  │ │
│ │ 패권점수 78.2/100  상승여력+11%│ │ └────────────────────────┘ │
│ └────────────────────────────────┘ │ ┌── S7 재무·애널리스트 ─┐ │
│ ┌── S2 시그널 요약 ──────────────┐ │ │ ROE 62% / 영익률 13%   │ │
│ │ ▲ 섹터 시총 1위 (점유율 31%)   │ │ │ 부채비율 1.4 / β 0.48  │ │
│ │ ▲ ROE 62% (중앙값 18% 상회)    │ │ │ 추천: 매수 (22명)      │ │
│ │ ⚠ 목표주가 대비 +3% (제한적)   │ │ │ 목표주가 $466 (+3%)    │ │
│ └────────────────────────────────┘ │ └────────────────────────┘ │
│ ┌── S3 점수 추이 (74일) ─────────┐ │ ┌── S5 밸류에이션(P1) ──┐ │
│ │  [smoothed area + 토글 라인]   │ │ │ PER  ▏본28│중앙22      │ │
│ │  규모|성장|수익|평가 [칩 토글] │ │ │ PEG  ▏본1.8│중앙2.1     │ │
│ └────────────────────────────────┘ │ │ ROE  ▏본62│중앙18      │ │
│ ┌── S4 섹터 내 포지션 ───────────┐ │ └────────────────────────┘ │
│ │ #  종목      점유율   점수      │ │                            │
│ │ 1 ▶LMT      [███]31%  78.2     │ │                            │
│ │ 2  RTX      [██ ]19%  71.0     │ │                            │
│ │ 3  NOC      [█  ]12%  66.5     │ │                            │
│ └────────────────────────────────┘ │                            │
│ ┌── S8 가격 차트 [30][74][전체] ─┐ │                            │
│ │  [area chart]                  │ │                            │
│ └────────────────────────────────┘ │                            │
└───────────────────────────────────┴──────────────────────────┘
```

### 모바일 (1열, `min-w-0` 타이틀)

```
┌────────────────────────┐
│ GlobalTopBar           │
├────────────────────────┤
│ < 홈                   │
│ LMT [미국]             │  ← 타이틀 truncate, 액션 줄바꿈
│ [공유] [★]             │
├────────────────────────┤
│ S1 요약 히어로         │
│ S2 시그널 요약         │  ← 우 사이드(S6/S7/S5) 가 본문 흐름 사이로
│ S6 패권 포지션         │     재배치: S1→S2→S6→S7→S3→S4→S5→S8
│ S7 재무·애널리스트     │
│ S3 점수 추이           │
│ S4 섹터 포지션         │
│ S5 밸류에이션(P1)      │
│ S8 가격 차트           │
└────────────────────────┘
```

헤더는 현 `stock-detail-page.tsx:44`의 `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3` + 타이틀 `min-w-0`/`truncate` 패턴을 **그대로 유지**.

---

## 4. 컴포넌트 계획

신규 디렉토리 `components/stock/insights/*` (각 200~400줄, 1파일=1섹션). 페이지 본문 `stock-detail-page.tsx`는 `StockDetailSections` 호출 대신 아래를 조립.

| 파일 | 섹션 | 차트/UI | 재사용 |
|------|------|---------|--------|
| `insights/insight-hero.tsx` | S1 | progressbar 게이지(52주·점수)는 기존 `stock-score-analysis`의 `role=progressbar` 패턴 차용 | `StockPriceBanner`, `RegionBadge` |
| `insights/signal-summary.tsx` | S2 | lucide 아이콘 불릿(ArrowUp/AlertTriangle/Minus). 룰→불릿 매핑은 순수 함수 `lib/stock-signals.ts`로 분리 | — |
| `insights/score-trend-chart.tsx` | S3 | recharts `AreaChart`(smoothed) + `Line` 4개 토글. `company-trend-chart.tsx` 멀티-series 패턴 + `Legend` 차용 | 차트 컬러 상수 재사용 |
| `insights/sector-position.tsx` | S4 | 테이블 + 가로 bar(div width %) | `getRankStyle`, `formatMarketCap`, `formatScore` |
| `insights/valuation-compare.tsx` | S5(P1) | diverging bar(본값 마커 vs 중앙값) | `formatPercent` |
| `insights/financial-analyst.tsx` | S7 | 라벨-값 그리드 + `Badge`(추천) | `formatPercent`, `formatRecommendation`, `formatPrice` |
| 재사용 그대로 | S6 | — | `StockHegemonyBadges` |
| 재사용 그대로 | S8 | 기간 토글만 래퍼 추가(`insights/price-chart-section.tsx`) | `PriceChart` |

recharts 차트 종류 선정:
- S3 점수추이: **AreaChart**(smoothed 메인) + 토글 시 **Line**. 기존 area+gradient 패턴.
- S4 점유율/S5 밸류에이션: 풀 차트 대신 **div 기반 가로 bar**(가벼움, 기존 score-analysis 진행바와 톤 일치). 필요 시 recharts `BarChart`로 승급.
- S8 가격: 기존 `AreaChart` 그대로.
- radial/게이지: 52주 위치는 **선형 progressbar**로 충분(radial 과용 금지).

framer-motion: **절제** — 페이지 진입 시 컨테이너 1회 `opacity/y` 페이드(현 `stock-detail-page.tsx`와 동일)만. 카드별 stagger·hover 모션 금지(안티패턴: 의미 없는 hover translate/scale).

상태/데이터: `useCompany(ticker)` 확장(점수 추이·52주·상승여력 필드 추가) + peer/밸류에이션은 신규 훅 `useStockInsights(ticker)` 또는 `useSector(sectorId)` 재사용. queryKey 분리로 캐시 격리.

---

## 5. 빈/결손 상태 (카드별 폴백)

| 결손 케이스 | 영향 섹션 | 폴백 UX |
|-------------|-----------|---------|
| KR 종목 애널리스트 결측(`recommendationKey/analystCount/targetMeanPrice = null`) | S1 상승여력, S7 | 상승여력 칸 숨김 + "애널리스트 커버리지 없음(국내 종목)" 안내 1줄. S2에서 해당 시그널 제외 |
| `score_history` 짧음(신규 종목 <14일) | S3 | 차트 대신 "추이 데이터 축적 중 (N일/74일)" 안내. 5일 미만이면 카드 자체 숨김 |
| `score = null` | S1 점수, S2, S3 | 현 `stock-detail-sections.tsx:41`의 "패권 점수를 산출 중입니다" 문구 재사용. S2/S3 숨김 |
| peer 1개(섹터에 본 종목뿐) | S4 | "비교 가능한 동종 종목 없음" + 본 종목 단독 행만 |
| 섹터 중앙값 계산 불가(peer 메트릭 결측) | S5 | 해당 지표 행만 회색 처리 "비교 데이터 부족" |
| `history` 비어있음 | S8 | 기존 `PriceChart`의 "No price data" 빈 상태 재사용 |
| region 결과 자체 없음 | 전체 | `EmptyRegionState`(`components/ui/empty-region-state.tsx`) 재사용 |

원칙: **카드 단위로 graceful degradation** — 한 데이터 결손이 페이지 전체를 막지 않는다.

---

## 6. 규칙 준수 체크리스트

- 이모지 금지 → 모든 아이콘 lucide-react(ArrowUp/ArrowDown/AlertTriangle/ShieldCheck/BarChart3/Minus). 디자인 안티패턴 §"이모지 사용 금지" 준수.
- 통화 → 가격·시총·목표주가·FCF는 API에서 `toUsd` 변환된 값만 표시(클라이언트는 변환 금지, `formatKrw`는 USD 입력). filter-architect API 계약 책임(§7).
- 불변성 → peer 정렬 등은 `[...arr].sort()`. `Math.random()` 렌더 호출 금지.
- 작은 파일 → 섹션당 1파일 200~400줄, `lib/stock-signals.ts`로 룰 로직 추출.
- 색상 → 하드코딩 raw 색 금지, 토큰(`text-success`/`text-danger`/`bg-surface-1`/`chart-*`) 사용. 단 recharts stroke는 기존 차트들이 `#10b981`/`#ef4444` 리터럴 사용 중 → **차트 컬러 상수 모듈로 통일**(기존 부채 정리 겸).
- a11y → 모든 progressbar에 `role/aria-valuenow/min/max`(기존 패턴), 차트에 대체텍스트(`aria-label` 또는 `figure`+`figcaption` 요약), 시그널 불릿은 색만이 아닌 아이콘+텍스트로 의미 전달, 뒤로가기 링크 `aria-label`(현행 유지).
- 텍스트 라벨 → small-caps 필요 시 `.eyebrow` 클래스(uppercase+sans 금지).

---

## 7. 의존 지점 (다른 에이전트)

### data-modeler (`insight-catalog.md`) — 계산 가능성 확정 필요
1. **S2 시그널 룰셋**: 어떤 강점/주의 룰이 데이터로 산출 가능한가(임계값·근거 필드 매핑). 본 문서는 5~7개 룰 가정.
2. **S3 점수추이**: `score_history` 74일이 모든 종목에 있는지, 최소 길이 분포(빈 상태 임계값 결정용).
3. **S5 섹터 중앙값**: PER/PEG/ROE의 섹터 집계가 의미 있는 표본(peer 수)인지 — 표본 작으면 S5 강등.
4. **S1 상승여력**: `(targetMeanPrice - price)/price`가 KR 종목에서 결측 비율.

### filter-architect (`api-design.md`) — API 계약 정합 필요
1. `/api/company/[ticker]` 확장 필드(또는 신규 `/api/stock/[ticker]/insights`): `scoreHistory[]`(smoothed+4구성요소, 날짜), `week52High/Low`(toUsd, 이미 snapshot에 있음 — 노출만), `targetUpside`, 기간 확장 `history`(74일+).
2. peer 비교: `/api/sector/[sectorId]` 재사용 가능 여부 확정(`companies`+`marketCapTotal` 보유 확인됨) vs 본 종목 섹터 한정 신규 엔드포인트.
3. 밸류에이션 중앙값: API 측 사전계산(권장) vs 클라이언트 계산. **toUsd 변환 책임은 API**.
4. `useStockInsights` 훅 queryKey/계약.

본 문서의 S3/S5/S1 상승여력은 위 1~4 확정 후 최종 fix. 미확정 시 P0=S1(52주 위치까지)·S2·S4·S6·S7·S8, S3는 score_history API 확정 직후 승격.

---

## 부록: 현 코드 대비 변경 요약
- `components/stock/stock-detail-page.tsx`: `StockDetailSections` 호출 제거 → 인사이트 섹션 직접 조립(헤더·로딩·에러·모션 골격은 유지).
- `components/company-detail.tsx`(모달): **무변경**.
- `components/stock/stock-detail-sections.tsx`: 모달 전용으로 남거나(권장) 페이지에서 분리. 공용 원자(`StockPriceBanner`/`StockScoreAnalysis`/`StockHegemonyBadges`)는 양쪽 재사용.
- 신규 `components/stock/insights/*` 6~7개 + `lib/stock-signals.ts` + 차트 컬러 상수 모듈.
