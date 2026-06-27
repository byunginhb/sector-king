# UI 기획서 — 시장 한정(미국·한국) UI 영향 + 신규 페이지 1개

> 작성: sk-ui-planner · 2026-06-10
> 입력: `_context.md`, 실제 컴포넌트 read 기반 (company-detail, region-toggle, empty-region-state, hegemony-map, industry-context-bar, global-search, statistics-page, company API, search API, statistics/companies API, sitemap, json-ld, [industryId]/layout)
> 협업 의존: `data-model.md`(region 라벨 결정), `filter-chain.md`(API 계약), `ticker-curation.md`(제거/ADR 대체 목록)

---

## 요약 (TL;DR)

- **Part A** — "해외" 토글이 사실상 "미국"이 되므로 라벨을 **"미국"**으로 변경 권고(아이콘 `Earth`→`DollarSign` 또는 유지). 카피 변경 지점은 4곳뿐(`region-toggle.tsx`, `empty-region-state.tsx`, `sector-company-list.tsx`, `design-system`). region 인프라(`useRegion`, `RegionToggle`, `EmptyRegionState`)는 이미 완비되어 있어 **재작업 없이 라벨/아이콘만 교체**한다.
- **Part B** — 신규 페이지 **`/stock/[ticker]` 종목 전용 상세 라우트**를 강력 추천. 현재 상세는 모달뿐이라 딥링크·공유·SEO가 모두 불가능한데, 시총 서비스의 가장 기본적인 랜딩 페이지가 비어 있는 상태다. 기존 `CompanyDetail`·`/api/company/[ticker]`를 거의 그대로 재사용 가능해 **구현 난이도 대비 가치가 가장 크다**. `.KS` 티커는 점(`.`)이 URL unreserved 문자라 라우트 파라미터로 안전함을 검증 완료.
- **Part C** — UI 카피("미국" vs "해외")와 `EmptyRegionState` 메시지가 data-modeler/filter-architect의 **region 라벨 최종 결정에 의존**. 결정 확정 전까지 라벨 상수 1곳(`region-toggle.tsx OPTIONS`)에 격리.

---

# Part A — 시장 한정의 UI 영향

## A-1. region 토글 라벨 재정의 — "해외" → "미국"

### 현황 (검증됨)
`components/region-toggle.tsx`의 `OPTIONS` 상수가 라벨 SoT다:

```ts
const OPTIONS = [
  { value: 'all',    label: '전체', icon: Globe2, ariaLabel: '전체 region' },
  { value: 'kr',     label: '국내', icon: Flag,   ariaLabel: '국내 종목만 보기' },
  { value: 'global', label: '해외', icon: Earth,  ariaLabel: '해외 종목만 보기' },
]
```

- 내부 값(`'all' | 'kr' | 'global'`)과 DB 값(`'KR' | 'INTL'`)은 **그대로 유지**한다. 비 US/KR 22개 티커 제거 후 `INTL = 순수 미국`이 되므로 `global` 키의 *의미*만 좁아진다. 값 자체를 바꾸면 `lib/region.ts`, 8개 API, 8개 hook, URL 쿼리 호환성까지 연쇄로 깨지므로 **값은 절대 변경하지 않는다**.

### 권고: 라벨만 "미국"으로 변경 (값/키 유지)

| 항목 | 변경 전 | 변경 후(권고) |
|------|---------|---------------|
| `label` | `해외` | **`미국`** |
| `ariaLabel` | `해외 종목만 보기` | **`미국 종목만 보기`** |
| `icon` | `Earth` | **`DollarSign`** (미국장 직관) 또는 `Earth` 유지 — data-modeler 결정 따름 |

- 이모지 금지·lucide-react 규칙 준수: 아이콘은 lucide-react `DollarSign`/`Flag`/`Globe2`만 사용. 국기 이모지(미국 깃발 등) 절대 금지.
- "전체"(`all`)·"국내"(`kr`) 라벨은 변경 없음.
- **변경 위치는 단 1곳**(`region-toggle.tsx` OPTIONS 배열). 이 상수가 전 페이지로 전파되므로 토글 라벨은 여기서 끝난다.

### "전체"의 의미 재검토 (선택)
시장이 2개(미국·한국)로 줄면 "전체"의 가치가 여전히 유효(미국+한국 합산 = 글로벌 시총 비교의 핵심). **3옵션 토글 유지를 권고**. 단, 일부 페이지에서 "전체=미국+한국"이 사실상 디폴트이므로 `all`에 카운트 배지(`counts` prop, 이미 지원)로 "미국 N · 한국 M" 같은 보조 표기를 고려할 수 있다(후순위).

## A-2. 제거된 섹터/빈 섹터의 빈 상태 UI

### 인프라 현황 (재사용 — 신규 제작 불요)
`components/ui/empty-region-state.tsx`가 이미 존재하며 `role="status"` `aria-live="polite"` a11y까지 완비. 7개 위치에서 사용 중.

**단, 카피가 "해외"로 하드코딩**되어 있어 라벨 변경에 맞춰 동기화 필요:

```ts
// empty-region-state.tsx:12 — 변경 필요
const regionLabel = region === 'kr' ? '국내' : region === 'global' ? '해외' : ''
//                                                                    ^^^^ → '미국'
```

```ts
// sector-company-list.tsx:243 — 변경 필요
`선택한 region(${region === 'kr' ? '국내' : '해외'})에 해당하는 종목이 없습니다.`
//                                          ^^^^ → '미국'
```

### 섹터 전체가 비는 경우 (티커 제거 후 발생 가능 — data-modeler/ticker-curator 추정 필요)
`_context.md`에 따르면 제거 대상 22개 중 다수가 해당 섹터의 글로벌 패권 기업(LVMH, TSMC, BMW 등). ADR 대체 실패 시 **섹터 카드가 통째로 빌 위험**. 두 가지 정책을 페이지별로 결정:

- **카드 숨김(hide)**: 자금흐름/대시보드처럼 카드가 많고 빈 카드가 시각적 노이즈인 경우. `hegemony-map.tsx`가 이미 `region === 'global'`일 때 `KR_ONLY_CATEGORY_IDS`(korea_bio, korea_banks) 카테고리를 필터링하는 선례 보유 — 동일 패턴 확장.
- **카드 노출 + 빈 상태(show empty)**: 패권지도처럼 "이 섹터에 미국 대표 기업이 빠졌다"는 정보 자체가 의미 있는 경우. 섹터 카드 내부에 작은 안내(`EmptyRegionState`의 축약 variant 또는 한 줄 텍스트) 노출.

> 권고: **money-flow/대시보드 = 숨김, 패권지도 = 노출**. 패권지도는 "어느 섹터가 미국 종목으로 채워졌나"를 보여주는 게 본질이므로 빈 섹터도 정보다.

## A-3. 영향받는 페이지 목록과 카피 변경 지점

| 페이지/컴포넌트 | region 토글 | "해외" 카피 | 빈 상태 정책 | 비고 |
|------|:-:|:-:|------|------|
| `components/region-toggle.tsx` | (SoT) | **수정 1곳** | — | 라벨/아이콘/ariaLabel |
| `components/ui/empty-region-state.tsx` | — | **수정 1곳** | (재사용) | `regionLabel` 삼항식 |
| `components/money-flow/sector-company-list.tsx` | — | **수정 1곳** | 안내 카피 | 빈 종목 메시지 |
| `components/design-system/components-section.tsx` | 데모 | **수정 1곳** | — | `hint="국내 / 해외 / 전체"` → `"국내 / 미국 / 전체"` |
| `components/hegemony-map.tsx` | 사용 | 없음 | 노출(권고) | `KR_ONLY_CATEGORY_IDS` 패턴 보유 |
| `components/industry-dashboard.tsx` | 사용 | 없음 | 숨김(권고) | — |
| `components/statistics/statistics-page.tsx` | 사용 | 없음 | 테이블 빈 행 | — |
| `components/price-changes/price-changes-page-content.tsx` | 사용 | 없음 | `EmptyRegionState`(보유) | line 152 |
| `components/money-flow/money-flow-page-content.tsx` | 사용 | 없음 | `EmptyRegionState`(보유) | — |
| `components/dashboard/company-stats-card.tsx` | 사용 | 없음 | `EmptyRegionState`(보유) | — |
| `components/dashboard/price-changes-card.tsx` | 사용 | 없음 | `EmptyRegionState`(보유) | — |
| `components/json-ld.tsx` | — | 없음 | — | description "한국·미국" 이미 정확 — 변경 불요 |
| `components/company-detail.tsx` | — | 없음 | — | `getStockUrl`이 `.KS`→네이버, 그 외→Yahoo. 일본/유럽 제거 후에도 로직 안전(미국=Yahoo 정상) |

**카피 변경 총합: 정확히 4개 파일, 4개 라인.** 토글 인프라·hook·URL 동기화는 0 변경.

### SEO 카피 (seo-optimizer 관점, 변경 불요 확인됨)
- `json-ld.tsx`의 WebSite description이 이미 `"한국·미국 주식 시장..."`으로 정확 → 변경 없음.
- `[industryId]/layout.tsx` generateMetadata는 산업명 기반이라 region 무관 → 변경 없음.

---

# Part B — 신규 페이지 1개 기획

## B-1. 후보 3개 비교

| 후보 | 사용자 가치 | 데이터 출처 | 구현 난이도 | 차별성 |
|------|------------|-------------|:----------:|--------|
| **① `/stock/[ticker]` 종목 상세** | 딥링크·공유·검색 유입의 **랜딩 종착지**. 현재 모달이라 URL 공유 불가 = 치명적 누락 | **기존 `/api/company/[ticker]` 100% 재사용** | **낮음** (모달→페이지 승격) | 시총 서비스의 기본기. SEO·OG·sitemap 동시 확보 |
| ② `/screener` 스크리너 | 미국·한국 종목을 시총/PER/성장률/score/region/industry로 발굴·정렬 | 신규 API 필요(`/api/screener`) 또는 `/statistics/companies` 확장 | **중~높음** (정렬·필터·페이지네이션·신규 API) | 데이터 수집 기준(시총)과 직결, 파워유저용 |
| ③ `/compare` 비교 | 종목 2~4개 나란히 비교 | `/api/company/[ticker]` N회 호출 | 중 | 의사결정 보조. 단, ①이 없으면 진입점이 약함 |
| ④ `/rankings` 랭킹 | 오늘의 급등락·시총·score 순위 | `/api/statistics/movers`+`companies` 재사용 | 중 | 대시보드/통계와 기능 중복 多 |

## B-2. 강력 추천 → **① `/stock/[ticker]` 종목 전용 상세 라우트**

### 추천 근거
1. **현재 가장 큰 구조적 공백**: 검색·등락카드·통계 테이블·뱃지 4곳에서 `setSelectedTicker`로 모달만 띄운다(검증됨). 종목 하나를 URL로 공유·북마크·검색 유입할 수단이 전무하다. 시총/지배력 서비스에서 "종목 페이지 없음"은 가장 기본적인 결손.
2. **SEO 가치가 가장 큼**(seo-optimizer 관점): 종목별 페이지는 "삼성전자 시가총액", "AAPL 패권 점수" 같은 롱테일 검색 유입의 핵심. JSON-LD(`Corporation`/`FinancialProduct`) + sitemap 등록 + OG 이미지로 즉시 색인 가능. 현재 sitemap에는 종목 페이지가 0개.
3. **구현 난이도 최저, 재사용 최대**: `CompanyDetail` 컴포넌트와 `/api/company/[ticker]`가 이미 완성. 모달 콘텐츠를 페이지 레이아웃으로 승격하면 됨. 신규 API·신규 데이터 0.
4. **다른 후보의 진입점이 됨**: ②④의 종목 행 클릭, ③ 비교 대상 선택 모두 결국 `/stock/[ticker]`로 연결되는 게 자연스럽다. ①을 먼저 깔면 후속 페이지가 쉬워진다.

### B-2-1. URL 설계 (코딩스타일 규칙 검증 완료)

```
/stock/AAPL            # 미국 종목
/stock/005930.KS       # 한국 종목 (삼성전자)
/stock/BRK-B           # 점 대신 하이픈 쓰는 US 티커
```

- **규칙 준수**: 라우트 파라미터는 **티커(ASCII)** — 한글·slug 금지 규칙을 자동 충족. 회사명은 절대 URL에 넣지 않는다.
- **`.KS` 인코딩 안전성 (Node로 실측 검증):**
  ```
  encodeURIComponent('005930.KS') === '005930.KS'   // 점은 RFC3986 unreserved, 인코딩 안 됨
  decodeURIComponent(encode(...)) === 원본            // 무손실 왕복 OK
  ```
  점(`.`)·하이픈(`-`)은 unreserved 문자라 `%2E` 등으로 인코딩되지 않음. Next.js dynamic segment `[ticker]`가 안전하게 파싱. (한글·특수문자 slug에서 발생하던 `%xx` 파싱 버그와 무관)
- **티커 검증 필수**(layout 또는 page): `/^[A-Za-z0-9.\-]{1,12}$/` 정규식으로 화이트리스트. 미존재 티커는 API가 이미 404 반환 → `notFound()` 호출.

### B-2-2. 컴포넌트 계층 (200~400줄 규칙 준수)

```
app/stock/[ticker]/
  page.tsx              # Server Component. params 검증 + generateMetadata(SEO/OG) + <Suspense> 래핑
  opengraph-image.tsx   # 동적 OG 이미지 (티커·종목명·시총 — [industryId]/opengraph-image.tsx 패턴 재사용)
  not-found.tsx         # 미존재 티커 안내 (선택)

components/stock/
  stock-detail-page.tsx       # 'use client'. 헤더(반응형) + 워치 토글 + 본문 조립 (~150줄)
  stock-detail-header.tsx     # GlobalTopBar 스타일 헤더 + 뒤로가기 + 공유 + WatchStarToggle (~80줄)
  stock-price-banner.tsx      # CompanyDetail의 Last Price 배너 추출 (~70줄)
  stock-score-analysis.tsx    # CompanyDetail의 ScoreAnalysis 추출 (~120줄)
  stock-hegemony-badges.tsx   # 패권 영역 뱃지 (~40줄)
  stock-price-chart.tsx       # 기존 components/price-chart.tsx 재사용 (history 30일)
```

**리팩토링 전략**: 현재 `company-detail.tsx`(327줄)는 모달·페이지 양쪽에서 쓰여야 하므로, 내부 섹션(PriceBanner / HegemonyBadges / ScoreAnalysis)을 위 작은 컴포넌트로 추출하고 `CompanyDetail`(모달용)과 `StockDetailPage`(라우트용)가 **공통 섹션을 공유**한다. 이렇게 하면 모달과 페이지가 동일 콘텐츠를 유지하며 코딩스타일의 "작은 파일" 규칙도 충족.

### 재사용할 기존 자산
| 자산 | 재사용 방식 |
|------|-----------|
| `components/company-detail.tsx` 내부 섹션 | 추출 후 페이지·모달 공유 |
| `hooks/use-company.ts` (`useCompany`) | 그대로 |
| `/api/company/[ticker]/route.ts` | 그대로 (toUsd 적용·sectors·history·score 모두 포함) |
| `components/price-chart.tsx` | 가격 히스토리 차트 |
| `components/me/watch-star-toggle.tsx` | 워치리스트 추가 |
| `components/share-button.tsx` + `hooks/use-share.ts` | URL 공유 (이제 의미 생김) |
| `GlobalTopBar` | 페이지 상단 바 |
| `components/json-ld.tsx` | `StockJsonLd` 추가 (아래) |

### B-2-3. 필요한 API

- **기존 재사용으로 충분**: `/api/company/[ticker]`가 company·profile·snapshot·history(30일)·score·sectors를 toUsd 정규화하여 반환. **신규 API 불요.**
- **선택적 신규(후순위)**: 더 긴 가격 히스토리(1년)나 동종 섹터 비교가 필요하면 `?range=1y` 쿼리 추가. 1차 출시 범위 밖.

### B-2-4. 반응형 레이아웃 시안 (ASCII 와이어프레임)

데스크탑 (sm+):
```
┌──────────────────────────────────────────────────────────┐
│ [< 뒤로]  Sector King                    [공유] [★ 워치]   │  ← GlobalTopBar + 헤더 액션
├──────────────────────────────────────────────────────────┤
│ 삼성전자 (005930.KS)                                       │  ← font-display 제목
│ Samsung Electronics                                        │
├───────────────────────────────┬──────────────────────────┤
│ Last Price                    │  패권 영역                │
│  $52.40  ▲ +12.3%             │  [반도체: 1위 ★]          │
│  (₩72,300)                    │  [디스플레이: 2위]         │
│  시총 $380B                   │                            │
│  [이 데이터 직접 확인 →]       │  패권 점수 분석           │
├───────────────────────────────┤  ▓▓▓▓▓▓▓░░ 7.8 / 10       │
│  [30일 가격 차트 ─ recharts]  │  규모 ▓▓▓▓                 │
│                               │  성장성 ▓▓▓                │
│                               │  수익성 ▓▓▓▓▓              │
│                               │  시장평가 ▓▓▓              │
└───────────────────────────────┴──────────────────────────┘
```

모바일 (< sm — 세로 1열):
```
┌──────────────────────┐
│ [<] SK    [공유][★]  │
├──────────────────────┤
│ 삼성전자 (005930.KS) │
│ Samsung Electronics  │
├──────────────────────┤
│ Last Price           │
│ $52.40 ▲ +12.3%      │
│ (₩72,300)            │
│ 시총 $380B           │
├──────────────────────┤
│ [30일 차트]          │
├──────────────────────┤
│ 패권 영역            │
│ [반도체: 1위 ★]      │
├──────────────────────┤
│ 패권 점수 분석       │
│ ▓▓▓▓▓▓▓░ 7.8/10     │
│ 규모/성장/수익/평가  │
└──────────────────────┘
```

헤더는 반응형 표준 패턴 사용(`hegemony-map.tsx:60` / MEMORY.md):
```
flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
```
타이틀 div에 `min-w-0`, 액션 그룹 `flex items-center gap-2 sm:gap-3 flex-wrap`.

### B-2-5. 빈 상태 / 로딩 / 에러

- **로딩**: `CompanyDetailSkeleton`(이미 존재) 확장 — 헤더·차트·점수 영역 스켈레톤. 페이지 단위라 차트/점수 칸까지 스켈레톤 추가.
- **에러(API 500)**: `components/dashboard/card-error.tsx` 패턴 재사용 또는 페이지 전용 에러 — "종목 데이터를 불러오지 못했습니다. 다시 시도" + 홈 링크.
- **미존재 티커(404)**: `not-found.tsx` — "해당 종목을 찾을 수 없습니다" + 검색 트리거 + 인기 종목 링크. 시장 한정으로 **제거된 22개 티커**(LVMH 등)로 들어오는 옛 링크도 여기로 떨어짐 → "이 종목은 더 이상 추적하지 않습니다. 미국·한국 종목만 제공합니다" 안내 카피 분기 권고.
- **부분 결손**: score가 null(데이터 커버리지 부족)이면 점수 섹션 숨기고 "점수 산출 중" 안내(CompanyDetail이 이미 `score && ` 가드 보유).

### B-2-6. region 필터와의 통합

- 종목 상세는 **단일 종목 페이지**라 region 토글을 두지 않는다(필터 대상이 1개). 대신 종목의 region을 **배지로 표시**: `getRegionFromTicker(ticker)`로 `KR`/`INTL` 판정 → "한국" / "미국" 배지(lucide `Flag`/`DollarSign`).
- 종목 상세에서 "같은 섹터 다른 종목"으로 이동할 때 region 컨텍스트를 잃지 않도록, 진입한 목록 페이지의 `?region=` 을 백링크에 보존하는 것을 권고(후순위).

### B-2-7. framer-motion / 아이콘 / 이모지 일관성

- framer-motion: 점수 바 width 트랜지션은 현재 CSS `transition-[width]` 사용 중 — 페이지 진입 시 섹션 fade-in 정도만 framer-motion으로 추가(과한 애니메이션 지양, 기존 페이지 톤 유지).
- 아이콘: lucide-react만(`ArrowLeft`, `Star`, `Share2`, `DollarSign`, `Flag`, `TrendingUp`). 현재 `company-detail.tsx`가 인라인 `<svg>`를 직접 쓰는 부분(외부링크·체크 아이콘)은 추출 시 **lucide-react로 교체** 권고(ExternalLink, BadgeCheck, BarChart3).
- 이모지 금지: 전 영역 준수. `[industryId]/layout`의 `industry.icon`은 DB 저장 사용자 데이터라 예외(규칙상 허용).

### B-2-8. SEO 통합 (seo-optimizer 관점)

1. **`generateMetadata`** (page.tsx, Server):
   - `title`: `{종목명}({ticker}) 시가총액·패권 점수 | Sector King`
   - `description`: `{종목명}의 실시간 시가총액, 섹터 지배력 순위, 성장성·수익성 패권 점수 분석`
   - `alternates.canonical`: `${BASE_URL}/stock/${ticker}`
   - `openGraph` + `twitter`(summary_large_image), 동적 OG 이미지
2. **JSON-LD**: `json-ld.tsx`에 `StockJsonLd` 추가 — schema.org `Corporation`(name, tickerSymbol, url) + 선택적 `FinancialProduct`. 가격을 구조화 데이터에 넣을 때는 `toUsd` 변환된 값 사용(통화 규칙).
3. **sitemap.ts 확장**: 현재 산업 페이지만 등록. 종목 페이지를 추가하려면 `getAll companies`에서 ticker 목록을 읽어 `/stock/${ticker}` 엔트리 생성. 437개(US 434 - 제거 22 + KR 83 등, 큐레이션 후 확정치) 규모 → sitemap 1개로 충분(50k 한계 내). **단 시장 한정으로 제거된 티커는 sitemap에서 제외**(ticker-curator의 최종 active 목록 기준).
4. **robots**: 종목 페이지 색인 허용(기존 robots.ts 확인 필요 — 별도 disallow 없으면 자동 허용).

---

# Part C — 의존 (data-modeler / filter-architect)

UI가 다른 에이전트 결정에 의존하는 지점:

| UI 결정 | 의존 대상 | 어떤 결정이 필요한가 | 격리 위치 |
|---------|-----------|---------------------|-----------|
| 토글 라벨 "미국" vs "해외" 유지 | **data-modeler / filter-architect** | `global` 키를 "미국"으로 재명명할지, "전체/국내/미국" 3옵션 유지할지 확정 | `region-toggle.tsx` OPTIONS 1곳 |
| `EmptyRegionState` 카피 | 위와 동일 | "해외 region에 데이터 없음" → "미국 region에 데이터 없음" | `empty-region-state.tsx:12` |
| 빈 섹터 숨김 vs 노출 정책 | **data-modeler / ticker-curator** | 22개 제거 + ADR 대체 후 **실제로 비는 섹터 목록**. 빈 섹터가 있어야 숨김/노출 정책이 의미 | `hegemony-map`의 `KR_ONLY_CATEGORY_IDS` 유사 상수 |
| 토글 아이콘(`DollarSign` vs `Earth`) | data-modeler | "미국" 라벨 확정 시 아이콘 동반 변경 | `region-toggle.tsx` OPTIONS |
| `/stock` sitemap 등록 티커 | **ticker-curator** | 제거 후 최종 active 티커 목록(제거된 22개는 sitemap·404 분기 대상) | `sitemap.ts`, `not-found.tsx` |
| `getStockUrl` 외부 링크 | filter-architect | 미국·한국만 남으므로 `.KS`→네이버, 그 외→Yahoo 2분기로 단순화 가능(일본/유럽 분기 불요) | `company-detail.tsx:14` (현재도 안전) |

**의존 처리 원칙**: 라벨/카피는 위 4개 파일 1라인씩에 격리되어 있어, region 라벨 최종 결정이 늦어져도 `/stock` 페이지 구현은 **선행 착수 가능**(라벨과 무관). 라벨 결정 확정 시 4라인 일괄 수정으로 마감.

---

## 부록 — region 인프라 재사용 현황 (재작업 0)

이미 완비되어 변경 불필요한 자산:
- `hooks/use-region.ts` — URL `?region=` ↔ state 동기화, `router.replace({scroll:false})`, `all`이면 키 제거. **그대로 사용.**
- `components/region-toggle.tsx` — `role="group"`, `role="radio"`/`aria-checked`, 키보드 화살표 내비, `disabledOptions`, `counts`, 반응형 사이즈. **라벨만 수정.**
- `components/ui/empty-region-state.tsx` — `role="status"` `aria-live="polite"`. **카피만 수정.**
- `components/layout/industry-context-bar.tsx` — `rightActions` 슬롯에 RegionToggle 주입(이미 반응형 표준 패턴 적용). **변경 없음.**
- `lib/region.ts` — SoT(`getRegionFromTicker`, `matchesRegion`, `applyRegionFilter`, `regionFilterToValue`). DB 값 KR/INTL 유지하므로 **변경 없음.**

## 부록 — 접근성 체크리스트 (/stock 신규 페이지)

- [ ] 헤더 토글/탭 그룹에 `role="group"` + `aria-label`
- [ ] 뒤로가기 링크에 `aria-label="이전 페이지로"` (MEMORY.md 기존 누락 부채 해소)
- [ ] 워치 토글 버튼 `aria-pressed`
- [ ] 점수 프로그레스 바 `role="progressbar"` + `aria-valuenow/valuemin/valuemax`
- [ ] 외부 링크 `rel="noopener noreferrer"` + 새 창 안내 텍스트
- [ ] region 배지(한국/미국)에 텍스트 라벨 병기(색·아이콘만으로 구분 금지)
- [ ] 로딩 스켈레톤 `aria-busy="true"` / 에러 `role="alert"`
- [ ] 차트에 대체 텍스트 또는 표 형태 보조(recharts a11y)
