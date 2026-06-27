# Stock Insight Catalog — `/stock/[ticker]`

> **범위:** 이미 DB에 수집된 데이터(`daily_snapshots`, `company_scores`, `score_history`, `sector_companies`, `sectors`, `companies`, `company_profiles`)만으로 만들 수 있는 인사이트. 신규 yfinance 수집 없음.
> **산식 SoT:** `scripts/scoring.py` (scale 35 / growth 30 / profitability 20 / sentiment 15 = 100점, EMA α=0.3 smoothing).
> **통화 SoT:** `lib/currency.ts::toUsd(value, ticker)` — 가격·시총·목표가·FCF는 비교/표시 전 반드시 USD 환산.
> **실측일:** 2026-06-10 (`data/hegemony.db` 직접 조회).

---

## 0. 데이터 실측 요약 (catalog 설계 근거)

| 항목 | 실측값 | 인사이트 영향 |
|------|--------|--------------|
| `score_history` 범위 | 2026-03-23 ~ 06-10 (74 distinct dates, 420 tickers, 20,610행) | 모멘텀 가능. 단 **200 ticker만 74일 풀**, 215는 27일, 5는 1일 → 최소 데이터 임계 필요 |
| `daily_snapshots` 범위 | 2026-01-27 ~ 06-10 (129 dates, 408 tickers) | 197 ticker ≥60일, 203은 20–59일, 8은 <20일 → 60일 수익률은 가용 span fallback |
| `company_scores` | 407행 (INTL 329 / KR 78) | 1티커 1행, 최신 스냅샷 |
| `week_52_high/low/price` null | 최신일 405행 중 **0건 null** | 52주 위치 인사이트 신뢰도 최상 |
| `beta` null | 전체 5건 (INTL 2 / KR 3) | 변동성(beta) 인사이트 거의 전부 가용 |
| `recommendation_key` | **NULL 없음** — 미수집 시 `'none'`으로 저장 (INTL 21·KR 20이 'none') | null 체크 대신 **`'none'`을 "시그널 없음"으로 처리** |
| `analyst_count` (KR) | 76/78 `>0`, 2건만 NULL | **KR 애널리스트 데이터는 사실상 양호** (_context의 "결측 빈번" 가정과 다름) |
| `target_mean_price` (KR) | 78중 2건만 null (삼성·하이닉스 등 대부분 존재, native KRW) | KR 상승여력 계산 가능 — toUsd 불필요(비율이므로) 단 표시가는 USD |
| `free_cashflow` null | INTL 29/329, **KR 13/78** | 재무건전성 FCF는 폴백 필요 |
| `debt_to_equity` null | INTL 24/329, **KR 11/78** | 동일 폴백 |
| `data_quality` 분포 | 1.0:293, 0.86:99, 0.71:12, ≤0.57:3 | 대부분 신뢰. ≤0.71(15건)만 신뢰도 경고 |
| 멀티섹터 | GOOGL 10섹터, MSFT 8(rank1 6개), AAPL 6 등 | 멀티섹터 패권 표현 가능 |
| 섹터 크기 | ≤2개 멤버 섹터 24개, 1개 멤버 2개 | **percentile/median은 min-peer 임계(≥4) 필요** |
| 혼합통화 섹터 | aircraft_mfg, battery, beverage, cell_gene, ddr, digital_banking 등 다수 KR+INTL 공존 | **시총점유율·중앙값은 USD 환산 후 서버 집계 필수** |

> ⚠️ **scoring.py 미보정 리스크 (07라운드 트래킹, 범위 밖):** `sector_total_mc`(L195)와 `mc_score`가 native 통화 합산이라 혼합통화 섹터에서 KRW raw(~1450배)가 과대평가됨. 우리 인사이트의 시총점유율·중앙값은 **scoring.py를 재사용하지 말고 별도로 USD 환산 후 계산**한다.

---

## 1. 인사이트 메트릭 카탈로그

> 컬럼 키: 이름 | 정의 | 계산식(보유 컬럼) | 필요 데이터 | 신규 쿼리? | 통화변환? | KR 가용성

### A. 점수 모멘텀 (score_history 기반)

| 이름 | 한 줄 정의 | 계산식 | 필요 데이터 | 신규 쿼리 | 통화변환 | KR 가용성 |
|------|-----------|--------|------------|:--------:|:-------:|----------|
| **점수 추세(N일 변화량)** | 최근 smoothed_score가 N일 전 대비 얼마나 올랐나 | `Δ = smoothed[t] − smoothed[t−N]` (N=7/30, 가용 범위 내) | `score_history.smoothed_score`, date | Y (단일티커 시계열 — `/api/company`에 history 확장) | N | 추세 단축(아래 §3 임계) |
| **점수 기울기(추세선)** | 최근 N일 smoothed_score 선형회귀 기울기(점/일) | `slope = OLS(date_index, smoothed)` | `score_history.smoothed_score` | Y | N | 동일 |
| **구성요소별 추이** | scale/growth/profitability/sentiment 각각의 N일 변화 | 각 `*_score[t] − *_score[t−N]` | `score_history.{scale,growth,profitability,sentiment}_score` | Y | N | 동일 |
| **모멘텀 방향 라벨** | 상승/횡보/하락 룰 라벨 | `slope>+0.05/일→상승`, `<−0.05→하락`, else 횡보 (임계는 UI 합의) | 위 기울기 | 파생(클라) | N | 동일 |

### B. 섹터 내 포지션 (peer = 같은 섹터 다른 종목)

| 이름 | 한 줄 정의 | 계산식 | 필요 데이터 | 신규 쿼리 | 통화변환 | KR 가용성 |
|------|-----------|--------|------------|:--------:|:-------:|----------|
| **섹터 내 순위** | 이 섹터에서 몇 위 / 전체 N | `sector_companies.rank` / `COUNT(*)` | `sector_companies` | 기존(`/api/company`에 sector별 N 추가 필요) | N | 가용 |
| **시총 점유율** | 섹터 USD 시총 합 대비 이 종목 비중 | `toUsd(mc_i)/Σ toUsd(mc_j)` (섹터 멤버 전부) | `daily_snapshots.market_cap`(최신일), `sector_companies` | **Y (서버 집계)** | **Y** | 가용 |
| **peer 대비 score 백분위** | 섹터 내 smoothed_score 백분위(0–100) | `rank_pct = (멤버 중 내 score 이하 수)/N×100` | `company_scores.smoothed_score`, `sector_companies` | **Y (서버 집계)** | N | 가용 |
| **1위와의 점수 격차** | 섹터 1위 대비 내 smoothed_score 차 | `smoothed_top − smoothed_self` | 위 | **Y (서버)** | N | 가용 |

### C. 밸류에이션 상대비교 (vs 섹터 중앙값)

| 이름 | 한 줄 정의 | 계산식 | 필요 데이터 | 신규 쿼리 | 통화변환 | KR 가용성 |
|------|-----------|--------|------------|:--------:|:-------:|----------|
| **PER vs 섹터 중앙값** | 내 PER이 섹터 median 대비 고/저평가 | `pe_self`, `median(pe_sector)`, `percentile` | `daily_snapshots.pe_ratio`(최신), `sector_companies` | **Y (서버)** | N (무차원) | 가용 |
| **PEG vs 섹터 중앙값** | 동일(성장 보정 밸류) | `peg_self` vs `median(peg)` | `daily_snapshots.peg_ratio` | **Y (서버)** | N | 가용 |
| **ROE vs 섹터 중앙값** | 자본효율 상대위치 | `return_on_equity` vs median | `company_scores.return_on_equity` | **Y (서버)** | N | 가용 |
| **영업이익률 vs 섹터 중앙값** | 수익성 상대위치 | `operating_margin` vs median | `company_scores.operating_margin` | **Y (서버)** | N | 가용 |

### D. 52주 위치 & 가격 모멘텀

| 이름 | 한 줄 정의 | 계산식 | 필요 데이터 | 신규 쿼리 | 통화변환 | KR 가용성 |
|------|-----------|--------|------------|:--------:|:-------:|----------|
| **52주 위치%** | 52주 밴드 내 현재가 위치 (0=저점,100=고점) | `(price−low52)/(high52−low52)×100` | `daily_snapshots.{price,week_52_high,week_52_low}` 최신 | 기존(이미 반환) | 불요(같은 ticker 비율) — 단 표시가는 USD | **100% 가용** |
| **20일 수익률** | 최근 20거래일 가격 변화율 | `(price[t]/price[t−20])−1` | `daily_snapshots.price` 시계열 | Y (history 60일 확장) | 불요(비율) | 가용 |
| **60일 수익률** | 최근 60거래일 변화율 (가용 span fallback) | `(price[t]/price[t−min(60,available)])−1` | 동일 | Y | 불요 | 가용(span 짧으면 라벨) |
| **실현 변동성** | 일별 로그수익률 표준편차(연율화 옵션) | `stdev(ln(price[t]/price[t−1]))×√252` | `daily_snapshots.price` 시계열 | Y | 불요 | 가용 |
| **베타** | 시장민감도(수집값) | `company_scores.beta` | `company_scores.beta` | 기존(반환 추가) | 불요(무차원) | 가용(5건만 null) |

### E. 애널리스트 시그널

| 이름 | 한 줄 정의 | 계산식 | 필요 데이터 | 신규 쿼리 | 통화변환 | KR 가용성 |
|------|-----------|--------|------------|:--------:|:-------:|----------|
| **목표주가 상승여력%** | 컨센서스 목표가 대비 현재가 괴리 | `(target_mean_price − price)/price` (둘 다 native 같은 통화 → 비율은 변환 불요) | `company_scores.target_mean_price`, `daily_snapshots.price` | 기존(이미 target USD 반환) | 비율은 불요 / **표시 목표가는 USD** | KR 76/78 가용 |
| **투자의견** | strong_buy/buy/hold/… 라벨 | `recommendation_key` (`'none'`→"의견 없음") | `company_scores.recommendation_key` | 기존 | N | 'none' 폴백 |
| **컨센서스 신뢰도** | 애널리스트 수(많을수록 신뢰) | `analyst_count` | `company_scores.analyst_count` | 기존 | N | KR 76/78 가용 |

### F. 멀티섹터 패권

| 이름 | 한 줄 정의 | 계산식 | 필요 데이터 | 신규 쿼리 | 통화변환 | KR 가용성 |
|------|-----------|--------|------------|:--------:|:-------:|----------|
| **1위 섹터 수** | 이 종목이 rank=1인 섹터 개수 | `COUNT(*) WHERE rank=1` | `sector_companies` | 기존(이미 sectors 반환, 집계만) | N | 가용 |
| **섹터별 rank 요약** | 속한 섹터별 (이름, rank, N) 리스트 | per-sector `rank`/`COUNT(*)` | `sector_companies`, `sectors` | 기존(+섹터 N) | N | 가용 |
| **패권 폭(breadth)** | 속한 총 섹터 수 | `COUNT(DISTINCT sector_id)` | `sector_companies` | 기존 | N | 가용 |

### G. 재무 건전성

| 이름 | 한 줄 정의 | 계산식 | 필요 데이터 | 신규 쿼리 | 통화변환 | KR 가용성 |
|------|-----------|--------|------------|:--------:|:-------:|----------|
| **부채비율(D/E)** | 자본 대비 부채 | `debt_to_equity` | `company_scores.debt_to_equity` | 기존(반환 추가) | 불요(무차원) | **KR 11/78 null → 폴백** |
| **잉여현금흐름(USD)** | FCF 규모 | `toUsd(free_cashflow, ticker)` | `company_scores.free_cashflow` | 기존(반환 추가) | **Y** | **KR 13/78 null → 폴백** |
| **영업이익률** | 본업 수익성 | `operating_margin` | `company_scores.operating_margin` | 기존 | 불요(비율) | 가용 |

### H. 종합 시그널 요약 (룰 기반, 과장 금지)

| 이름 | 한 줄 정의 | 계산식(룰 예시) | 필요 데이터 | 신규 쿼리 | 통화변환 | KR 가용성 |
|------|-----------|----------------|------------|:--------:|:-------:|----------|
| **강점 불릿** | 객관적 강점 자동 추출 | 룰: `score 백분위≥75→"섹터 상위권"`, `상승여력≥15%→"애널 상방 여력"`, `점수기울기>0→"점수 우상향"`, `1위섹터≥2→"멀티섹터 1위"`, `52주위치≥80→"신고가 근접"` | 위 인사이트 결과 | 파생(서버 권장) | (계산 결과 재사용) | 가용(필드별 폴백) |
| **주의 불릿** | 객관적 리스크 자동 추출 | 룰: `52주위치≤15→"저점권"`, `점수기울기<0→"점수 하락세"`, `D/E 상위 percentile→"높은 부채"`, `data_quality≤0.71→"데이터 신뢰도 주의"`, `recommendation='none'→"애널 커버리지 없음"` | 동일 | 파생(서버) | 가용 |

---

## 2. 계산 위치 (서버 vs 클라)

### 서버(API)에서 계산 — **다른 종목 데이터 필요 → 집계 쿼리**
filter-architect에 넘길 쿼리 요구사항:

1. **섹터 peer 집계** (B·C 그룹 전부): 종목이 속한 **각 섹터별로** 멤버 전체의 다음을 한 번에 끌어와 집계.
   - 요구 쿼리: `sector_companies JOIN company_scores JOIN (최신 daily_snapshots)` — `ticker, rank, smoothed_score, market_cap(native), pe_ratio, peg_ratio, return_on_equity, operating_margin` per sector.
   - 집계 산출: `시총점유율`(market_cap을 **`toUsd(mc, member_ticker)` 환산 후** Σ로 나눔), `score 백분위`, `1위와 격차`, `PER/PEG/ROE/영업이익률 median + 내 percentile`.
   - **min-peer 임계 N≥4**: 멤버 4 미만 섹터는 median/percentile 산출 생략(`null` + "표본 부족" 플래그). 24개 소형 섹터 보호.
   - **멀티섹터 처리**: 종목이 여러 섹터 소속 → 각 섹터별 결과 배열 반환. 대표 섹터는 scoring.py와 동일하게 `smoothed_score 최고 섹터` 선택 권장.
2. **시총점유율 USD 환산**: 절대 native 합산 금지(혼합통화 섹터 다수). 멤버별 `toUsd(market_cap, member_ticker)` 후 Σ. scoring.py의 native 합산 로직 재사용 금지.
3. **점수 모멘텀 시계열**(A): 단일 티커 `score_history` ORDER BY date — `/api/company`의 history를 30일 가격에서 → score_history 풀 범위(최대 74일)로 확장.
4. **가격 시계열 확장**(D의 20/60일 수익률·변동성): `daily_snapshots` 30일 → 최소 60일(가용 시) 반환.
5. **종합 시그널**(H): 위 결과를 묶어 룰 적용 — 서버에서 묶는 게 안전(임계 일관성, 폴백 일원화).

### 클라이언트에서 파생 — **자기 종목 데이터만으로 충분**
- **52주 위치%**(D): price/high52/low52는 이미 반환 → 클라 계산 OK.
- **목표주가 상승여력%**(E): target·price 반환되면 클라 비율 계산 OK.
- **모멘텀 방향 라벨/표시 포맷**(A·H): 서버가 준 수치에 임계 라벨만 클라 적용.
- **불변 처리 주의**: `[...arr].sort()` (MEMORY: `.sort()` in-place 버그).

---

## 3. 데이터 함정 / 주의

1. **KR 애널리스트는 양호** — _context 가정과 다름. 실측: KR target/analyst는 76~78/78 가용. 진짜 폴백 대상은 **`free_cashflow`(KR 13 null)·`debt_to_equity`(KR 11 null)**. → G 그룹 인사이트는 null 시 "데이터 없음"으로 숨김, 종합 시그널에서 제외.
2. **`recommendation_key`는 NULL이 아니라 `'none'`** — null 체크로는 결측을 못 잡음. `'none'`(INTL 21·KR 20)을 "애널 커버리지 없음"으로 처리하고 sentiment 강점 룰에서 제외.
3. **score_history 최소 임계** — 200 ticker만 74일, 215는 27일, 5는 1일. **N=7일 변화는 ≥8행, N=30일 추세는 ≥31행** 있을 때만 표기. 미만이면 "추세 데이터 부족(수집 N일째)" 폴백. 신규 종목 보호.
4. **시총점유율·중앙값은 반드시 USD 환산 후** — aircraft_mfg/battery/beverage/ddr/digital_banking 등 KR+INTL 혼합 섹터 다수. native KRW(~1450×)가 비중·median을 오염. scoring.py L195 native 합산 버그를 인사이트에서 답습 금지.
5. **소형 섹터 percentile 무의미** — ≤2 멤버 섹터 24개, 1멤버 2개. min-peer N≥4 미만은 percentile/median 생략. 멤버 2~3개는 "순위만" 표시.
6. **60일 수익률 span fallback** — 203 ticker는 20–59일치만 보유. `min(60, 가용일수)` 사용하고 "최근 N일" 라벨로 정직 표기. <20일(8 ticker)은 가격 모멘텀 숨김.
7. **data_quality 신뢰도 표기** — ≤0.71(15건)만 "데이터 신뢰도 주의" 배지. 대부분(293+99=392건)은 0.86~1.0이라 경고 불필요.
8. **smoothed vs raw** — 페이지 대표 점수·모멘텀은 `smoothed_score`(rank·UI 일관성), raw는 "원점수" 보조 표기만. API의 `score.total`이 이미 smoothed.
9. **상승여력 비율은 변환 불요지만 표시 목표가는 USD** — `(target−price)/price`는 같은 통화라 비율 동일. 단 화면에 목표가 절대값을 보이면 `toUsd(target, ticker)` (이미 route.ts L140 처리됨).

---

## 4. 우선순위 (임팩트 × 구현난이도)

### P0 — 1차 출시 권장 세트 (높은 임팩트 / 낮은~중간 난이도, 기존 데이터 즉시)
- **점수 모멘텀**(A): score_history는 "미개발 금광", 시계열만 확장하면 됨. 차별화 핵심.
- **52주 위치% + 가격 모멘텀**(D): 100% 데이터 가용, 클라 계산 간단, 시각 임팩트 큼.
- **애널리스트 시그널**(E): 이미 route.ts가 target USD 반환 — 상승여력·의견·신뢰도만 조립.
- **멀티섹터 패권 요약**(F): 이미 sectors 반환 — rank=1 집계만. 패권 컨셉 핵심.
- **섹터 내 순위 + 시총 점유율 + score 백분위**(B): 서버 집계 1쿼리. peer 컨텍스트 = 페이지가 모달과 갈리는 지점.

### P1 — 두 번째 릴리스 (높은 임팩트 / 집계·룰 복잡)
- **밸류에이션 상대비교**(C): PER/PEG/ROE/영업이익률 median+percentile. B와 같은 집계 쿼리에 묶어 처리.
- **종합 시그널 요약**(H): P0+C 결과를 룰로 묶음 — 선행 인사이트 안정화 후.
- **구성요소별 점수 추이**(A 확장): 4개 축 각 추세 — 모멘텀 기본 안정화 후.

### P2 — 여력 시 (보조 / 폴백 빈번)
- **재무 건전성**(G): D/E·FCF — KR null률 높아 폴백 UX 정리 필요, 보조 지표.
- **실현 변동성**(D): beta로 대부분 갈음 가능, stdev는 부가.
- **점수 기울기 회귀선**(A): 변화량으로 1차 충분, 회귀는 정교화 단계.

---

## 5. filter-architect / ui-planner 인계 요약

- **신규 서버 집계 1종**: "섹터 peer 집계" — 종목 소속 각 섹터별 멤버의 `{rank, smoothed_score, toUsd(market_cap), pe_ratio, peg_ratio, ROE, operating_margin}`를 끌어와 `시총점유율·score백분위·1위격차·밸류median+percentile` 산출. **min-peer N≥4, market_cap은 멤버별 toUsd 후 합산.**
- **기존 `/api/company` 확장 2종**: ① history를 30일 가격 → score_history 풀(≤74일) + 가격 60일로 확장, ② score 응답에 `beta, debtToEquity, freeCashflow(USD), rawTotalScore` 추가.
- **통화 규칙**: 시총점유율·FCF·표시 목표가는 USD. 비율(상승여력·52주위치·수익률·percentile)은 변환 불요.
- **폴백 매트릭스**: `recommendation='none'`→커버리지 없음 / score_history <임계→추세 부족 / 섹터 <4멤버→median 생략 / FCF·D/E null→숨김 / data_quality≤0.71→신뢰도 배지.
