# 통화 토글 전역 상태 아키텍처 (state-arch)

작성: sk-filter-architect · 2026-06-14 · 영역: `components/providers.tsx`, `lib/currency.ts`, 신규 `components/currency-provider.tsx` / `hooks/use-currency.ts`
선행 컨텍스트: `_workspace/10_currency_toggle/01_plan/_context.md`
형제 산출물: `_workspace/10_currency_toggle/01_plan/format-layer.md` (포맷 레이어가 `useCurrency()` 계약을 소비)
실측 기준 코드: `components/providers.tsx`, `hooks/use-region.ts`, `components/theme-toggle.tsx`, `app/layout.tsx`, `hooks/use-onboarding.ts`, `lib/format.ts`, `lib/currency.ts`, `components/layout/global-top-bar.tsx`, `app/stock/[ticker]/opengraph-image.tsx`

---

## 0. 결론 (먼저 읽기)

- **저장 방식: (A) Context + localStorage**, next-themes 동일 패턴. 단, next-themes 라이브러리는 통화용으로 재활용 불가(테마 전용 API)라 동형의 경량 자체 Provider를 둔다.
- **flash 처리: localStorage + inline script(next-themes 방식) 채택.** 기본이 KRW라 다수 사용자는 애초에 flash 없음. USD 선택 사용자만 깜빡이는데, 이를 `<head>` inline script로 `<html data-currency>` 를 첫 페인트 전에 세팅해 제거. cookie SSR 주입은 미들웨어/모든 서버렌더 결합도가 높아 과설계 → 기각.
- **React Query 캐시: 무영향.** 통화는 표시 전용이고 API는 USD 불변이므로 `queryKey`에 currency를 **절대 넣지 않는다.** 통화 의존 쿼리 0개(실측).
- **SSR 가격 렌더: 1곳만 존재** — `app/stock/[ticker]/opengraph-image.tsx`(빌드/서버 시각, 클라 상태 접근 불가). OG 이미지는 통화 토글을 알 수 없으므로 **고정 기본(USD)** 유지. 나머지 모든 가격 표시 컴포넌트는 `'use client'`라 Context로 충분.
- `Currency` / `DEFAULT_CURRENCY` 타입 SoT는 `lib/currency.ts`(format-layer §1.7 합의 그대로). state-arch와 format-layer가 동일 심볼 import.

---

## 1. 저장 방식 결정 (핵심)

### 1.1 옵션 비교

| 옵션 | 메커니즘 | 장점 | 단점 | 판정 |
|------|----------|------|------|------|
| **(A) Context + localStorage** | React Context로 전역 공유, localStorage 영속 | 페이지/산업 무관 전역 선호값에 정확히 맞음. URL 비오염. region 토글과 직교(서로 영향 0). next-themes/useOnboarding 검증된 선례. 캐시 무영향 | 서버에서 localStorage 못 읽음 → flash 가능(아래 §3에서 해결) | **채택** |
| (B) URL `?currency=` (useRegion 스타일) | searchParams 동기화 | SSR에서 즉시 정확(서버가 URL 읽음) | **통화는 모든 링크에 전파되면 안 됨**(_context §6: "모든 링크에 전파하면 안 됨"). 전역 선호값을 URL에 넣으면 공유 링크·SEO canonical·뒤로가기·산업 전환 시 매번 따라다님. region과 달리 통화는 "콘텐츠 필터"가 아니라 "표시 환경설정". `useSearchParams` → Suspense 강제(전 페이지 래핑 비용). | **기각** |
| (C) cookie 기반 SSR 주입 | Set-Cookie + 서버에서 cookies() 읽어 주입 | flash 완전 제거(SSR에서 정확히 그림) | 미들웨어/모든 RSC가 cookie 읽어 내려야 함(결합도↑). 가격 표시는 거의 전부 클라 컴포넌트라 SSR 주입 이득이 적음(어차피 클라에서 그림). 과설계 | **기각**(필요 시 향후 보강) |
| (D) next-themes 라이브러리 재활용 | next-themes를 통화에도 사용 | 신규 코드 0 | next-themes는 `class`/`data-theme` 1축 전용 API. 두 번째 ThemeProvider를 통화용으로 띄우면 의미 왜곡·DOM 속성 충돌·다크모드와 상태 혼선. 부적합 | **기각**(패턴만 모방) |

### 1.2 채택 근거 요약

통화는 **산업/페이지와 직교한 전역 사용자 환경설정**이다(테마와 동일 성격). region(`?region=`)은 "어떤 데이터를 보여줄지"를 바꾸는 **콘텐츠 필터**라 URL·캐시·API가 관여하지만, 통화는 "같은 USD 데이터를 어떤 단위로 표기할지"만 바꾸는 **표시 환경설정**이다. 따라서:

- region과 정반대 결론: region = URL(공유·딥링크 의미 있음), currency = Context+localStorage(개인 선호, 링크 전파 금지).
- 테마(next-themes)와 동일 결론: 전역·개인·영속.

→ **(A) Context + localStorage 확정.** 단 next-themes 라이브러리(D)는 API가 통화에 안 맞아 동형의 경량 자체 Provider로 구현(코드 ~40줄).

---

## 2. Provider / 훅 설계

### 2.1 타입 SoT (`lib/currency.ts`에 추가)

format-layer §1.3/§1.7과 **동일 심볼**. 양 레이어가 여기서 import (중복 정의 금지).

```typescript
// lib/currency.ts (기존 파일에 추가) — Currency 타입 단일 진실
export type Currency = 'KRW' | 'USD'

/** 요구사항: 기본 표기는 원화(₩). */
export const DEFAULT_CURRENCY: Currency = 'KRW'

/** localStorage / inline-script / data-attr 공유 상수 (오타 방지·단일 진실) */
export const CURRENCY_STORAGE_KEY = 'sector-king-currency'
export const CURRENCY_ATTRIBUTE = 'data-currency' // <html data-currency="KRW|USD">

export function isCurrency(v: unknown): v is Currency {
  return v === 'KRW' || v === 'USD'
}
```

> 명명 근거: 기존 localStorage 키 컨벤션 `sector-king-onboarding`(use-onboarding) 과 일치하는 `sector-king-currency`. `data-currency` 속성은 next-themes 의 `data-theme`/`class` 와 충돌 없는 별도 축.

### 2.2 CurrencyProvider + useCurrency 훅

```typescript
// hooks/use-currency.ts
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type Currency,
  DEFAULT_CURRENCY,
  CURRENCY_STORAGE_KEY,
  CURRENCY_ATTRIBUTE,
  isCurrency,
} from '@/lib/currency'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (next: Currency) => void
  /** localStorage 동기화 완료 여부. flash-민감 UI(토글 active 상태)에서 활용 가능 */
  isHydrated: boolean
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // SSR/첫 렌더는 항상 DEFAULT_CURRENCY 로 시작(서버·클라 초기 트리 일치 → 하이드레이션 안전).
  // inline script(§3)가 <html data-currency> 를 먼저 세팅해 페인트 flash 는 막고,
  // 여기서는 마운트 후 localStorage 를 읽어 React state 를 교정한다.
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CURRENCY_STORAGE_KEY)
      if (isCurrency(raw)) setCurrencyState(raw)
    } catch {
      // localStorage 불가(프라이빗 모드 등) — DEFAULT 유지
    }
    setIsHydrated(true)
  }, [])

  const setCurrency = useCallback((next: Currency) => {
    if (!isCurrency(next)) return
    setCurrencyState(next)
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, next)
    } catch {
      // 영속 실패해도 세션 내 동작은 유지
    }
    // data-attr 동기화: inline script 와 같은 소스로 통일(다음 새로고침 flash 방지)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(CURRENCY_ATTRIBUTE, next)
    }
  }, [])

  // 멀티탭 동기화(옵션, 저비용): 다른 탭에서 바꾸면 이 탭도 반영
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CURRENCY_STORAGE_KEY && isCurrency(e.newValue)) {
        setCurrencyState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, isHydrated }),
    [currency, setCurrency, isHydrated]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

/**
 * 전역 통화 상태 훅. format-layer 의 useCurrencyFormat 이 내부에서 호출한다.
 * Provider 밖에서 호출되면 DEFAULT_CURRENCY 로 안전 폴백(throw 하지 않음) —
 * OG 이미지/스토리북/테스트 등 Provider 없는 컨텍스트 회복력.
 */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (ctx) return ctx
  return { currency: DEFAULT_CURRENCY, setCurrency: () => {}, isHydrated: false }
}
```

설계 메모:
- **불변성**: state는 항상 새 값 set, 객체 변경 없음(코딩스타일 준수).
- **순수 폴백**: Provider 미장착 컨텍스트에서 `useCurrency()`가 throw 대신 DEFAULT 반환 → format-layer 의 차트 formatter·테스트가 안전. (테마 토글처럼 강제 throw 안 함.)
- **isHydrated 노출**: 토글 컴포넌트가 마운트 전(서버 트리) active 상태를 잘못 그려 깜빡이는 걸 막을 옵션 제공(ui-planner가 사용 결정).

### 2.3 Provider 트리 삽입 위치 (`components/providers.tsx`)

현재 트리: `QueryClientProvider > ThemeProvider > SearchProvider > OnboardingProvider`.

`CurrencyProvider` 삽입 위치 = **ThemeProvider 안쪽, SearchProvider 바깥** (테마와 형제 레벨의 전역 환경설정; 검색·온보딩보다 상위라 그 하위 모든 UI가 통화 접근 가능):

```tsx
// components/providers.tsx (변경안)
<QueryClientProvider client={queryClient}>
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
    <CurrencyProvider>            {/* ← 추가 */}
      <SearchProvider>
        <OnboardingProvider>
          {children}
          <GlobalSearch />
          <WelcomeTrigger />
        </OnboardingProvider>
      </SearchProvider>
    </CurrencyProvider>
  </ThemeProvider>
</QueryClientProvider>
```

근거: `QueryClientProvider`보다 안쪽이어야 통화 변경이 쿼리 무효화와 무관함이 트리 상으로도 명확(통화는 React Query 위에 얹힌 표시 레이어). `ThemeProvider`와 인접 = 둘 다 전역 표시 환경설정이라 의미적 응집. `children` 전체를 감싸므로 모든 페이지·`GlobalTopBar` 토글이 접근.

### 2.4 format-layer 와의 계약 (확정)

format-layer §1.5 의 `useCurrencyFormat()`은 이 훅을 내부에서 호출한다 — **권장 구조 그대로 채택**:

```typescript
// hooks/use-currency-format.ts (format-layer 소유, 계약 확인용 재기재)
export function useCurrencyFormat(): CurrencyFormat {
  const { currency } = useCurrency()      // ← state-arch 제공
  return useMemo(() => ({
    marketCap: (v) => formatMarketCap(v, currency),
    price: (v) => formatPrice(v, currency),
    priceCompact: (v) => formatPriceCompact(v, currency),
    flowAmount: (v) => formatFlowAmount(v, currency),
    currency,
  }), [currency])
}
```

- 컴포넌트는 `useCurrencyFormat()`만 쓰고 `currency`를 prop drilling 하지 않는다(DX·결합도↓).
- 포맷 코어 함수는 `currency` 인자만 받는 순수 함수(format-layer §1.4) → state-arch는 **통화 값 공급**만 책임지고 포맷 로직은 모름(관심사 분리).
- `useCurrency()` 반환 형태는 format-layer §1.7 가정(`{ currency, setCurrency }`)의 상위호환(+`isHydrated`). 계약 충족.

---

## 3. SSR / 하이드레이션 flash 방지

### 3.1 문제

localStorage는 서버에서 못 읽으므로 첫 페인트는 항상 `DEFAULT_CURRENCY='KRW'`. KRW 사용자는 flash 없음. **USD 선택 사용자만** 새로고침 시 "₩ 잠깐 → $ 교정" 깜빡임 발생.

### 3.2 결정: localStorage + inline script (next-themes 방식)

next-themes가 다크모드 flash를 막는 것과 동일 원리. `<head>`에 동기 inline script를 넣어 **React 하이드레이션 이전, 첫 페인트 전에** `<html data-currency>`를 설정한다. CSS/포맷이 이 속성을 신뢰하면 flash 0.

다만 본 작업의 가격 표기는 CSS가 아니라 **JS(formatKrw/$)로 문자열을 만든다.** inline script만으로는 React가 그릴 첫 문자열을 바꿀 수 없다(React state는 여전히 DEFAULT로 시작해야 하이드레이션 미스매치가 안 남). 따라서 2단계로 나눈다:

1. **inline script** — 페인트 전에 `document.documentElement.setAttribute('data-currency', stored)` 실행. 차트축·CSS·`[data-currency]` 셀렉터가 즉시 정확. (DOM 속성 선반영)
2. **React state** — Provider는 첫 렌더에서 무조건 DEFAULT로 시작 → `useEffect`에서 localStorage 읽어 교정. 이렇게 해야 **서버 HTML과 클라 첫 렌더 트리가 일치**(하이드레이션 미스매치 없음). USD 사용자에게는 가격 문자열만 1프레임 KRW로 보였다 교정될 수 있음.

### 3.3 권장 수준 (실용 결론)

- **채택: inline script로 `<html data-currency>`만 선반영 + `<html suppressHydrationWarning>` 유지.** 이미 `app/layout.tsx:129`에 `suppressHydrationWarning`이 있어(테마용) 통화 속성 선반영의 하이드레이션 경고도 함께 흡수됨.
- 가격 **문자열** 1프레임 깜빡임은 다음 중 택1로 처리(ui-planner 결정):
  - (권장) **그대로 수용** — 기본 KRW라 영향 사용자 소수(USD 선택자 한정), 1프레임이며 콘텐츠 점프 없음(₩/$ 폭 유사). 복잡도 최소. format-layer §4 결론과 동일.
  - (옵션) 가격 표시 컴포넌트가 `isHydrated` 전에는 스켈레톤/dim 처리 — 비용 대비 효과 낮음, 비권장.
- **cookie SSR 주입(옵션 C)은 채택 안 함**: 가격 표시가 거의 전부 클라 컴포넌트라 SSR에서 정확히 그릴 이득이 작고, 미들웨어·전 RSC 결합 비용이 큼. 향후 OG/메타에 통화 반영 요구가 생기면 그때 재검토.

### 3.4 inline script 구현 (`app/layout.tsx`)

```tsx
// app/layout.tsx <head> 내부, WebSiteJsonLd 인근에 추가
<script
  // 첫 페인트 전 동기 실행: localStorage 의 통화를 <html data-currency> 로 선반영.
  // 키/속성/기본값은 lib/currency.ts SoT 와 문자열로 일치시켜야 함(빌드 시 인라인).
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var c=localStorage.getItem('sector-king-currency');document.documentElement.setAttribute('data-currency',(c==='USD'||c==='KRW')?c:'KRW');}catch(e){document.documentElement.setAttribute('data-currency','KRW');}})();`,
  }}
/>
```

> 주의: inline script 문자열은 번들러가 `lib/currency.ts` 상수를 자동 치환하지 못하므로 키(`sector-king-currency`)·기본값(`KRW`)을 **하드코딩**한다. 변경 시 SoT와 동시 수정해야 하는 유일한 이중 지점 → 해당 상수 옆에 "inline script 와 동기화" 주석 명시(use-region/onboarding 패턴 준수). 검증 에이전트 체크 항목으로 등록(§7).

---

## 4. React Query 캐시 영향 (중요)

### 4.1 결론: 캐시 완전 무영향 — queryKey 변경 0

통화 전환은 **표시 전용**이다. 근거:

- API 응답은 _context §13 + format-layer §0 실측대로 **전부 USD 불변**. 통화를 바꿔도 서버가 돌려주는 데이터(USD 숫자)는 동일.
- 따라서 `queryKey`에 `currency`를 넣으면 **불필요한 재요청**이 발생(같은 USD를 또 fetch). 절대 추가 금지.
- 통화 전환 = 이미 캐시된 USD 데이터를 다른 포맷터로 다시 문자열화하는 **클라 렌더링 작업**일 뿐. React state(currency) 변경 → 구독 컴포넌트 리렌더 → 새 통화로 포맷. 데이터 레이어 무관.

### 4.2 통화 의존 쿼리 식별 (예외 탐색)

실측 결과 **통화 의존 쿼리 0개.** 모든 hook은 USD를 받아 그대로 캐싱하고, ₩ 변환은 표시 시점(`formatKrw`)에만 일어난다. region(`?region=`)은 데이터 자체를 거르므로 queryKey에 들어가지만, currency는 데이터를 거르지 않으므로 들어가지 않는다 — 이 직교성이 핵심.

```
region  → queryKey 포함  (콘텐츠 필터: 다른 데이터)
currency → queryKey 제외  (표시 환경설정: 같은 데이터, 다른 단위)
```

### 4.3 검증 포인트(verifier 용)

- `grep -rn "queryKey" hooks/` 결과에 `currency`가 **등장하지 않아야** 함.
- 통화 토글 시 Network 탭에 신규 요청 0건이어야 함(캐시 재사용 증거).

---

## 5. SSR 컴포넌트 경계

### 5.1 가격 표시 = 거의 전부 클라 컴포넌트

실측(`grep` 으로 format 함수 사용처 중 `'use client'` 미선언 파일 탐지): **단 1곳** 외 전부 `'use client'`. 즉 통화 토글 영향 표시 지점은 모두 Context 접근 가능 → 추가 작업 불필요.

### 5.2 유일한 SSR 가격 렌더: OG 이미지

`app/stock/[ticker]/opengraph-image.tsx:39` — `formatMarketCap(summary.marketCapUsd)` 를 **빌드/서버 시각**에 호출(`ImageResponse`). 이 시점엔 사용자 localStorage·Context가 존재하지 않음 → 통화 주입 **불가**.

**처리 방안(확정):** OG 이미지는 통화 인자 미지정 → format-layer §1.4 의 기본값 `'USD'`로 동작(현행 유지). 소셜 공유 카드는 개인 통화 선호를 반영할 수 없는 게 정상(공유 대상마다 선호 다름). format-layer §6 주석과 일치. ui-planner/design-system이 "OG는 USD 고정" 정책을 인벤토리에 명시.

> 대안(비권장): URL 파라미터(`?currency=`)로 OG에 통화 전달 — 캐시 폭발·복잡도↑, 공유 카드에 과한 개인화. 기각.

### 5.3 차트 경계

format-layer §3 확인: `price-chart`, `flow-river`, `sector-company-list`, statistics 차트 모두 `'use client'` → 훅(`useCurrencyFormat`) 직접 사용 가능. 서버에서 렌더되는 통화축 차트 없음 → 경계 문제 없음.

---

## 6. 다른 영역과의 계약

| 영역 | state-arch 가 제공 / 합의 |
|------|--------------------------|
| **format-layer** | `useCurrency(): { currency, setCurrency, isHydrated }` Context 제공. `Currency`/`DEFAULT_CURRENCY`/`isCurrency`는 `lib/currency.ts` SoT. `useCurrencyFormat`(format-layer 소유)이 이 훅을 내부 호출(§2.4). 캐시/API 무영향 보증(§4). |
| **ui-planner** | 토글 컴포넌트는 `const { currency, setCurrency, isHydrated } = useCurrency()` 사용. `setCurrency('KRW'|'USD')` 호출로 전역 전환. 토글 배치는 `global-top-bar.tsx` ThemeToggle 인접(데스크탑 155행 영역 / 모바일 Sheet "도구" 섹션 230행 영역). `isHydrated` 로 active 상태 flash 제어 가능. flash 문자열 1프레임 수용 여부 최종 결정. OG=USD 고정 정책 반영. |
| **design-system** | 토글 컴포넌트(₩/$ 2상태)의 a11y: `role="group"` + 각 옵션 `aria-pressed`(테마 토글의 `sr-only` 라벨 패턴 참고). ThemeToggle 과 시각 일관. 토글이 보내는 값은 `'KRW' | 'USD'` 유니온뿐. |

---

## 7. 변경 파일 요약 + 검증 체크리스트

### 7.1 신규/변경 파일

| 파일 | 작업 | 내용 |
|------|------|------|
| `lib/currency.ts` | 추가 | `Currency`, `DEFAULT_CURRENCY`, `CURRENCY_STORAGE_KEY`, `CURRENCY_ATTRIBUTE`, `isCurrency` (SoT) |
| `hooks/use-currency.ts` | 신규 | `CurrencyProvider` + `useCurrency()` (Context+localStorage, §2.2) |
| `components/providers.tsx` | 수정 | `CurrencyProvider`를 ThemeProvider 안/SearchProvider 밖에 삽입 (§2.3) |
| `app/layout.tsx` | 수정 | `<head>` inline script(`data-currency` 선반영). `suppressHydrationWarning` 은 이미 존재(재사용) (§3.4) |
| `hooks/use-currency-format.ts` | 신규(format-layer 소유) | `useCurrency()` 소비 — 계약만 합의(§2.4) |

> `CurrencyProvider`를 `hooks/use-currency.ts`에 함께 둘지(use-onboarding 선례) 별도 `components/currency-provider.tsx`로 분리할지는 컨벤션 선택. 기존 `SearchProvider`가 `components/`에 있으나 `useOnboarding`은 `hooks/`에 Provider 동거 → JSX 포함이므로 `hooks/use-currency.tsx`(tsx 확장) 또는 `components/currency-provider.tsx` 권장. implementer 재량.

### 7.2 verifier 체크리스트

- [ ] `Currency`/`DEFAULT_CURRENCY` 가 `lib/currency.ts` 단 한 곳에만 정의(format-layer 가 동일 심볼 import, 중복 정의 없음).
- [ ] 기본 통화 = `'KRW'` (요구사항 1).
- [ ] `CurrencyProvider`가 `QueryClientProvider` 안쪽 + `ThemeProvider` 안쪽 + `SearchProvider` 바깥쪽에 위치.
- [ ] `grep -rn "queryKey" hooks/` 에 `currency` **부재**(캐시 무영향).
- [ ] 통화 토글 시 Network 신규 요청 **0건**.
- [ ] localStorage 키 = `'sector-king-currency'`(컨벤션 일치). 값은 `'KRW'|'USD'`만 저장.
- [ ] inline script 의 키/기본값 문자열이 `lib/currency.ts` 상수와 일치(이중 지점 동기화 주석 존재).
- [ ] 새로고침 시: KRW 선택 → flash 없음. USD 선택 → `<html data-currency="USD">` 즉시 반영(DOM 속성), 가격 문자열은 1프레임 허용(수용 정책).
- [ ] `useCurrency()` 가 Provider 밖에서 호출돼도 throw 하지 않고 DEFAULT 반환(OG/테스트 회복력).
- [ ] `app/stock/[ticker]/opengraph-image.tsx` 는 통화 인자 미전달(USD 고정) — 변경 없음.
- [ ] 멀티탭: 한 탭에서 통화 변경 시 다른 탭도 동기화(`storage` 이벤트).
- [ ] 불변성: state 갱신이 객체 변경(mutation) 없이 새 값 set.

---

## 8. 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 하이드레이션 미스매치 | 콘솔 경고/리렌더 | Provider 첫 렌더 항상 DEFAULT 시작 + `suppressHydrationWarning`(기존) → 안전. inline script 는 DOM 속성만 건드려 React 트리 불변 |
| inline script ↔ SoT 문자열 불일치 | flash 미해결 또는 잘못된 통화 선반영 | 상수 옆 "inline script 동기화" 주석 + verifier 체크(§7.2). use-region 의 동일 패턴 주석 컨벤션 준수 |
| queryKey 에 실수로 currency 추가 | 통화 전환마다 전체 재요청(성능/쿼터) | §4 명시 + grep 검증. 코드리뷰 필수 항목 |
| Provider 위치 오류(QueryClient 바깥 등) | 일부 트리에서 통화 미적용 | §2.3 위치 고정 + verifier 트리 확인 |
| OG 이미지에 통화 주입 시도 | 빌드 에러(훅 사용 불가) 또는 캐시 폭발 | OG=USD 고정 정책 확정(§5.2) |
| URL 채택 회귀(누가 ?currency= 도입) | 링크 전파·SEO 오염·Suspense 강제 | §1 결정 근거 문서화 — currency 는 URL 금지가 설계 불변식 |

데이터 모델/마이그레이션/캐시 변경 **없음.** 순수 클라 상태 레이어 추가이며 다운타임·데이터 손실 가능성 0.
