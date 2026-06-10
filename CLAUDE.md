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
