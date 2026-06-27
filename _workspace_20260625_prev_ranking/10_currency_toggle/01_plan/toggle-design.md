# 통화 토글 컴포넌트 디자인 + ₩/$ 표기 규칙 표준 (toggle-design)

작성: sk-design-system · 2026-06-14 · 영역: `components/currency-toggle.tsx`(신규), `lib/format.ts`(표기 규칙 SoT), `app/design-system/*`(카탈로그)
선행 컨텍스트: `_workspace/10_currency_toggle/01_plan/_context.md`
자릿수 정합 기준: `_workspace/10_currency_toggle/01_plan/format-layer.md` (이 문서의 표기 규칙은 format-layer §2와 1:1 일치)
실측 선례 코드: `components/region-toggle.tsx`(세그먼트 토글 — role/aria/키보드), `components/theme-toggle.tsx`(아이콘 토글), `components/layout/global-top-bar.tsx`(배치), `app/design-system/page.tsx` + `components/design-system/*`(카탈로그 톤·토큰)

---

## 0. 결론 요약 (TL;DR)

1. **형태: 세그먼트 컨트롤 (₩ | $)** — region-toggle의 세그먼트 패턴을 그대로 재사용. 옵션 2개라 드롭다운보다 1탭 전환이 우수.
2. **레이블: 통화 기호 글리프(₩/$) + 텍스트("원"/"달러") 병기.** lucide 아이콘(`DollarSign`)은 쓰지 않는다 — `₩`에 대응하는 lucide 원화 아이콘이 없어 비대칭이 되고, 통화 기호 글리프가 더 명확. **이모지 절대 금지(글리프는 이모지 아님).**
3. **상태: controlled** — `value`/`onChange`만 받는다(theme-toggle처럼 내부 store 직접 호출 X). state-arch의 `useCurrency()`를 부모(top-bar)가 연결.
4. **표기 규칙 SoT:** USD = `$` + `M/B/T`(소수 2자리, 주가 `$108.77`) / KRW = `₩` + `조·억·만원` 압축(금액) · `₩` + 원단위 정수 콤마(주가 `₩157,716`).
5. **카탈로그:** `components-section.tsx`의 Region Toggle 바로 위에 "Currency Toggle" 서브섹션 추가, foundations에 "통화 표기 규칙" 표 추가.

---

## 1. 통화 토글 컴포넌트 디자인

### 1.1 형태 결정 — 세그먼트 컨트롤 (확정)

| 후보 | 장점 | 단점 | 판정 |
|------|------|------|------|
| **세그먼트 컨트롤 `₩ \| $`** | 옵션 2개라 한눈에 둘 다 보임, 1탭 전환, region-toggle 패턴 재사용(코드·a11y·키보드 공짜), top-bar 좁은 폭에서도 두 글리프만이라 컴팩트 | 옵션 3개 이상 확장 시 폭 부담(현재 2개라 무관) | **채택** |
| 아이콘 드롭다운 | 폭 최소 | 현재값 확인에 1탭 더, 메뉴 오버레이 관리(z-index/포커스 트랩) 비용, 옵션 2개에 과한 UI | 기각 |
| theme식 1버튼 토글(클릭 시 순환) | 가장 좁음 | 현재 통화/다음 통화 모호(₩↔$ 순환이 불명확), region-toggle와 시각 비일관 | 기각 |

→ **region-toggle와 동일한 세그먼트 패턴**을 채택해 시각·상호작용 일관성을 확보한다. theme-toggle은 "켜고 끄는" 이항이라 1버튼이 맞지만, 통화는 "둘 중 택1 표시"라 세그먼트가 멘탈 모델에 맞다.

### 1.2 ASCII — 데스크탑 (size="md", top-bar)

```
                          선택됨(active)        비선택
                          ┌──────────┐
   ┌──────────────────────┼──────────┼──────────────────────┐
   │   bg-muted (track)   │ bg-bg ●  │                       │
   │  ┌────────────────┐  ┌──────────┐  ┌────────────────┐   │
   │  │  ₩  원         │  │  $  달러  │  │                │   │   ← 2-세그먼트
   │  └────────────────┘  └──────────┘                       │
   │  text-muted-fg       text-fg shadow-sm                   │
   └──────────────────────────────────────────────────────────┘
        rounded-lg · p-0.5 · gap-0.5 (region-toggle와 동일 트랙)

   세그먼트 1개 내부:
   ┌─────────────────┐
   │ ₩  원           │   글리프(₩) + 텍스트(원)
   └─────────────────┘
     │   └ <span>원</span>  text-xs sm:text-sm font-medium
     └ <span aria-hidden>₩</span>  num-mono, 글리프 폭 안정 위해 tabular
```

선택 상태(₩ 선택 시):
```
┌──────────────────────────────────┐
│ ┌──────────┐                      │
│ │ ₩  원    │   $  달러            │     ₩=active(bg-background+shadow), $=muted
│ └──────────┘                      │
└──────────────────────────────────┘
```

선택 상태($ 선택 시):
```
┌──────────────────────────────────┐
│              ┌──────────┐         │
│   ₩  원      │ $  달러   │        │     $=active, ₩=muted
│              └──────────┘         │
└──────────────────────────────────┘
```

### 1.3 ASCII — 모바일 (Sheet "도구" 섹션 내, size="md" 그대로)

top-bar 모바일은 햄버거 → Sheet 패널이므로 토글은 Sheet "도구" 섹션에 들어간다(ThemeToggle 옆). 폭 여유가 있어 데스크탑과 동일 사이즈 사용.

```
┌─ Sheet: 메뉴 ─────────────────────┐
│ 도구                              │
│ ┌────────────────────────────┐   │
│ │ [검색] [도움말] [공유] [☾]  │   │   ← 기존 도구들
│ │ ┌──────────┬──────────┐     │   │
│ │ │ ₩  원    │ $  달러   │    │   │   ← 통화 토글 추가
│ │ └──────────┴──────────┘     │   │
│ └────────────────────────────┘   │
│ 표시 통화                          │   ← (선택) 작은 라벨 병기 가능
└────────────────────────────────────┘
```

초협소 폭 대비(옵션): 텍스트 라벨을 `hidden sm:inline`으로 숨겨 글리프만(`₩` / `$`) 노출 가능 — 단 sr-only 라벨은 항상 유지(§3). 기본은 텍스트 병기 노출 권장.

### 1.4 사이즈 토큰 (region-toggle와 동일 스케일)

| size | 세그먼트 버튼 | 글리프/텍스트 | 용도 |
|------|--------------|--------------|------|
| `md`(기본) | `px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm` | `text-xs sm:text-sm` | top-bar, Sheet 도구, 일반 |
| `sm` | `px-2 py-1 text-xs` | `text-xs` | 카드 내부 등 협소 영역(현재 미사용, 확장 대비) |

→ **기간 필터 버튼 표준**(`px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm`)과 동일 → 프로젝트 전체 컨트롤 톤 일관.

### 1.5 토큰 매핑 (region-toggle 1:1 + 디자인 시스템 토큰)

| 요소 | 클래스 | 토큰 근거 |
|------|--------|----------|
| 트랙(컨테이너) | `inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5` | `--muted` 배경 + `rounded-lg`(12px). region-toggle와 동일 |
| 세그먼트 공통 | `inline-flex items-center gap-1 rounded-md font-medium transition` | `rounded-md`(10px) |
| active 세그먼트 | `bg-background text-foreground shadow-sm` | `--background` 위로 떠오름 + 미세 그림자 |
| 비active 세그먼트 | `text-muted-foreground hover:text-foreground` | `--muted-foreground` |
| 포커스 링 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background` | single amber(`--primary`) — 디자인 시스템 시그널 색 |
| 글리프(₩/$) | `num-mono` + `tabular-nums` | 통화 기호는 등폭 숫자 톤. ₩↔$ 전환 시 폭 점프 방지 |

> **주의:** 색상은 emerald/rose 같은 **상태색을 쓰지 않는다.** 통화 선택은 "상승/하락"이 아니라 중립 선택이므로 muted/foreground 중립 토큰만 사용. (region-toggle와 동일 철학.)

### 1.6 컴포넌트 시그니처 (구현 계약 — sk-implementer 인계)

```typescript
// components/currency-toggle.tsx  ('use client')
import type { Currency } from '@/lib/currency'   // format-layer §1.3 SoT 공유

export interface CurrencyToggleProps {
  value: Currency                       // 'KRW' | 'USD'
  onChange: (next: Currency) => void    // controlled
  className?: string
  size?: 'sm' | 'md'                    // 기본 'md'
  /** 텍스트 라벨 숨기고 글리프만 (초협소 영역). 기본 false */
  glyphOnly?: boolean
  /** a11y 그룹 라벨. 기본 '표시 통화 선택' */
  ariaLabel?: string
}

const OPTIONS = [
  { value: 'KRW', glyph: '₩', label: '원',   ariaLabel: '원화(₩)로 표시' },
  { value: 'USD', glyph: '$', label: '달러', ariaLabel: '달러($)로 표시' },
] as const
```

- **controlled 전용.** theme-toggle은 `useTheme()`를 직접 잡지만, currency-toggle은 region-toggle처럼 controlled로 두어 카탈로그(데모)·테스트·SSR 제어가 쉽다. 전역 연결은 top-bar 래퍼가 `useCurrency()`로 수행.
- 키보드/role/aria는 region-toggle 구조를 그대로 복제(§3). 옵션 배열만 2개로 축소.
- 글리프는 `aria-hidden`(스크린리더는 텍스트 라벨/ariaLabel만 읽음).

### 1.7 top-bar 연결 래퍼 (배치 — ui-planner와 합의 영역)

```typescript
// 데스크탑 액션군: ThemeToggle 왼쪽(또는 오른쪽)에 인접
// global-top-bar.tsx 데스크탑 155행 부근:
//   ... <SearchTrigger /> {pageId && <HelpButton/>} <CurrencyToggleConnected /> <ThemeToggle /> <AuthButtonClient />
// 모바일 Sheet "도구" 섹션 230행 부근: <ThemeToggle /> 뒤에 <CurrencyToggleConnected />

function CurrencyToggleConnected() {
  const { currency, setCurrency } = useCurrency()  // state-arch 제공
  return <CurrencyToggle value={currency} onChange={setCurrency} />
}
```

- 정확한 좌/우 위치와 모바일 "표시" 섹션 분리 여부는 **ui-planner(display-inventory)가 최종 결정.** 디자인 관점 권장: 데스크탑은 ThemeToggle **왼쪽**(테마=환경 설정, 통화=데이터 표시 설정이라 데이터 컨트롤군에 가깝게), 모바일 Sheet는 별도 "표시" 섹션 또는 "도구" 섹션 상단.

---

## 2. ₩/$ 표기 규칙 표준 (표기 일관성 SoT)

> 이 규칙은 format-layer §2와 **1:1 일치**한다. 둘 중 하나라도 바뀌면 양 문서를 동시 갱신한다. 입력은 **항상 USD**(API가 USD로 통일) — 포맷 함수가 native 원/엔을 직접 받는 일은 없다(이중환산 버그 방지, CLAUDE.md 재발 2회).

### 2.1 통화별 단위 체계 (전체 대조표)

| 카테고리 | USD 체계 | KRW 체계 | 함수 |
|----------|----------|----------|------|
| **시가총액·집계금액** | `$` + `T/B/M` 압축(소수 2) | `₩`계열 `조·억·만원` 압축 | `formatMarketCap` |
| **자금흐름액** | `$` + `T/B/M` 압축(소수 1) | `조·억·만원` 압축(절댓값, 부호는 호출부) | `formatFlowAmount` |
| **주가(단가)** | `$` + 소수 2 정밀 (`$108.77`) | `₩` + 원단위 정수 콤마 (`₩157,716`) | `formatPrice` |
| **짧은 주가(좁은 셀)** | `$M/K` 압축 | `억·만원` 압축 | `formatPriceCompact` |

핵심 철학(USD·KRW 공통): **집계 금액 = 압축 단위 / 단가 = 정밀 표기.** 토글은 이 철학을 양 통화에 동일하게 적용.

### 2.2 시가총액 표기 예시 표 (formatMarketCap)

| USD 입력 | USD 출력 | KRW 출력(×1450 기준) | 비고 |
|----------|----------|----------------------|------|
| 4,213,000,000,000 | `$4.21T` | `6109.0조원` | ≥1e12 USD → 조원, 소수 1 |
| 1,820,000,000,000 | `$1.82T` | `2639.0조원` | |
| 76,400,000,000 | `$76.40B` | `111조원` | ≥1e9 USD, KRW는 1e8=억 경계라 조원 진입 |
| 1,820,000,000 | `$1.82B` | `3조원` | (1.82B×1450=2.6조) |
| 834,000,000 | `$834.00M` | `1조원` | (834M×1450=1.21조) |
| 12,100,000 | `$12.10M` | `175억원` | ≥1e6 USD → 억원, 정수 |
| 540,000 | `$540,000` | `8억원` | USD 압축 경계 미만 → 콤마 |

> KRW 반올림: 조원=소수 1자리, 억원/만원=정수(`Math.round`). USD: T/B/M=소수 2자리.

### 2.3 자금흐름액 표기 예시 표 (formatFlowAmount)

| USD 입력(절댓값) | USD 출력 | KRW 출력 | 부호 표기 |
|------------------|----------|----------|----------|
| +1,500,000,000,000 | `$1.5T` | `2175.0조원` | 호출부가 `+`/유입색 부여 |
| −76,400,000,000 | `$76.4B` | `111조원` | 호출부가 `−`/유출색 부여 |
| +12,100,000 | `$12.1M` | `175억원` | |

> **음수 부호 위치 규칙(자금흐름):** 포맷 함수는 **절댓값**만 반환한다(USD·KRW 동일). 부호(`+`/`−`)와 상태색(유입=success / 유출=danger)은 **호출부**가 글리프 앞에 붙인다(flow-river 패턴). 즉 표기는 `−₩111조원` / `+$76.4B` 형태로, **부호 → 통화기호 → 숫자 → 단위** 순서. 통화기호 안쪽이 아니라 부호가 최외곽.
> - 올바름: `−₩111조원`, `+$76.4B`
> - 금지: `₩−111조원`, `$+76.4B` (부호가 기호 뒤로 들어가면 안 됨)

### 2.4 주가 표기 예시 표 (formatPrice)

| USD 입력 | USD 출력 | KRW 출력(×1450) | 비고 |
|----------|----------|------------------|------|
| 108.77 | `$108.77` | `₩157,716` | 원단위 정수 + 천단위 콤마 |
| 1,234.50 | `$1,234.50` | `₩1,790,025` | |
| 0.83 | `$0.83` | `₩1,204` | |
| 54,000원 종목(=$37.24) | `$37.24` | `₩54,000` | 입력은 USD이지만 KRW 환산 시 원래 원 단위로 복원 |

> **왜 주가는 `만원` 압축을 안 쓰나:** 한국 주가는 멘탈 모델이 "원 단위 정수"(삼성전자 ₩54,000). `₩157,716`을 `16만원`으로 압축하면 -2,284원 손실 → 매매 단가로 부적절. 시총/흐름(집계)만 압축, 주가(단가)는 정밀. (format-layer §2.1과 동일 결정.)

### 2.5 짧은 주가 표기 예시 표 (formatPriceCompact — 모바일 리스트)

| USD 입력 | USD 출력 | KRW 출력 | 비고 |
|----------|----------|----------|------|
| 1,820,000 | `$1.82M` | `26억원` | 좁은 셀 압축 |
| 834,000 | `$834K` | `12억원` | |
| 108.77 | `$108.77` | `15만원` | compact는 주가도 만원 압축(좁은 셀 우선) |

> compact는 "좁은 셀에서 자릿수 절약"이 목적이라 KRW도 `formatKrw`(억/만원) 압축을 쓴다. 정밀 단가가 필요한 곳(주가 배너 등)은 `formatPrice`를 쓸 것. **셀 폭 우선 vs 단가 정밀, 컴포넌트가 함수 선택으로 명시.**

### 2.6 통화 무관 항목 (토글 영향 0 — 디자인 가이드 명시)

아래 항목은 **토글과 무관하며 항상 동일하게 표기**한다. 통화 토글을 ₩↔$ 바꿔도 변하지 않음을 카탈로그·가이드에 명시(사용자 혼란 방지).

| 항목 | 표기 | 함수 | 이유 |
|------|------|------|------|
| 등락률 | `+1.23%` / `−1.08%` | `formatPriceChange`, `formatPercent` | 비율(%) — 통화 무관 |
| 거래량 | `1.2M`(주) | `formatVolume` | 주 수 — 무차원 |
| 점수 | `7.3/10` | `formatScore` | 점수 — 무차원 |
| 비율 지표 | PER/PEG/ROE/β/D&E | — | 무차원 |

> 디자인 규칙: 통화 무관 숫자는 통화 토글 영향권 밖이므로 **통화 기호(₩/$)를 절대 붙이지 않는다.** `%`·`주`·`점`·배수(`x`) 단위만.

### 2.7 글리프·자간 디자인 규칙

- **통화 기호와 숫자는 모두 `num-mono`/`tabular-nums`**로 렌더 → ₩↔$ 토글 시 폭 점프 최소화(레이아웃 시프트 방지).
- 통화 기호와 숫자 사이 **공백 없음**: `$108.77`, `₩157,716`(붙임). 단위(`조원`/`억원`)는 숫자에 붙임: `2639.0조원`.
- 부호는 최외곽(§2.3): `−₩111조원`.
- N/A 표기는 통화 무관 동일: `N/A`(통화 기호 없음).

---

## 3. 접근성 (a11y)

region-toggle의 검증된 a11y 구조를 그대로 계승한다.

### 3.1 ARIA 구조

```
<div role="group" aria-label="표시 통화 선택">          ← 그룹 라벨(한국어)
  <button role="radio" aria-checked={KRW?}             ← 라디오 시맨틱
          aria-label="원화(₩)로 표시"                   ← 텍스트 라벨(기호만 아님)
          tabIndex={선택됨 ? 0 : -1}>                   ← roving tabindex
    <span aria-hidden>₩</span><span>원</span>
  </button>
  <button role="radio" aria-checked={USD?}
          aria-label="달러($)로 표시" tabIndex=...>
    <span aria-hidden>$</span><span>달러</span>
  </button>
</div>
```

### 3.2 규칙 체크리스트

- [x] 컨테이너 `role="group"` + `aria-label="표시 통화 선택"` (한국어, _context 요구).
- [x] 각 옵션 `role="radio"` + `aria-checked` (선택 상태를 보조기술에 전달).
- [x] 각 옵션 `aria-label`로 **기호만이 아닌 의미 텍스트** 병기("원화(₩)로 표시" / "달러($)로 표시"). 글리프 `aria-hidden`.
- [x] **키보드 네비게이션**: `ArrowLeft`/`ArrowRight`로 순환 이동, `Home`/`End`로 양끝. region-toggle `handleKeyDown` 로직 그대로(옵션 2개로 축소).
- [x] **roving tabindex**: 선택된 옵션만 `tabIndex=0`, 나머지 `-1` → Tab으로 그룹 진입 시 현재값에 포커스.
- [x] 포커스 가시성: `focus-visible:ring-2 ring-primary ring-offset-2` (amber, 디자인 시스템 시그널).
- [x] 시각 라벨(텍스트 "원"/"달러")이 글리프와 항상 병기 → 색각/저시력 사용자도 통화 식별 가능. `glyphOnly` 모드에서도 sr-only 텍스트는 유지.
- [x] 상태색에 의존하지 않음(active는 배경+그림자+굵기로 구분, 색만으로 구분 X) → WCAG 1.4.1.

### 3.3 region-toggle 대비 차이

| 항목 | region-toggle | currency-toggle |
|------|---------------|-----------------|
| 옵션 수 | 3 (all/kr/global) | 2 (KRW/USD) |
| 아이콘 | lucide(Globe2/Flag/DollarSign) | **글리프(₩/$)** — lucide 미사용 |
| counts 배지 | 있음 | 없음(통화는 카운트 무의미) |
| disabledOptions | 있음 | 불필요(두 통화 항상 가능) |
| 그룹 aria-label | 'Region 필터' | '표시 통화 선택' |

→ 키보드·role·tabindex·focus 로직은 **동일 코드 패턴 재사용**, 옵션 데이터와 글리프 렌더만 차이.

---

## 4. /design-system 카탈로그 반영

### 4.1 Components 섹션 — "Currency Toggle" 서브섹션 추가

위치: `components/design-system/components-section.tsx`의 **Region Toggle 서브섹션(139~151행) 바로 위**에 삽입(두 세그먼트 토글을 나란히 배치 → 패턴 일관성 시각화).

```tsx
{/* Currency toggle */}
<DsSubsection title="Currency Toggle" hint="원(₩) / 달러($)">
  <div className="border border-border-subtle bg-surface-1 p-5 flex flex-wrap items-center gap-4">
    <CurrencyToggle value={currency} onChange={setCurrency} />
    <span className="text-xs text-muted-foreground">
      현재 선택: <span className="font-mono text-foreground">{currency}</span>
    </span>
  </div>
  <CodeBlock
    label="사용 예 (controlled)"
    code={`import { CurrencyToggle } from '@/components/currency-toggle'

// 전역 연결은 top-bar 래퍼가 useCurrency()로:
const { currency, setCurrency } = useCurrency()
<CurrencyToggle value={currency} onChange={setCurrency} />`}
  />
</DsSubsection>
```

- `components-section.tsx` 상단에 `const [currency, setCurrency] = useState<Currency>('KRW')` 추가(기존 `region` state 패턴과 동일, 데모용 로컬 상태).
- import: `import { CurrencyToggle } from '@/components/currency-toggle'`, `import type { Currency } from '@/lib/currency'`.

### 4.2 Foundations 섹션 — "통화 표기 규칙" 서브섹션 추가

`components/design-system/foundations-section.tsx` 하단에 표기 규칙 표(§2.2~2.6 요약)를 추가. 라이브 예시로 `formatMarketCap`/`formatPrice`를 두 통화로 나란히 렌더:

```
시가총액  | USD: $4.21T   | KRW: 6109.0조원
주가      | USD: $108.77  | KRW: ₩157,716
자금흐름  | USD: +$76.4B  | KRW: +111조원
등락률    | (통화 무관) +1.82%
거래량    | (통화 무관) 1.2M
```

- 통화 무관 행은 "토글 영향 없음" 배지(muted)로 시각 구분 → 디자인 의도(§2.6) 전달.

### 4.3 카탈로그 동기화 원칙

- currency-toggle 시그니처/토큰 변경 시 §4.1 예시 코드 즉시 갱신(Living styleguide).
- 표기 규칙(§2) 변경 시 §4.2 표 + format-layer §2 동시 갱신.

---

## 5. 다른 영역 의존 (계약)

| 영역 | 산출물 | 이 문서와의 계약 |
|------|--------|------------------|
| **format-layer** (sk-data-modeler) | `01_plan/format-layer.md` | 자릿수·단위 규칙 §2 ↔ format-layer §2 **1:1 일치 필수.** `Currency` 타입/`DEFAULT_CURRENCY='KRW'`는 `lib/currency.ts` SoT 공유. USD=`$`+M/B/T(소수2)/주가 소수2, KRW=`₩`+조/억/만원(금액)·`₩`+원단위정수(주가). |
| **state-arch** (sk-filter-architect) | `01_plan/state-arch.md` | `useCurrency(): { currency, setCurrency }` Context 제공. currency-toggle은 이를 **직접 호출하지 않고** controlled prop으로 받음. top-bar 래퍼(§1.7)가 연결. 기본 KRW, localStorage 영속. |
| **ui-planner** (sk-ui-planner) | `01_plan/display-inventory.md` | 토글 **배치 최종 결정**(top-bar 데스크탑 위치/모바일 Sheet 섹션). 이중표기(`$ (₩)`) 2곳 단일화 여부 결정 — 단일화 시 통화 1개만 노출(이 토글의 전제). 어느 컴포넌트가 `formatPrice` vs `formatPriceCompact`를 쓰는지 매핑. |
| **sk-implementer** | 코드 | `components/currency-toggle.tsx` 구현(§1.6 시그니처), top-bar 연결(§1.7), 카탈로그 반영(§4). |

---

## 6. 구현 인계 체크리스트 (sk-implementer)

- [ ] `components/currency-toggle.tsx` 신규 — region-toggle 구조 복제 + 옵션 2개(₩/$) + 글리프 렌더(§1.6).
- [ ] 토큰: `bg-muted` 트랙, active=`bg-background text-foreground shadow-sm`, focus=`ring-primary`(§1.5). emerald/rose 상태색 금지.
- [ ] a11y: `role="group"` + `aria-label="표시 통화 선택"`, 옵션 `role="radio"`/`aria-checked`/`aria-label`, roving tabindex, 화살표 키(§3).
- [ ] 글리프 `aria-hidden`, 텍스트 라벨("원"/"달러") 병기. `glyphOnly` prop으로 초협소 대응(sr-only 유지).
- [ ] top-bar 연결 래퍼(§1.7) — 데스크탑 ThemeToggle 인접, 모바일 Sheet 도구/표시 섹션(ui-planner 최종 위치 확인).
- [ ] 카탈로그: `components-section.tsx` Currency Toggle 서브섹션(§4.1) + `foundations-section.tsx` 표기 규칙 표(§4.2).
- [ ] 표기 규칙 §2가 format-layer §2와 일치하는지 최종 대조(자릿수·부호 위치).

---

## 7. 안티패턴 (하지 말 것)

- ✗ lucide `DollarSign` 등 아이콘으로 통화 표시 → `₩` 대응 아이콘 부재로 비대칭. 통화 기호 글리프 사용.
- ✗ 이모지(💵/💰/🇰🇷/🇺🇸) 사용 → **절대 금지**(글로벌 + 프로젝트 정책).
- ✗ active 상태를 색(emerald/rose)만으로 표시 → 통화는 중립 선택. 배경+그림자로 구분(WCAG 1.4.1).
- ✗ 부호를 통화기호 뒤에 배치(`₩−111조원`) → 부호는 최외곽(`−₩111조원`).
- ✗ 통화 무관 항목(%·주·점수)에 ₩/$ 부착 → 토글 영향권 밖.
- ✗ 주가를 `만원` 압축(`16만원`) → 단가 정밀도 손실. 주가는 원단위 정수(`₩157,716`).
- ✗ 포맷 함수에 raw 원/엔 입력 → 이중환산 버그. 입력은 항상 USD.
- ✗ 토글을 uncontrolled로 store 직접 호출 → controlled 유지(테스트·카탈로그·SSR 제어성).
```