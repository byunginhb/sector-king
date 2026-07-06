# sector-king

Next.js 15 + TypeScript + Drizzle/SQLite + React Query + framer-motion + recharts 기반의 멀티 산업 주식 대시보드.

## 패키지 매니저

`pnpm`만 사용. `pnpm-lock.yaml` 외 lockfile 생성 금지.

## 통화 정규화 규칙 (필수)

**`dailySnapshots` 와 `companyScores` 의 가격성 필드는 네이티브 통화로 저장된다.** 클라이언트는 모든 응답을 USD($)로 표시하므로, **API 응답 직전 반드시 `toUsd(value, ticker)` 로 변환**해야 한다. 누락 시 .KS/.KQ/.T/.TW/.HK/.PA 티커가 raw 원·엔·NT달러 값으로 노출되어 `$1.82M` 같은 이중 환산 버그가 발생한다(2026-05-09, 2026-05-18 두 번 재발).

**변환 필수 필드:**
- `dailySnapshots`: `price`, `marketCap`, `week52High`, `week52Low`, `dayHigh`, `dayLow`, `firstPrice`, `latestPrice`, `priceChange`(절댓값 차이일 때만 — 원 컬럼 `daily_snapshots.price_change` 는 %라 변환 불요)
- `companyScores`: `targetMeanPrice`, `freeCashflow`
- 위 값들로 파생 계산하는 가격 차/합도 USD 변환 후 계산

**변환 불요 필드 (통화 무관):**
- 비율·퍼센트: `percentChange`, `priceChange`(dailySnapshots 컬럼 = %), `revenueGrowth`, `earningsGrowth`, `operatingMargin`, `returnOnEquity`
- 무차원: `volume`, `peRatio`, `pegRatio`, `beta`, `debtToEquity`, score 값
- 클라이언트 표시용 KRW: `formatKrw(usd)` 가 USD를 받아 ×환율 → 원화 표기 (절대 원값을 넘기지 말 것)

**체크리스트 (모든 신규/수정 API 라우트에서):**
- [ ] 응답에 가격·시총 필드가 있는가?
- [ ] 해당 필드를 `toUsd(value, ticker)` 로 감쌌는가?
- [ ] 두 가격을 빼서 차액을 만든다면, 양쪽을 USD 로 변환 후 빼는가?
- [ ] 같은 통화의 두 가격을 나눠 비율을 구한다면(같은 ticker 한정), 변환은 선택 — 단 출력 시 USD로 변환된 값을 응답해야 함

**SoT:** `lib/currency.ts` (`toUsd`, `TICKER_SUFFIX_CURRENCY`). 새 거래소 접미사 추가 시 여기 한 곳만 수정.

## 하네스: sector-king domain harness

**목표:** 산업/섹터/티커 데이터 모델, 필터 체인(`lib/industry.ts`), API 라우트, UI 페이지가 동시에 영향받는 작업을 안전하게 조율한다.

**트리거:** 다음 영역에 걸치는 작업 요청 시 `sk-orchestrator` 스킬을 사용한다.
- 산업/섹터/티커 데이터 모델 변경, 시드/마이그레이션
- region(전체/국내/해외) 필터 도입·확장
- 섹터별 누락 티커 보완
- 산업 대시보드/money-flow/price-changes/statistics/hegemony-map의 동시 변경
- 위 영역의 재실행, 수정, 보완

단순 질문·단일 파일 편집은 직접 응답한다.

**에이전트 (`.claude/agents/`):** sk-data-modeler, sk-ticker-curator, sk-filter-architect, sk-ui-planner, sk-implementer, sk-verifier

**작업 디렉토리:** `_workspace/01_plan/`, `_workspace/02_impl/`, `_workspace/03_verify/` (gitignore 권장)

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-09 | 초기 하네스 구성 | 전체 | region 필터(전체/국내/해외) + 누락 티커 보완 작업 시작 |
| 2026-05-09 | S1~S5 완료 — region 토글 + 티커 보완 출시 | DB 스키마, lib/region, API 8개, hook 8개, UI 5개 페이지 | 통합 기획서 수락 기준 14개 코드 검증 통과 |
| 2026-06-10 | 07_market_scope 완료 — 시장 미국·한국 한정 + `/stock/[ticker]` 신규 | DB(비US/KR 22개 제거, MUFG/JD 등 대체), scripts(remove/add 마이그레이션·currency.py·suggest_candidates), region 라벨 4파일, app/stock·components/stock | INTL=미국 재정의(식별자 유지), 시총+섹터대표성 수집기준, 종목 전용 상세 라우트. 수락기준 8개 CONDITIONAL→PASS(좀비소스 정리 후) |
| 2026-06-10 | 08_stock_insights 완료 — `/stock/[ticker]` 인사이트 페이지 격상 | API base 가산확장 + 신규 `/api/company/[ticker]/insights`, components/stock/insights/* 7개, lib/stock-signals·chart-colors, use-company-insights | 모달=스냅샷/페이지=시계열·peer·룰시그널 차별화. score_history 74일·시총점유율(USD집계)·밸류에이션 percentile 활용. 수락기준 15개 PASS(모달 무회귀, toUsd 집계 실증) |
| 2026-06-11 | 09_accuracy_audit 완료 — 유료화 대비 정합성 수정 + `/guide` 신규 | scoring.py(USD 합산), backfill_score_history.py(EMA 재체인), update_data.py(주말 skip·KR volume 가드), 주말행 10,422행·깨진티커 15종 정리(XYZ/PSKY 대체), lib/currency·format(환율 SoT), money-flow 라벨·기준일 표기, app/guide+components/guide | 혼합통화 scale 왜곡(MU 0.03%→29.77%) 해소, 자금흐름=기간 시총 변화액 정의 확정, 검증 12/12 PASS·EMA 407/407 재현 |
| 2026-06-14 | 10_currency_toggle 완료 — 통화 표시 토글(기본 ₩ + 원/달러 전역) | 신규 hooks/use-currency·use-currency-format·components/currency-toggle, lib/format(4함수 통화인지), providers·layout(inline script), 표시지점 28파일 전수 전환 | 순수 표시 레이어(DB/API/캐시 무변경). Context+localStorage(next-themes 패턴), queryKey 미포함, 이중표기 단일화, 양방향 환산. 검증 14/14 PASS·신규 lint 회귀 0 |
| 2026-06-14 | 시총 KPI 정확화 + 일자별 드릴다운 | API industries.market(dedup), 신규 /api/statistics/market-cap·use-market-cap-history·market-cap-detail-modal, market-pulse-strip(라벨·클릭), lib/format(경 단위) | "전체 시가총액" 멀티산업 중복 1.7배 제거→"추적 종목 시총", 169179.7조원→9.7경원, 카드 클릭 시 일자별 차트+표 모달. 검증 7/7 PASS(region kr+global=all 실증) |
| 2026-06-27 | 11_kr_top200 — KR 시총 상위 200 누락 운영기업 99개 적재 + 노출 배선 | DB(KR 79→178, 신규 섹터 14·카테고리 4·industry 연결 4, rank cap ≤10→≤30), scripts/migrate-add-kr-top200-sectors.ts, _workspace/research/batch*.csv·run_batch.sh | ETF/우선주 제외 운영기업만 add_ticker.py로 적재(yfinance 자동, LLM 0). 통신·해운·지주 등 신규 섹터 industry 연결로 대시보드/지도/머니플로우/통계 전면 노출. score_history는 시스템 기본대로 forward-only. 빌드 standalone DB에 KR 178 번들 확인. seed.ts는 폐기된 tech 부트스트랩이라 미동기화—taxonomy SoT는 누적 마이그레이션+커밋 DB |
| 2026-06-28 | 12_us_top250 — US 시총 상위 250 누락 운영기업 94개 적재 | DB(US 330→424, 신규 섹터 17개 전부 기존 카테고리에 편입→배선 불필요), scripts/migrate-add-us-top250-sectors.ts·backfill_new_ticker_score_history.py, _workspace/research/us_all.csv | 갭 96개 중 MDLN(상장 미확정)·MMC(Yahoo 데이터 공급 문제) 제외. 철도/미드스트림/정유/지역은행/담배/아날로그반도체/산업재유통/의약품유통 등 비테크 클러스터. US는 native USD라 toUsd 불요. score_history 백필로 단기점수 100 붕괴 방지(신규 종목 65행 생성). journal=delete 보장(WAL 500 방지). 빌드 standalone DB에 US 424 번들 확인 |
| 2026-06-28 | 12_dcf_score — /rankings 에 DCF 점수(0~100)+상승예측% 독립 보조 지표 추가 | 신규 lib/dcf.ts(순수함수·통화무지)·__tests__/unit/dcf.test.ts(13), app/api/rankings/route.ts(freeCashflow 배선+company_profiles sector leftJoin+computeDcf+sortKey dcf/dcfUpside), hooks/use-rankings.ts, components/rankings/ranking-table·ranking-card-list·rankings-page, components/guide/number-glossary-data.ts·app/methodology(섹션6) | 표준 2단계 DCF(예측 10년+TV). FCF는 네이티브 유지·주당 내재가치만 1회 toUsd(intrinsicToUsd 주입). g0=clamp(revenueGrowth,-5%,15%), r=베타·부채(/100)·규모(USD기준) 가산 6~12%. 가드: FCF≤0→negativeFcf, 금융주→finance, 자료부족→missing, NaN 명시 차단. 기존 단기·장기·combinedScore·topPicks·애널리스트 upsidePct 무회귀. 한계: company_profiles 약 1/3만 보유→sector 기반 금융주 제외 일부만 작동(FCF≤0 가드가 주 방어선) |
| 2026-07-07 | issue#8 시장 규모 — 단독 페이지 `/market-size`(버블+트리맵 시각화) 신규 | 신규 app/market-size·app/api/market-size/route.ts·hooks/use-market-size·components/market-size/*(page·bubble·treemap·explainer), types(MarketSize*), global-top-bar(PieChart 탭)·sitemap 배선 | 카테고리(클릭→섹터 드릴다운) 버블: X=시총가중 revenueGrowth, Y=시총가중 목표주가 상승여력((target−price)/price 동일통화 상쇄), 크기=시총, 색=대표산업. 트리맵=카테고리 시총비율(성장률 청록→보라 시퀀셜). 시총·매출 toUsd 후 집계 실증(KR 반도체 $4.06e12 raw KRW÷1450). 매출 보조(185/602 커버 라벨). 카테고리 M:N 중복(합 $220T≈추적×2)이라 그랜드 토탈 미표기·비율만. 최신 스냅샷 기준. 접이식 설명 패널. build/tsc/lint(신규 회귀 0) PASS |
| 2026-07-07 | 시장 규모 성장 전망 UX 개편 — 버블 차트 → 지표 분리 막대 | 버블 제거(market-size-bubble-chart 삭제), 신규 market-size-metric-bars(재사용 수평 div 막대), market-size-page(2열 grid·모바일 스택)·explainer 갱신 | 사용자 피드백("버블 보기 불편"): 매출 성장률·목표주가 상승여력을 각각 랭킹 막대로 분리. 데스크탑 lg:grid-cols-2·모바일 세로. 지표 desc 정렬 상위12, null 제외, 소프트 캡(상위85%×1.2·최소40%)으로 극단값(지주회사 성장 193%)이 다른 막대 안 눌리게—라벨은 실제%. 양수 emerald/음수 rose, recharts 미사용(경량). API·트리맵 무변경 재활용(멀티에이전트 설계·데이터 검증). build/tsc/lint(신규 회귀 0) PASS |
