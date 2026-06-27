# 08_stock_insights 검증 리포트 (증거 기반 독립 검증)

> 검증자: sk-verifier · 2026-06-10 · DB: data/hegemony.db (실측)
> 전체 판정: **CONDITIONAL PASS** — 라운드 산출물은 전 항목 PASS. 단 `pnpm lint`는 저장소 전역 기존 부채로 exit 1 (이번 라운드 무관).

## 빌드/품질 exit code
| 명령 | exit | 비고 |
|------|:----:|------|
| `pnpm exec tsc --noEmit` | **0** | 타입 에러 0 |
| `pnpm build` | **0** | `/stock/[ticker]`, `/api/company/[ticker]/insights` 컴파일 등록 확인 |
| `pnpm lint` | **1** | 49 errors / 10 warnings — **전부 기존 부채**. 이번 라운드 신규/변경 파일에는 0 |

---

## 항목별 판정

### 1. tsc --noEmit — PASS
exit 0, 출력 없음.

### 2. pnpm build — PASS
exit 0. 빌드 라우트 목록에서 확인:
```
├ ƒ /api/company/[ticker]
├ ƒ /api/company/[ticker]/insights
├ ƒ /stock/[ticker]
└ ƒ /stock/[ticker]/opengraph-image
```

### 3. pnpm lint — PASS (이번 라운드 기인 0)
exit 1이지만 49개 error 전부 기존 파일(기존 부채):
- `Math.random`/`Date.now` in render: flow-card.tsx, flow-river.tsx, industry-money-flow-card.tsx, global-top-bar.tsx (MEMORY "Known Technical Debt"와 일치)
- setState in effect: global-search.tsx, global-top-bar.tsx, use-share.ts, news-subscribe-cta.tsx, onboarding-hint-strip.tsx
- 렌더 중 컴포넌트 생성: recently-viewed-row.tsx, company-ranking-table.tsx, category-icon.tsx, industry-icon.tsx
- 메모이제이션: ticker-tape.tsx, sector-trend-section.tsx
- 테스트/coverage 파일 warning

교차 검증: `grep -E "stock/insights|stock-signals|chart-colors|use-company-insights|stock-detail-page|company/\[ticker\]/insights|api-helpers" lint_out.txt` → **NO_NEW_ROUND_FILES_IN_LINT_OUTPUT**. 이번 라운드 신규/변경 7개 파일군 모두 lint 클린.

### 4. 모달 무회귀 — PASS
`components/company-detail.tsx`는 `useCompany(ticker)`(base)만 호출, `StockDetailSections` 렌더. `/insights`·`useCompanyInsights` 미사용. 신규 필드는 전부 옵셔널이라 기존 매핑 형태 불변.

### 5. base API 가산성 — PASS
`route.ts`: 신규 필드 9종(beta/debtToEquity/freeCashflow/week52Position/dayHigh/dayLow/avgVolume/analystUpside/dominance) 가산. 기존 필드(company/profile/snapshot 핵심/history/score 기존/sectors) 매핑·의미 불변. `types/index.ts`: 신규 필드 전부 `?:`/nullable (ScoreDetail beta?/debtToEquity?/freeCashflow?, snapshot week52Position? 등, analystUpside?/dominance?).

### 6. 통화 (혼합통화 메모리 집계) — PASS (핵심)
route.ts L202~247: peer 행별 `toUsd(p.marketCap, peerTicker)` → `normalized.map` → `marketCaps.reduce(sum)` / `[...marketCaps].sort()` median. SQL은 raw `market_cap` 조회만, ORDER BY는 `sectorCompanies.rank`. **`SUM(market_cap)`/`ORDER BY market_cap` 없음.**

### 7. min-peer N≥4 — PASS
`MIN_PEER_SAMPLE=4`. `insufficientPeerSample = peerCount < 4`. `hasSample` false면 medianScore/medianMarketCapUsd null, `buildValuationMetric(...hasSample=false)`가 percentile/median null 반환. marketSharePct는 표본과 무관하게 항상 산출(설계 일치 — 점유율은 percentile 아님).

### 8. 주 섹터 선정 — PASS
`memberSectors.sort`: rank ASC → sectorOrder ASC(null=MAX_SAFE_INTEGER) → sectorId localeCompare. 결정론적 tie-break. `[0]` 선택.

### 9. range 화이트리스트 — PASS
`resolveRange(searchParams, {allowed:[30,60,74,120], fallback:74})`. lib/api-helpers.ts: range null/NaN/화이트리스트 외 → fallback. 보유분 클램프는 호출부 `slice` 처리(appliedRange=실제 반환 일수).

### 10. 실데이터 sanity (gaming 섹터, KR 4 + US 5) — PASS
per-row toUsd(올바름) vs native SUM(버그) 대조:
- 총액 USD: 3.26T / 네이티브 SUM: 21.99T (KR raw 6.7배 오염)
- 259960.KS: USD share **0.2%** vs native **47.6%**
- MSFT: USD **92.0%** vs native 13.6%
route 로직은 per-row toUsd라 KR 과대 없음. 코드 경로(L237-247) 일치 확인.

### 11. 이모지 0 — PASS
`components/stock/insights/**`, `lib/stock-signals.ts` grep 결과 이모지 리터럴 0. 매치된 글자는 코드 주석의 →/≥/≤/~ 글리프뿐(비-UI 텍스트, 위반 아님). UI는 lucide만(TrendingUp/Down, Minus, Star, Users, Scale, Landmark, Sparkles, ArrowUp, AlertTriangle, LineChart, ShieldCheck, ArrowLeft).

### 12. a11y — PASS
- progressbar role + aria-valuenow/min/max: insight-hero(52주위치·패권점수), valuation-compare(백분위)
- 차트 대체텍스트: score-trend-chart `<figure>`+`<figcaption class=sr-only>` altText, price-chart-section figcaption
- 시그널 색만 아닌 아이콘+텍스트: signal-summary SignalRow = ArrowUp/AlertTriangle 아이콘 + label/evidence + sr-only "강점/주의"
- 토글: role=group + aria-pressed (score-trend 구성요소, price-chart 기간)

### 13. 통화 표시 (재변환 없음) — PASS
insight 클라 컴포넌트에 실제 `toUsd` 호출 0(주석만). API USD 값을 `formatPrice`/`formatMarketCap`에 그대로 전달. `formatKrw(usdAmount)`는 USD 입력→×1450 (시그니처·본문 확인). insight 컴포넌트는 formatKrw 미사용이라 이중환산 불가.

### 14. 폴백 — PASS
- score_history <5 → ScoreTrendChart "추이 데이터 축적 중 (N/74일)"
- peer ≤1 → SectorPosition "비교 가능한 동종 종목이 없습니다"
- min-peer <4 → ValuationCompare "비교 데이터 부족" + percentile/median null
- KR 애널 결측/recommendation='none'/null → InsightHero·FinancialAnalyst "애널리스트 커버리지 없음", 상승여력·의견 숨김
- FCF·D/E null → FinancialAnalyst 행 필터(show=false)로 숨김
- score=null → InsightHero "산출 중", FinancialAnalyst "재무 지표를 산출 중"
DB 실측: <5행 ticker 5개, <4멤버 섹터 다수(electrical_equip 1 등) — 폴백 트리거 데이터 실재.

### 15. 시그널 품질 (AI 슬롭 방지) — PASS
`buildStockSignals` 룰 전부 근거 데이터 기반 + evidence 병기 + 중립 카피("우상향","저점권","상방 여력" 등 단정·환각 없음). P1 밸류에이션 룰은 hasSample(N≥4)에서만. recommendation='none'**과 null** 둘 다 "애널리스트 커버리지 없음" caution으로 처리(null로 누락 안 함). SignalSummary 하단 "투자 권유가 아닙니다" 면책.

---

## FAIL / 위험 목록
- **FAIL 없음.**
- 위험(이번 라운드 무관, 사전 인지): `pnpm lint` exit 1 (49 errors). 전역 CI에서 lint 게이트가 있다면 머지 차단 가능 — 단 기존 부채이며 이번 작업이 악화시키지 않음(신규 파일 0 error). 별도 부채 정리 라운드 권장.
- 경미: signal-summary의 no-coverage 룰이 `recommendationKey == null`도 caution에 포함 — 카탈로그상 KR도 'none' 저장이라 사실상 'none' 경로가 정상. 동작상 문제 없음.
