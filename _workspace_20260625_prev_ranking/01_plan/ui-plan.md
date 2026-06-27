# Region Toggle UI Plan (전체 / 국내 / 해외)

> Author: `sk-ui-planner`
> Scope: 산업 대시보드 + 5개 페이지 (`hegemony-map`, `money-flow`, `price-changes`, `statistics`, 산업 대시보드 카드들)
> Last updated: 2026-05-09

---

## 0. 요약 (TL;DR)

- 신규 공용 컴포넌트 `<RegionToggle />` 도입 — 세그먼트 컨트롤 형태 `[전체] [국내] [해외]`
- 위치: 페이지 헤더 우측, 기간 필터(period) 옆 (반응형 표준 패턴 적용)
- 상태 동기화: URL 쿼리 `?region=all|kr|global` (default `all`) ↔ React Query queryKey ↔ API 파라미터
- 데이터 분기: 종목 ticker suffix(`.KS`, `.KQ`)로 국내/해외 구분 (`lib/industry.ts`의 region 필터 추가)
- 빈 상태: 페이지별 정책 다름 — 카드 단위는 "회색 비활성 + 안내문", 리스트/테이블은 "빈 상태 메시지", 패권 지도는 카테고리 단위 숨김 허용
- a11y: `role="group"`, `aria-pressed`, 화살표 키 좌우 탐색 지원

---

## 1. 컴포넌트 영향도 매트릭스

변경 유형 범례:
- **P** = prop 추가 (`region?: Region`)
- **U** = UI 추가/변경 (토글 노출, 빈 상태 추가)
- **L** = 로직 변경 (필터링, queryKey, API 호출)
- **N** = 변경 없음

| 파일 / 컴포넌트 | P | U | L | 비고 |
|---|---|---|---|---|
| **공통** | | | | |
| `components/region-toggle.tsx` (신규) | - | U | L | 신규 공용 컴포넌트 |
| `lib/use-region.ts` (신규 훅) | - | - | L | URL ↔ state 동기화 |
| `lib/industry.ts` | - | - | L | `getIndustryFilter`에 `region` 인자 추가 |
| `types/index.ts` | - | - | L | `Region = 'all' \| 'kr' \| 'global'` 타입 추가 |
| **산업 대시보드 (`/`)** | | | | |
| `app/page.tsx` | N | N | N | 컨테이너만, 변경 없음 |
| `components/industry-dashboard.tsx` | - | U | L | 헤더 우측에 `<RegionToggle />` 추가, `useIndustries({region})` |
| `components/dashboard/industry-money-flow-card.tsx` | P | U | L | `region` prop 수신, 빈 상태 처리(국내 데이터 없는 산업) |
| `components/dashboard/company-stats-card.tsx` | P | U | L | `region` prop 수신, 데이터 없을 시 안내문 |
| `components/dashboard/price-changes-card.tsx` | P | U | L | `region` prop 수신, 데이터 없을 시 안내문 |
| **패권 지도 (`/[industryId]`)** | | | | |
| `app/[industryId]/page.tsx` | N | N | N | 컨테이너만 |
| `components/hegemony-map.tsx` | - | U | L | 헤더 우측에 `<RegionToggle />` 추가, `useMapData({region})` |
| `components/category-card.tsx` | P | U | L | sectors 빈 카테고리 숨김(opt-in prop) |
| `components/sector-card.tsx` | P | U | L | companies 빈 섹터는 비활성화(흐리게) |
| `components/company-statistics.tsx` | P | U | L | sectorCompanies 필터 적용 + 빈 상태 |
| `components/price-change-card.tsx` | P | U | L | region prop 전달 |
| **자금 흐름 (`/[industryId]/money-flow`)** | | | | |
| `components/money-flow/money-flow-page-content.tsx` | - | U | L | 헤더에 `<RegionToggle />` 추가, `useMoneyFlow({region})` |
| `components/money-flow/flow-card.tsx` | N | N | N | 데이터만 변경, prop 불필요 |
| `components/money-flow/flow-summary.tsx` | N | N | N | 데이터만 변경 |
| `components/money-flow/sector-company-list.tsx` | P | U | L | 종목 리스트에 region 필터링 + 빈 상태 |
| `components/sector-trend/sector-trend-section.tsx` | P | - | L | queryKey에 region 포함 |
| **등락율 (`/[industryId]/price-changes`)** | | | | |
| `components/price-changes/price-changes-page-content.tsx` | - | U | L | 헤더에 `<RegionToggle />` 추가, `usePriceChanges({region})` |
| `components/price-changes/price-change-table.tsx` | P | U | - | 빈 상태 메시지 추가 |
| `components/price-changes/price-change-chart.tsx` | P | - | L | 데이터 변경만 |
| **통계 (`/[industryId]/statistics`)** | | | | |
| `components/statistics/statistics-page.tsx` | - | U | L | 헤더에 `<RegionToggle />` 추가, 4개 hook 모두 `region` 전달 |
| `components/statistics/category-comparison-chart.tsx` | P | U | L | 빈 카테고리 숨김 + 안내 |
| `components/statistics/sector-trend-chart.tsx` | P | - | L | 데이터 변경 |
| `components/statistics/top-sectors-growth-chart.tsx` | P | U | L | 빈 상태 |
| `components/statistics/company-ranking-table.tsx` | P | U | - | 빈 상태 메시지 |
| **API 라우트** | | | | |
| `app/api/industries/route.ts` | - | - | L | `?region=` 수신 |
| `app/api/map/route.ts` | - | - | L | `?region=` 수신 |
| `app/api/money-flow/route.ts` | - | - | L | `?region=` 수신 |
| `app/api/price-changes/route.ts` | - | - | L | `?region=` 수신 |
| `app/api/statistics/**/route.ts` | - | - | L | `?region=` 수신 |
| `app/api/industry-money-flow/route.ts` | - | - | L | `?region=` 수신 |

**총 영향:**
- 신규 파일: 2개 (`components/region-toggle.tsx`, `hooks/use-region.ts`)
- prop 추가: 약 16개 컴포넌트
- 로직 변경: 약 22개 파일 (API 라우트 6 + hooks ~7 + 컴포넌트 ~9)
- UI 변경: 약 13개 컴포넌트 (헤더 5 + 빈 상태 ~8)

---

## 2. 공용 컴포넌트 인터페이스 제안

### 2.1 `<RegionToggle />`

```typescript
// components/region-toggle.tsx
import { Globe2, Flag, Earth } from 'lucide-react'

export type Region = 'all' | 'kr' | 'global'

export interface RegionToggleProps {
  /** 현재 선택된 region */
  value: Region
  /** 변경 콜백 (controlled) */
  onChange: (next: Region) => void
  /** 추가 클래스명 */
  className?: string
  /** 작은 크기 (대시보드 카드 등 작은 영역용) */
  size?: 'sm' | 'md'
  /** 옵션별 비활성화 (특정 region에 데이터 없음을 알릴 때) */
  disabledOptions?: Region[]
  /** a11y label - 그룹 설명 */
  ariaLabel?: string
  /** 데이터 카운트(선택) — 옵션 옆 작은 숫자로 표시 */
  counts?: Partial<Record<Region, number>>
}

export function RegionToggle(props: RegionToggleProps): JSX.Element
```

**옵션 라벨/아이콘 매핑:**

| Region | 한글 라벨 | lucide 아이콘 | aria-label |
|---|---|---|---|
| `all` | 전체 | `Globe2` | "전체 region" |
| `kr` | 국내 | `Flag` | "국내 종목만 보기" |
| `global` | 해외 | `Earth` | "해외 종목만 보기" |

**스타일 (Tailwind):**

```tsx
<div role="group" aria-label={ariaLabel ?? 'Region 필터'}
     className="inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
  {/* 각 버튼 */}
  <button
    type="button"
    role="radio"
    aria-checked={value === r}
    aria-pressed={value === r}
    disabled={disabledOptions?.includes(r)}
    onClick={() => onChange(r)}
    className={cn(
      'inline-flex items-center gap-1 rounded-md font-medium transition',
      // 반응형 패턴 (기간 필터와 동일):
      'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm',
      value === r
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground',
      disabledOptions?.includes(r) && 'opacity-40 cursor-not-allowed'
    )}
  >
    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
    <span>{label}</span>
    {counts?.[r] != null && (
      <span className="ml-0.5 text-[10px] tabular-nums opacity-70">
        {counts[r]}
      </span>
    )}
  </button>
</div>
```

### 2.2 `useRegion()` 훅

```typescript
// hooks/use-region.ts
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { Region } from '@/types'

const VALID: Region[] = ['all', 'kr', 'global']

export function useRegion(): {
  region: Region
  setRegion: (next: Region) => void
} {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const region = useMemo<Region>(() => {
    const raw = params.get('region')
    return VALID.includes(raw as Region) ? (raw as Region) : 'all'
  }, [params])

  const setRegion = useCallback(
    (next: Region) => {
      const sp = new URLSearchParams(params.toString())
      if (next === 'all') sp.delete('region')
      else sp.set('region', next)
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router]
  )

  return { region, setRegion }
}
```

### 2.3 타입 추가 (`types/index.ts`)

```typescript
export type Region = 'all' | 'kr' | 'global'

// 기존 hook 옵션 타입에 region 추가
export interface CommonQueryOptions {
  industryId?: string
  region?: Region   // 신규
}
```

---

## 3. 페이지별 토글 위치 와이어프레임

### 3.1 산업 대시보드 (`/`)

#### Desktop (≥ sm)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [LOGO]  Sector King              [업데이트시각] [전체|국내|해외] [Share][Search][?][Theme] │
│         산업별 투자 패권 지도                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ [반도체]  [AI 인프라]  [클라우드]                                              │
│ [헬스케어]  [에너지]  [금융]                                                   │
│                                                                              │
│ [산업별 자금 흐름 카드 — 빈 region일 때 안내]                                  │
│ [기업 통계]   [등락율]                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Mobile (< sm)

```
┌─────────────────────────────────────────┐
│ [LOGO]  Sector King                     │
│         산업별 투자 패권 지도            │
│                                         │
│ [업데이트시각]                           │
│ [전체|국내|해외]   [Share][?][Search][T] │
├─────────────────────────────────────────┤
│ [반도체 카드 — 1열]                       │
│ [AI 인프라 카드]                          │
│ ...                                     │
└─────────────────────────────────────────┘
```

### 3.2 패권 지도 (`/[industryId]`)

#### Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [LOGO]  Sector King   |   [전체][자금흐름][등락율]  [전체|국내|해외]  [Share][?][Theme][날짜] │
│         반도체 투자 패권 지도                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─ 카테고리 ─┐  ┌─ 카테고리 ─┐  ┌─ 카테고리 ─┐                                  │
│ │ [섹터][섹터]│  │ ...        │  │ ...        │     [기업 통계]               │
│ │ 빈 섹터: dim│  │            │  │            │     [등락율 카드]              │
│ └───────────┘  └───────────┘  └───────────┘                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Mobile

```
┌─────────────────────────────────────────┐
│ [LOGO] Sector King                      │
│        반도체 투자 패권 지도             │
│                                         │
│ [전체][자금][등락율]                     │
│ [전체|국내|해외]   [Share][?][T][날짜]   │
├─────────────────────────────────────────┤
│ [Tabs: 카테고리 가로 스크롤]              │
│   [선택된 카테고리 카드]                  │
│ ...                                     │
│ [기업 통계 / 등락율 (모바일 하단)]         │
└─────────────────────────────────────────┘
```

### 3.3 자금 흐름 (`/[industryId]/money-flow`)

#### Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [←] 반도체 섹터 자금 흐름                                                       │
│     2026-04-15 ~ 2026-04-29                                                  │
│                       [1일][3일][7일][14일][30일]  [전체|국내|해외]  [Share][?][Search] │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Flow Summary - region별 합계]                                                 │
│ [↑ 유입 흐름 카드들]    [↓ 유출 흐름 카드들]                                    │
│   (region=kr면 국내만 표시)                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Mobile

```
┌─────────────────────────────────────────┐
│ [←]  반도체 자금 흐름                    │
│      2026-04-15 ~ 2026-04-29            │
│                                         │
│ [1일][3일][7일][14일][30일]              │
│ [전체|국내|해외]    [Share][?][Search]   │
├─────────────────────────────────────────┤
│ [Summary]                               │
│ [Inflow Cards 세로]                     │
│ [Outflow Cards 세로]                    │
└─────────────────────────────────────────┘
```

### 3.4 등락율 (`/[industryId]/price-changes`)

#### Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [←] 반도체 등락율                                                              │
│     종목별 가격 변화                                                            │
│                       [정렬: 등락률|이름|시총]  [전체|국내|해외]  [Share][?][Search] │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Chart: top 20 trend]                                                         │
│ [Table: ticker | 이름 | 등락률 | 시총]                                         │
│   region=kr면 .KS/.KQ 종목만 표시                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Mobile

```
┌─────────────────────────────────────────┐
│ [←] 반도체 등락율                        │
│                                         │
│ [등락률][이름][시총]                     │
│ [전체|국내|해외]    [Share][?][Search]   │
├─────────────────────────────────────────┤
│ [차트 — 가로 스크롤]                      │
│ [테이블 — 가로 스크롤 or 카드뷰]          │
└─────────────────────────────────────────┘
```

### 3.5 통계 (`/[industryId]/statistics`)

#### Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [←] 반도체 통계                                                                │
│     섹터·카테고리·기업 트렌드                                                   │
│                          [7일][30일][전체]  [전체|국내|해외]  [Share][?][Search] │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Sector Trend]              [Category Comparison]                              │
│ [Top Sectors Growth]        [Company Ranking Table]                           │
│   - 빈 카테고리는 차트에서 숨김 + 하단 안내                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Mobile

```
┌─────────────────────────────────────────┐
│ [←] 반도체 통계                          │
│                                         │
│ [7일][30일][전체]                        │
│ [전체|국내|해외]    [Share][?][Search]   │
├─────────────────────────────────────────┤
│ [Sector Trend]                          │
│ [Category Comparison]                   │
│ [Top Sectors Growth]                    │
│ [Company Ranking Table — 가로 스크롤]    │
└─────────────────────────────────────────┘
```

---

## 4. URL 쿼리 동기화 전략

### 4.1 기본 규칙

- **쿼리 키:** `region`
- **유효값:** `all` (default) | `kr` | `global`
- **default 처리:** `region=all`은 URL에서 **생략** (깔끔한 공유 URL을 위해)
- **잘못된 값:** `useRegion`이 fallback으로 `all` 반환 (서버 라우트도 동일)
- **`router.replace` 사용:** 토글 변경 시 history stack에 쌓이지 않도록 (뒤로가기로 region만 토글되는 일 방지)
- **`{ scroll: false }` 적용:** 토글 시 스크롤 위치 보존

### 4.2 흐름도

```
URL ?region=kr
   │
   ▼
useRegion() ─── region: 'kr'
   │
   ▼
페이지 컴포넌트 (state로 region 보유)
   │
   ▼
useMoneyFlow({ industryId, period, region })
   │
   ▼
queryKey: ['money-flow', industryId, period, region]
   │
   ▼
fetch /api/money-flow?industry=tech&period=14&region=kr
   │
   ▼
API: getIndustryFilter({ industryId, region }) → tickers 필터링
   │
   ▼
응답 → 자식 컴포넌트들
```

### 4.3 queryKey 규약

모든 데이터 hook의 queryKey 끝에 region을 일관되게 추가:

```typescript
// Before
useQuery({
  queryKey: ['money-flow', industryId, period],
  queryFn: () => fetchMoneyFlow({ industryId, period }),
})

// After
useQuery({
  queryKey: ['money-flow', industryId, period, region],
  queryFn: () => fetchMoneyFlow({ industryId, period, region }),
})
```

**핵심:** queryKey에 region을 추가하면 region 변경 시 자동으로 캐시 분리되어 stale 데이터를 보여주지 않는다.

### 4.4 API 계약 (간단)

```
GET /api/<endpoint>?industry=<id>&region=<all|kr|global>&...
```

- `region` 미지정 시 = `all`
- 잘못된 값은 400 대신 `all`로 fallback (UX 우선)
- 응답 페이로드에 `region` 에코백(디버그용 + 빈 상태 메시지에 활용)

### 4.5 region ↔ ticker 분류 규칙 (`lib/industry.ts`)

```typescript
function isKoreanTicker(ticker: string): boolean {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ')
}

export function filterByRegion<T extends { ticker: string }>(
  items: T[],
  region: Region
): T[] {
  if (region === 'all') return items
  if (region === 'kr') return items.filter(i => isKoreanTicker(i.ticker))
  return items.filter(i => !isKoreanTicker(i.ticker))
}
```

---

## 5. 빈 상태 처리 가이드

### 5.1 정책 매트릭스

| 페이지 / 컴포넌트 | 데이터 0건일 때 처리 | 이유 |
|---|---|---|
| 산업 대시보드 — 산업 카드 | **숨김** (해당 region에 종목 없는 산업 자체 미노출) | 사용자 인지부하 최소화 |
| 산업 대시보드 — 자금 흐름 카드 | **카드 노출 + "해당 region에 자금 흐름 데이터 없음"** | 카드 자리 유지로 레이아웃 안정성 |
| 산업 대시보드 — 통계 카드 2개 | **카드 노출 + 비활성 안내문** | 동일 |
| 패권 지도 — 카테고리 카드 | sectors 0개면 **카테고리 자체 숨김**, 1개+면 노출 | 그리드가 비어 보이는 것 방지 |
| 패권 지도 — 섹터 카드 | companies 0개면 **흐리게 dim + "이 region에 종목 없음"** | 섹터 구조 유지 |
| 패권 지도 — 사이드바 통계 | **빈 안내문** | 사이드바 폭 유지 |
| 자금 흐름 — flow 카드 | inflow/outflow 0개면 **"이 region에 자금 흐름 없음" 메시지** | 양쪽 컬럼 유지 |
| 자금 흐름 — sector company list | 0개면 **"이 region에 해당 섹터 종목 없음"** | 모달/패널 일관성 |
| 등락율 — 차트 | 0개면 **빈 차트 + "표시할 종목 없음"** | 차트 영역 자리 유지 |
| 등락율 — 테이블 | 0개면 **"필터 조건에 맞는 종목 없음" 행** | shadcn Table 패턴 |
| 통계 — 차트 (4개) | 카테고리/섹터/기업 0개면 **빈 차트 + 안내문** | |
| 통계 — 랭킹 테이블 | 0개면 **빈 행 + 안내문** | |

### 5.2 빈 상태 컴포넌트 (재사용)

```typescript
// components/ui/empty-region-state.tsx
import { Inbox } from 'lucide-react'

interface Props {
  region: Region
  message?: string
}

export function EmptyRegionState({ region, message }: Props) {
  const regionLabel = region === 'kr' ? '국내' : region === 'global' ? '해외' : ''
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="w-10 h-10 text-muted-foreground mb-3" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        {message ?? `${regionLabel} region에 표시할 데이터가 없습니다.`}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        다른 region을 선택해 보세요.
      </p>
    </div>
  )
}
```

### 5.3 비활성화 옵션 표시 (선제 안내)

`<RegionToggle disabledOptions={['kr']} />` 형태로, 데이터 카운트를 미리 계산해서 0인 옵션을 disabled 처리.
사용자가 비어 있는 region으로 클릭 자체를 못하도록 차단 (단, 산업 카드별 정책에 따라 클릭 허용 + 빈 상태 안내도 가능 — 페이지마다 결정).

**권장:** 산업 대시보드는 `disabledOptions` 사용 (전역적 시야 확보), 개별 페이지는 클릭 허용 + 빈 상태 안내(상세 탐색 우선).

### 5.4 카운트 표시 (선택)

`<RegionToggle counts={{ kr: 12, global: 38 }} />` 사용 시:

```
[전체 50] [국내 12] [해외 38]
```

데이터 fetch가 끝나야 알 수 있으므로 첫 렌더에서는 표시하지 않음(Skeleton 후 표시).

---

## 6. 접근성 체크리스트

### 6.1 ARIA / 시맨틱

- [ ] 토글 컨테이너에 `role="group"` 또는 `role="radiogroup"` 부착
- [ ] `aria-label`로 "Region 필터" 등 그룹 의미 명시
- [ ] 각 버튼:
  - [ ] `role="radio"` + `aria-checked={selected}` (radiogroup 방식, 권장)
  - [ ] 또는 `aria-pressed={selected}` (toggle button group 방식)
  - [ ] `type="button"` 명시 (form 안에 있을 경우 submit 방지)
- [ ] 비활성 옵션: `disabled` + `aria-disabled="true"`
- [ ] 아이콘은 `aria-hidden="true"` (텍스트 라벨이 의미를 전달)

### 6.2 키보드 탐색

- [ ] `Tab`으로 그룹 진입, `Tab`으로 그룹 탈출 (그룹 내부는 한 stop)
- [ ] 그룹 내부 좌/우 화살표(`ArrowLeft`/`ArrowRight`)로 옵션 이동 후 자동 선택 (radiogroup 표준 동작)
- [ ] `Home`/`End`로 첫/마지막 옵션 이동
- [ ] `Space`/`Enter`로 명시적 선택 (radio면 자동, button이면 명시적)
- [ ] 선택된 옵션만 `tabIndex={0}`, 나머지는 `tabIndex={-1}` (roving tabindex)

### 6.3 시각 / 색약 대응

- [ ] 선택 상태를 색상만으로 구분하지 않기 — 그림자/배경 대비도 함께
- [ ] 포커스 링 명시: `focus-visible:ring-2 ring-primary ring-offset-2`
- [ ] 다크모드 / 라이트모드 모두 검수
- [ ] 4.5:1 텍스트 대비 (WCAG AA) — 비활성 옵션 `opacity-40`은 안내용이므로 대비 면제 (장식적)

### 6.4 모션 / 화면 변화

- [ ] region 변경 시 데이터 로드 — `aria-live="polite"` 영역에 "국내 데이터로 변경됨" 알림 (선택, screen reader 사용자에게 도움)
- [ ] URL 변경은 `replace`로 history 미오염

### 6.5 모바일 / 터치

- [ ] 터치 타겟 최소 36px (모바일에서 `px-2 py-1`은 약 24px이므로 → `min-h-[36px] min-w-[44px]` 추가 권장)
- [ ] 햅틱 피드백 (선택, 안 필수)

### 6.6 한국어 / i18n

- [ ] 라벨은 한국어 ("전체", "국내", "해외")
- [ ] aria-label도 한국어 ("국내 종목만 보기")
- [ ] 빈 상태 메시지 한국어

### 6.7 검증 방법

- [ ] axe-core 자동 검사
- [ ] VoiceOver(macOS) / TalkBack(Android) 수동 검사
- [ ] 키보드만으로 전체 토글 조작 가능 확인
- [ ] 모바일 320px 폭에서 토글이 줄바꿈되어도 깨지지 않는지 확인

---

## 7. 구현 순서 제안 (단계적 롤아웃)

1. **Phase A — 기반 (반나절):**
   - `types/index.ts`에 `Region` 타입 추가
   - `lib/industry.ts`에 `filterByRegion` 추가, `getIndustryFilter`에 region 인자 추가
   - `components/region-toggle.tsx`, `hooks/use-region.ts` 신규 작성 + 단위 테스트

2. **Phase B — API 라우트 (1일):**
   - 6개 API 라우트에 `region` 쿼리 파라미터 수신 + 필터링
   - 응답에 `region` 에코백 추가

3. **Phase C — Hooks 업데이트 (반나절):**
   - 6개 hook에 `region` 옵션 추가, queryKey 갱신

4. **Phase D — 페이지 통합 (페이지당 0.5일 × 5):**
   - 우선순위: 패권 지도 → 자금 흐름 → 등락율 → 통계 → 산업 대시보드
   - 각 페이지 헤더에 `<RegionToggle />` 배치 + `useRegion()` 연결

5. **Phase E — 빈 상태 / a11y 검수 (1일):**
   - `EmptyRegionState` 컴포넌트 적용
   - axe-core / VoiceOver 검수

6. **Phase F — 통합 테스트 (반나절):**
   - URL 공유 동작 확인
   - 캐시 격리 확인
   - 모바일 반응형 검수

---

## 8. 협업 인터페이스 (다른 에이전트용)

### `sk-filter-architect`에게 요청할 것

- `getIndustryFilter` 시그니처에 `region` 인자 추가 (`getIndustryFilter({ industryId?, region? })`)
- API 응답 스키마에 `region` 필드 에코백 포함
- ticker 분류 규칙(`isKoreanTicker`) 위치 합의 (`lib/region.ts` 신규 권장)

### `sk-data-modeler`에게 확인할 것

- 산업별 region 분포 (e.g. 반도체 산업의 국내 종목 개수)
- 빈 region이 빈번히 발생하는 산업 식별 → `disabledOptions` 자동 산정 로직 검토

---

## 9. 변경 이력

| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-05-09 | sk-ui-planner | 초안 작성 (Phase 0 기반 region 토글 도입 계획) |
