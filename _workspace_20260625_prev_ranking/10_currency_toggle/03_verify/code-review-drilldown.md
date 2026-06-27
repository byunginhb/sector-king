# 코드 리뷰 — 추적 종목 시총 일자별 드릴다운

리뷰 대상 커밋: `a2d7b0e` (HEAD 머지 후, base `d38a847` 대비)
대상 파일:
- `app/api/statistics/market-cap/route.ts` (신규, 115줄)
- `hooks/use-market-cap-history.ts` (신규, 43줄)
- `components/dashboard/market-cap-detail-modal.tsx` (신규, 230줄)
- `components/dashboard/market-pulse-strip.tsx` (수정)
- `types/index.ts` (수정, 가산적)

검증에 참조한 SoT: `lib/currency.ts`, `lib/region.ts`, `lib/api-helpers.ts`, `lib/format.ts`,
`hooks/use-currency-format.ts`, `app/api/industries/route.ts`(기존 distinct 집계 패턴),
`drizzle/schema.ts`(인덱스/nullable), `components/ui/dialog.tsx`(Radix a11y).

---

## CRITICAL

없음

---

## HIGH

없음

---

## MEDIUM

### M1. `periodChange` 0 나눗셈 미가드 → Infinity/NaN trendColor 영향
`components/dashboard/market-cap-detail-modal.tsx:55-60`
```tsx
const periodChange =
  history.length >= 2
    ? ((history[history.length - 1].marketCapUsd - history[0].marketCapUsd) /
        history[0].marketCapUsd) *   // ← history[0].marketCapUsd === 0 가드 없음
      100
    : 0
const trendColor = periodChange >= 0 ? CHART_POSITIVE : CHART_NEGATIVE
```
- 문제: API의 일자별 합은 `totalByDate.get(date) ?? 0` 이므로 첫 표시일에 해당 거래일 스냅샷이 전무하면(희소 데이터) `marketCapUsd === 0` 이 될 수 있다. 이때 분모 0 → `Infinity`(양수면 `>= 0` true라 색만 잘못 잡힘) 또는 `0/0 = NaN`(`NaN >= 0` false → 무조건 NEGATIVE 색). 차트 자체는 죽지 않으나 추세 색이 오판된다.
- 비교: API의 일자별 `changePct` 는 `prev && prev > 0` 가드가 있어 안전(route.ts:74). 클라 `periodChange` 만 가드 누락.
- 권고: 분모 가드 추가.
```tsx
const first = history[0]?.marketCapUsd ?? 0
const last = history[history.length - 1]?.marketCapUsd ?? 0
const periodChange =
  history.length >= 2 && first > 0 ? ((last - first) / first) * 100 : 0
```

### M2. 윈도우 스냅샷 쿼리에 ticker 술어 부재 → 전 종목 스캔 후 메모리 필터
`app/api/statistics/market-cap/route.ts:62-70`
```ts
const snapshots = await db
  .select({ ticker, date, marketCap })
  .from(dailySnapshots)
  .where(gte(dailySnapshots.date, oldestDate))   // ticker 필터 없음 → 윈도우 내 전 종목 로드
```
- 문제: `tickerSet.has(s.ticker)` 로 메모리에서 거른다. 인덱스가 `idx_snapshots_ticker_date(ticker, date)` 라 date 선행 술어 단독으로는 인덱스 활용이 제한적(풀스캔에 가까운 date 필터). 추적 종목이 전 종목의 대부분이라 실害는 작고, `revalidate=3600` 캐시로 완화되지만 range=120 윈도우에서 불필요 행을 적재한다.
- 비교: 기존 `industries/route.ts` 도 동일하게 윈도우 전체를 메모리 집계하는 패턴이라 신규 코드만의 회귀는 아님(일관성 유지 차원에서 의도된 답습으로 보임).
- 권고(선택): 현 데이터 규모(추적 종목 수백, 99일)에서는 수용 가능. 종목 수가 커지면 `inArray(dailySnapshots.ticker, [...tickerSet])` + `gte(date)` 복합 술어로 인덱스 선행 컬럼을 살리는 것을 고려. 지금은 SoT 패턴 일관성을 우선해 OK.

### M3. 희소 거래일의 부분 합산이 `changePct` 를 왜곡할 수 있음
`app/api/statistics/market-cap/route.ts:56-60, 71-77`
- 문제: 특정 ticker가 어떤 date에 스냅샷이 없으면 그날 합계에서 빠진다(누락=0 가산이 아니라 미가산). 전일 모든 종목 존재 → 당일 일부 누락이면 합계가 급락해 `changePct` 가 과장된 음수로 표시될 수 있다.
- 비교: 기존 `industries/route.ts:252-260` 의 `inner.get(d) ?? 0` 와 동일한 한계로, 데이터 파이프라인이 거래일마다 전 종목을 채운다는 전제에 의존. 신규 회귀 아님.
- 권고(선택): 표시일 기준 "직전 보유 스냅샷 carry-forward" 또는 "당일 스냅샷 보유 종목 수가 기준 미달이면 행 제외"를 향후 데이터 품질 가드로 검토. 현 전제 하에서는 OK.

---

## LOW

### L1. `chartData` 의 X축 label 이 표(`formatDate`)와 다른 포맷 — 의도된 차이지만 혼선 여지
`components/dashboard/market-cap-detail-modal.tsx:62-69` (차트: `toLocaleDateString('ko-KR', {month:'short', day:'numeric'})`)
vs 표 `formatDate`(`YYYY.MM.DD`). 동일 데이터의 두 표기가 달라 사용자 혼선 소지. 권고: 둘 다 `lib/format` 의 포맷터로 통일하거나, 차트 축 압축은 유지하되 Tooltip label 은 전체 날짜로 노출.

### L2. 차트 축/그리드 색상 하드코딩 매직 컬러
`market-cap-detail-modal.tsx:120-148` 의 `#94a3b8`, `#e2e8f0`, `#64748b`, `'white'` 등 리터럴. `lib/chart-colors.ts`(이미 `CHART_POSITIVE/NEGATIVE` 사용 중)에 축/그리드 토큰을 추가해 SoT 화 권고. 다크모드 대응 시에도 유리.

### L3. `new Date(p.date).toLocaleDateString(...)` 타임존 경계
`market-cap-detail-modal.tsx:63` — `'YYYY-MM-DD'` 문자열을 `new Date()` 로 파싱하면 UTC 자정 기준이라 음의 UTC 오프셋 환경에서 하루 밀릴 수 있음. 표의 `formatDate` 도 동일. 권고: 거래일 라벨은 문자열 분해 포맷(`lib/format.toLocalDateString` 역방향) 사용 고려. KST(+9) 환경에선 무해.

### L4. range 토글 상태가 모달 재오픈 후에도 유지
`market-cap-detail-modal.tsx:50` `useState(90)` — 모달을 닫아도 컴포넌트가 언마운트되지 않으면(Radix Portal 조건부 렌더라 보통 언마운트됨) 직전 range가 남는다. 실제로는 `open=false` 시 컨텐츠 언마운트되어 다음 오픈 시 90으로 리셋되므로 무해. 명시적 의도라면 OK.

---

## 중점 점검 항목 확인 결과

1. 통화 정규화: PASS. API가 `toUsd(s.marketCap||0, s.ticker)` 로 USD 정규화(route.ts:58), 응답 필드명 `marketCapUsd` 로 USD 명시. 클라는 `fmt.marketCap(p.marketCapUsd)`(modal 차트/Tooltip/표)만 사용 — raw 재변환 없음. `changePct`(%)·`tickerCount`(무차원)에 통화 변환 미적용 정확. `fmt.marketCap` KRW 경로는 `formatKrw(usd)` 로 USD→₩ 단일 환산이라 이중환산 없음(format.ts:13, 158).
2. 데이터 정확성: PASS. `Set<string>` distinct ticker(route.ts:53-55)로 멀티산업 중복 제거 — 기존 `industries/route.ts:237-241` SoT 패턴 답습 일치. 전일 대비 `prev && prev > 0` 0 나눗셈 가드(route.ts:74). `range+1` 조회 후 `fullHistory.length > 1` 일 때만 `slice(1)`(route.ts:79) — 단일/빈 경계 안전. region 분기: all=키 생략(regionValue=null), kr/global=`innerJoin(companies).where(region=?)` — `industries/route.ts:66-71` 와 동일. `clampIntParam(7~120)` + DB 보유 99일 `limit(range+1)` 자연 클램프(api-helpers.ts:103).
3. React Query: PASS. `queryKey: ['market-cap-history', region, range]` — currency 미포함 정확(표시 전용). `enabled: open` 으로 모달 닫힘 시 fetch 안 함(hook:enabled, modal:enabled=open). region·range만 키. `revalidate=3600` 서버 캐시. (LOW) `staleTime` 미지정 → 모달 재오픈마다 background refetch 가능하나 서버 revalidate 로 완화. 필요 시 `staleTime` 설정 권고.
4. 엣지케이스: 대체로 PASS. 빈 배열 → `'표시할 추이 데이터가 없습니다'` 분기. 단일 포인트 → API `slice` 가드 + 클라 `history.length >= 2` 가드. `changePct === null` → '—' 표기. `[...history].reverse()` 불변성 준수(modal:194). 차트 `domain={['auto','auto']}`. YAxis width KRW=72/USD=56 분기(modal:140). 모달 빠른 여닫이 → Radix Portal 언마운트 + React Query 취소로 race 무해. (MEDIUM M1) `periodChange` 분모 0 가드만 누락.
5. a11y: PASS. 카드 `<button type="button" aria-haspopup="dialog" aria-label={actionLabel} focus-visible:ring>`(strip:289-300). 버튼 내부 인터랙티브 중첩 없음(header+children 모두 비대화형). 모달 에러 `role="alert"`, 로딩 `aria-busy="true"`. 표 th 는 `scope` 미지정(LOW 수준 — 단순 3열 표라 영향 작음, 권고: `scope="col"` 추가). 기간 토글 `role="group" aria-label` + 버튼 `aria-pressed`. Radix Dialog 가 focus trap/Escape/Close 제공.
6. 회귀: PASS. 기존 4 KPI 마크업 무변경 — `KpiCard` 가 `onClick` 없으면 기존 `<div className="sk-card">` 분기 그대로 보존(strip:318-325), `header` 만 공통 추출. types 가산적(`MarketCapHistoryPoint`/`MarketCapHistoryResponse` 신규, 기존 타입 무변경). 모달 값은 strip KPI 와 동일 distinct+toUsd 집계라 정합(strip `marketCapChange`=최근 2일 vs modal `periodChange`=전체 기간 — 의도된 다른 지표, 회귀 아님).
7. 보안/스타일: PASS. SQL 은 Drizzle 파라미터 바인딩(문자열 연결 없음). 에러 응답 generic(`'Failed to fetch market cap history'`) + 서버 `console.error` 상세 로깅. 이모지 0. 불변성 준수(`[...datesDesc].sort()`, `[...history].reverse()`). 파일 크기: route 115줄/hook 43줄/modal 230줄 — 모두 400줄 이하, modal 은 차트+표 단일 책임이라 수용. 에러 처리 try/catch 완비.

---

커밋 판정: OK(이미 머지됨)
