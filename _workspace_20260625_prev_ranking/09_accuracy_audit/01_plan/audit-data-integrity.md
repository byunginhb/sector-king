# 데이터 정합성 실측 감사 — `data/hegemony.db`

- 감사일: 2026-06-11
- 대상 DB: `data/hegemony.db` (8.7MB, sqlite3)
- 최신 스냅샷 날짜: `2026-06-10`
- 기준 규칙: `lib/region.ts::getRegionFromTicker` (.KS/.KQ → KR, 그 외 → INTL), `lib/currency.ts::toUsd` (KRW÷1450)
- 테이블 행수: companies 420, daily_snapshots 29,943, company_scores 407, score_history 20,610, **company_profiles 0**, sector_companies 548, sectors 112

> 판정 규칙: 모든 주장에 쿼리+결과 증거를 첨부. 심각도 = CRITICAL(틀린 숫자가 사용자에게 노출) / HIGH(조건부 오류·오해) / MEDIUM(이론적 약점·문서화) / LOW.

---

## A. 참조 무결성 / 고아

### A1-a. FK 고아 행 — CLEAN
```sql
SELECT COUNT(*) FROM daily_snapshots  WHERE ticker NOT IN (SELECT ticker FROM companies); -- 0
SELECT COUNT(*) FROM company_scores   WHERE ticker NOT IN (SELECT ticker FROM companies); -- 0
SELECT COUNT(*) FROM score_history    WHERE ticker NOT IN (SELECT ticker FROM companies); -- 0
SELECT COUNT(*) FROM company_profiles WHERE ticker NOT IN (SELECT ticker FROM companies); -- 0
SELECT COUNT(*) FROM sector_companies WHERE ticker NOT IN (SELECT ticker FROM companies); -- 0
SELECT COUNT(*) FROM sector_companies WHERE sector_id NOT IN (SELECT id FROM sectors);     -- 0
```
- **판정: CLEAN** | 심각도: — | 모든 자식 테이블의 ticker/sector_id가 부모에 존재. 댕글링 FK 0건.

### A1-b. 유령 회사 (companies에 있으나 sector_companies에 없음) — CLEAN
```sql
SELECT COUNT(*) FROM companies WHERE ticker NOT IN (SELECT ticker FROM sector_companies); -- 0
```
- **판정: CLEAN** | 모든 회사가 최소 1개 섹터에 매핑됨.

### A1-c. 데이터 없는 회사 (broken cards) — **ISSUE / HIGH**
섹터에는 매핑돼 있으나 **company_scores 없음 13개**, **daily_snapshots 없음 12개**. 이들은 섹터 카드/대시보드에 빈/깨진 항목으로 노출됨.

```sql
SELECT c.ticker, c.name, c.region,
  (SELECT COUNT(*) FROM sector_companies sc WHERE sc.ticker=c.ticker) in_sectors,
  (SELECT MAX(date) FROM daily_snapshots d WHERE d.ticker=c.ticker) last_snap
FROM companies c WHERE c.ticker NOT IN (SELECT ticker FROM company_scores);
```
| ticker | name | region | 섹터수 | 마지막 스냅샷 |
|---|---|---|---|---|
| SQ | Block Inc. | INTL | 1 | (없음) |
| **CATL** | Contemporary Amperex Technology | INTL | 1 | (없음) |
| 326030.KQ | SK Biopharmaceuticals | KR | 1 | 2026-02-13 |
| 263750.KS | Pearl Abyss | KR | 1 | (없음) |
| 039030.KS | Eo Technics | KR | 1 | (없음) |
| 041510.KS | SM Entertainment | KR | 1 | (없음) |
| PARA | Paramount Global | INTL | 2 | (없음) |
| **ABB** | ABB Ltd | INTL | 1 | (없음) |
| CYBR | CyberArk Software | INTL | 2 | (없음) |
| BLUE | bluebird bio | INTL | 1 | (없음) |
| 950140.KS | GC Biopharma | KR | 1 | (없음) |
| PLL | Piedmont Lithium | INTL | 1 | (없음) |
| JWN | Nordstrom Inc. | INTL | 1 | (없음) |

- **판정: ISSUE** | 심각도: **HIGH** (유료 서비스에서 빈 카드 = 품질 결함).
- 원인 가설:
  - `CATL`(중국)·`ABB`(스위스)는 비US/KR 기업으로 round 07에서 제거 대상이었으나 **좀비 행으로 잔존** (companies + sector_companies에 남음). region이 형식상 INTL로 백필됐을 뿐 데이터 수집 불가.
  - `SQ`(→Block은 티커 XYZ로 변경), `PARA`, `JWN`, `CYBR`, `BLUE`, `PLL` = yfinance fetch 실패 후보(상폐/티커변경/인수). _context.md의 "update_data Failed 14개"의 잔류분으로 추정.
  - KR 4개(263750/039030/041510/950140)도 수집 실패.
- 권고: (1) CATL·ABB는 sector_companies + companies에서 **삭제**(범위정책 위반 잔존). (2) 나머지는 티커 검증 후 대체 티커로 교체하거나 sector 매핑 제거. (3) API 라우트가 score/snapshot 없는 ticker를 **응답에서 제외**하는 가드 확인 필요(boundary).

### A2. region 백필 정합 — CLEAN
```sql
-- KR 접미사인데 region<>KR : (없음)
-- KR 접미사 아닌데 region=KR : (없음)
SELECT region, COUNT(*) FROM companies GROUP BY region;  -- INTL 337, KR 83
-- 접미사 분포: US(무접미사) 337, .KS 78, .KQ 5  (.T/.TW/.HK/.PA 0건 — round07 제거 확인)
```
- **판정: CLEAN** | 전 420행이 `getRegionFromTicker` 규칙과 일치. 외국(.T/.TW/.HK/.PA) 접미사 잔존 0.

### A3. 섹터별 rank 연속·중복 — CLEAN
```sql
-- 중복 rank: 0건
-- max(rank)<>count OR min<>1 인 섹터: 0건
```
- **판정: CLEAN** | 모든 섹터의 rank가 1..N 연속, 중복 없음. (스키마 CHECK rank 1~10 + UNIQUE(sector_id,ticker)가 보증)

---

## B. 시계열 품질

### B4-a. (ticker,date) 중복 / 날짜 형식 / 미래 날짜 — CLEAN
```sql
-- (ticker,date) 중복: 0 (UNIQUE 제약)
-- date NOT GLOB 'YYYY-MM-DD': 0
-- 미래 날짜(>2026-06-11): 0
-- 날짜 범위: 2026-01-27 ~ 2026-06-10, distinct 129일
```
- **판정: CLEAN**

### B4-b. 주말/공휴일 데이터 = 전일 carry-forward — **ISSUE / MEDIUM**
주말 행이 다수 존재하며, 대부분 직전 거래일 가격을 그대로 복제(carry-forward)함. 공휴일(Memorial Day 2026-05-25)도 동일.
```sql
-- 요일 분포 (0=일..6=토): 일 3181, 월 4637, 화 4919, 수 4927, 목 4537, 금 4561, 토 3181
WITH s AS (SELECT ticker,date,price, LAG(price) OVER(PARTITION BY ticker ORDER BY date) prev, strftime('%w',date) dow FROM daily_snapshots)
SELECT SUM(dow IN('0','6')) weekend, SUM(dow IN('0','6') AND price=prev) eq_prev FROM s;
-- weekend 6362행 중 3997행이 전일 가격과 동일
```
증거 (AAPL): 2026-05-22(금) price 308.82 → 05-25(월 공휴일) price 308.82(동일)이나 **volume은 43,605,063→43,670,223로 변동**.
- **판정: ISSUE** | 심각도: **MEDIUM**
- 의미: 스냅샷이 OHLC가 아니라 yfinance `.info` 라이브 쿼리값을 저장 → 장 닫힌 날에도 행이 생기고 가격은 직전값·거래량은 미세 변동하는 비정합 행 발생. 거래대금(money-flow) 합산 시 휴장일 거래량이 중복 가산될 소지. 52주/모멘텀 윈도우 계산에 비거래일이 섞임.
- 권고: 수집 시 거래일만 저장(휴장일 skip), 또는 money-flow/모멘텀 쿼리에서 `strftime('%w',date) NOT IN ('0','6')` 및 가격무변동 행 필터. 최소한 설명 페이지에 "스냅샷=장중/마감 시점 라이브 쿼리" 명시(S7 연계).

### B4-c. KR 거래량 = 0 (체계적) — **CRITICAL**
KR(.KS/.KQ) 종목의 거래량이 대부분 날짜에 0으로 저장됨. INTL은 0건.
```sql
SELECT SUM(volume=0 OR volume IS NULL) zero, COUNT(*) FROM daily_snapshots WHERE ticker LIKE '%.KS' OR ticker LIKE '%.KQ';
-- KR: 1404 / 4395  (≈32%)
-- INTL: 0 / 25548
```
최신일(2026-06-10) **78개 KR 전 종목 volume=0** (Samsung 005930.KS 포함). 날짜별로 보면 06-02·06-05만 거래량 존재, 나머지 0:
```
date        kr_zero  kr_total
2026-06-01    78       78
2026-06-02     0       78   <- 수집 성공
2026-06-03    78       78
2026-06-05     0       78   <- 수집 성공
2026-06-08~10  78      78
```
- **판정: ISSUE** | 심각도: **CRITICAL**
- 의미: money-flow = typicalPrice × volume. **KR 전 종목의 자금흐름이 대부분 날짜에 0으로 계산됨** → 국내(region=kr) money-flow 페이지가 사실상 무의미한 0값 노출. avg_volume 기반 vol_ratio_score(scale 컴포넌트)도 왜곡.
- 원인 가설: cron 실행 시점에 KR 장 마감 데이터가 yfinance `.info`에 아직 반영 안 됨 → `regularMarketVolume`=0 또는 None을 그대로 저장. 06-02/06-05만 시점이 맞아 수집됨.
- 재현: `SELECT date,volume FROM daily_snapshots WHERE ticker='005930.KS' ORDER BY date DESC LIMIT 8;` → 0,0,0,36573066,0,0,47186132,0
- 권고: (1) `update_data.py`에서 KR 종목 volume이 0/None이면 **저장 skip 또는 직전 유효값 유지**(현재는 0 덮어씀 추정). (2) cron 시점을 KR 마감(15:30 KST) 충분히 이후로 조정. (3) money-flow 쿼리에서 volume=0 KR 행 제외 가드. 의심 위치: `scripts/update_data.py`(volume 필드 매핑), `lib/money-flow-helpers.ts`.

### B5. stale 티커 (최근 5거래일 내 미갱신) — **ISSUE / HIGH**
```sql
SELECT ticker, MAX(date) FROM daily_snapshots GROUP BY ticker HAVING MAX(date) < '2026-06-04';
```
| ticker | 마지막 스냅샷 | 경과 |
|---|---|---|
| 326030.KQ (SK바이오팜) | 2026-02-13 | ~4개월 |
| CFLT (Confluent) | 2026-05-19 | ~3주 |
| EXAS (Exact Sciences) | 2026-05-22 | ~3주 |

추가로 A1-c의 데이터 0개 12종목은 마지막 스냅샷 자체가 없음. 마지막 스냅샷 분포: 2026-06-10에 405종목, 나머지 3종목은 위 stale.
- **판정: ISSUE** | 심각도: **HIGH** (수집 파이프라인이 일부 티커를 조용히 누락 → 오래된 가격이 "현재"로 표시).
- 권고: 수집 실패 티커 알림/대체. EXAS는 인수 합병(Abbott 인수 진행) 가능성, CFLT도 점검. 326030.KQ는 4개월 stale = 즉시 조치.

### B6. score_history 최신행 ↔ company_scores.smoothed_score 정합 — CLEAN
```sql
WITH latest AS (SELECT ticker, smoothed_score, ROW_NUMBER() OVER(PARTITION BY ticker ORDER BY date DESC) rn FROM score_history)
SELECT COUNT(*) FROM latest l JOIN company_scores cs ON cs.ticker=l.ticker
WHERE l.rn=1 AND ABS(COALESCE(l.smoothed_score,-999)-COALESCE(cs.smoothed_score,-999))>0.01; -- 0
```
- **판정: CLEAN** | 407개 모든 티커에서 최신 이력행과 현재 스코어 일치. score_history 범위 2026-03-23~06-10 (74일 연속).

### B7. 값 범위 sanity (최신일) — 대체로 CLEAN, 1건 ISSUE
```sql
-- price<=0: 0 | market_cap<=0/NULL: 0 | week52_low>week52_high: 0
-- price 52주밴드 ±10% 초과 이탈: 0 | week52 NULL: 0
-- pe_ratio<0 (전체기간): 0  (적자기업은 NULL 처리, 음수 미발생 — 정상)
-- pe NULL 140, peg NULL 85 (적자/데이터부족 — 허용)
-- price_change(=%) 범위: [-11.67%, +9.78%] (현실적 일일 변동, % 의미 확인)
-- volume=0/NULL: 78건 (전부 KR — B4-c CRITICAL로 별도 집계)
```
- **판정: CLEAN** (volume=0 제외 — B4-c에서 CRITICAL로 다룸)
- 부가: company_scores.data_quality 평균 0.95(최저 0.43), free_cashflow NULL 42/407, target_mean_price NULL 2/407. 결측은 scoring.py의 중앙값 폴백(S6)으로 흡수됨 — 이론 감사(audit-theory) 대상.

---

## C. 통화 / 크기 sanity (S1·S2·S3 연계)

### C8. KR 시총·가격 저장 통화 = native KRW 확인 (toUsd 전제 충족) — CLEAN
implied shares = market_cap / price 로 검증 → 실제 주식수와 일치 = 저장값이 native KRW임을 입증.
```sql
SELECT ticker, price, market_cap, market_cap/1450.0/1e9 usd_b FROM daily_snapshots WHERE date='2026-06-10' AND ticker IN ('005930.KS','000660.KS');
```
| ticker | price(KRW) | market_cap(KRW) | implied shares | USD cap (÷1450) |
|---|---|---|---|---|
| 005930.KS | 302,500 | 1,986,385,464,524,800 | 6.57B (실제 ~5.97B) | $1,370B |
| 000660.KS | 2,048,000 | 1,453,782,810,492,928 | 0.71B (실제 ~0.73B) | $1,003B |

KR price 분포: min 4,320 / max 2,048,000 / avg 242,077 (전부 KRW 스케일, USD 오염 0건). USD<1000 의심행 0.
- **판정: CLEAN** | market_cap·price는 native KRW로 일관 저장, implied shares가 현실과 일치 → **toUst(÷1450) 변환이 올바름**. (절대 수치가 2026 시뮬레이션 데이터라 실세계 2025 가격보다 높지만, 내부 정합성은 완전.)
- 참고: 절대 시총 레벨이 현실 대비 높은 것은 데이터셋이 미래(2026) 시점 가정값이기 때문 — 정합성 결함 아님. 단, 유료 서비스가 "현재 시세"를 표방한다면 데이터 출처/시점 고지 필요(S7).

### C9. US 시총 outlier — CLEAN
```sql
-- TOP: NVDA $4854B, GOOGL $4346B, AAPL $4283B, MSFT $2952B, AMZN $2560B
-- BOTTOM: BLNK $96M, CHPT $166M, ALT $508M, PHR $565M, EVGO $593M
-- AAPL implied shares = 4282539048960/291.58 = 14.7B (실제 ~14.8B) 정합
```
- **판정: CLEAN** | US 시총 $96M~$4.85T 합리적 범위. 비정상 outlier 없음.

---

## D. 중복 / 일관성

### D10. 이름 결측·중복, sector_companies 중복 — CLEAN
```sql
-- name NULL/empty: 0 | name_ko NULL/empty: 0
-- 동일 name 다른 ticker: 0건
-- (sector_id,ticker) 중복: 0 (UNIQUE)
```
- **판정: CLEAN**

### D11. 다중 섹터 매핑 / 이중상장 / 클래스주 중복 — 대체로 CLEAN, 설계 주의 1건
```sql
-- 동일 ticker 다중 섹터: 83개 (GOOGL 10, MSFT 8, AAPL 6, TSLA 5, AMZN 5, 005930.KS 5 ...)
-- GOOG/GOOGL 동시 존재: 없음 (GOOGL 1개만) | BRK: BRK-B 1개만 | TSM: 1개만 | 2330.TW: 없음
-- 동일 name US/KR 이중상장: 0건
```
- **판정: CLEAN (이중상장/클래스주 중복 없음)** | 심각도: **MEDIUM (설계 주의)**
- GOOGL/GOOG, BRK-A/B, FOX/FOXA 류 클래스주 이중계상 없음. ADR 이중상장 없음.
- 다만 **83개 티커가 여러 섹터에 동시 소속**(의도된 설계: 한 기업이 복수 하위섹터에서 경쟁). 이 자체는 정상이나, **섹터 경계를 넘어 시총을 합산하는 집계가 있다면 동일 기업이 N번 계상**됨. 산업/대시보드 레벨 시총 합·점유율 계산 시 ticker DISTINCT 여부를 코드 감사(audit-display)에서 확인 권고.

---

## ★ 별도 발견 (감사 항목 외, 정합성 직결)

### X1. scoring.py 혼합통화 시총 합산 미수정 (S3) — **CRITICAL**
`scripts/scoring.py:195-197` 의 `sector_total_mc` 가 native 통화(KRW raw)를 그대로 합산. 코드 주석이 버그를 명시적으로 인정하고 있으나 미적용 상태이며, **그 결과가 company_scores/score_history 에 영구 저장되어 사용자에게 노출 중**.
```python
# scoring.py:195
sector_total_mc = sum((row[1] or 0) * (row[15] or 1.0) for row in companies)  # row[1]=native market_cap, to_usd 미적용
```
실측 왜곡 (hbm 섹터, 2026-06-10):
| ticker | region | scoring.py 시총점유%(native) | 올바른 점유%(USD) |
|---|---|---|---|
| 000660.KS | KR | 42.25 | 29.68 |
| 005930.KS | KR | 57.72 | 40.55 |
| **MU (Micron)** | INTL | **0.03** | **29.77** |

→ MU의 시총 점유 점수가 실제 29.77% 인데 **0.03%로 ~1000배 과소** 계산됨. 혼합통화 섹터 **43개** 전부에서 KR 종목 scale_score 과대·US 종목 과소 → smoothed_score(최종 패권점수) 왜곡.
- **판정: ISSUE** | 심각도: **CRITICAL** (틀린 점수가 사용자에게 노출, _context.md S3 = 이번 라운드 수정 대상).
- 권고: `scoring.py` `sector_total_mc` 와 `weighted_mc` 양쪽을 `scripts/currency.py::to_usd(market_cap, ticker)` 로 감싸 USD 환산 후 합산. 재계산 시 기존 score_history 와 점프 발생 → smoothing(EMA α=0.3) 재시작 또는 이력 재계산 정책 필요(별도 이론 감사 연계). **직접 수정 금지 — sk-implementer 반환.**

### X2. company_profiles 전 행 비어있음 — **MEDIUM**
```sql
SELECT COUNT(*) FROM company_profiles; -- 0
```
- 스키마는 존재하나 데이터 0행. `/stock/[ticker]` 등에서 sector/industry/country/employees/description 을 이 테이블에서 읽는다면 전부 NULL/빈값 노출.
- **판정: ISSUE** | 심각도: **MEDIUM** (기능에 따라 HIGH 가능 — 사용처를 audit-display에서 확인). 권고: 수집 파이프라인에 profile 수집 추가 또는 미사용이면 스키마/UI 정리.

---

## 심각도별 이슈 집계

| 심각도 | 건수 | 항목 |
|---|---|---|
| **CRITICAL** | 2 | B4-c KR 거래량=0 체계적, X1 scoring 혼합통화 합산(S3) |
| **HIGH** | 2 | A1-c 데이터 없는 13종목(좀비 카드), B5 stale 티커 3종 |
| **MEDIUM** | 3 | B4-b 주말 carry-forward 행, D11 다중섹터 시총 중복계상 주의, X2 company_profiles 공백 |
| **LOW** | 0 | — |
| **CLEAN** | 9 | A1-a, A1-b, A2, A3, B4-a, B6, B7, C8, C9, D10 |

## 수정 필요 목록 (우선순위순)

1. **[CRITICAL] X1 — scoring.py S3 USD 환산** : `scripts/scoring.py:195` `sector_total_mc`/`weighted_mc` 를 `to_usd` 로 환산. 43개 혼합섹터 점수 재계산 + smoothing 이력 점프 처리. (틀린 패권점수 노출 중)
2. **[CRITICAL] B4-c — KR 거래량 0** : `scripts/update_data.py` 에서 KR volume 0/None 저장 방지(skip 또는 직전값 유지) + cron 시점 조정. KR money-flow 전면 0 해소.
3. **[HIGH] A1-c — 좀비/실패 종목 13개** : CATL·ABB(범위정책 위반) 삭제, SQ/PARA/JWN/CYBR/BLUE/PLL/KR4 = 티커 검증 후 교체 또는 섹터 매핑 제거. API에 score/snapshot 없는 ticker 제외 가드.
4. **[HIGH] B5 — stale 3종** : 326030.KQ(4개월), CFLT, EXAS 수집 복구 또는 대체.
5. **[MEDIUM] X2 — company_profiles 공백** : 사용처 확인 후 수집 추가 또는 정리.
6. **[MEDIUM] B4-b — 주말/휴장일 행** : 거래일만 저장 또는 money-flow/모멘텀 쿼리에서 비거래일·무변동 행 필터.
7. **[MEDIUM] D11 — 다중섹터 시총 합산** : 산업/대시보드 레벨 시총 집계 코드에서 ticker DISTINCT 보장 확인(audit-display).

> 본 감사는 DB 저장값 자체의 정합성에 한정. API 응답 직전 `toUsd` 적용 여부·UI 표시 일관성은 audit-display, 산식의 이론적 정당성(S4 money-flow 정의, S6 결측 폴백, S9 percentile/EMA)은 audit-theory 에서 별도 검증.
