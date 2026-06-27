# Sector-King · 마켓 리포트(News) 기획

> 산출물: `app/samplenews.md`(262줄) 구조를 데이터화하고, 관리자 작성 → 발행 → 사용자 메인 노출 → 상세 드릴다운까지의 일관된 흐름을 정의한다.
> 작성: sk-news-architect · 2026-05-09

---

## 1. 현황 · 요구사항 요약

### 1.1 sample 분석 (이중 뷰 구조)

`app/samplenews.md`는 **하나의 일별 리포트**가 두 개의 뷰를 가진다.

#### [전문가용 리포트] — 8개 섹션

| ID | 섹션 | 구조 | 카드/항목 수 |
|----|------|------|------|
| A | 30초 브리핑 | 단일 markdown 단락 (2~4문장, 핵심 키워드 **bold**) | 1 |
| B | 헤드라인 요약 | 번호별 카드: `[카테고리] 제목 — (TICKER)` + 핵심 + 포인트 + 키워드 | N=12 |
| C | 테마/섹터 흐름 맵 | 번호별 카드: 제목 + 근거 헤드라인 + 해석 + 다음 체크포인트 | N=6 |
| D | 액션 아이디어 | 라벨(Watchlist/리포트/리스크/섹터/배당) + 본문 | N=5 |
| E | Bear/Base/Bull | 3분할 카드: 시나리오 본문 + 트리거 | 3 (고정) |
| F | 한 줄 결론 | 단일 문장 (인용형) | 1 |
| G | 자금 흐름 맵 | "빠져나가는 곳" / "흘러가는 곳" / "흐름의 핵심 동력" 3블록 + 섹터별 수익률 | 1 |
| H | 한국 주식 관계 | 종목별 카드: 종목명(코드) + 의견(매수/중립/관망) + 근거 + 리스크 + 의견 | N=5 |

#### [초보자용 리포트] — 5개 섹션

| ID | 섹션 | 구조 | 항목 수 |
|----|------|------|------|
| N1 | 한 줄 요약 | 단일 단락 (반말, 친근한 톤) | 1 |
| N2 | 무슨 일이 있었어 | 번호별 카드: 제목 + 본문 | N=6 |
| N3 | 주목 종목 | 3개 표(상승/하락/하락 시 매수): 티커 + 이유 | 3개 표 |
| N4 | 한국 주식 | 종목별 블록: 종목명 + 액션(사/조심하면서 사/지켜봐) + 본문 | N=5 |
| N5 | 한 줄 정리 | 단일 문장 | 1 |

### 1.2 핵심 요구사항

- **이중 뷰 토글**: 같은 리포트, 두 가지 표현 (segment control)
- **N개 가변 길이**: 헤드라인·테마·한국 주식은 일별로 개수가 다름 → 배열 기반 데이터 모델
- **티커 cross-link**: 헤드라인의 `(CLS)`, 한국 주식의 `(000660)` → 자동으로 회사 페이지/모달 연결
- **메타데이터**: 발행일, 작성자, 상태(draft/published/archived), 슬러그 또는 ID, 태그(#AI인프라 등)
- **관리자 작성 UX**: 섹션별 폼 입력이 가독성 높음 (마크다운 일괄 입력은 검증 어려움)
- **검색**: Phase 1에서는 X. JSONB로 저장하되 GIN 인덱스 후속 추가 가능

### 1.3 디자인 토큰 준수

- 색: `slate-950` 배경, `stone-50/100` 텍스트, `amber-400/500` 액센트
- 카드: `sk-card` (배경+border+shadow 표준)
- 숫자: `tabular-nums` (수익률, P/E)
- 아이콘: lucide-react만 (이모지 절대 금지)

---

## 2. 데이터 모델

### 2.1 결정: 단일 테이블 + JSONB

| 옵션 | 장 | 단 | 결정 |
|------|----|----|------|
| A. 분리 테이블 (reports/headlines/themes/...) | 검색·인덱싱 강함 | 조인 7~8개, 작성 폼 복잡, 마이그레이션 무거움 | X |
| **B. 단일 테이블 + JSONB 섹션** | **단순, 1쿼리 로드, 폼/뷰 1:1 매핑, 변경 유연** | 풀텍스트 검색은 후속 (GIN 인덱스로 해결) | **채택** |

> 일별 리포트는 **트래픽 패턴이 read-heavy + 단일 문서 단위**라서 JSONB가 자연스럽다. 검색은 Phase 2.

### 2.2 `news_reports` 테이블 (Supabase / Postgres)

```sql
create table news_reports (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique,                                -- e.g. '2026-05-09-hormuz-ai'
  title        text not null,                              -- e.g. "오늘의 마켓 리포트"
  subtitle     text,                                       -- 1~2줄 부제
  status       text not null default 'draft'
                 check (status in ('draft','published','archived')),
  published_at timestamptz,                                -- status=published 시점
  report_date  date not null,                              -- 리포트 기준일 (예: 2026-05-09)
  cover_emoji  text,                                       -- (사용 안 함, 미래용 nullable)
  tags         text[] default '{}',                        -- ['ai','energy','korea']
  expert       jsonb not null default '{}'::jsonb,         -- 전문가용 섹션 (스키마 §2.3)
  novice       jsonb not null default '{}'::jsonb,         -- 초보자용 섹션 (스키마 §2.4)
  thirty_sec   text,                                       -- A섹션 plain text — 메인 카드용 (검색/노출 빠름)
  one_liner    text,                                       -- F섹션 한 줄 결론 — 카드 강조용
  author_id    uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index news_reports_status_published_idx
  on news_reports (status, published_at desc);
create index news_reports_report_date_idx
  on news_reports (report_date desc);
create index news_reports_tags_gin on news_reports using gin (tags);
-- 후속: create index news_reports_expert_gin on news_reports using gin (expert jsonb_path_ops);
```

**트리거**: `updated_at` 자동 갱신.

### 2.3 TypeScript: 전문가 섹션 스키마

```ts
// types/news.ts

export type ReportStatus = 'draft' | 'published' | 'archived';

export type ScenarioKind = 'bear' | 'base' | 'bull';

export type KoreanStockOpinion =
  | 'buy'           // 매수
  | 'buy_selective' // 선별적 매수
  | 'neutral'       // 중립/관망
  | 'reduce';       // 비중 축소

export type NoviceStockBucket =
  | 'will_rise'    // 상승 확률 높은 종목
  | 'will_fall'    // 하락 확률 높은 종목
  | 'buy_on_dip';  // 하락 시 담아야 할 종목

// ----- B. 헤드라인 카드 -----
export interface HeadlineItem {
  index: number;                    // 1-based
  category: string;                 // "Trending Analysis" | "Market News" | "Analysis" | "Stock Ideas" | "Sector"
  title: string;                    // "The AI Boom Powering Celestica"
  tickers: TickerRef[];             // [{ symbol: 'CLS', exchange: 'NYSE' }]
  core: string;                     // "핵심: ..."
  point: string;                    // "포인트: ..."
  keywords: string[];               // ['AI 인프라', 'CapEx', '하이퍼스케일러']
}

export interface TickerRef {
  symbol: string;                   // 'CLS', '000660'
  exchange?: 'NYSE' | 'NASDAQ' | 'KOSPI' | 'KOSDAQ' | string;
  name?: string;                    // 표시용 (선택)
  industryId?: string;              // sector-king 라우팅용 (선택)
}

// ----- C. 테마 / 섹터 흐름 맵 -----
export interface ThemeFlowItem {
  index: number;
  title: string;                    // "섹터 로테이션: 에너지·산업재 → 빅테크 OUT"
  evidence: string;                 // 근거 헤드라인
  interpretation: string;           // 해석
  nextCheckpoint: string;           // 다음 체크포인트
}

// ----- D. 액션 아이디어 -----
export interface ActionIdeaItem {
  label: 'watchlist' | 'report' | 'risk' | 'sector' | 'dividend';
  body: string;                     // 한 단락
  tickers?: TickerRef[];            // 본문에서 추출된 티커 (자동 cross-link)
}

// ----- E. Bear/Base/Bull -----
export interface ScenarioItem {
  kind: ScenarioKind;
  body: string;                     // 본문 (2~4문장)
  trigger: string;                  // "트리거: ..."
}

// ----- G. 자금 흐름 맵 -----
export interface SectorFlow {
  name: string;                     // "에너지(Energy)"
  ytdPct?: number;                  // 21 (단위 %)
  note: string;                     // "호르무즈 지정학 프리미엄 ..."
}

export interface FundFlowMap {
  outflows: SectorFlow[];           // 빠져나가는 곳
  inflows: SectorFlow[];            // 흘러가는 곳
  driver: string;                   // 흐름의 핵심 동력 (단락)
}

// ----- H. 한국 주식 -----
export interface KoreanStockItem {
  index: number;
  name: string;                     // "SK하이닉스"
  code: string;                     // "000660"
  opinion: KoreanStockOpinion;      // 'buy'
  rationale: string;                // 근거
  risk: string;                     // 리스크
  comment: string;                  // 의견 (마무리 코멘트)
}

// ----- 전문가 섹션 컨테이너 -----
export interface ExpertReport {
  thirtySecBrief: string;           // A. 30초 브리핑 (markdown 허용)
  headlines: HeadlineItem[];        // B
  themeFlows: ThemeFlowItem[];      // C
  actions: ActionIdeaItem[];        // D
  scenarios: {                      // E
    bear: ScenarioItem;
    base: ScenarioItem;
    bull: ScenarioItem;
  };
  oneLiner: string;                 // F
  fundFlow: FundFlowMap;            // G
  koreanStocks: KoreanStockItem[];  // H
}
```

### 2.4 TypeScript: 초보자 섹션 스키마

```ts
// ----- N2. 무슨 일이 있었어 -----
export interface NoviceEventItem {
  index: number;
  title: string;                    // "AI 관련주는 여전히 핫해"
  body: string;                     // 본문 (markdown 허용)
}

// ----- N3. 주목 종목 (표 3개) -----
export interface NoviceStockRow {
  ticker: TickerRef;
  reason: string;
}

export interface NoviceStockTable {
  bucket: NoviceStockBucket;
  rows: NoviceStockRow[];
}

// ----- N4. 한국 주식 -----
export interface NoviceKoreanStockItem {
  index: number;
  name: string;                     // "SK하이닉스"
  code: string;
  action: '사' | '조심하면서 사' | '지켜봐' | '안 사';
  body: string;
}

// ----- 초보자 섹션 컨테이너 -----
export interface NoviceReport {
  oneLineSummary: string;           // N1
  events: NoviceEventItem[];        // N2
  stockTables: NoviceStockTable[];  // N3 (3개)
  koreanStocks: NoviceKoreanStockItem[]; // N4
  closing: string;                  // N5
}
```

### 2.5 최상위 리포트 타입

```ts
export interface NewsReport {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  status: ReportStatus;
  publishedAt: string | null;       // ISO
  reportDate: string;               // 'YYYY-MM-DD'
  tags: string[];
  thirtySec: string | null;         // 카드 노출용 캐시
  oneLiner: string | null;          // 카드 강조용 캐시
  expert: ExpertReport;
  novice: NoviceReport;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsListItem {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  publishedAt: string;
  reportDate: string;
  tags: string[];
  thirtySec: string;                // 카드용
  oneLiner: string;                 // 카드 보조
}
```

---

## 3. 섹션 컴포넌트 카탈로그

> 모든 컴포넌트는 `components/news/` 하위. lucide 아이콘만 사용.

### 3.1 페이지 레벨

| 컴포넌트 | 경로 | 역할 |
|---------|------|------|
| `NewsHomeCard` | `components/news/news-home-card.tsx` | 메인(`/`) 노출용 카드 (제목+30초+발행일+CTA) |
| `NewsListPage` | `app/news/page.tsx` | 발행된 리포트 목록 |
| `NewsDetailPage` | `app/news/[id]/page.tsx` | 상세 (전문가/초보자 토글) |
| `AdminNewsListPage` | `app/admin/news/page.tsx` | 관리자 목록 |
| `AdminNewsEditor` | `app/admin/news/[id]/page.tsx` | 관리자 편집기 (신규=`new`) |

### 3.2 뷰 컨테이너 / 토글

```tsx
// components/news/report-view-toggle.tsx
interface ReportViewToggleProps {
  view: 'expert' | 'novice';
  onChange: (v: 'expert' | 'novice') => void;
}
// segment control: [전문가용] [초보자용]
```

```tsx
// components/news/expert-report-view.tsx
interface ExpertReportViewProps {
  report: ExpertReport;
  reportId: string;
}

// components/news/novice-report-view.tsx
interface NoviceReportViewProps {
  report: NoviceReport;
  reportId: string;
}
```

### 3.3 섹션 컴포넌트 (전문가)

| 컴포넌트 | Props | 비고 |
|---------|-------|------|
| `ThirtySecondBrief` | `{ markdown: string }` | A. 카드, 좌측 amber 라인 |
| `HeadlineCard` | `{ item: HeadlineItem; onTickerClick?: (t) => void }` | B. 번호 뱃지 + 카테고리 칩 + 티커 칩 |
| `HeadlineList` | `{ items: HeadlineItem[] }` | B 컨테이너, 가상 스크롤 X (10~15개) |
| `ThemeFlowCard` | `{ item: ThemeFlowItem }` | C. 좌측 큰 인덱스 |
| `ActionIdeaList` | `{ items: ActionIdeaItem[] }` | D. 라벨 칩 + 본문 |
| `ScenarioCardTrio` | `{ scenarios: ExpertReport['scenarios'] }` | E. 3분할 카드 (bear=red-500/30, base=stone-300, bull=emerald-500/30) |
| `OneLinerQuote` | `{ text: string }` | F. blockquote, large amber serif |
| `FundFlowMap` | `{ flow: FundFlowMap }` | G. 좌(out)/우(in) 두 컬럼 + driver 카드 |
| `KoreanStockCard` | `{ item: KoreanStockItem }` | H. 의견 뱃지(buy=emerald, neutral=stone, reduce=rose) |
| `KoreanStockList` | `{ items: KoreanStockItem[] }` | H 컨테이너 |

### 3.4 섹션 컴포넌트 (초보자)

| 컴포넌트 | Props | 비고 |
|---------|-------|------|
| `NoviceOneLineSummary` | `{ text: string }` | N1. 큰 카드 |
| `NoviceEventList` | `{ items: NoviceEventItem[] }` | N2. 번호+제목+본문 |
| `NoviceStockTableTrio` | `{ tables: NoviceStockTable[] }` | N3. 3개 컬럼/스택 |
| `NoviceKoreanStockBlock` | `{ items: NoviceKoreanStockItem[] }` | N4. 액션 라벨 컬러 코드 |
| `NoviceClosing` | `{ text: string }` | N5. 카드 |

### 3.5 공용 빌딩 블록

| 컴포넌트 | Props | 비고 |
|---------|-------|------|
| `TickerChip` | `{ ticker: TickerRef; onClick? }` | 헤드라인/액션에서 cross-link |
| `CategoryChip` | `{ category: string }` | "Trending Analysis" 등 색상 매핑 |
| `KeywordTag` | `{ tag: string }` | `#AI인프라` |
| `OpinionBadge` | `{ opinion: KoreanStockOpinion }` | 매수/중립/관망 색상 |
| `ScenarioBadge` | `{ kind: ScenarioKind }` | bear/base/bull |
| `SectionAnchor` | `{ id: string; title: string; icon }` | TOC 타겟 |
| `ReportTOC` | `{ sections: { id; title }[] }` | 우측 sticky |

### 3.6 핵심 신규 컴포넌트 5개 (요약)

1. **`NewsHomeCard`** — 메인 진입점
2. **`HeadlineCard`** — 헤드라인 1건의 표준 카드 (cross-link 포함)
3. **`ScenarioCardTrio`** — Bear/Base/Bull 3분할
4. **`FundFlowMap`** — 자금 흐름 맵 (좌우 컬럼)
5. **`KoreanStockCard`** — 한국 주식 의견 카드

---

## 4. 사용자 노출 흐름

### 4.1 메인(`/`) 카드 위치

**권장 위치: `MarketPulseStrip` 바로 아래, 산업 카드 그리드 위**

이유:
- KPI 헤로 직후 “오늘의 인사이트”라는 자연스러운 정보 위계
- 산업 카드 위에 위치하면 사용자가 산업 드릴다운 전에 큰 그림을 잡을 수 있음
- 옆에 두면(2-col) 모바일에서 깨짐 → 위/아래 풀폭이 안전

대안: MarketPulseStrip 위 (사용자 첫 시선) — 그러나 KPI가 핵심 가치 제안이므로 KPI를 위에 두는 현재 구조 유지가 합리적.

### 4.2 메인 카드 디자인 (`NewsHomeCard`)

```
┌─────────────────────────────────────────────────────┐
│ [Newspaper icon]  오늘의 마켓 리포트                 │
│ 2026-05-09 · #AI #energy #korea           [상세 보기]│
│                                                       │
│ "AI 투자는 계속되지만 돈은 실물로 이동 중이며,        │
│  호르무즈 해협이 시장의 천장과 바닥을 동시에         │
│  결정하고 있다."                                      │
│ ─────────────────                                   │
│ 30초 브리핑                                           │
│ 오늘 시장은 지정학 리스크와 섹터 로테이션 두 축으로  │
│ 움직이고 있다. S&P 500은 좁은 박스권 ...             │
└─────────────────────────────────────────────────────┘
```

- 비발행(`status != 'published'`) 또는 published_at < today-7 → 미노출
- 발행 리포트가 0건이면 컴포넌트 자체 렌더링 X (placeholder 없음)

### 4.3 목록 페이지(`/news`)

- 발행된 리포트 카드 그리드 (1col mobile, 2col tablet, 3col desktop)
- 카드 = 제목 + 발행일 + 태그 + 30초 브리핑 첫 2줄(line-clamp)
- 상단 필터: 태그, 기간 (최근 7일/30일/전체)
- 페이지네이션 또는 무한 스크롤 (Phase 1: 페이지네이션 단순)

### 4.4 상세 페이지(`/news/[id]`)

```
[← 목록으로]                                       [전문가/초보자] toggle
─────────────────────────────────────────────────
오늘의 마켓 리포트
2026-05-09 · 작성자 · 5분 읽기 · #AI #energy

  ┌──────────────────┐  ┌──────────────────────────┐
  │ TOC (sticky)      │  │  [선택된 뷰 렌더링]      │
  │ A. 30초 브리핑    │  │                            │
  │ B. 헤드라인       │  │  ThirtySecondBrief         │
  │ C. 테마 흐름      │  │  HeadlineList              │
  │ D. 액션           │  │  ThemeFlowList             │
  │ E. 시나리오       │  │  ActionIdeaList            │
  │ F. 한 줄 결론     │  │  ScenarioCardTrio          │
  │ G. 자금 흐름      │  │  OneLinerQuote             │
  │ H. 한국 주식      │  │  FundFlowMap               │
  │                    │  │  KoreanStockList           │
  └──────────────────┘  └──────────────────────────┘
─────────────────────────────────────────────────
면책 조항
```

- 데스크톱: 우측 sticky TOC (`lg:` 이상)
- 모바일: 상단 collapsible TOC (`<details>` 또는 sheet)
- 토글 전환은 URL 쿼리 `?view=novice`로 보존 (공유/북마크)
- 헤드라인의 티커 클릭 → 산업 ID가 매핑되면 `/{industryId}/...`로 라우팅, 아니면 `<TickerCompanyModal>` 표시 (Phase 2)
- 한국 주식 종목 클릭 → 동일 패턴 (`KOSPI/KOSDAQ` 라우팅 후속)

### 4.5 cross-link 정책

`TickerRef.industryId` 우선 → 라우팅
없으면: hover로 회사명/거래소만 노출, 클릭은 비활성 또는 모달

```ts
function tickerHref(t: TickerRef): string | null {
  if (t.industryId) return `/${t.industryId}`;          // Phase 1: 산업 페이지로
  return null;                                           // Phase 2: 회사 모달
}
```

---

## 5. 관리자 작성 흐름

### 5.1 결정: 섹션별 폼 + Markdown 부분 허용

| 옵션 | 채택 |
|------|------|
| A. Markdown 단일 에디터 | X — 섹션 검증/티커 추출/뷰 토글 어렵고, JSONB 일관성 망가짐 |
| **B. 섹션별 폼 (각 텍스트 영역은 markdown 허용)** | **채택** — 일관성 + 자유도 균형 |
| C. WYSIWYG 빌더 | X — 과한 엔지니어링 |

자유 텍스트 필드(`brief`, `body`, `interpretation` 등)는 **간단 markdown** (bold, italic, link, list)만 렌더. `react-markdown` + `remark-gfm` 사용.

### 5.2 라우트 구조

```
/admin/news                       — 목록 (필터: status, date)
/admin/news/new                   — 신규 작성
/admin/news/[id]                  — 편집
/admin/news/[id]/preview          — 미리보기 (전문가/초보자 토글)
```

> 모든 `/admin/*`은 sk-auth-architect 합의에 따라 `admin` role 미들웨어로 보호.

### 5.3 편집기 UX (`AdminNewsEditor`)

- 좌측: 섹션 네비 (A~H, N1~N5) — 클릭 시 해당 섹션 폼 스크롤
- 중앙: 폼
- 우상단 버튼:
  - `미리보기` (모달 또는 새 탭)
  - `임시저장` (status=draft, autosave 30초)
  - `발행` (status=published, published_at=now)
  - `보관` (status=archived)

### 5.4 헤드라인/테마/한국주식 같은 N개 항목

- "+ 헤드라인 추가" 버튼 → 카드형 폼 추가
- 각 카드: 드래그 핸들로 순서 변경, X 버튼으로 삭제
- 폼 검증(zod): `core`/`point`/`title` 필수, `tickers` 1개 이상

### 5.5 검증 (zod)

```ts
// lib/news/schema.ts
export const tickerRefSchema = z.object({
  symbol: z.string().min(1).max(20),
  exchange: z.string().optional(),
  name: z.string().optional(),
  industryId: z.string().optional(),
});

export const headlineItemSchema = z.object({
  index: z.number().int().min(1),
  category: z.string().min(1),
  title: z.string().min(1).max(200),
  tickers: z.array(tickerRefSchema).min(1),
  core: z.string().min(1).max(500),
  point: z.string().min(1).max(500),
  keywords: z.array(z.string()).default([]),
});

export const expertReportSchema = z.object({
  thirtySecBrief: z.string().min(10),
  headlines: z.array(headlineItemSchema).min(1),
  themeFlows: z.array(themeFlowItemSchema).min(1),
  actions: z.array(actionIdeaItemSchema).min(1),
  scenarios: z.object({
    bear: scenarioItemSchema,
    base: scenarioItemSchema,
    bull: scenarioItemSchema,
  }),
  oneLiner: z.string().min(1),
  fundFlow: fundFlowMapSchema,
  koreanStocks: z.array(koreanStockItemSchema).default([]),
});
// ... noviceReportSchema 동일 패턴
```

### 5.6 발행 정책

- `발행` 클릭 시:
  1. zod 검증 → 실패 시 첫 에러로 스크롤
  2. `expert.thirtySecBrief` → `news_reports.thirty_sec` (메인 카드용 캐시) 동기 복제
  3. `expert.oneLiner` → `news_reports.one_liner` 동기 복제
  4. `status='published'`, `published_at=now()`
  5. 메인 페이지 `revalidatePath('/')` + `/news` 무효화

---

## 6. API 라우트

> Next.js 15 App Router · 모든 admin 라우트는 미들웨어로 admin role 검증.

### 6.1 공개 (Read)

```
GET  /api/news?status=published&limit=10&page=1&tag=ai
GET  /api/news/[id]                    — 상세
GET  /api/news/latest                  — 메인 카드용 (최신 1건, status=published)
```

응답: `ApiResponse<NewsListItem[] | NewsReport>`

### 6.2 관리자 (Write)

```
POST   /api/admin/news                 — 신규 (status=draft default)
PATCH  /api/admin/news/[id]            — 편집 (부분 업데이트, expert/novice 통째 전송)
POST   /api/admin/news/[id]/publish    — 발행 토글 (status=published, published_at)
POST   /api/admin/news/[id]/archive    — 보관
DELETE /api/admin/news/[id]            — 삭제 (soft 권장: status=archived 우선)
```

### 6.3 인증·인가 (sk-auth-architect 합의)

- Supabase Auth + Google OAuth
- `auth.users.app_metadata.role = 'admin'` 검증
- RLS:
  ```sql
  alter table news_reports enable row level security;

  -- 누구나 발행본 읽기
  create policy news_public_read on news_reports
    for select using (status = 'published');

  -- 관리자는 모든 행 read/write
  create policy news_admin_all on news_reports
    for all using (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    ) with check (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
  ```
- 서버 라우트(`/api/admin/news/*`)에서도 이중 검증.

### 6.4 캐싱

- `GET /api/news/latest` — `revalidate: 60` (ISR)
- 관리자 라우트 — `cache: 'no-store'`
- 발행 시 `revalidatePath('/')`, `revalidatePath('/news')`, `revalidatePath('/news/${id}')`

---

## 7. 샘플 변환 — `samplenews.md` → JSONB

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "slug": "2026-05-09-hormuz-ai-rotation",
  "title": "오늘의 마켓 리포트",
  "subtitle": "지정학 리스크 + 섹터 로테이션의 두 축",
  "status": "published",
  "report_date": "2026-05-09",
  "published_at": "2026-05-09T08:00:00Z",
  "tags": ["ai", "energy", "geopolitics", "korea"],
  "thirty_sec": "오늘 시장은 지정학 리스크(이란-미국 협상 불확실성)와 섹터 로테이션(에너지/산업재 강세 vs. 빅테크 약세) 두 축으로 움직이고 있다. S&P 500은 좁은 박스권에서 등락 중이며, 이란의 호르무즈 해협 관련 새로운 요구사항 보도 후 약세 전환. AI 인프라 투자 테마는 여전히 유효하나, 밸류에이션 부담(Shiller P/E 41)과 스태그플레이션 우려가 공존. Block(XYZ)의 호실적 서프라이즈와 AT&T의 역사적 자사주매입 전환이 개별 종목 모멘텀을 형성 중.",
  "one_liner": "AI 투자는 계속되지만 돈은 실물로 이동 중이며, 호르무즈 해협이 시장의 천장과 바닥을 동시에 결정하고 있다.",
  "expert": {
    "thirtySecBrief": "오늘 시장은 **지정학 리스크(이란-미국 협상 불확실성)**와 섹터 로테이션(에너지/산업재 강세 vs. 빅테크 약세) 두 축으로 움직이고 있다. ...",
    "headlines": [
      {
        "index": 1,
        "category": "Trending Analysis",
        "title": "The AI Boom Powering Celestica",
        "tickers": [{ "symbol": "CLS", "exchange": "NYSE", "industryId": "tech" }],
        "core": "Celestica, FY2026 매출 가이던스를 $17B로 상향하며 $1B CapEx 가속화 발표. 그러나 실적 발표 후 주가 14% 하락.",
        "point": "AI CapEx 수혜주임에도 주가 하락은 \"실적 발표 후 차익실현\" 패턴 — 저점 매수 기회인지 구조적 한계인지 판단 필요.",
        "keywords": ["AI 인프라", "CapEx", "하이퍼스케일러"]
      },
      {
        "index": 2,
        "category": "Trending Analysis",
        "title": "Uber's Earnings: The Case For 50% Upside",
        "tickers": [{ "symbol": "UBER", "exchange": "NYSE" }],
        "core": "Uber가 로보택시 위협론을 불식시키며 높은 확신의 실적 발표. 50% 추가 상승 가능성 분석.",
        "point": "자율주행이 위협이 아닌 기회로 재해석되는 내러티브 전환 — 모빌리티 섹터 재평가 가능성.",
        "keywords": ["로보택시", "모빌리티", "실적서프라이즈"]
      },
      {
        "index": 3,
        "category": "Trending Analysis",
        "title": "AT&T Crossed A Historical Point: Buybacks Surpassed Dividends",
        "tickers": [{ "symbol": "T", "exchange": "NYSE" }],
        "core": "AT&T 역사상 처음으로 자사주매입이 배당을 초과. 총주주수익률(TSY) 8% 이상.",
        "point": "전통 배당주에서 \"성장+환원\" 하이브리드로의 전환 — 통신섹터 밸류에이션 리레이팅 시그널.",
        "keywords": ["자사주매입", "배당", "자본배분"]
      },
      {
        "index": 4,
        "category": "Market News",
        "title": "Block (XYZ) Q1 Earnings Beat",
        "tickers": [{ "symbol": "XYZ", "exchange": "NYSE" }],
        "core": "Block, Q1 실적 대폭 상회 후 시간외 9.8% 급등. 2026 연간 Gross Profit 가이던스 상향($12.2B, 18% 성장).",
        "point": "인력 40% 감축과 동시에 수익성 급개선 — 핀테크 섹터의 \"효율성 혁명\" 사례.",
        "keywords": ["핀테크", "구조조정", "수익성"]
      },
      {
        "index": 5,
        "category": "Trending Analysis",
        "title": "Microsoft: A Compelling Opportunity From The Downturn",
        "tickers": [{ "symbol": "MSFT", "exchange": "NASDAQ", "industryId": "tech" }],
        "core": "빅테크 조정장에서 Microsoft가 매력적 진입 기회로 부상. AI 플레이 Top 5 선정(Wedbush).",
        "point": "테크 약세 국면에서 퀄리티 대형주로의 자금 이동 가능성 — MSFT가 \"안전한 AI 베팅\" 역할.",
        "keywords": ["빅테크조정", "AI플레이", "밸류에이션"]
      },
      {
        "index": 6,
        "category": "Analysis",
        "title": "U.S. Inflation Measures Tell Two Different Stories",
        "tickers": [],
        "core": "미국 물가 지표가 상반된 신호 발송 — CPI vs. PCE 간 괴리 확대.",
        "point": "호르무즈 폐쇄로 인한 에너지/운송비 상승이 \"스태그플레이션\" 내러티브 강화 중.",
        "keywords": ["인플레이션", "스태그플레이션", "연준정책"]
      },
      {
        "index": 7,
        "category": "Market News",
        "title": "Iran-US Negotiations Stall — 호르무즈 해협 리스크 재부각",
        "tickers": [],
        "core": "이란이 해협 통과 선박에 새 요건 부과 가능성 보도 + 미국 Project Freedom 재개 검토(WSJ).",
        "point": "유가 $100 근방 고착화 시 글로벌 경기침체 리스크 아직 시장에 미반영.",
        "keywords": ["지정학", "유가", "호르무즈"]
      },
      {
        "index": 8,
        "category": "Stock Ideas",
        "title": "Best Small Cap Value Stocks May 2026",
        "tickers": [{ "symbol": "VTWO" }],
        "core": "Russell 2000 중 수익성 있는 기업이 YTD +8% vs. 적자기업 소폭 마이너스. 퀄리티 소형주 강세.",
        "point": "소형주 로테이션이 \"퀄리티\" 중심으로 전개 — 맹목적 소형주 매수는 위험, 선별 필요.",
        "keywords": ["스몰캡", "퀄리티", "로테이션"]
      },
      {
        "index": 9,
        "category": "Analysis",
        "title": "Palantir Options Traders Brace for Double-Digit Move",
        "tickers": [{ "symbol": "PLTR", "exchange": "NASDAQ", "industryId": "tech" }],
        "core": "Palantir 실적 발표 앞두고 옵션시장이 ~10% 변동 가격 산정. 콜 옵션에 자금 집중.",
        "point": "AI 소프트웨어 대장주의 실적이 AI 테마 전체 방향성을 결정할 수 있음.",
        "keywords": ["옵션", "실적변동성", "AI소프트웨어"]
      },
      {
        "index": 10,
        "category": "Market News",
        "title": "MercadoLibre Q1 Earnings Preview",
        "tickers": [{ "symbol": "MELI", "exchange": "NASDAQ" }],
        "core": "매출 40% 성장 예상($8.32B), 컨센서스 EPS $8.47. 라틴아메리카 이커머스 대장주.",
        "point": "이머징마켓 소비 회복의 바로미터 — 핀테크+이커머스 듀얼 성장 스토리.",
        "keywords": ["이머징", "이커머스", "라틴아메리카"]
      },
      {
        "index": 11,
        "category": "Sector",
        "title": "Energy Sector — SM Energy 2026 생산 목표 420,000 BOE/d",
        "tickers": [{ "symbol": "SM" }],
        "core": "SM Energy, Q2 자사주매입 계획과 함께 생산량 목표 발표. 에너지 섹터 YTD +21%.",
        "point": "에너지 섹터가 2026년 최대 수혜 섹터로 부상 — 지정학 프리미엄 + 실적 모멘텀.",
        "keywords": ["에너지", "생산확대", "자사주매입"]
      },
      {
        "index": 12,
        "category": "Analysis",
        "title": "1999 Bubble Comparison — Shiller P/E at 41",
        "tickers": [],
        "core": "현재 Shiller P/E 41배는 인터넷 버블 이후 최고치. 밸류에이션 경고 신호.",
        "point": "과거 이 수준에서 10년 연환산 수익률은 역사적으로 매우 낮았음 — 장기 투자자 주의.",
        "keywords": ["밸류에이션", "버블", "P/E"]
      }
    ],
    "themeFlows": [
      {
        "index": 1,
        "title": "섹터 로테이션: 에너지·산업재 → 빅테크 OUT",
        "evidence": "에너지 YTD +21%, 테크 YTD -3%, 2026 Most Violent Rotation: Buy Energy, Sell Software",
        "interpretation": "시장은 \"실물자산 + 현금창출력\"을 선호하며, AI 투자 붐의 수혜가 하드웨어/에너지로 이전 중. 소프트웨어는 디레이팅 구간.",
        "nextCheckpoint": "Q2 빅테크 실적(Meta, Google CapEx 가이던스), 유가 $100 돌파 지속 여부."
      },
      {
        "index": 2,
        "title": "호르무즈 해협 / 지정학 리스크",
        "evidence": "Iran says allies violated ceasefire, Strait of Hormuz 새 요건 부과, Project Freedom 재개",
        "interpretation": "시장은 부분적 휴전 상태를 '정상'으로 가격 산정했으나, 재긴장 시 유가 스파이크($90→$100+)와 아시아 경제 타격 즉각 반영.",
        "nextCheckpoint": "이란-미국 협상 진전 여부(우라늄 양도 조건), OPEC 긴급회의 소집 여부."
      },
      {
        "index": 3,
        "title": "AI CapEx 사이클 지속",
        "evidence": "Celestica $17B 가이던스, 빅4 클라우드 합산 CapEx $700B, Palantir 실적 변동성",
        "interpretation": "AI 인프라 투자는 구조적으로 지속되나, 수혜주가 '하드웨어 제조(CLS, ANET)' → '소프트웨어(PLTR, MSFT)'로 회전 중. 밸류에이션 선별 필수.",
        "nextCheckpoint": "PLTR/MELI 실적 발표(5/8~9), NVIDIA 다음 분기 가이던스."
      },
      {
        "index": 4,
        "title": "핀테크 효율성 혁명",
        "evidence": "Block 인력 40% 감축 + 가이던스 상향, XYZ 시간외 +9.8%",
        "interpretation": "핀테크가 \"성장 at all costs\"에서 \"수익성 + 성장\"으로 전환 완료. 구조조정 후 마진 확대가 주가 재평가 동력.",
        "nextCheckpoint": "PayPal, SoFi 등 동종업체 실적 비교, 소비자 지출 데이터."
      },
      {
        "index": 5,
        "title": "스몰캡 퀄리티 로테이션",
        "evidence": "Best Small Cap Value May 2026, Russell 2000 수익성 기업 YTD +8%, 소형주 6개월간 QQQ 대비 double-digit 아웃퍼폼",
        "interpretation": "금리 안정화 + 실적 개선으로 소형주가 구조적 강세 전환. 단, 수익성 기준으로 엄격한 선별 필요.",
        "nextCheckpoint": "5월 FOMC 회의(금리 방향), Russell 2000 실적 beat rate 추이."
      },
      {
        "index": 6,
        "title": "스태그플레이션 내러티브",
        "evidence": "인플레 지표 상반된 스토리, 호르무즈 폐쇄 → 운송비/에너지비 상승, Shiller P/E 41",
        "interpretation": "\"성장 둔화 + 물가 상승\"이 동시에 나타나면 연준이 진퇴양난. 현재는 '우려' 수준이나 유가가 장기 $100+ 고착 시 현실화.",
        "nextCheckpoint": "5월 CPI 발표, 소비자신뢰지수, 고용 데이터."
      }
    ],
    "actions": [
      {
        "label": "watchlist",
        "tickers": [{ "symbol": "CLS" }],
        "body": "Watchlist 추가: CLS(Celestica) — 14% 하락 후 반등 가능성 검증. $17B 매출 가이던스 달성 확률과 AI CapEx 의존도 분석 필요."
      },
      {
        "label": "report",
        "tickers": [{ "symbol": "PLTR" }],
        "body": "리포트 확인: PLTR(Palantir) 실적 발표(5/8 장후) 결과 확인 → 옵션 내재변동성 대비 실제 변동 비교. AI 소프트웨어 밸류에이션 방향 결정."
      },
      {
        "label": "risk",
        "body": "리스크 점검: 호르무즈 해협 관련 이란-미국 협상 뉴스 모니터링. 유가가 $105 돌파 시 포트폴리오 내 에너지 비중 재검토 + 아시아 수출주 하방 리스크 산정."
      },
      {
        "label": "sector",
        "body": "섹터 비교: 에너지(XLE) vs. 테크(XLK) YTD 수익률 갭 — 역사적 평균 회귀 시점 연구. 에너지 과열 여부 RSI/밸류에이션 체크."
      },
      {
        "label": "dividend",
        "tickers": [{ "symbol": "T" }, { "symbol": "VZ" }, { "symbol": "CMCSA" }],
        "body": "배당/환원 전략 검증: AT&T(T) 자사주매입 전환 후 TSY 8% — 유사 전환 가능성 있는 통신/유틸리티 종목 스크리닝(VZ, CMCSA 등)."
      }
    ],
    "scenarios": {
      "bear": {
        "kind": "bear",
        "body": "호르무즈 해협 협상 결렬로 유가 $120+ 스파이크 → 글로벌 스태그플레이션 현실화 → 연준 금리인하 불가 → 밸류에이션 멀티플 급격 축소(Shiller P/E 41→30). 소비 위축과 기업 마진 압축 동시 발생.",
        "trigger": "이란의 해협 완전 봉쇄 선언 또는 미국의 군사작전 재개."
      },
      "base": {
        "kind": "base",
        "body": "이란-미국 협상이 불안정하나 부분적 통항 유지 → 유가 $90~$100 박스권 → 섹터 로테이션 지속(에너지/산업재 강세, 테크 횡보) → S&P 500 연말까지 한자릿수 수익률. AI CapEx는 계속되나 수혜주 선별 심화.",
        "trigger": "이란 협상 '현 상태 유지' + FOMC 금리 동결 지속."
      },
      "bull": {
        "kind": "bull",
        "body": "이란-미국 핵합의 타결 → 유가 $70대 급락 → 인플레 해소 기대로 연준 금리인하 → 테크 + 소형주 동반 랠리 → S&P 500 사상최고치 경신. Shiller P/E 높지만 이익성장으로 정당화.",
        "trigger": "이란 우라늄 해외이전 합의 + 호르무즈 완전 개방."
      }
    },
    "oneLiner": "AI 투자는 계속되지만 돈은 실물로 이동 중이며, 호르무즈 해협이 시장의 천장과 바닥을 동시에 결정하고 있다.",
    "fundFlow": {
      "outflows": [
        { "name": "기술주(Tech)", "ytdPct": -3, "note": "AI 투자붐에도 불구하고 밸류에이션 부담 + 실적 성장 둔화. 소프트웨어 중심으로 디레이팅." },
        { "name": "금융(Financials)", "note": "시장 대비 부진. 금리 방향 불확실성이 은행 수익 전망 압박." }
      ],
      "inflows": [
        { "name": "에너지(Energy)", "ytdPct": 21, "note": "호르무즈 지정학 프리미엄 + OPEC 감산 + 실적 호조." },
        { "name": "소재(Materials)", "ytdPct": 17, "note": "인프라 투자 + 원자재 가격 상승 수혜." },
        { "name": "산업재(Industrials)", "ytdPct": 12, "note": "리쇼어링/국방비 증가 수혜." },
        { "name": "필수소비재(Staples)", "ytdPct": 15, "note": "경기방어 선호 + 배당 매력." },
        { "name": "유틸리티(Utilities)", "note": "AI 데이터센터 전력 수요 + 방어적 포지셔닝." }
      ],
      "driver": "실물자산(에너지, 원자재)과 현금흐름이 안정적인 기업으로의 자금 이동이 2026년의 가장 뚜렷한 시장 트렌드. 이는 (1) 지정학 불확실성, (2) 인플레이션 헤지 수요, (3) 테크 밸류에이션 과열 피로감의 복합 작용."
    },
    "koreanStocks": [
      {
        "index": 1,
        "name": "SK하이닉스",
        "code": "000660",
        "opinion": "buy",
        "rationale": "한국 KOSPI 75% 급등의 핵심 드라이버. AI 반도체 수요 구조적 확대(빅4 클라우드 CapEx $700B). HBM 공급 타이트닝 지속.",
        "risk": "유가 상승 시 한국(순에너지 수입국) 경제 전반 타격 가능. 단, 반도체 수출 호조가 상쇄.",
        "comment": "매수 유지. AI CapEx 사이클이 꺾이지 않는 한 구조적 강세."
      },
      {
        "index": 2,
        "name": "삼성전자",
        "code": "005930",
        "opinion": "buy_selective",
        "rationale": "시가총액 $1T 돌파 임박. AI 메모리 수요 + KOSPI 비중 25%로 인덱스 자금 유입 수혜.",
        "risk": "파운드리 사업 경쟁력 약화, 비메모리 부문 부진. 밸류에이션이 역사적 고점 근접.",
        "comment": "선별적 매수. 메모리 사이클 피크 신호(재고 축적, ASP 하락) 모니터링 필요."
      },
      {
        "index": 3,
        "name": "HD현대중공업",
        "code": "329180",
        "opinion": "buy",
        "rationale": "호르무즈 해협 리스크로 해운/조선 수요 급증. 산업재 섹터 글로벌 강세(YTD +12%)와 동조. 미 해군 함정 발주 기대.",
        "risk": "지정학 해소 시 프리미엄 소멸 가능.",
        "comment": "매수. 중기적으로 선박 발주 사이클이 구조적으로 지지."
      },
      {
        "index": 4,
        "name": "에코프로비엠",
        "code": "247540",
        "opinion": "neutral",
        "rationale": "소재 섹터 글로벌 강세(YTD +17%)지만, 2차전지 소재는 EV 수요 둔화와 중국 경쟁 심화로 차별화.",
        "risk": "글로벌 소재 강세가 '배터리 소재'가 아닌 '산업용 원자재(구리, 알루미늄)' 중심. EV 보조금 정책 불확실성.",
        "comment": "중립. 섹터 강세와 개별 실적 간 괴리 확인 후 진입."
      },
      {
        "index": 5,
        "name": "S-Oil",
        "code": "010950",
        "opinion": "buy",
        "rationale": "에너지 섹터 글로벌 최강세(YTD +21%). 호르무즈 지정학 프리미엄으로 정유 마진 확대. 한국 내 대표 에너지주.",
        "risk": "이란 합의 시 유가 급락 → 정유마진 압축. 아람코 지분 구조상 배당 정책 변수.",
        "comment": "매수. 단, 이란 협상 타결 시나리오에 대비한 손절 기준 설정 필요."
      }
    ]
  },
  "novice": {
    "oneLineSummary": "미국이랑 이란이 싸우고 있어서 기름값이 비싸고, 그래서 테크 주식보다 에너지/공장 관련 주식이 더 잘 나가는 중이야.",
    "events": [
      {
        "index": 1,
        "title": "AI 관련주는 여전히 핫해",
        "body": "Celestica(CLS)라는 AI 서버 부품 만드는 회사가 올해 매출 목표를 확 올렸어. 근데 주가는 실적 발표 후 오히려 14% 떨어짐. 이미 많이 올랐으니까 차익실현한 거야.\n\nPalantir(PLTR)는 오늘 실적 발표하는데, 옵션시장에서 10% 이상 움직일 거라고 예상하고 있어."
      },
      {
        "index": 2,
        "title": "Uber 잘 나가",
        "body": "\"로보택시 때문에 Uber 망하는 거 아냐?\" 걱정했는데, 오히려 실적이 좋아서 50% 더 오를 수 있다는 분석이 나왔어."
      },
      {
        "index": 3,
        "title": "Block(XYZ) 대박",
        "body": "핀테크 회사인 Block이 직원 40% 자르고 수익을 확 끌어올렸어. 주가 시간외에서 거의 10% 뛰었어."
      },
      {
        "index": 4,
        "title": "AT&T가 역사를 만들었어",
        "body": "원래 AT&T는 배당금으로 유명한 회사인데, 처음으로 자사주매입(회사가 자기 주식 사는 것)이 배당보다 더 많아짐. 주주한테 돌려주는 총 수익이 8% 넘어."
      },
      {
        "index": 5,
        "title": "기름값 문제가 심각해",
        "body": "이란이 호르무즈 해협(전세계 석유 25%가 지나가는 좁은 바닷길)을 위협하고 있어서, 기름값이 $100 근처에서 안 내려와. 이게 오래가면 경기침체 올 수도 있어."
      },
      {
        "index": 6,
        "title": "돈의 흐름이 바뀌고 있어",
        "body": "올해: 에너지 +21%, 소재 +17%, 산업재 +12%, 필수소비재 +15%\n반면 테크는 -3%\n쉽게 말하면 \"진짜 물건 만드는 회사\"로 돈이 몰리고, \"소프트웨어/앱 회사\"에서는 빠지는 중이야."
      }
    ],
    "stockTables": [
      {
        "bucket": "will_rise",
        "rows": [
          { "ticker": { "symbol": "XYZ", "name": "Block" }, "reason": "실적 대폭 상회 + 가이던스 상향. 모멘텀 강함" },
          { "ticker": { "symbol": "UBER", "name": "Uber" }, "reason": "로보택시 우려 해소 + 실적 서프라이즈" },
          { "ticker": { "symbol": "T", "name": "AT&T" }, "reason": "자사주매입 전환 → 밸류에이션 리레이팅" },
          { "ticker": { "symbol": "SM", "name": "SM Energy" }, "reason": "에너지 섹터 강세 + 생산 확대 + 자사주매입" },
          { "ticker": { "symbol": "MELI", "name": "MercadoLibre" }, "reason": "매출 40% 성장 예상. 이머징마켓 대장주" }
        ]
      },
      {
        "bucket": "will_fall",
        "rows": [
          { "ticker": { "symbol": "CLS", "name": "Celestica" }, "reason": "실적 발표 후 14% 하락. 추가 차익실현 가능" },
          { "ticker": { "symbol": "XLK", "name": "소프트웨어 섹터 전반" }, "reason": "섹터 로테이션으로 자금 유출 중" },
          { "ticker": { "symbol": "SPX", "name": "고P/E 테크주" }, "reason": "Shiller P/E 41 경고. 밸류에이션 부담 → 금리/인플레 악재에 취약" }
        ]
      },
      {
        "bucket": "buy_on_dip",
        "rows": [
          { "ticker": { "symbol": "MSFT", "name": "Microsoft" }, "reason": "조정 시 \"안전한 AI 베팅\". 퀄리티 대형주" },
          { "ticker": { "symbol": "CLS", "name": "Celestica" }, "reason": "AI CapEx $700B 수혜. 단기 낙폭 과대 시 매수 기회" },
          { "ticker": { "symbol": "PLTR", "name": "Palantir" }, "reason": "AI 소프트웨어 대장주. 실적 후 급락 시 장기 매수 관점" }
        ]
      }
    ],
    "koreanStocks": [
      {
        "index": 1,
        "name": "SK하이닉스",
        "code": "000660",
        "action": "사",
        "body": "AI 반도체 수요가 미쳤어. 빅테크 4개 회사가 올해 서버에 $700B(약 1,000조원) 쓰겠다잖아. HBM 메모리 품귀 현상 계속될 거야."
      },
      {
        "index": 2,
        "name": "삼성전자",
        "code": "005930",
        "action": "조심하면서 사",
        "body": "시총 $1T(1조 달러) 찍을 뻔했어. 메모리는 좋은데, 파운드리가 좀 걱정. 너무 비싸지면 좀 기다려."
      },
      {
        "index": 3,
        "name": "HD현대중공업",
        "code": "329180",
        "action": "사",
        "body": "호르무즈 해협 긴장 → 배 많이 필요 → 조선주 호황. 미국 해군 발주도 기대되고."
      },
      {
        "index": 4,
        "name": "에코프로비엠",
        "code": "247540",
        "action": "지켜봐",
        "body": "글로벌 소재 섹터 강세인 건 맞는데, 배터리 소재는 EV 수요 문제로 따로 놀아. 확실해질 때까지 관망."
      },
      {
        "index": 5,
        "name": "S-Oil",
        "code": "010950",
        "action": "사",
        "body": "기름값 비쌀 때 정유회사가 돈을 벌어. 지금 에너지가 올해 제일 잘 나가는 섹터야(+21%). 다만 이란 협상 타결되면 빠질 수 있으니 손절라인은 정해놔."
      }
    ],
    "closing": "AI는 계속 돈을 쓰고, 기름값은 비싸고, 테크에서 실물경제로 돈이 이동 중. 반도체/에너지/조선이 핵심 키워드야."
  }
}
```

---

## 8. a11y / 반응형 가이드

### 8.1 a11y

| 요소 | 처리 |
|------|------|
| 뷰 토글 | `role="tablist"` / `role="tab"` / `aria-selected` / 화살표 키 네비 |
| 시나리오 카드 | `role="group"` + `aria-labelledby="scenario-bear/base/bull"` |
| TOC | `<nav aria-label="리포트 목차">` + 현재 섹션 `aria-current="location"` |
| 티커 칩 | `<button>` (모달) 또는 `<a>` (라우팅) — 절대 `div` X |
| 의견 뱃지 | 색상 + 텍스트 (색맹 대응) — `매수`/`중립` 등 텍스트 항상 노출 |
| 헤드라인 카드 | `<article aria-labelledby="headline-{n}-title">` |
| 인라인 markdown | `react-markdown` 사용 (XSS 방어 자동) |
| 면책 조항 | 페이지 하단 `<aside aria-label="투자 면책 조항">` |
| 폼 | 모든 input에 `<label>` 연결, error 메시지 `aria-describedby` |

### 8.2 반응형 (모바일 우선)

| 요소 | 모바일 (<640px) | sm | lg+ |
|------|------|------|------|
| 메인 카드 | 풀폭 | 풀폭 | 풀폭 |
| 헤드라인 카드 | 1col | 1col | 1col (가독성 우선) |
| 시나리오 카드 | 1col 스택 | 1col | 3col 가로 |
| 자금흐름 맵 | 1col 스택 (out → in → driver) | 1col | 2col (out/in) + driver below |
| 한국 주식 카드 | 1col | 2col | 2col |
| TOC | 상단 collapsible | 상단 | 우측 sticky |
| 뷰 토글 | full-width segment | inline segment | inline segment |
| 카테고리 칩 | 작은 크기 | 작은 크기 | 표준 |

### 8.3 성능

- 상세 페이지 ISR `revalidate: 300` (5분)
- TOC scroll-spy는 `IntersectionObserver` 사용 (rAF X)
- 헤드라인이 15개 초과 시 lazy mount 고려 (Phase 2)
- markdown 렌더는 컴포넌트 메모이제이션 (`useMemo` + 본문 해시)

---

## 9. 협업 인터페이스 (다른 에이전트)

### 9.1 sk-auth-architect

- `news_reports` 테이블에 대해 위 §6.3의 RLS 정책 합의
- 미들웨어 보호 라우트: `/admin/news/**`, `/api/admin/news/**`
- Supabase JWT의 `app_metadata.role = 'admin'` 검증
- Editor용 토큰 만료 시 임시저장 보장 (localStorage backup)

### 9.2 sk-data-modeler

- `news_reports` DDL 통합 마이그레이션 작성 (Drizzle 또는 Supabase migration)
- 인덱스: `(status, published_at desc)`, `(report_date desc)`, `tags GIN`
- 후속(Phase 2): `expert` JSONB GIN 인덱스 (`jsonb_path_ops`)
- `updated_at` 트리거
- 시드: 본 문서 §7의 JSON을 초기 published 리포트로 삽입

### 9.3 sk-ui-planner

- 메인(`/`) 카드 위치: **MarketPulseStrip 바로 아래, 산업 카드 그리드 위**
- 카드 포맷: 제목 + 한 줄 결론(`one_liner`) + 30초 브리핑(`thirty_sec`, line-clamp-3) + 발행일 + 태그 + CTA "상세 보기"
- 태그 필터는 Phase 2 (목록 페이지 전용)
- `/news` 글로벌 네비 추가 검토 (헤더 메뉴: 메인 / 산업 / 마켓 리포트)

### 9.4 sk-implementer

- 위 §3 카탈로그를 components/news/ 하위에 1:1 구현
- `react-markdown` + `remark-gfm` 도입 (`pnpm add react-markdown remark-gfm`)
- API: `app/api/news/**`, `app/api/admin/news/**`
- 페이지: `app/news/page.tsx`, `app/news/[id]/page.tsx`, `app/admin/news/**`

### 9.5 sk-verifier

- 검수 체크리스트:
  - [ ] 발행 리포트 0건일 때 메인 카드 미노출
  - [ ] 비로그인 사용자가 `/admin/news` 접근 시 차단
  - [ ] non-admin 로그인 사용자가 `POST /api/admin/news` 시 403
  - [ ] 토글 전환 시 URL 쿼리 보존 + 새로고침에도 유지
  - [ ] 헤드라인 티커가 `industryId` 있으면 라우팅, 없으면 비활성
  - [ ] 모바일에서 시나리오 3분할이 1col로 정상 스택
  - [ ] 발행 후 메인/`/news`/`/news/[id]` 즉시 갱신
  - [ ] 이모지 0개 (lucide만)
  - [ ] zod 검증 실패 시 첫 에러로 자동 스크롤
  - [ ] 면책 조항 모든 상세 페이지 노출

---

## 부록: 마일스톤

| 단계 | 산출물 |
|------|------|
| M1 (DDL) | `news_reports` 테이블 + RLS + 트리거 + 시드 1건 |
| M2 (Read) | `GET /api/news/latest`, `/api/news`, `/api/news/[id]` + 메인 카드 + `/news` 목록 + `/news/[id]` 상세 (전문가/초보자 토글) |
| M3 (Write) | `/admin/news` 목록 · 신규 · 편집 · 미리보기 · 발행/임시저장 |
| M4 (Polish) | TOC scroll-spy, 모바일 sheet TOC, 티커 cross-link, ISR 캐시 |
| M5 (Phase 2) | 풀텍스트 검색 (GIN), 회사 모달, 댓글/구독, RSS |
