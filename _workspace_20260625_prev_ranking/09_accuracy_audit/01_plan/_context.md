# 09_accuracy_audit — 공통 컨텍스트 (메인 오케스트레이터)

## 사용자 요구사항 (원문 요지)
1. **데이터 정확도·이론적 문제 전수 점검** — 실제 사용자에게 **유료로** 서비스하려면 데이터 정합성과 논리에 문제가 없어야 한다.
2. 문제가 있으면 **수정**한다.
3. **아주 쉽게** 이 서비스의 기능과 숫자들이 어떤 의미인지 설명하는 **새 페이지 1개** 추가.

## 서비스 개요 (감사 대상의 전체 그림)
- 멀티 산업 주식 대시보드. 미국·한국 종목만(07라운드 확정, region INTL=미국).
- 핵심 숫자들: **패권 점수**(scale 35/growth 30/profitability 20/sentiment 15, EMA α=0.3 smoothing), **자금 흐름**(money-flow), **시가총액(USD)**, 등락률, 52주 위치, 섹터 rank, 시총 점유율, 밸류에이션 percentile, 목표주가 상승여력.
- 데이터 원천: yfinance `.info` 일일 수집(`scripts/update_data.py`) → `daily_snapshots`(native 통화)·`company_scores`·`score_history`. 점수 산식 SoT: `scripts/scoring.py`.
- 표시: 모든 가격성 값은 API 응답 직전 `toUsd(value, ticker)` (CLAUDE.md 필수 규칙 — 과거 2회 재발 버그).

## 이미 알려진/의심되는 문제 (시드 — 반드시 확인하되 이것만 보지 말 것)

### S1. 환율 SoT 분열 (방금 발견, 정합성 직결)
- `lib/currency.ts`: `KRW: Number(process.env.KRW_USD_RATE) || 1450` (env 기반)
- `lib/format.ts:135`: `const KRW_RATE = 1450` (하드코딩, env 무시)
- `scripts/currency.py`: env 기반(1450 기본)
→ env로 환율 갱신 시 표시(₩ 환산)와 계산(USD 환산)이 어긋남. SoT 일원화 필요.

### S2. 고정 환율 자체의 정확도 (유료 서비스 관점)
- 환율 1450이 env 기본값으로 박제 — 실제 환율 변동 미반영. KR 종목의 USD 시총/가격이 전부 이 값에 종속.
- 검토: `update_data.py`에서 yfinance `KRW=X` 환율을 일일 수집해 DB/env에 반영하는 방안 vs 현행 유지+문서화. 비용/복잡도 대비 판단.

### S3. scoring.py 혼합통화 시총 합산 (알려진 버그, 07라운드에서 의도적 보류 — 이번 라운드 범위 내!)
- `scoring.py` `sector_total_mc`가 native 통화 합산 → KR+US 혼합 섹터에서 KRW raw(~1450배)가 scale_score(시총 점유 20점)를 왜곡. **이번에 수정 대상.**
- 수정 시 `scripts/currency.py::to_usd` 활용. 수정 후 점수 재계산이 기존 score_history와 단절(점프) 발생 — smoothing/이력 처리 방안 포함.

### S4. money-flow 산식의 이론적 한계
- 자금 흐름 = typicalPrice × volume 누적(거래대금 근사). 모든 거래는 매수=매도이므로 "순유입"은 이론상 측정 불가 — "유입/유출"이라는 라벨이 과대 해석 소지. 산식 확인 후: (a) 계산이 일관적인지, (b) UI 라벨/설명이 정직한지, (c) 설명 페이지에 정확한 정의 명시.

### S5. priceChange 의미론
- `daily_snapshots.price_change` = `regularMarketChangePercent`(%). 어딘가에서 절댓값 차이로 오용하는 곳 없는지 전수 확인.

### S6. 결측 처리의 이론적 선택
- `scoring.py` `normalize(None) → max_score*0.5`(중앙값 폴백) — 결측이 "평균 점수"가 되는 설계. data_quality로 보정하지만, 유료 서비스에서 이 선택이 정당한지 + 설명 페이지에 명시 필요.

### S7. 스냅샷 시점/시차
- KR 장마감(15:30 KST)과 US 장마감(16:00 ET)이 다른데 같은 `date`로 저장 — cron 시점에 따라 한쪽은 장중 가격일 수 있음. 의미론 확인 + 문서화.

### S8. 소표본 시총 점유율 (코드리뷰 MEDIUM)
- peer 2~3개 섹터에서도 marketSharePct 노출 — 점유율 자체는 유효하나 "섹터 N개 종목 기준" 컨텍스트 표기 검토.

### S9. 52주 high/low, week52Position, upsidePct, percentile 산식 정확성
- 분모 0 가드는 확인됐으나, percentile 계산 방식(이하 개수/N), EMA, 모멘텀 delta 등 수학적 정의가 표준적인지.

## 최근 코드 상태
- 방금 main에 머지됨: `/stock/[ticker]` 인사이트 페이지(점수추이 74일·peer·시총점유율·밸류에이션 percentile·시그널 룰), `/api/company/[ticker]/insights`, `lib/stock-signals.ts`.
- 기존 페이지: `/`(대시보드), `/[industryId]/{money-flow,price-changes,statistics}`, hegemony-map, `/stock/[ticker]`, `/news`, `/methodology`(점수 산식 설명 — 이미 존재!), `/me/*`, `/contact`, `/design-system`.

## 새 설명 페이지 관련
- **기존 `/methodology`와 중복 금지** — methodology는 점수 산식 중심. 새 페이지는 **완전 초보자용**: "이 서비스로 뭘 볼 수 있고, 화면의 숫자들이 무슨 뜻이고, 어떻게 읽으면 되는지"를 아주 쉽게. 감사에서 확인된 한계·주의사항(자금흐름 정의, 환율, 데이터 시점, 결측 처리)을 **정직하게** 포함 — 유료 서비스 신뢰의 근간.

## 핵심 파일
`scripts/scoring.py`, `scripts/update_data.py`, `lib/currency.ts`, `lib/format.ts`, `scripts/currency.py`, `lib/stock-signals.ts`, `app/api/**`(특히 statistics/*, company/*), `lib/money-flow-helpers.ts`, `drizzle/schema.ts`, `app/methodology/page.tsx`, `data/hegemony.db`(.venv/bin/python 사용)

## 산출물 경로
- 데이터 정합성 감사 → `01_plan/audit-data-integrity.md`
- 이론/산식 감사 → `01_plan/audit-theory.md`
- API/표시 일관성 감사 → `01_plan/audit-display.md`
- 설명 페이지 기획 → `01_plan/guide-page-design.md`

## 감사 공통 원칙
- 주장에는 증거(쿼리 결과/코드 인용/수치 재현). 심각도: CRITICAL(틀린 숫자가 사용자에게 노출) / HIGH(조건부로 틀림·오해 유발) / MEDIUM(이론적 약점·문서화 필요) / LOW.
- "유료 서비스 신뢰" 기준: 숫자가 틀리면 안 되고, 맞더라도 의미가 오해되면 안 된다.
