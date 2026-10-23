# sector-king

Next.js 16 + React 19 + TypeScript + Drizzle/SQLite + React Query + framer-motion + recharts 기반의 멀티 산업 주식 대시보드.

## 작업 시작 전 `git pull` (필수)

**모든 작업은 원격 main 최신화로 시작한다.** 먼저 `git status`와 현재 브랜치를 확인해 기존 변경을 보존한다. 깨끗한 main은 `git pull --ff-only`로 갱신하고 기준 SHA를 기록한다. 충돌·미커밋 변경이 있으면 이를 덮어쓰지 말고 최신 원격 main에서 격리 작업한다.

- 최신 수집 DB의 원본은 `db-snapshot` 브랜치다. `.github/workflows/update-data.yml`이 평일 하루 4회 갱신하고, `pnpm build`/`pnpm db:pull`은 `scripts/fetch-db.mjs`로 이를 가져온다. main 최신화만으로 최신 DB가 확보됐다고 판단하지 않는다.
- 원격 확보 실패 시 스크립트는 유효한 로컬 DB로 폴백할 수 있다. 그 경우 최신 원격 데이터 검증과 구분한다. 유효 DB가 없으면 실패하며 빈 DB로 대체하지 않는다.
- main에도 `data/hegemony.db` 추적 파일이 남아 있으므로 빌드·스크립트 이후 의도치 않은 DB 변경을 확인한다. 기존 변경과 이번 실행의 부수효과를 구분하고, 데이터 업무가 아니면 해당 DB를 커밋하지 않는다. 기존 DB 변경을 임의로 되돌리거나 데이터 갱신·수집·운영 배포를 문서 수정에 덧붙이지 않는다.

## 프로젝트 위키

정의·결정·기획 의도는 `docs/wiki/index.md` 에서 시작한다. 자금 흐름 관련 작업 전에는 `docs/wiki/concepts/money-flow-definitions.md` 를 먼저 읽는다.

## 패키지 매니저

`pnpm`만 사용. `pnpm-lock.yaml` 외 lockfile 생성 금지.

## 통화 정규화 규칙 (필수)

**`dailySnapshots` 와 `companyScores` 의 가격성 필드는 네이티브 통화로 저장된다.** API의 가격 응답 계약은 USD이며 클라이언트는 원/달러 표시를 선택하므로, **API 응답 직전 반드시 `toUsd(value, ticker)` 로 변환**해야 한다. 누락 시 .KS/.KQ/.T/.TW/.HK/.PA 티커가 raw 원·엔·NT달러 값으로 노출되어 `$1.82M` 같은 이중 환산 버그가 발생한다(2026-05-09, 2026-05-18 두 번 재발).

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

**트리거:** 다음 영역에 걸치는 작업 요청 시 기존 `.agents/skills/sk-orchestrator/SKILL.md`를 읽는다(Claude용 동일 절차는 `.claude/skills/sk-orchestrator/SKILL.md`).
- 산업/섹터/티커 데이터 모델 변경, 시드/마이그레이션
- region(전체/국내/해외) 필터 도입·확장
- 섹터별 누락 티커 보완
- 산업 대시보드/money-flow/price-changes/statistics/hegemony-map의 동시 변경
- 위 영역의 재실행, 수정, 보완

단순 질문·단일 파일 편집은 직접 응답한다.

**실제 저장된 정의 (`.claude/agents/`):** sk-data-modeler, sk-ticker-curator, sk-filter-architect, sk-ui-planner, sk-implementer, sk-verifier

**작업 디렉토리:** `_workspace/01_plan/`, `_workspace/02_impl/`, `_workspace/03_verify/` (gitignore 권장)

## 변경 이력과 사실 확인

- [이전 변경 이력 전체](docs/wiki/history/claude-changelog-through-2026-10-13.md)는 원문 보관이며 현재 지침의 일부로 자동 실행하지 않는다. 기능별 결정·제약을 확인할 때 관련 행과 위키 문서를 추가로 읽는다.
- 현재 버전은 `package.json`, 데이터 확보·갱신은 `scripts/fetch-db.mjs`와 `.github/workflows/update-data.yml`, 통화 계약은 `lib/currency.ts`·`lib/format.ts`·`hooks/use-currency.tsx`가 근거다. 표시 기본값은 KRW이고 API USD 정규화와는 별개다.
- 하네스 파일 존재, 실제 직원 호출, 검증 성공은 구분한다. 기존 정의가 실행 도구에 연결됐다고 가정하거나 없는 `.Codex/agents/`를 호출하지 않는다.
