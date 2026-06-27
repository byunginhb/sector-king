# Sector King — Design Vision v2

> 작성: sk-design-system / 2026-05-09
> 대상: 메인 화면(`/`) 및 산업 단위 페이지 전반의 시각 품질 업그레이드
> 의존: 기존 shadcn/ui + Tailwind v4 토큰 컨벤션 / recharts / framer-motion / lucide-react

---

## 1. 비전 + 무드보드

### 비전 한 문장
> **"Bloomberg의 정보 밀도를 Linear의 절제된 톤으로 풀어낸, 한국 투자자를 위한 패권 지도."**

핵심 키워드: **Dense yet Calm**, **Data-first**, **Quiet Luxury**, **Tabular Numerals**.

### 무드보드 (텍스트 묘사)
- **베이스 톤**: 다크 모드는 순흑이 아닌 `slate-950` 계열의 *블루 그레이*. 라이트 모드는 차가운 흰색 대신 `stone-50`에 가까운 *warm off-white*.
- **포인트 컬러**: 단일 강조색(`amber/gold`)을 "왕좌·1위·하이라이트"에만 사용. 상승/하락은 채도를 한 단계 낮춘 *teal/emerald*와 *rose/coral* — 새빨강·새파랑은 금기.
- **텍스처**: 카드는 1px 보더 + 미세 그라데이션(top→bottom 0.5% lift). 그림자는 거의 없으며, 대신 **뉴모피즘 없는 평면적 다층 구조**.
- **타이포그래피**: 본문 Geist Sans, 숫자는 *Tabular numeric variant*. 큰 KPI는 **font-feature `tnum` + tight tracking**.
- **모션**: framer-motion은 "변화가 있을 때만". hover 시 1px lift, 데이터 갱신 시 250ms crossfade. 화살표 파티클은 톤다운 — *간헐적 흐름*만.
- **레퍼런스 비주얼 톤**: Koyfin 다크 + Stripe Dashboard의 카드 곡선 + Arc의 금색 강조 + TradingView의 sparkline 밀도.

---

## 2. 레퍼런스 패턴 표

| 레퍼런스 | 차용 포인트 | Sector King 적용 |
|---------|------------|-----------------|
| **Koyfin** | 다크 베이스 + 한 색 강조 / 좌측 네비 + KPI 띠 / 표 zebra 미사용·1px 행 구분 | 다크 토큰 재정의(`slate-950`), 헤더 하단 *Market Pulse 띠* 도입 |
| **TradingView** | 미니 sparkline 24px 높이 / 가격 변화 색 + 화살표 / 호버 시 ticker tape | 산업 카드에 14일 sparkline 추가, 핫 섹터 ticker tape (자동 스크롤) |
| **Bloomberg Terminal** | 정보 밀도 극단 / monospace 숫자 / 색상 코드 일관 | `font-feature-settings: 'tnum'` 전역 숫자 / 상승=teal·하락=rose 단일 매핑 |
| **Linear** | 다크 우선 디자인 / 1px 보더 + 미세 hover lift / 침착한 타이포 | hover transition `translate-y-[-1px]` + `border-color` 전환만 |
| **Stripe Dashboard** | 부드러운 KPI 카드 / 라벨 위 보조 텍스트 / 마이크로인터랙션 | KPI 카드 `rounded-2xl` + 카운트업 애니메이션 |
| **Finimize** | 모바일 카드 1열 스택 / 짧은 인사이트 캡션 | 모바일에서 산업 카드에 *한 줄 인사이트* 추가 ("AI 칩 강세 지속") |
| **Arc Browser** | warm gradient + 골드 액센트 / 로고 글로우 | 헤더 로고에 부드러운 골드 글로우 / `--primary` amber 유지 |
| **Finimize / Robinhood** | 상승·하락 색의 채도 한 단계 낮춤 | `emerald-500` 대신 `teal-400`, `rose-500` 대신 `rose-400` |

---

## 3. 컬러 토큰 업그레이드

### 3.1 다크 모드 (Before → After)

```css
/* BEFORE — warm 톤 단일 베이스 */
--background: 20 10% 8%;
--foreground: 30 10% 95%;
--card:       20 10% 10%;
--muted:      20 10% 15%;
--border:     20 10% 18%;
--primary:    30 15% 70%;   /* 강조색이 회색에 가까움 */

/* AFTER — Bloomberg/Koyfin 톤의 차분한 슬레이트 + 골드 액센트 */
--background:  222 24%  6%;  /* #0A0E14 거의 검정에 가까운 슬레이트 */
--surface-1:   222 20%  9%;  /* #0F141C 카드 베이스 */
--surface-2:   220 18% 12%;  /* #161C26 카드 hover / nested */
--surface-3:   220 16% 16%;  /* #1F2733 elevated */
--card:        222 20%  9%;
--card-foreground: 220 14% 96%;
--foreground:  220 14% 96%;
--muted:       220 16% 14%;
--muted-foreground: 220 10% 62%;
--border:      220 14% 20%;  /* 1px hairline */
--border-subtle: 220 14% 16%;
--primary:      43 92% 58%;   /* #F2C24A 골드 액센트 */
--primary-foreground: 222 24% 6%;
--accent:      220 16% 14%;
--accent-foreground: 43 92% 70%;

/* Status — 채도 한 단계 down (눈 피로 ↓) */
--success:    160 60% 45%;   /* teal-400 상승 */
--success-bg: 160 60% 12%;
--danger:       0 75% 62%;   /* rose-400 하락 */
--danger-bg:    0 60% 14%;
--warning:     38 92% 60%;   /* amber 경고 (primary와 별도) */
--info:       210 90% 62%;   /* sky 정보 */

/* Chart palette — 8색 (Koyfin 영감) */
--chart-1: 43 92% 58%;   /* gold */
--chart-2: 160 60% 50%;  /* teal */
--chart-3: 210 90% 62%;  /* sky */
--chart-4: 280 65% 65%;  /* violet */
--chart-5:   0 75% 62%;  /* rose */
--chart-6:  30 90% 58%;  /* orange */
--chart-7: 190 70% 55%;  /* cyan */
--chart-8: 145 50% 55%;  /* lime-green */
```

### 3.2 라이트 모드 (Before → After)

```css
/* BEFORE — 차가운 회색 (#F6F7F9) */
--background: 220 14% 97%;

/* AFTER — warm off-white + paper texture 톤 */
--background: 36 20% 98%;    /* #FAF9F6 stone-50 톤 */
--surface-1:  0 0% 100%;     /* 카드 순백 */
--surface-2: 36 14% 96%;     /* hover */
--surface-3: 36 12% 93%;     /* nested */
--card: 0 0% 100%;
--card-foreground: 222 47% 11%;
--foreground: 222 30% 16%;
--muted: 36 14% 95%;
--muted-foreground: 220 9% 42%;
--border: 220 14% 88%;
--border-subtle: 220 14% 93%;
--primary: 38 92% 50%;        /* amber 정통 */
--primary-foreground: 0 0% 100%;

/* Status (라이트) */
--success:  160 70% 35%;     /* teal-700 */
--success-bg: 160 50% 94%;
--danger:     0 72% 50%;     /* rose-600 */
--danger-bg:  0 75% 96%;
--warning:   30 90% 45%;
--info:    210 85% 50%;
```

### 3.3 토큰 확장 — 신규 의미 토큰

| 신규 토큰 | 용도 | 예시 |
|---------|-----|-----|
| `--surface-1/2/3` | 카드 깊이 단계 | base / hover / elevated |
| `--border-subtle` | 표 행 구분, 섬세한 영역 분할 | `border-border-subtle` |
| `--success / --danger / --warning / --info` | 의미 색상 단일 진실 | 기존 `text-emerald-*` 직접 사용 → `text-success` 매핑 |
| `--chart-1..8` | recharts 팔레트 일관성 | `useTokenColors()` 훅으로 노출 |

---

## 4. 타이포 토큰 + 숫자 전용 처리

### 4.1 폰트 스택
- 본문: `var(--font-geist-sans)` (그대로 유지)
- 숫자 KPI: 동일 폰트, **`font-feature-settings: 'tnum' 1, 'lnum' 1`** 강제 → tabular numerals
- 모노 (티커·금액 디테일): `var(--font-geist-mono)`

### 4.2 globals.css 추가

```css
@layer base {
  /* 숫자 정렬 일관성 */
  .tabular-nums,
  .num,
  [data-num] {
    font-feature-settings: "tnum" 1, "lnum" 1;
    font-variant-numeric: tabular-nums lining-nums;
    letter-spacing: -0.01em;
  }
}
```

### 4.3 위계 표

| 토큰 | 클래스 | 용도 |
|-----|-------|-----|
| `display` | `text-3xl sm:text-4xl font-bold tracking-tight` | 페이지 타이틀, 메가 KPI |
| `kpi-lg` | `text-2xl sm:text-3xl font-bold tabular-nums tracking-tight` | KPI 띠 큰 숫자 |
| `kpi-md` | `text-lg sm:text-xl font-bold tabular-nums` | 카드 KPI |
| `kpi-sm` | `text-base font-semibold tabular-nums` | 보조 KPI |
| `heading` | `text-base font-bold leading-tight` | 카드 제목 |
| `label` | `text-xs font-medium text-muted-foreground uppercase tracking-wider` | KPI 위 라벨 ("총 시가총액") |
| `caption` | `text-xs text-muted-foreground` | 보조 캡션 |
| `mono-sm` | `font-mono text-xs tabular-nums` | 티커, 코드, 시간 |

라벨에 `uppercase tracking-wider` 적용은 *Stripe / Koyfin* 패턴. 한글 라벨은 uppercase 효과가 없으므로 한글 라벨은 `text-xs font-medium tracking-tight`로 대체.

---

## 5. 카드 디자인 시스템 업그레이드

### 5.1 카드 토큰 (베이스)

```
border-radius: rounded-xl (12px)         → rounded-2xl (16px) 로 통일
border:        border border-border      → border border-border-subtle (1px hairline)
background:    bg-card                   → bg-surface-1 (다크에서 깊이감)
padding:       p-4                       → p-5 (KPI 카드는 p-6)
shadow:        hover:shadow-lg           → hover:shadow-[0_1px_0_0_var(--border)] + translate-y
hover:         scale 없음, color 변화만   → border-color → primary/30 + bg-surface-2
transition:    transition-all (300ms)    → transition-[border,background,transform] (200ms ease-out)
```

### 5.2 산업 카드 (After)

구성 (위→아래):
1. **헤더**: 아이콘(24px, `text-muted-foreground`) + 산업명(heading) + 영문(caption)
2. **KPI**: 라벨("총 시가총액") + 큰 숫자(kpi-md, tabular-nums) + Δ% 배지(success/danger 토큰)
3. **미니 sparkline (NEW)**: 14일 시가총액 변화 — 높이 32px, recharts `<Area>` (fill `currentColor / 0.15`)
4. **3열 스탯**: 카테고리/섹터/기업 — 기존 유지 but `bg-muted/50` → `bg-surface-2` + 1px top hairline
5. **인사이트 한 줄 (NEW, 모바일 우선)**: "AI 칩 강세 지속" — `text-xs text-muted-foreground line-clamp-1`

### 5.3 자금 흐름 카드

- 화살표 파티클: opacity `0.6 → 0.3`, count `12 → 6`, duration `1.2s → 2.0s`
- 데이터 강조로 전환: 좌측 큰 숫자(유입/유출 합계), 우측 미니 막대 그래프
- 색상: 단순 emerald/rose → `--success / --danger` 토큰

### 5.4 KPI 띠 카드 (NEW)

헤더 아래 sticky 영역, 4열 그리드:

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ 전체 시가총액    │ 전일 대비        │ 핫 섹터 (Top)    │ 시장 분위기      │
│ $XX.X T          │ +1.24%           │ 반도체  +3.4%    │ Risk-On  ●●●○○   │
│ ─sparkline 24px─ │ ▲ 7일 추세       │ AI 칩  +2.1%     │ 7일 평균 변동성  │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

---

## 6. 신규 모듈 패턴

### 6.1 `<MarketPulseStrip />` (KPI 띠)

```tsx
interface MarketPulseStripProps {
  region: 'global' | 'kr' | 'us'
  metrics: {
    totalMarketCap: { value: number; deltaPct: number; trend: number[] }
    dayChange: { pct: number; direction: 'up' | 'down' }
    hotSector: { name: string; deltaPct: number }
    sentiment: { label: string; score: number /* 0-1 */ }
  }
}
```
- 위치: 메인 헤더 직후, `sticky top-[64px]`
- 데스크탑: 4열 / 태블릿: 2열 / 모바일: 가로 스크롤(snap)
- 배경: `bg-surface-1/80 backdrop-blur` + bottom 1px border

### 6.2 `<MiniSparkline />`

```tsx
interface MiniSparklineProps {
  data: number[]        // 14~30 포인트
  variant?: 'auto' | 'success' | 'danger' | 'neutral'  // auto: 첫·마지막 비교
  height?: number       // 기본 32
  showDot?: boolean     // 마지막 점 강조
}
```
- recharts `ResponsiveContainer + AreaChart` / `<Area dot={false} strokeWidth={1.5}>` / 그라데이션 `defs`
- variant=auto: `data[last] >= data[0]` → success 색, 아니면 danger
- 호버 비활성 (카드 일부로만 사용, 인터랙션은 카드가 담당)

### 6.3 `<DataTable />` 표준

규칙:
- zebra 사용 안 함, 행 사이 `border-b border-border-subtle`
- sticky header: `bg-surface-1/95 backdrop-blur`
- 정렬 인디케이터: `<ChevronUp className="h-3 w-3 opacity-60">` (active 시 opacity-100 + text-primary)
- 숫자 컬럼: `text-right tabular-nums`
- 호버: 행 전체 `bg-surface-2`, 200ms
- 모바일: `overflow-x-auto` + 첫 컬럼 `sticky left-0 bg-surface-1`

### 6.4 `<TickerTape />` (NEW)

핫 섹터/회사를 가로 자동 스크롤로 표시 (TradingView 패턴):
- 마우스 오버 시 일시정지
- 각 항목: `[티커] [회사명] [가격] [Δ%]` — 모노 폰트
- 무한 루프: 듀얼 트랙 + `animate-marquee` (framer-motion 또는 CSS keyframes)

### 6.5 빈 상태 / 로딩 스켈레톤

- 빈 상태: lucide `Inbox / SearchX / TrendingDown` 64px `text-muted-foreground/40` + 한 줄 카피 + 액션 버튼
- 스켈레톤: 단조로운 회색이 아닌 `bg-surface-2` + 미세 shimmer (1px gradient 좌→우, 1.5s)
- 스켈레톤은 **실제 카드 모양과 동일한 여백/크기**로 — layout shift 방지

---

## 7. 메인 화면 ASCII 와이어프레임

### 7.1 데스크탑 (≥1024px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [logo] Sector King · 산업별 투자 패권 지도        [04-15 · 5h ago] [KR/US]  │
│                                                   [Share][Search][?][Theme] │
├─────────────────────────────────────────────────────────────────────────────┤  ← sticky
│  TOTAL MCAP        DAY CHANGE       HOT SECTOR       MARKET MOOD            │  ← MarketPulseStrip
│  $54.21 T          +1.24% ▲         Semiconductors   Risk-On  ●●●○○         │
│  ──14d sparkline   7d ▲             +3.42%           σ(7d) 1.4%             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▌Industry Money Flow      산업별 자금 흐름 — 시총 변화로 본 유입·유출   [7d]│
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │   [Tech] →→→→→→→→→→→→→→→  +$420B    [Healthcare] ←←  -$32B            │ │
│ │   [Finance] →→  +$84B               [Energy] ←←←  -$110B               │ │
│ │   (기존 컴포넌트 — 파티클 톤다운, 화살표 6개로 축소)                    │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ▌Industry Hegemony Map    산업 패권 지도 — 클릭하여 드릴다운             [↗]│
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐              │
│ │ [Cpu]  Tech      │ │ [Stetho] Health  │ │ [Zap]  Energy    │              │
│ │ Technology       │ │ Healthcare       │ │ Energy/Resources │              │
│ │                  │ │                  │ │                  │              │
│ │ TOTAL MCAP       │ │ TOTAL MCAP       │ │ TOTAL MCAP       │              │
│ │ $18.4T  +1.24% ▲ │ │ $7.2T   -0.32% ▼ │ │ $4.8T   +0.81% ▲ │              │
│ │ ──14d sparkline──│ │ ──14d sparkline──│ │ ──14d sparkline──│              │
│ │ "AI 칩 강세 지속"│ │ "헬스케어 횡보"  │ │ "원유 재고 우려" │              │
│ │ ────────────────  │ │ ────────────────  │ │ ────────────────  │              │
│ │  3      12     74│ │  4      8      52│ │  3      9      40│              │
│ │ Cat   Sect   Comp│ │ Cat   Sect   Comp│ │ Cat   Sect   Comp│              │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘              │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐              │
│ │ [ShoppingCart] … │ │ [Landmark] …     │ │ [Building2] …    │              │
│ │  Consumer        │ │  Finance         │ │  Real Estate     │              │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘              │
│                                                                              │
│ ▌Hot Sectors & Companies  핫 섹터/회사 — 24시간                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ◀ NVDA $924  +3.4%  ·  TSM $218  +2.1%  ·  ASML $1042 +1.9%  · …    ▶ │ │  ← TickerTape
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ▌Market Summary           시장 동향 요약                                     │
│ ┌─────────────────────────────────────┬─────────────────────────────────┐  │
│ │  Company Statistics                 │  Price Changes (Top movers)     │  │
│ │  ├ 신규 상장   12                   │  ├ 상승 NVDA   +3.4%            │  │
│ │  ├ 시총 1조 ↑  84                   │  ├ 상승 TSM    +2.1%            │  │
│ │  └ ─sparkline─                      │  └ 하락 INTC   -2.8%            │  │
│ └─────────────────────────────────────┴─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 모바일 (≤640px)

```
┌─────────────────────────┐
│ [logo] Sector King      │
│ 산업별 투자 패권 지도   │
│ [04-15][KR][?][Theme]   │
├─────────────────────────┤  ← sticky
│ ─── MARKET PULSE ───    │  ← 가로 스크롤 snap
│ ┌──────────┐┌──────────┐│
│ │TOTAL MCAP││DAY CHANGE││
│ │$54.21T   ││+1.24% ▲  ││
│ │─sparkl── ││7d ▲      ││
│ └──────────┘└──────────┘│
├─────────────────────────┤
│ ▌Industry Money Flow    │
│ ┌─────────────────────┐ │
│ │ Tech    +$420B  ▲   │ │
│ │ Finance +$84B   ▲   │ │
│ │ Energy  -$110B  ▼   │ │
│ └─────────────────────┘ │
│                         │
│ ▌Industry Hegemony      │
│ ┌─────────────────────┐ │
│ │ [Cpu] Tech          │ │
│ │ $18.4T   +1.24% ▲   │ │
│ │ ────sparkline────   │ │
│ │ "AI 칩 강세 지속"   │ │
│ │ 3 cat · 12 sec · 74 │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ [Stetho] Healthcare │ │
│ │ ...                 │ │
│ └─────────────────────┘ │
│                         │
│ ▌Hot Tickers ─────►     │  ← TickerTape
│ NVDA +3.4 · TSM +2.1…   │
│                         │
│ ▌Summary                │
│ ┌─────────────────────┐ │
│ │ Companies stats     │ │
│ ├─────────────────────┤ │
│ │ Price changes       │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## 8. 마이크로인터랙션 가이드

### 8.1 원칙 — "조용한 모션"
- **변화가 있을 때만**, 그리고 **200ms 이내**.
- 페이지 진입 시 stagger 진입 모션 금지(이미 데이터가 보이는 게 우선).
- 호버 모션은 **1px 이하 lift + border 색 전환**만. scale/shadow 변화는 KPI 카드에 한정.

### 8.2 패턴 표

| 상황 | 모션 | 토큰 |
|-----|-----|-----|
| 카드 hover | `translate-y-[-1px]` + `border-color → primary/30` | 200ms ease-out |
| 카드 click (Link) | `scale-[0.99]` 100ms 후 navigate | tap 피드백 |
| KPI 숫자 변경 | crossfade 250ms (이전→새 값) | framer `<AnimatePresence mode="popLayout">` |
| 카운트업 진입 | 0 → 실제값, 600ms ease-out, **첫 1회만** | `useCountUp` 훅 |
| Sparkline 진입 | 좌→우 stroke draw 600ms | `<motion.path strokeDasharray>` |
| 페이지 전환 | 100ms opacity fade-in (Next.js loading.tsx 활용) | `opacity-0 → 100` |
| 자금 흐름 화살표 | duration 2.0s, 6개, opacity 0.3 | 기존 컴포넌트 톤다운 |
| TickerTape | 무한 marquee 60s, hover 시 paused | CSS `animation` |
| 데이터 새로고침 | 카드 우상단 mini spinner (lucide `Loader2 animate-spin`) | 12px |

### 8.3 framer-motion 사용 가이드

- `motion.*` 컴포넌트는 **카드 단위에서 1회**만 사용.
- 리스트 stagger는 첫 진입 시만 (`useInView({ once: true })`).
- prefers-reduced-motion 존중: globals.css에 `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0s !important; transition-duration: 0s !important; } }`.

---

## 9. 구현 우선순위

### Phase 1 — 토큰 리프레시 (저위험, 즉시 임팩트)
*예상 변경 범위: `app/globals.css` + `lib/format.ts` 보조 + 일부 컴포넌트 클래스 미세조정*

1. `app/globals.css` 다크/라이트 토큰 교체 (Section 3)
2. 신규 의미 토큰 추가: `--success / --danger / --warning / --info / --surface-1..3 / --chart-1..8`
3. tabular-nums 전역 유틸 추가 (Section 4.2)
4. `@theme inline` 블록에 신규 색 토큰 노출
5. 기존 `text-emerald-* / text-rose-*` → `text-success / text-danger`로 점진 치환 (검색 치환 가능, ~30개소)
6. `/design-system` 페이지에 새 팔레트·타이포 스케일 카탈로그 추가

**검증**: 시각 회귀 테스트(스크린샷), 라이트/다크 모드 토글 확인.

### Phase 2 — 카드 & 모듈 업그레이드 (중위험)
*예상 변경 범위: `components/dashboard/*`, `components/industry-dashboard.tsx`, 신규 `components/ui/*`*

1. `<MiniSparkline />` 신규 컴포넌트 (recharts) — `components/ui/mini-sparkline.tsx`
2. 산업 카드에 sparkline 14일 추가 — `industry-dashboard.tsx` IndustryCard
3. 카드 토큰 적용: `rounded-xl → rounded-2xl`, `p-4 → p-5`, hover 모션 변경
4. `<MarketPulseStrip />` 신규 — `components/dashboard/market-pulse-strip.tsx`
5. 자금 흐름 파티클 톤다운 + 데이터 강조 (`industry-money-flow-card.tsx` 톤만 변경)
6. 빈 상태 + 스켈레톤 톤 통일

**의존**: `MarketPulseStrip` 데이터 — 기존 `/api/industries` 응답 + 추가 집계 1~2개. **sk-data-modeler에 메트릭 합의 필요**.

### Phase 3 — 신규 패턴 + 모션 (선택적, 가치 입증 후)
1. `<TickerTape />` — 핫 섹터/회사 marquee
2. `<DataTable />` 표준화 — 통계·가격 변화 테이블 일관 적용
3. 카운트업 / 데이터 갱신 crossfade 모션
4. recharts 색상 팔레트 훅 `useTokenColors()`
5. `prefers-reduced-motion` 글로벌 핸들링

**의존**: TickerTape의 정렬/필터 정책 — **sk-ui-planner와 합의 필요**.

---

## 부록 A. 변경 영향도 요약

| 파일 | 변경 | 위험 |
|-----|-----|-----|
| `app/globals.css` | 토큰 전면 교체 | 낮음 (시각만 변경) |
| `tailwind.config.*` (없으면 v4 `@theme`) | 신규 색·간격 노출 | 낮음 |
| `components/ui/section-header.tsx` | 변경 없음 | — |
| `components/industry-dashboard.tsx` | IndustryCard에 sparkline 추가 + 클래스 정리 | 중 |
| `components/dashboard/industry-money-flow-card.tsx` | 파티클 props 톤다운 | 낮음 |
| `components/dashboard/market-pulse-strip.tsx` | **신규** | 중 (데이터 의존) |
| `components/ui/mini-sparkline.tsx` | **신규** | 낮음 |
| `components/ui/ticker-tape.tsx` | **신규 (Phase 3)** | 중 |
| `app/design-system/page.tsx` | 새 토큰·컴포넌트 카탈로그 추가 | 낮음 |

## 부록 B. 협업 인터페이스

- **sk-ui-planner**: 메인 화면의 섹션 순서, MarketPulseStrip 메트릭 4종 선정, TickerTape 정렬 정책
- **sk-data-modeler**: `MarketPulseStrip`용 7d sparkline 시리즈 / sentiment 점수 산식
- **sk-implementer**: Phase 1 토큰 마이그레이션 스크립트, Phase 2 컴포넌트 구현
- **sk-verifier**: 라이트/다크 모드 시각 회귀, prefers-reduced-motion 케이스

## 부록 C. 금기 사항

- 이모지 리터럴 사용 금지 (DB 데이터 제외)
- `text-red-500 / text-green-500` 직접 사용 금지 → `text-danger / text-success`
- scale 모션 카드 전체에 적용 금지 (KPI 띠 한정)
- AnimatePresence를 hover 단위에 적용 금지
- 다층 그림자(`shadow-xl` 이상) 사용 금지 — 1px hairline + surface depth로 위계 표현
