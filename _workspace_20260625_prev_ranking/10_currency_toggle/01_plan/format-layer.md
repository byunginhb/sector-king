# 통화 인지 포맷 레이어 설계 (format-layer)

작성: sk-data-modeler · 2026-06-14 · 영역: `lib/format.ts`, 통화 표시 차트
선행 컨텍스트: `_workspace/10_currency_toggle/01_plan/_context.md`
실측 기준 코드: `lib/format.ts`, `lib/currency.ts`, `components/price-chart.tsx`, `components/money-flow/flow-river.tsx`, `components/money-flow/sector-company-list.tsx`, statistics 차트 4종

---

## 0. 핵심 전제 (실측 검증 완료)

- **API 응답은 전부 USD.** 입력은 항상 USD 값이며, 이 레이어는 출력 통화만 전환한다. DB/API/React Query 캐시 무변경.
- 환율 SoT는 `lib/currency.ts::getKrwRate()` 단 하나. KRW 표기는 `USD × getKrwRate()`. (현재 `formatKrw`가 이미 이 방식.)
- `getKrwRate()`는 env/상수만 읽는 **순수 함수**라 포맷 함수 내부에서 직접 호출해도 SSR/테스트 안전. → 통화 인자만 외부에서 주입하면 전체 순수성 유지.
- KRW 표기 체계(`formatKrw`)는 이미 검증됨: `조원 / 억원 / 만원 / 원`, `signed` 옵션 지원. **재사용이 정답이며 새 KRW 로직을 작성하지 않는다.**

### 통화별 단위 체계 대조

| 구간 | USD (기존) | KRW (formatKrw 기존) |
|------|-----------|---------------------|
| ≥ 1e12 USD | `$1.82T` | `조원` (예: $1.82T×1450 = 2,639조 → `2639.0조원`) |
| ≥ 1e9 USD | `$1.82B` | `조원` (KRW는 1e8 경계가 억) |
| ≥ 1e6 USD | `$1.82M` | `억원` |
| 소액 | `$108.77` | `만원 / 원` |

USD는 `$`+`M/B/T`, KRW는 `₩`/한국식 단위. 토글은 **둘 중 하나만** 노출(이중 표기 제거는 ui-planner 결정).

---

## 1. 통화 인지 포맷 API

### 1.1 설계 옵션 비교

| 옵션 | 장점 | 단점 | 판정 |
|------|------|------|------|
| **(A)** 기존 함수에 `currency` 인자 추가 — `formatMarketCap(usd, currency)` | 변경 최소, 함수 1:1, 순수 유지, 트리셰이킹 친화 | 모든 호출부가 `currency`를 직접 들고 다녀야 함(32개 호출부 prop drilling) | 코어로 채택 |
| **(B)** 신규 함수군 + 기존 deprecate | 명시적 | 함수 수 2배, 마이그레이션 중 혼선, 기존 9개 `formatKrw`와 충돌 | 기각 |
| **(C)** 훅 `useCurrencyFormat()`가 현재 통화를 클로저로 잡아 `fmt.marketCap(usd)` 반환 | 호출부가 `currency`를 안 들고 다님(DX 최고), 컴포넌트는 `fmt`만 받음 | 훅이라 RSC/순수함수 컨텍스트(차트 formatter 클로저, 서버 컴포넌트)에서 직접 못 씀 | (A) 위의 얇은 래퍼로 채택 |

### 1.2 권장안: **(A) 순수 코어 + (C) 훅 래퍼 = 2계층**

```
[순수 코어]  lib/format.ts
  formatMarketCap(usd, currency)  ← currency 인자, getKrwRate()만 내부 호출
  formatPrice(usd, currency)
  formatPriceCompact(usd, currency)
  formatFlowAmount(usd, currency)
        ▲ 순수·SSR·테스트 안전·차트 formatter 클로저에서 직접 호출 가능
        │
[훅 래퍼]  hooks/use-currency-format.ts (state-arch가 통화 상태 제공)
  const fmt = useCurrencyFormat()
  fmt.marketCap(usd) === formatMarketCap(usd, currentCurrency)
        ▲ 일반 클라이언트 컴포넌트의 기본 사용법. currency를 자동 주입.
```

- 컴포넌트는 거의 전부 `useCurrencyFormat()`(C)를 쓴다 → prop drilling 0.
- 차트(recharts formatter 클로저)와 서버 컴포넌트는 currency를 한 번 꺼내 코어(A)를 직접 호출한다 → 순수성 유지.
- (A)가 단일 진실; (C)는 (A)에 `currentCurrency`를 바인딩한 얇은 클로저일 뿐. 로직 중복 없음.

### 1.3 타입

```typescript
// lib/currency.ts (또는 types) — state-arch와 공유할 단일 타입
export type Currency = 'KRW' | 'USD'
export const DEFAULT_CURRENCY: Currency = 'KRW' // 요구사항: 기본 ₩
```

### 1.4 코어 함수 시그니처 + KRW 분기 동작

기존 시그니처에 `currency: Currency = 'USD'` 후행 인자를 추가한다. 기본값을 `'USD'`로 두면 **인자 미지정 기존 호출부가 그대로 USD로 동작**(점진 마이그레이션 안전). 마이그레이션 완료 후 `useCurrencyFormat` 경유가 KRW 기본을 보장.

```typescript
// ── 시가총액 ──────────────────────────────────────────────
export function formatMarketCap(
  value: number | null | undefined,
  currency: Currency = 'USD'
): string {
  if (value === null || value === undefined) return 'N/A'
  if (currency === 'KRW') return formatKrw(value)          // 조원/억원/만원/원 재사용
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  return `$${value.toLocaleString()}`
}

// ── 가격(주가) ────────────────────────────────────────────
export function formatPrice(
  value: number | null,
  currency: Currency = 'USD'
): string {
  if (value === null || value === undefined) return 'N/A'
  if (currency === 'KRW') {
    const krw = value * getKrwRate()
    return `₩${Math.round(krw).toLocaleString()}`        // 원 단위 정수, 천단위 콤마
  }
  return `$${value.toFixed(2)}`
}

// ── 짧은 가격(좁은 셀) ────────────────────────────────────
export function formatPriceCompact(
  value: number | null | undefined,
  currency: Currency = 'USD'
): string {
  if (value === null || value === undefined) return 'N/A'
  if (currency === 'KRW') return formatKrw(value)          // 억/만원 압축 표기 재사용
  const abs = Math.abs(value)
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e5) return `$${Math.round(value / 1e3).toLocaleString()}K`
  if (abs >= 1e4) return `$${(value / 1e3).toFixed(1)}K`
  if (abs >= 1e3) return `$${Math.round(value).toLocaleString()}`
  return `$${value.toFixed(2)}`
}

// ── 자금흐름액 ────────────────────────────────────────────
// 주의: 입력이 음수일 수 있으나 호출부가 부호(+/-)를 따로 붙인다(flow-river:270).
//       따라서 KRW도 절댓값 표기(formatKrw 기본 동작)로 일치시킨다.
export function formatFlowAmount(
  amount: number,
  currency: Currency = 'USD'
): string {
  if (currency === 'KRW') return formatKrw(amount)         // 절댓값·조/억원
  const absAmount = Math.abs(amount)
  if (absAmount >= 1e12) return `$${(absAmount / 1e12).toFixed(1)}T`
  if (absAmount >= 1e9) return `$${(absAmount / 1e9).toFixed(1)}B`
  if (absAmount >= 1e6) return `$${(absAmount / 1e6).toFixed(1)}M`
  return `$${absAmount.toLocaleString()}`
}
```

### 1.5 훅 래퍼 시그니처

```typescript
// hooks/use-currency-format.ts
// useCurrency()는 state-arch가 제공(Context). 여기서는 계약만 가정.
export interface CurrencyFormat {
  marketCap: (usd: number | null | undefined) => string
  price: (usd: number | null) => string
  priceCompact: (usd: number | null | undefined) => string
  flowAmount: (usd: number) => string
  currency: Currency           // 차트 formatter 클로저 구성용 노출
}

export function useCurrencyFormat(): CurrencyFormat {
  const { currency } = useCurrency()   // ← state-arch 계약 (1.7 참조)
  return useMemo(() => ({
    marketCap: (v) => formatMarketCap(v, currency),
    price: (v) => formatPrice(v, currency),
    priceCompact: (v) => formatPriceCompact(v, currency),
    flowAmount: (v) => formatFlowAmount(v, currency),
    currency,
  }), [currency])
}
```

### 1.6 토글 영향 0 — 통화 무관 함수 (변경 금지)

아래는 **절대 currency 인자를 받지 않는다.** 잘못 변환하면 오표시 버그(2026-05-09/18 재발 패턴과 동류). _context.md §44 일치.

| 함수 | 출력 | 이유 |
|------|------|------|
| `formatPriceChange(v)` | `+1.23%` | 비율(%) — 통화 무관 |
| `formatPercent(v)` | `+1.2%` | 비율(%) |
| `formatVolume(v)` | `1.2M`(주) | 거래량(주 수) — 무차원 |
| `formatScore` / `toScoreSummary` | `7.3/10` | 점수 — 무차원 |
| `formatNumber / formatDate / formatRelativeTime / formatRecommendation` | — | 통화 무관 |

> 별도: `daily_snapshots.price_change` 컬럼은 `%`다(CLAUDE.md). flow-river의 `flowPercent`, sector-company-list의 `priceChangePercent`도 % → 변환 금지.

### 1.7 state-arch 계약 (입력 의존)

- state-arch가 `useCurrency(): { currency: Currency; setCurrency: (c: Currency) => void }`를 Context로 제공.
- `Currency` 타입과 `DEFAULT_CURRENCY`는 `lib/currency.ts`에 두고 양쪽이 import(SoT 일원화).
- 포맷 레이어는 **전역 통화를 직접 읽지 않는다.** 항상 (A) 인자 또는 (C) 훅 경유. → 순수성/SSR §4 보장.

---

## 2. KRW 변환 정밀도/일관성

| 표시 대상 | USD 입력 | KRW 출력 규칙 | 반올림 |
|-----------|---------|---------------|--------|
| 시가총액 | usd | `formatKrw(usd)`: ≥1조→`N.N조원`, ≥1억→`N억원`, ≥1만→`N만원` | 조원 소수1자리, 억/만원 정수(`Math.round`) |
| 자금흐름액 | usd | `formatKrw(usd)` 동일 | 동일 |
| 주가(price) | usd | `₩{round(usd×rate)}` 원 단위 정수 + 천단위 콤마 | `Math.round` |
| priceCompact | usd | `formatKrw(usd)`(억/만원) | formatKrw 규칙 |

- **단일 SoT 강제:** 모든 KRW 환산은 `getKrwRate()` 한 함수만 거친다. 시총·흐름은 `formatKrw` 경유라 자동 일치. 주가만 `formatPrice` 내부에서 `getKrwRate()` 직접 곱(동일 환율).
- 환율 변경 시 변경 지점 0 (env만 수정) — 기존 아키텍처 유지.

### 2.1 주가 KRW 표기 자릿수 (명시 결정)

질문: 미국 주가 `$108.77` → `₩157,716`(원 단위)인가, `15만원`인가?

**권장: 원 단위 정수 + 천단위 콤마 (`₩157,716`).** 근거:
1. 한국 주가는 원래 원 단위(예: 삼성전자 ₩54,000 / SK하이닉스 ₩178,000)다. 사용자 멘탈 모델이 "원 단위 정수".
2. `만원` 압축은 시총/흐름 같은 **집계 금액**에는 맞지만, 개별 **주가**에는 정밀도가 깨진다(₩157,716 → `16만원`은 -2,284원 손실, 매매 단가로 부적절).
3. 시총/흐름(formatKrw)과 주가(formatPrice)의 표기 체계를 의도적으로 분리: **금액=압축단위, 단가=원단위 정수.** USD에서도 동일 철학(시총=`$M/B/T` 압축, 주가=`$108.77` 정밀).

소수점: 원화는 소수 없음 → `Math.round`로 정수. 1원 미만 주가(드묾)도 반올림.

### 2.2 음수/부호 처리

- `formatKrw`는 기본 절댓값, `{signed:true}`로 부호 보존. 자금흐름·가격은 호출부가 부호를 따로 붙이는 패턴(flow-river:270 `{isInflow ? '+' : '-'}`)이므로 **절댓값 표기 유지**(USD 동작과 동일). 회귀 없음.

---

## 3. 차트 통화축 처리

핵심 원리: **recharts `tickFormatter`/`formatter`는 클로저다.** 컴포넌트가 `currency`(또는 `fmt`)를 훅/prop으로 받아 렌더 시 formatter를 새로 구성하면, 통화 전환이 자동 반영된다(currency가 의존성이므로 리렌더). 전역을 formatter 내부에서 읽지 않는다.

### 3.1 통화축 차트 (변환 대상) — 실측 분류

| 컴포넌트 | 위치 | 현재 | 처리 |
|----------|------|------|------|
| `price-chart.tsx` | YAxis:64, Tooltip:72 | 인라인 `$${value.toFixed(0/2)}` | currency prop 추가 → `fmt`/코어로 클로저 구성 |
| `money-flow/flow-river.tsx` | 사설 `formatAmount`:14-26 | 인라인 `$T/B/M` | `formatFlowAmount(v, currency)`로 치환, currency prop 수신 |
| `money-flow/sector-company-list.tsx` | 사설 `formatPrice`:20, `formatMarketCap`:27 | 인라인 `$` | 코어 `formatPrice/formatMarketCap(v, currency)`로 치환(사설 함수 제거) |
| `statistics/category-comparison-chart.tsx` | YAxis tick:60(bare T/B/M, `$` 없음), Tooltip:77(이미 `$ (₩)` 이중) | 혼합 | YAxis는 currency 분기, Tooltip 이중표기는 ui-planner 결정(단일화 시 `fmt.marketCap`) |
| `statistics/top-sectors-growth-chart.tsx` | Tooltip:78 `$ (₩)` 이중 | 시총 이중 | 동일 — `fmt.marketCap`로 단일화 또는 유지 |

### 3.2 비통화축 차트 (변경 금지) — 실측 확인

| 컴포넌트 | 축 | 이유 |
|----------|-----|------|
| `statistics/company-trend-chart.tsx` | `%`(tick:93, tooltip:99) | 비율 — 통화 무관 |
| `statistics/sector-trend-chart.tsx` | `%`(tick:92) | 비율 |
| `statistics/top-sectors-growth-chart.tsx` **YAxis** | `%`(tick:57) | 성장률 축은 %; 시총은 Tooltip에만 |
| `stock/insights/score-trend-chart.tsx` | `점`(formatter:147) | 점수 — 무차원 |

### 3.3 차트 주입 패턴 (price-chart 예시)

```typescript
// 'use client' 컴포넌트 → 훅 직접 사용 가능
export function PriceChart({ data }: PriceChartProps) {
  const fmt = useCurrencyFormat()           // currency 자동 주입
  // ...
  <YAxis tickFormatter={(v) => fmt.price(v)} ... />
  <Tooltip formatter={(v) => [fmt.price(typeof v === 'number' ? v : 0), '가격']} ... />
}
```

- 서버 컴포넌트에서 렌더되는 차트가 있으면 부모가 `currency`를 prop으로 내려 코어(A) 직접 호출. (price-chart/flow-river/sector-company-list 모두 `'use client'`라 훅으로 충분.)
- `fmt`가 `useMemo([currency])`라 currency 미변경 시 formatter 재생성 없음(렌더 안정).
- **참고(좌표 도메인):** price-chart의 `minPrice/maxPrice`(:32-33)는 차트 좌표 계산용 raw USD 값이라 변환 불요(축 라벨만 통화 포맷). KRW 전환해도 곡선 모양 동일.

---

## 4. 순수성 / SSR

- **코어 함수는 100% 순수:** 외부 입력은 `(value, currency)`뿐. 전역 통화 상태를 직접 읽지 않음 → 단위 테스트에서 `formatMarketCap(1e12, 'KRW')` 식으로 통화 고정 검증 가능.
- `getKrwRate()` 내부 호출은 허용: env/상수만 읽는 순수 함수, 빌드 시 고정값. SSR/클라 동일(`NEXT_PUBLIC_KRW_USD_RATE`).
- **SSR 깜빡임:** 통화 상태(localStorage)는 서버에서 못 읽음 → 첫 페인트는 `DEFAULT_CURRENCY='KRW'`로 그림. 기본이 KRW이고 다수 사용자가 KRW면 flash 최소. flash 완전 제거가 필요하면 state-arch가 next-themes식 inline script 또는 cookie SSR 주입으로 해결(이 레이어 무관 — 포맷 함수는 받은 currency만 신뢰).
- 결정성: 동일 `(value, currency, rate)` → 동일 출력. 하이드레이션 미스매치는 currency 초기값 불일치에서만 발생하며 그건 state-arch 책임.

---

## 5. 다른 영역과의 계약

| 영역 | 계약 |
|------|------|
| **state-arch** | `useCurrency(): {currency, setCurrency}` Context 제공. `Currency`/`DEFAULT_CURRENCY`는 `lib/currency.ts` SoT import. 캐시/API 무영향(이 레이어가 USD 입력만 다룸을 보증). |
| **ui-planner** | 어느 표시가 어느 함수를 쓰는지 매핑. 특히 §3.1 이중표기(`$ (₩)`) 2곳을 토글 단일화할지 결정. formatPriceChange/Percent/Volume/score는 토글에서 제외(§1.6)임을 전수 인벤토리에 반영. |
| **design-system** | 자릿수/표기 규칙 채택: USD=`$`+M/B/T(소수2), KRW=`₩`+조/억/만원 압축(금액)·`₩`+원단위정수(주가). signed 부호는 호출부 책임. |

---

## 6. 마이그레이션 영향도 (실측 호출부)

기존 함수에 후행 선택 인자를 추가하므로 **시그니처 호환**(기존 호출 무수정 시 USD 유지). 통화 반영하려면 호출부를 `useCurrencyFormat` 경유로 전환.

| 함수 | 변환 대상 파일 수 | 파일 |
|------|------|------|
| `formatMarketCap` | 14 | global-search, company-badge, industry-dashboard, statistics/(top-sectors-growth·category-comparison·company-ranking-table), price-changes/price-change-table, money-flow/sector-company-list, dashboard/(company-stats-card·market-pulse-strip), stock/stock-price-banner, stock/insights/(financial-analyst·sector-position), app/stock/[ticker]/opengraph-image |
| `formatPrice` | 5 | price-changes/price-change-table, money-flow/sector-company-list, stock/stock-price-banner, stock/insights/(insight-hero·financial-analyst) |
| `formatPriceCompact` | 1 | dashboard/price-changes-card |
| `formatFlowAmount` | 5 | industry-dashboard, money-flow/(flow-summary·flow-card), dashboard/(market-pulse-strip·industry-money-flow-card) |
| `formatKrw`(기존 이중표기 9곳) | 9 | ui-planner가 단일화 시 `fmt` 대체 검토 |
| 사설 인라인 `$` | 3 | price-chart, flow-river, sector-company-list |

> **주의 — opengraph-image(서버):** `app/stock/[ticker]/opengraph-image.tsx`는 빌드/서버 렌더로 훅 사용 불가. OG 이미지는 통화 토글(클라 상태)을 알 수 없으므로 **기본 통화(USD 또는 KRW 고정) 유지**가 합리적. ui-planner와 정책 합의 필요(권장: OG는 USD 고정, 인자 미지정 기본값 활용).

---

## 7. 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 이중 변환(KRW 입력에 또 ×rate) | `$1.82M`→이중환산 버그(CLAUDE.md 재발 2회) | 입력은 **항상 USD**임을 불변식으로 명시. 포맷 함수는 raw native 통화를 절대 받지 않음(toUsd는 API에서 끝). 코드리뷰 체크리스트화 |
| 통화 무관 필드 오변환 | %·주·점수가 ₩로 둔갑 | §1.6 화이트리스트 고정. formatPriceChange/Percent/Volume/Score는 currency 인자 자체를 갖지 않게 설계 |
| SSR 하이드레이션 flash | 첫 페인트 KRW→교정 시 깜빡 | 기본 KRW로 최소화; 완전 제거는 state-arch 책임 |
| 차트 formatter 클로저 미갱신 | 토글 후 축 라벨 안 바뀜 | `fmt`를 `useMemo([currency])`로 만들어 currency 변경 시 formatter 재구성 보장 |
| 데이터 손실 | 없음 — 표시 레이어만, DB/마이그레이션 무관 | 해당 없음 |

데이터 모델/마이그레이션 변경 **없음.** 이 작업은 순수 표시 레이어 전환이며 다운타임·데이터 손실 가능성 0.
