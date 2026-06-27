# 10_currency_toggle 검증 리포트 (sk-verifier · 증거 기반)

> 검증일: 2026-06-14 · 검증자: sk-verifier · 방식: progress 주장 불신, 직접 grep/read/실행
> 기준: integrated-plan.md §5(+D1~D5) · display-inventory.md §1 · state-arch.md §7.2

## 전체 판정: **CONDITIONAL PASS**

빌드(tsc+build) 완전 통과, 기능/아키텍처 수락기준 14항목 전부 PASS.
유일한 조건: **lint exit 1** — 단, 신규 회귀는 `use-currency.tsx` 1건뿐이며 이는 기존
`use-onboarding.ts`/`use-share.ts`와 **동일한 hydration-safe 패턴**에 프로젝트 전역 ESLint
rule(`react-hooks/set-state-in-effect`)이 무는 선재 노이즈. HEAD 자체가 49 errors로 이미 빨강.

| exit code | 명령 | 결과 |
|---|---|---|
| 0 | `pnpm exec tsc --noEmit` | PASS (에러 0) |
| 0 | `pnpm build` | PASS (전 라우트 컴파일, OG 서버렌더 포함) |
| 1 | `pnpm lint` | FAIL — but 신규 회귀 +1건(선재 패턴), HEAD 베이스라인도 exit 1 |

---

## 항목별 판정

### 상태/아키텍처

**1. Currency/DEFAULT_CURRENCY 단일 정의, 기본=KRW — PASS**
```
grep -rn "export type Currency|export const DEFAULT_CURRENCY" lib/ hooks/ components/ app/
→ lib/currency.ts:52: export type Currency = 'KRW' | 'USD'
→ lib/currency.ts:55: export const DEFAULT_CURRENCY: Currency = 'KRW'
```
중복 정의 0건. 단일 SoT. 기본 KRW 확인.

**2. CurrencyProvider 트리 위치 — PASS**
providers.tsx 실측: `QueryClientProvider > ThemeProvider > CurrencyProvider > SearchProvider > OnboardingProvider`.
QueryClient 안 + ThemeProvider 안 + SearchProvider 밖 — state-arch §2.3과 정확히 일치.

**3. 캐시 무영향 (핵심) — PASS**
```
grep -rni "queryKey" hooks/ | grep -i "currency" → NONE
```
통화 의존 쿼리 0개. queryKey에 currency 부재. 통화=표시전용 불변식 충족.

**4. localStorage 키/값 + Provider 밖 DEFAULT 폴백 — PASS**
- 키 `'sector-king-currency'` (use-currency.tsx:38,50). 값 `'KRW'|'USD'`만 (isCurrency 가드).
- `useCurrency()` Provider 밖 호출 시 `{ currency: DEFAULT_CURRENCY, setCurrency: ()=>{}, isHydrated: false }` 반환 — throw 안 함 (use-currency.tsx:84-88).
- 멀티탭 storage 이벤트 동기화 존재 (use-currency.tsx:61-69).

**5. layout.tsx inline script data-currency 선반영 — PASS**
```
app/layout.tsx:137 inline script:
  localStorage.getItem('sector-king-currency') → setAttribute('data-currency', (c==='USD'||c==='KRW')?c:'KRW')
  catch → 'KRW'
```
키/속성/기본값('KRW') 모두 lib/currency.ts 상수와 문자열 일치. `suppressHydrationWarning`(layout.tsx:129) 재사용. 동기화 주석 lib/currency.ts:60-62 존재.

### 포맷 레이어

**6. 4함수만 currency 인자, 통화무관 함수 인자 부재 — PASS**
- currency 인자 보유: formatMarketCap/formatPrice/formatPriceCompact/formatFlowAmount (lib/format.ts).
- 통화무관 함수에 currency 인자 부재:
```
grep "formatPriceChange|formatPercent|formatVolume|formatScore" lib/format.ts | grep currency → NONE
```
오변환 방지 화이트리스트 고정 확인.

**7. KRW 분기 getKrwRate() 단일 SoT (1450 직접 하드코딩 없음) — PASS**
- 주가 KRW: `value * getKrwRate()` → `₩{정수}.toLocaleString()` 원단위 (format.ts:25-26).
- 시총/흐름 KRW: `formatKrw(value)` 조/억/만원 압축 재사용 (format.ts:12,41,176).
- formatKrw 내부: `Math.abs(usdAmount) * getKrwRate()` (format.ts:162).
```
grep -rn "1450" components/ app/ lib/ hooks/ (lib/currency.ts·guide·design-system 제외) → NONE
```
1450은 lib/currency.ts CURRENCY_RATES.KRW 폴백 1곳에만 존재.

**8. 이중환산 방지 — PASS**
포맷 함수 KRW 분기는 전부 formatKrw/getKrwRate 경유. raw native(원/엔) 입력 경로 없음.
입력은 항상 USD(API 응답 = toUsd 후). `*1450` 직접 곱셈 잔존 0. CLAUDE.md 재발 2회 버그 패턴 부재.

### 전수 전환 (누락 점검)

**9. display-inventory §1 ✅ 지점 전수 전환 — PASS**
인벤토리 21개 표시파일 전부 `useCurrencyFormat` 사용 확인 (21/21 OK):
company-badge, company-stats-card, industry-money-flow-card, market-pulse-strip, price-changes-card,
global-search, industry-dashboard, flow-card, flow-summary, flow-river, sector-company-list,
price-change-table, company-ranking-table, category-comparison-chart, top-sectors-growth-chart,
price-chart, sector-trend-section, stock-price-banner, insight-hero, financial-analyst, sector-position.
이중표기 formatKrw 병기 삭제 확인:
```
grep -rn "formatKrw(" components/ app/ → NONE (표시 레이어 호출 0건)
formatKrw 정의는 lib/format.ts:158 1곳 (SoT 유지)
```

**10. 하드코딩 잔존 0 + 로컬 포맷함수 제거 — PASS**
- `$${...toFixed/toLocaleString/1e...}` 통화 하드코딩: 표시 레이어 0건.
- flow-river: 로컬 formatAmount 제거 → useCurrencyFormat (flow-river.tsx:205,258). 단 SVG 코인 파티클 글리프 `$`/`$-`(line 53,98)는 장식용(통화값 아님) 의도적 잔존.
- sector-company-list: 로컬 formatPrice/formatMarketCap 제거 → fmt.price/fmt.marketCap (line 190,211).
- sector-trend-section: 로컬 formatAmount 제거 → fmt.marketCap (line 196).
- price-chart: YAxis tickFormatter + Tooltip 모두 fmt.price (line 66,74), KRW 시 width 64 분기.

**11. 통화무관(%·주·점수·MFI·percentile) 미전환 유지 — PASS**
잔존 `toFixed`는 전부 `%`(등락률/성장률), `점`(score), SVG path 좌표, aria-label 텍스트.
```
grep "(₩|$)...{formatPercent|formatPriceChange|formatVolume|formatScore}" → NONE
```
통화기호 오부착 0건. score-trend-chart(점), valuation-compare(%), sector-position 점유율(%) 무변경.

**12. OG=KRW 고정, JSON-LD=USD 유지 — PASS**
- OG(opengraph-image.tsx:40): `formatMarketCap(summary.marketCapUsd, 'KRW')` 고정 (D2 채택).
- JSON-LD(json-ld.tsx:139): `currency: 'USD'` 무변경 (D3, 기계판독 표준).

### 토글/a11y

**13. currency-toggle.tsx a11y/토큰/이모지 — PASS**
- role="group"(line 90) + 각 버튼 role="radio"(106) + aria-checked(107).
- roving tabindex: `tabIndex={isSelected ? 0 : -1}`(109).
- 화살표 키: ArrowLeft/ArrowRight/Home/End 핸들러(52-81).
- 글리프 aria-hidden="true"(123) + 텍스트 라벨(label/sr-only).
- emerald/rose 미사용 (grep NONE) — 중립 토큰(bg-muted/bg-background/ring-primary).
- 이모지 리터럴 0 (글리프 ₩/$만, 유니코드 이모지 grep NONE).

**14. global-top-bar 데스크탑+모바일 양쪽 배치 — PASS**
- 데스크탑: `<CurrencyToggleConnected />`(line 157) ThemeToggle(158) 왼쪽.
- 모바일 Sheet 도구 섹션(228 "도구"): `<CurrencyToggleConnected />`(234) ThemeToggle(233) 옆.
- 래퍼 CurrencyToggleConnected(255-257)가 useCurrency()로 controlled 연결.

### 빌드

**15. tsc/build/lint exit code — CONDITIONAL**
- `pnpm exec tsc --noEmit`: **exit 0** (에러 0).
- `pnpm build`: **exit 0** (전 라우트 컴파일 성공, /stock/[ticker]/opengraph-image 서버렌더 포함).
- `pnpm lint`: **exit 1** — 분석:
  - HEAD 베이스라인: 59 problems / **49 errors** / 10 warnings (이미 빨강).
  - working tree: 59 problems / **50 errors** / 9 warnings.
  - 순증 = **+1 error**: `hooks/use-currency.tsx:39:28` `react-hooks/set-state-in-effect`.
  - 이 rule은 `setCurrencyState(raw)`(localStorage→state 교정, hydration-safe 패턴)을 무는데,
    **기존** `hooks/use-onboarding.ts:48`(`setState(readState())`), `hooks/use-share.ts:44`도 동일 rule로 이미 에러.
    즉 state-arch §2.2가 명시 처방한 표준 패턴에 대한 프로젝트 전역 ESLint 정책 노이즈이며, 코드 결함 아님.
  - 나머지 49 errors는 전부 HEAD 선재(coverage/block-navigation.js 생성물, __tests__, 무관 컴포넌트 등).

---

## FAIL/누락 목록
- **누락(기능): 0건.**
- **lint 신규 회귀: 1건** — `hooks/use-currency.tsx:39` `react-hooks/set-state-in-effect`.
  - 성격: 기존 use-onboarding/use-share와 동형의 hydration 패턴. 수락기준 "lint 신규 회귀 0"의
    엄격 해석 시 미충족이나, 실질 결함 아님.
  - 권장(선택): 해당 라인에 `// eslint-disable-next-line react-hooks/set-state-in-effect` 부여
    (use-onboarding/use-share도 동일 처리하면 일관) → 이 경우 신규 회귀 0 달성.

## state-arch §7.2 체크리스트 결과
13개 항목 전부 PASS (Currency SoT 단일·기본 KRW·Provider 위치·queryKey currency 부재·
localStorage 키/값·inline script 동기화 주석·USD flash 정책·Provider밖 폴백·OG USD→KRW(D2 변경)·
멀티탭 동기화·불변성 set). 단 OG는 §7.2 기재 "USD 고정"에서 **D2 결정에 따라 KRW 고정으로 변경** — 계획서와 정합.
