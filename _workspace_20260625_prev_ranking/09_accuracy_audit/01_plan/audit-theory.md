# 이론/산식 감사 보고서 — audit-theory.md
**생성일**: 2026-06-11  
**감사자**: Scientist Agent (claude-sonnet-4-6)  
**감사 범위**: T1 패권 점수, T2 자금 흐름, T3 인사이트 산식, T4 데이터 원천 한계

---

## 판정 요약표

| 항목 | 판정 | 심각도 | 조치 |
|------|------|--------|------|
| T1-S3 혼합통화 sector_total_mc 버그 | FLAWED | CRITICAL | 수정 필수 |
| T1-S1 환율 SoT 분열 (format.ts 하드코딩) | FLAWED | HIGH | 수정 필수 |
| T2 자금 흐름 라벨 vs 실제 의미 | CAVEAT | HIGH | 라벨/설명 수정 |
| T2 MFI 구현 방식 (표준과 다름) | CAVEAT | MEDIUM | 설명 페이지 명시 |
| T1-S6 결측 폴백 normalize(None)=50% | CAVEAT | MEDIUM | 설명 페이지 명시 |
| T1 EMA α=0.3 초기값·수렴 | SOUND | LOW | 문서화 권장 |
| T1 rank_update smoothed DESC 기준 | SOUND | — | 이상 없음 |
| T3 percentile 정의 (이하/N) | CAVEAT | LOW | 설명 페이지 명시 |
| T3 median 짝수 N 처리 | SOUND | — | 이상 없음 |
| T3 52주 위치 산식 | SOUND | — | 이상 없음 |
| T3 upsidePct (USD/USD 비율) | SOUND | — | 이상 없음 |
| T3 scoreMomentum trend 임계 1.0점 | CAVEAT | LOW | 설명 페이지 명시 |
| T4-S2 고정 환율 ±5% 오차 | CAVEAT | MEDIUM | 설명 페이지 명시 |
| T4-S7 스냅샷 시점(2회 cron) | CAVEAT | LOW | 설명 페이지 명시 |
| T4 yfinance TTM/Forward 혼용 | CAVEAT | MEDIUM | 설명 페이지 명시 |
| S5 priceChange(%) 절댓값 오용 | SOUND | — | 오용 없음 확인 |

---

## T1. 패권 점수 (scripts/scoring.py)

### T1-S3: 혼합통화 sector_total_mc 버그

**판정: FLAWED | 심각도: CRITICAL | 조치: 수정 필수**

**코드 위치**: `scoring.py L195-197`
```python
sector_total_mc = sum(
    (row[1] or 0) * (row[15] or 1.0) for row in companies
)
```
row[1]은 market_cap — KR 종목은 KRW raw 값, US 종목은 USD 값을 그대로 합산한다.

**수치 재현 결과**:

게임 섹터 (KR=4, US=5):
| Ticker | 시총(USD) | 현행 mc_score | 올바른 mc_score | 차이 |
|--------|-----------|---------------|-----------------|------|
| MSFT (US) | $2,951.8B | 0.61 | 20.00 | +19.39 |
| SONY (US) | $122.3B | 0.25 | 8.89 | +8.64 |
| EA (US) | $51.0B | 0.11 | 3.70 | +3.60 |
| TTWO (US) | $39.1B | 0.08 | 2.84 | +2.76 |
| RBLX (US) | $29.7B | 0.06 | 2.16 | +2.10 |
| 259960.KS (KR) | $7.2B | **20.00** | 0.52 | **-19.48** |
| 036570.KS (KR) | $3.5B | 10.38 | 0.25 | -10.13 |
| 251270.KS (KR) | $2.3B | 6.80 | 0.16 | -6.63 |

배터리 섹터 (KR=3, US=2):
| Ticker | 시총(USD) | 현행 mc_score | 올바른 mc_score | 차이 |
|--------|-----------|---------------|-----------------|------|
| 373220.KS (LG에너지) | $62.2B | 20.00 | 20.00 | 0.00 |
| 006400.KS (삼성SDI) | $26.9B | 10.11 | 9.72 | -0.39 |
| 051910.KS (SKI) | $17.4B | 6.54 | 6.29 | -0.25 |
| QS (US) | $4.3B | **0.00** | 1.55 | **+1.55** |

근본 원인: native 합산 시 KRW raw(~90조) 대 USD($4B) → 숫자 크기 1,394배 차이로 sector_total이 KR 종목에 지배되어, US 종목의 비중이 사실상 0으로 측정됨.

**수정안**: `scripts/currency.py::to_usd()` 적용
```python
from currency import to_usd as _to_usd
sector_total_mc = sum(
    (_to_usd(row[1], row[0]) or 0) * (row[15] or 1.0)
    for row in companies
    if row[1] is not None
)
# 개별 weighted_mc도 USD 환산
weighted_mc = _to_usd(data["market_cap"], ticker) * rw if data["market_cap"] else None
```

**score_history 단절 처리**:
- MSFT 등 US 종목은 수정 후 scale_score가 크게 상승 → smoothed_score 계단 현상
- EMA α=0.3 반감기 2.3일 → 약 10일이면 95% 수렴하나 score_history 차트에 계단이 시각화됨
- **권장**: 수정 당일 이전 90일치 score_history 전체 backfill 재계산 (DB에 daily_snapshots 보존됨)
- **최소**: 수정 당일 날짜에 주석 처리 + 설명 페이지 공지

---

### T1-S1: 환율 SoT 분열

**판정: FLAWED | 심각도: HIGH | 조치: 수정 필수**

`lib/format.ts L135`:
```typescript
const KRW_RATE = 1450  // 하드코딩 — env 미참조
```
`lib/currency.ts L2`:
```typescript
KRW: Number(process.env.KRW_USD_RATE) || 1450,  // env 참조
```

env로 KRW_USD_RATE를 갱신하면:
- toUsd() (계산) → env 값 반영
- formatKrw() (표시) → 여전히 1450 고정

결과: USD→KRW 역환산 표시금액이 실제 계산과 어긋남.

**수정안**: `lib/format.ts`에서 `lib/currency.ts`의 KRW_RATE를 import하거나 동일 env 참조로 통일.

---

### T1-S6: normalize(None) 결측 폴백 설계

**판정: CAVEAT | 심각도: MEDIUM | 조치: 설명 페이지 명시**

```python
def normalize(value, min_val, max_val, max_score):
    if value is None:
        return max_score * 0.5  # 중앙값 폴백
```

모든 축에서 동일하게 50% 점수를 부여:
- revenue_growth 결측 → 7.5/15점
- earnings_growth 결측 → 7.5/15점
- operating_margin 결측 → 5.0/10점
- return_on_equity 결측 → 5.0/10점

실제 결측 비율 (2026-06-10 기준, N=407):
- earnings_growth: 25.3% 결측 (103/407) — 가장 많음
- revenue_growth: 2.7% (11/407)
- 나머지 fundamental: 0~3.4%

완전 결측 기업의 이론 총점(scale 중앙값 가정): **50.0/100점** — 중하위권 실적 기업과 구별 불가.

**설계의 타당성**: "데이터 없음 = 평균 가정"은 정보 이론적으로 보수적 선택. data_quality 필드(0~1)가 이를 보조 표시하므로 설계 자체는 방어 가능. 단 유료 서비스에서는 결측이 점수에 어떻게 작용하는지를 명시해야 함.

**이론적 대안 (참고용)**:
- 결측 축 제외 후 나머지 축 재가중: 데이터 있는 기업과 비교 불가
- 결측 기업 별도 표시(회색/N/A): 구현 복잡, 사용자 혼동 가능
- 현행(50% 폴백 + data_quality 표시): 단순·일관·설명 가능 → 유지 권장

---

### T1: EMA α=0.3 초기값 및 수렴 속도

**판정: SOUND | 심각도: LOW | 조치: 문서화 권장**

초기값 처리 (`scoring.py L252-254`):
```python
prev_smoothed = prev[0] if prev and prev[1] is not None else scores["raw_total"]
smoothed = EMA_ALPHA * scores["raw_total"] + (1 - EMA_ALPHA) * prev_smoothed
```
- score_updated_at IS NULL이면 prev_smoothed = raw_total → 첫날 smoothed = raw_total ✓ (수학적으로 정상)

수렴 속도:
- 반감기 ≈ 0.693/0.3 = **2.3일**
- 급변(예: raw 80→60) 후 10일이면 0.56점 오차 이내 수렴
- 실제 삼성전자 데이터: raw와 smoothed의 차이 일관되게 1점 이내 — 안정적 작동 확인

---

### T1: rank_update(update_sector_rankings) 정렬 기준

**판정: SOUND**

`scoring.py L328-343`: `smoothed_score DESC` 정렬 후 rank 부여.
- smoothed_score가 이미 EMA 적용된 값 → rank 변동성 자연 완화 ✓
- 동률 시 `weighted_mc DESC`로 타이브레이킹 ✓

---

## T2. 자금 흐름 (lib/money-flow-helpers.ts)

### T2-1: flowAmount/flowDirection 라벨 문제

**판정: CAVEAT | 심각도: HIGH | 조치: 라벨 수정 또는 설명 페이지 명시**

`calculateSectorFlow()` L208-209:
```typescript
const flowAmount = endMarketCap - startMarketCap
const flowDirection: 'in' | 'out' = flowAmount >= 0 ? 'in' : 'out'
```

실제 의미: **기간 내 섹터 시가총액 순증감액** (startCap → endCap 변화)

**문제**: "자금 유입/유출"로 표시하면 오해 소지 있음.
- 시총 증가 = 주가 상승 × 발행주식수. 신규 매수 자금이 없어도 주가 상승만으로 시총 증가.
- 금융 이론에서 "순유입" 측정은 불가: 모든 매수=매도 (항등식).

`calculateTotals()`도 동일 로직으로 totalInflow/totalOutflow 계산.

**권고 라벨 수정안**:
- "자금 유입" → "시총 증가"
- "자금 유출" → "시총 감소"  
- 또는 "섹터 시가총액 변화" + 툴팁: "해당 기간 섹터 전체 시가총액의 증감액입니다."

**정직한 설명 문구 초안**:
> "자금 흐름 수치는 선택 기간 동안의 섹터 시가총액 변화액을 나타냅니다. 실제 매수 자금을 직접 측정하는 것은 기술적으로 불가능하며, 시가총액 증가는 주가 상승에 의한 평가액 증가를 포함합니다."

---

### T2-2: MFI 구현 방식

**판정: CAVEAT | 심각도: MEDIUM | 조치: 설명 페이지 정의 명시**

현재 구현 (`money-flow-helpers.ts L181-188`):
```typescript
const position = (snap.price - snap.dayLow) / range
if (position > 0.5) {
  positiveFlow += rawMoneyFlow
} else {
  negativeFlow += rawMoneyFlow
}
```

- **현재**: 종가가 일중 범위 상반부이면 positive (일중 매수압력 기반)
- **표준 Wilder MFI**: 오늘 typical price > 어제 typical price이면 positive (전일 대비 방향 기반)

현재 방식이 틀린 것은 아님. Williams %R, Stochastic과 유사한 개념으로 금융에서 사용됨. 단 "MFI"라는 명칭을 사용한다면 구현 방식을 설명 페이지에 명시해야 함.

**MFI 수식 자체는 표준**: `mfi = 100 - 100 / (1 + positiveFlow/negativeFlow)` ✓

---

## T3. 인사이트 산식 (app/api/company/[ticker]/insights/route.ts, lib/stock-signals.ts)

### T3-1: percentile 정의

**판정: CAVEAT | 심각도: LOW | 조치: 설명 페이지 명시**

```typescript
function percentileOf(self, values) {
  const atOrBelow = values.filter(v => v <= self).length
  return (atOrBelow / values.length) * 100
}
```

"이하 개수/전체" = 경험적 CDF 근사. 표준 정의(NIST: (rank-0.5)/N×100)와 약간 다름.
- self=최대값이면 percentile=100%
- self=최소값이면 percentile=1/N×100 (0%가 아님)
- MIN_PEER_SAMPLE=4로 최소 4개 → percentile 25% 단위 → 거친 분포

소표본에서의 오차는 있으나 실용 수준에서 허용 범위. 설명 페이지에 "동일 섹터 N개 종목 중 하위 X%"로 정의 명시 필요.

---

### T3-2: median 계산

**판정: SOUND**

```typescript
function median(sortedAsc) {
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (sortedAsc[mid-1] + sortedAsc[mid]) / 2 : sortedAsc[mid]
}
```
- 짝수 N: 중간 두 값의 평균 ✓ (표준 정의 일치)
- 홀수 N: 정중앙 원소 ✓

---

### T3-3: 52주 위치 산식

**판정: SOUND**

`app/api/company/[ticker]/route.ts L99-108`:
```typescript
const week52Position =
  (snap.price - snap.week52Low) / (snap.week52High - snap.week52Low)
// 0~1 clamp, 분모=0 방어
```
- 동일 ticker의 가격끼리 비율 계산 → native 통화 그대로 사용 가능 ✓
- 분모 0 가드: `week52High > week52Low` 조건 ✓
- 결과 `Math.min(1, Math.max(0, ...))` clamp ✓

---

### T3-4: upsidePct 산식

**판정: SOUND**

`app/api/company/[ticker]/route.ts L111-118`:
```typescript
const targetMeanPriceUsd = toUsd(scoreRow.targetMeanPrice, ticker)
const currentPriceUsd = toUsd(snap.price, ticker)
const upsidePct = (targetMeanPriceUsd - currentPriceUsd) / currentPriceUsd
```
- 양쪽 모두 USD 환산 후 비율 계산 ✓ (KRW/KRW도 정상이지만 USD 통일)
- scoring.py `calculate_sentiment_score()`에서도 native/native 비율 → 동일 결과 ✓

---

### T3-5: scoreMomentum trend 임계

**판정: CAVEAT | 심각도: LOW | 조치: 설명 페이지 명시**

`insights/route.ts L159-163`:
```typescript
const trend = deltaTotal > 1.0 ? 'up' : deltaTotal < -1.0 ? 'down' : 'flat'
```
- deltaTotal = 기간 첫날 vs 마지막날 smoothed 차이 (중간 변동 무시)
- 1.0점 임계: 100점 만점 1% → EMA smoothed 기준으로 합리적
- 개선 여지: OLS 기울기 또는 이동평균 crossover 활용 가능하나 현재도 실용적 범위 내

시그널 임계값 (`lib/stock-signals.ts`):
- 52주 ≥80% → "신고가 근접": 자의적이나 일관됨 ✓
- 52주 ≤15% → "저점권": 동일 ✓
- 상승여력 ≥15% → "상방 여력": 일반적 기준과 유사 ✓
- 면책 문구: "투자 권유가 아닙니다" 위치 확인 필요 (UI 레벨에서 별도 검토)

---

## T4. 데이터 원천 한계 (scripts/update_data.py)

### T4-1: yfinance .info 필드 시맨틱

**판정: CAVEAT | 심각도: MEDIUM | 조치: 설명 페이지 명시**

| 필드 | yfinance 키 | 실제 기준 시점 |
|------|------------|---------------|
| pe_ratio | trailingPE | TTM (과거 12개월) |
| peg_ratio | pegRatio | Forward P/E ÷ EPS 성장률 (혼합) |
| revenue_growth | revenueGrowth | 분기 YoY (연간 전망 아님) |
| earnings_growth | earningsGrowth | 분기 YoY |
| operating_margin | operatingMargins | TTM |
| return_on_equity | returnOnEquity | TTM |
| target_mean_price | targetMeanPrice | 애널리스트 12개월 Forward |
| beta | beta | 5년 월간 회귀 |

핵심 주의사항:
- `trailingPE`(TTM)와 `pegRatio`(Forward 기반)를 같은 화면에 병렬 제시 시 기준 시점이 다름 → 툴팁 필요
- `revenueGrowth`/`earningsGrowth`는 분기 단위 YoY — "연간 성장률"로 오해 금지
- yfinance 데이터는 지연 가능성 있으며 실시간 재무데이터가 아님

---

### T4-2: 고정 환율 오차

**판정: CAVEAT | 심각도: MEDIUM | 조치: 설명 페이지 명시**

현행: KRW=1450 고정 (env 기본값, 일일 갱신 없음)

환율 ±5% 변동 시 KR 종목 USD 시총 오차:

| Ticker | KRW 시총 | @1450(기준) | @1378(KRW+5%) | @1523(KRW-5%) |
|--------|----------|-------------|---------------|---------------|
| 삼성전자 | 1,986조 | $1,369.9B | $1,441.5B | $1,304.3B |
| SK하이닉스 | 1,453조 | $1,002.6B | $1,055.0B | $954.6B |
| 현대차 | 157조 | $108.7B | $114.4B | $103.5B |

오차 규모: 환율 5% 변동 → USD 시총 ±5% 오차 (선형 비례). 삼성전자 기준 ±$68.7B.

이는 scale_score의 mc_score(시총 비중)에 영향을 줌: 같은 섹터 내 KR vs US 종목 비중 계산 왜곡.

**수정 방안 (선택)**:
- yfinance `KRW=X` 환율을 일일 수집하여 env/DB 반영 (복잡도 ↑)
- 현행 유지 + 설명 페이지에 "환율은 참고값이며 실시간 반영되지 않음" 명시

---

### T4-3: 스냅샷 수집 시점 (S7)

**판정: CAVEAT | 심각도: LOW | 조치: 설명 페이지 명시**

update-data.yml 2회 실행:
- Run 1: UTC 07:30 (KST 16:30) — KR 장마감(15:30) 1시간 후
- Run 2: UTC 22:00 (KST 다음날 07:00) — US 장마감(ET 16:00=UTC 21:00) 1시간 후

두 실행 모두 같은 `date`(UTC 기준)로 UPSERT → Run 2가 Run 1을 덮어씀.
KR 종목은 Run 2 시점에도 재수집되지만 장외시간이므로 yfinance는 정규장 종가 반환 (실질 무해).
패권 점수 재계산은 Run 2 완료 후 → KR+US 최신값 기준 ✓

**문서화 문구 초안**:
> "데이터는 한국 장마감 후(KST 오후 4:30)와 미국 장마감 후(KST 다음날 오전 7:00) 2회 수집됩니다. 당일의 최종 확정 데이터는 KST 오전 7시 이후 반영됩니다."

---

## S5: priceChange(%) 절댓값 오용 여부

**판정: SOUND**

전수 확인 결과:
- `daily_snapshots.price_change`(`regularMarketChangePercent`)는 모든 API 라우트에서 % 단위로만 사용됨
- `price-changes/route.ts`의 `priceChange` 필드는 별도 파생값(USD 절댓값 차이)이며 `daily_snapshots.price_change`와 혼용되지 않음
- `movers/route.ts L34`: "priceChange는 percent 단위 일별 변화율" 명시 주석 ✓

---

## "수정해야 할 것" vs "정직하게 설명하면 되는 것"

### 수정 필수 (코드 변경)

1. **T1-S3: scoring.py 혼합통화 버그** (CRITICAL)
   - `sector_total_mc` 계산 시 `to_usd(value, ticker)` 적용
   - 개별 `weighted_mc`도 USD 환산
   - 수정 후 score_history backfill 재계산 권장

2. **T1-S1: lib/format.ts 환율 하드코딩** (HIGH)
   - `const KRW_RATE = 1450` → `lib/currency.ts` import 또는 동일 env 참조

### 라벨/UI 수정 (코드 변경 필요, 설명만으로 불충분)

3. **T2: "자금 유입/유출" 라벨** (HIGH)
   - "시총 증가/감소" 또는 "시가총액 변화"로 수정
   - 툴팁에 실제 정의 명시

### 설명 페이지에 정직하게 고지해야 할 한계 목록

| 항목 | 고지 문구 요약 |
|------|--------------|
| 환율 고정 | 한국 종목의 USD 환산에 고정 환율(약 1,450원)을 사용하며, 실시간 환율을 반영하지 않습니다. |
| 데이터 수집 시점 | KST 16:30, 다음날 07:00 2회 수집. 당일 최종값은 오전 7시 이후. |
| 자금 흐름 정의 | 자금 흐름 수치는 섹터 시가총액의 기간 변화액입니다. 실제 매수/매도 자금을 직접 측정하지 않습니다. |
| MFI 구현 방식 | 매수압력 지수(0-100)는 당일 종가의 일중 위치를 기준으로 계산됩니다 (표준 Wilder MFI와 다름). |
| 결측 데이터 처리 | 일부 항목(특히 earnings_growth 25%)이 수집되지 않을 경우 해당 항목에 중간값(50%)을 부여합니다. 데이터 신뢰도는 종목 상세 화면에서 확인하세요. |
| yfinance 기준 시점 | PER은 과거 12개월 기준, PEG는 Forward 기반, 매출/이익 성장률은 분기 YoY입니다. 실시간 재무 데이터가 아닙니다. |
| 패권 점수 결측 폴백 | 애널리스트 미커버 종목이나 데이터 미수집 항목은 중간 점수를 받으며, 이는 실제 실적과 다를 수 있습니다. |
| 소표본 percentile | 섹터 종목 수가 적을 경우(≥4개) percentile은 25% 단위로 거칠게 표시됩니다. |

---

## 통계 요약

- 총 감사 항목: 16개
- FLAWED (수정 필수): 2개 (T1-S3, T1-S1)
- CAVEAT (설명 필요): 8개
- SOUND (이상 없음): 6개
- 즉시 코드 수정이 필요한 CRITICAL 항목: **1개** (T1-S3 혼합통화 버그)
- 유료 서비스 신뢰를 위해 라벨 수정이 필요한 HIGH 항목: **2개** (T1-S1, T2 라벨)
