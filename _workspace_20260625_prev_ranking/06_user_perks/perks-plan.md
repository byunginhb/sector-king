# Sector-King · 로그인 유저 혜택 (User Perks) 통합 기획서

> 작성: sk-product-strategist · 2026-05-10
> 입력: `_workspace/05_supabase_news/integrated-plan-v3.md` (Phase A1 완료, Phase A2 진행)
> 상태: 초안 — 사용자 검토 후 B1 착수

---

## 1. 한 줄 요약

지금 sector-king의 로그인은 "관리자 전용 기능 출입증"일 뿐이다. 일반 사용자가 자발적으로 가입할 이유가 0에 가깝다. 본 문서는 **워치리스트(즐겨찾기) + 일별 마켓 리포트 이메일 구독 + 개인 메모 + 최근 본 종목**을 1차 MVP로 제시해 "내 데이터가 누적되는 도구"로 전환한다. 모두 무료로 출시하고, 6개월 retention 데이터 수집 후 유료화(고급 알림·무제한 워치·백테스트) 자리만 비워둔다.

---

## 2. 현황 분석 — 왜 지금 로그인할 이유가 없는가

### 2.1 현재 로그인 후 사용자가 얻는 것
| 영역 | 비로그인 | 로그인 (role=user) | 로그인 (role=admin) |
|------|---------|-------------------|---------------------|
| 산업/섹터/회사 데이터 | 전체 열람 | 전체 열람 (동일) | 전체 열람 (동일) |
| Market Pulse / Money Flow | 전체 열람 | 전체 열람 (동일) | 전체 열람 (동일) |
| 마켓 리포트 (Phase A2) | published 전체 열람 | 전체 열람 (동일) | draft 포함 모든 상태 |
| 검색 / region 토글 | 사용 가능 | 사용 가능 (동일) | 사용 가능 (동일) |
| `/admin` 콘솔 | 차단 | 차단 (403) | 진입 |
| 헤더 표시 | "로그인" 버튼 | 아바타 + 드롭다운 | + "관리자 콘솔" |

### 2.2 문제 진단
- **일반 user의 incremental 가치 = 0**: 로그인해도 화면이 한 픽셀도 바뀌지 않는다.
- **로그인 마찰 비용 > 가치**: Google OAuth는 가볍지만 그래도 "왜?"라는 질문에 답이 없다.
- **재방문 유인 부재**: 다음 날 다시 들어올 이유가 "내가 본 산업이 어떻게 됐을까" 호기심 외엔 없다. 알림·메모·워치리스트 같은 "내 흔적" 메커니즘이 0이다.
- **인프라는 이미 있다**: Supabase Auth + profiles + RLS + Postgres가 가동 중. 신규 테이블 4~5개만 추가하면 모든 sticky 메커니즘이 가능하다.

### 2.3 전환 방향
- **즉시 가치(첫 클릭)**: 워치리스트 "별표 토글" — 1초 액션, 다음 방문에 즉시 보상.
- **누적 가치(7~30일)**: 워치리스트 일별 변동 요약, 최근 본 종목 트렌드, 메모 검색.
- **외부 트리거(이메일)**: 매일 아침 "당신의 워치리스트 어제 +1.2%" 한 줄짜리 리포트 — 앱을 안 열어도 가치가 가서 클릭으로 돌아오게 만든다.

---

## 3. JTBD (Job-to-be-Done) — 사용자가 로그인하는 이유

| ID | Job | 페르소나 | 빈도 | 1차 매핑 혜택 |
|----|-----|---------|------|--------------|
| J1 | "내가 보는 종목 5~10개만 빠르게 확인하고 싶다" | 자기주도 투자자(30~40대) | 일 1~3회 | **워치리스트** |
| J2 | "오늘 시장이 어떻게 흘렀는지 1분 안에 알고 싶다" | 직장인 투자자 | 일 1회(아침) | **마켓 리포트 이메일 구독** |
| J3 | "내가 어떤 종목을 봤는지 기억하고 싶다 / 며칠 전에 본 그 종목 어디 갔지" | 입문~중급 | 주 2~3회 | **최근 본 종목 (recently viewed)** |
| J4 | "이 종목에 대한 내 생각/매수 근거를 적어두고 싶다" | 분석형 투자자 | 비정기 | **개인 메모 (notes)** |
| J5 | "내 워치리스트 종목이 ±5% 움직이면 알려줬으면 좋겠다" | 능동형 트레이더 | 비정기 | **가격 알림 (B2 단계)** |
| J6 | "관심 산업의 핫 섹터가 바뀌면 즉시 알고 싶다" | 섹터 로테이터 | 주 1회 | **섹터/산업 즐겨찾기 + 변동 알림 (B2)** |
| J7 | "이 화면을 친구·동료에게 깔끔하게 공유하고 싶다 (+내 이름·코멘트)" | SNS 공유형 | 비정기 | **개인화 공유 카드 (B3)** |

---

## 4. 혜택 카탈로그 — 평가표

평가 기준: **가치(1~5)** 사용자 체감 가치, **비용(1~5)** 구현·운영 부담(높을수록 무거움), **데이터 의존성** 필요한 데이터 범위, **RLS 복잡도** 정책 난이도.

| # | 혜택 | 가치 | 비용 | 데이터 의존성 | RLS | 비고 |
|---|------|-----|------|--------------|-----|-----|
| P1 | 종목 워치리스트 (별 토글) | **5** | 2 | 기존 `companies` ticker 참조만 | 단순 (본인 행만) | **MVP** |
| P2 | 섹터 / 산업 즐겨찾기 | 4 | 2 | 기존 sectors/industries id | 단순 | **MVP** (P1과 같은 테이블 재사용) |
| P3 | 최근 본 종목 (Recently viewed) | 4 | 2 | 클릭 이벤트만 적재 | 단순 | **MVP** |
| P4 | 종목/섹터/산업 개인 메모 | 4 | 3 | 텍스트 저장 + entity FK | 단순 | **MVP** |
| P5 | 일별 마켓 리포트 이메일 구독 | **5** | 3 | news_reports + 발송 인프라 | 단순 (구독자 본인) | **MVP** (Resend 권장) |
| P6 | 워치리스트 일별 PnL 요약 카드 | 5 | 3 | watchlist + dailySnapshots | 본인 워치 read | **MVP** (메인 화면 카드) |
| P7 | 가격 임계치 알림 (±%) | 4 | 4 | 임계치 정의 + 일별 cron 평가 + 이메일 | 본인 행만 | B2 |
| P8 | 새 마켓 리포트 발행 알림 | 4 | 2 | news_reports.published_at 트리거 | 구독 옵트인 | B2 (P5와 통합) |
| P9 | 산업 핫 섹터 변경 알림 | 3 | 4 | dailySnapshots 변동 분석 | 본인 즐겨찾기 | B3 |
| P10 | 검색·필터 프리셋 저장 | 3 | 2 | URL 쿼리 직렬화 저장 | 단순 | B2 |
| P11 | PDF/CSV 데이터 내보내기 | 3 | 3 | 서버 렌더링 PDF 또는 CSV stream | 단순 | B3 |
| P12 | 공유 카드 개인화 (이름/코멘트) | 3 | 3 | OG image 동적 생성 | 단순 | B3 |
| P13 | Badge / 명예 시스템 (게임화) | 2 | 3 | 활동 로그 집계 | 단순 | 보류 (가치 낮음) |
| P14 | 모의 포트폴리오 (가상 보유 + PnL) | 4 | **5** | 가상 거래 모델 + 일별 평가 | 단순 | B3 (큰 기능) |
| P15 | 카톡/디스코드 알림 채널 | 3 | 4 | 외부 webhook + 채널 매핑 | 본인 채널 | B3 (이메일 안정 후) |
| P16 | 활동 로그 / 클릭 트렌드 시각화 | 3 | 3 | activity_log 집계 | 본인만 | B3 |
| P17 | "내 워치리스트가 본 산업 분포" 인포그래픽 | 3 | 2 | watchlist + industries | 본인만 | B3 |

> 평가 합산 = 가치 - 비용 (높을수록 우선). 상위 6개가 1차 MVP 후보가 됨.

---

## 5. MVP 선정 (B1) — 1차 출시 5개 혜택

### MVP 구성
| # | 혜택 | 핵심 KPI | 사유 |
|---|------|---------|-----|
| **M1** | 종목/섹터/산업 워치리스트 (P1+P2 통합) | 가입 후 7일 내 워치리스트 추가율 ≥ 60% | 즉시 가치, 구현 비용 낮음, 모든 상위 페이지에 별 토글 1개로 끼워 넣기 가능 |
| **M2** | 최근 본 종목 (P3) | 재방문 사용자 중 "최근 본" 모듈 클릭률 ≥ 25% | 클릭 1회로 적재, 메인에 모듈 1개 추가, 콜드 스타트 없음 |
| **M3** | 개인 메모 (P4) | 가입 후 30일 내 메모 작성 사용자 비율 ≥ 20% | 분석형 투자자 retention 강력. 메모는 한 번 쌓이면 lock-in이 강함 |
| **M4** | 마켓 리포트 이메일 구독 (P5+P8) | 구독 → 첫 7일 클릭률 ≥ 30% | 외부 트리거. 앱을 안 열어도 가치 전달 → 클릭으로 복귀 |
| **M5** | 워치리스트 일별 PnL 요약 카드 (P6) | 워치 보유자 D7 retention ≥ 45% | M1을 의미 있게 만드는 보상. 메인 첫 화면에서 "내 종목 어제 +X%" 즉시 노출 |

### MVP 비포함 (의도적)
- P7 가격 알림: cron 평가 + 임계치 UI는 비용 4. B2로 분리.
- P14 모의 포트폴리오: 비용 5. 큰 기능이라 별도 트랙.
- P13 Badge: 가치 낮음. 사용자 요구 검증 후.
- P15 카톡/디스코드: 이메일 안정성 검증 후.

### 디자인 원칙
- **별 토글 1개만 도입**: 회사 카드/섹터 카드/산업 카드 모두 같은 `WatchStarToggle` 컴포넌트.
- **로그인 안 했을 때 토글 클릭** → "로그인이 필요해요" 토스트 + `/login?next={현재 path}#watch={ticker}` 리다이렉트. 로그인 후 자동 추가.
- **빈 상태 카드 디자인**: 워치리스트 비어있을 때 "검색해서 별 표시해보세요" CTA + 인기 종목 3개 추천.
- **이메일 옵트인**: 가입 직후 onboarding step에서 "매일 아침 8시 마켓 리포트 받기" 단일 토글 (기본 ON, 1-click off 가능). 스팸 회피 위해 소프트 옵트인 + unsubscribe 링크 모든 메일 하단.

---

## 6. 데이터 모델 — 신규 테이블 SQL

Supabase Postgres에 추가. 모든 테이블 RLS enable + 본인 행만 read/write.

### 6.1 `watchlist` (M1: 워치리스트, P1+P2 통합)

```sql
-- 워치리스트 — 종목/섹터/산업을 한 테이블에 통합 (entity_type discriminator)
create table public.watchlist (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  entity_type   text not null check (entity_type in ('ticker','sector','industry')),
  entity_id     text not null,                       -- ticker(AAPL) / sector_id(uuid) / industry_id(slug)
  display_name  text,                                -- 캐시용. 동기화는 비동기 OK
  note          text,                                -- 짧은 한 줄 메모 (긴 글은 notes 테이블)
  pinned        boolean not null default false,      -- 메인 카드 상단 고정 (최대 5개)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index idx_watchlist_user_created on public.watchlist (user_id, created_at desc);
create index idx_watchlist_user_type on public.watchlist (user_id, entity_type);

alter table public.watchlist enable row level security;

create policy "watchlist_self_select" on public.watchlist
  for select using (auth.uid() = user_id);

create policy "watchlist_self_insert" on public.watchlist
  for insert with check (auth.uid() = user_id);

create policy "watchlist_self_update" on public.watchlist
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "watchlist_self_delete" on public.watchlist
  for delete using (auth.uid() = user_id);

create trigger trg_watchlist_updated_at
  before update on public.watchlist
  for each row execute function public.set_updated_at();

-- 안전장치: 1인당 최대 200개 (어뷰즈 방지)
create or replace function public.enforce_watchlist_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.watchlist where user_id = new.user_id) >= 200 then
    raise exception '워치리스트 최대 200개까지 추가 가능합니다';
  end if;
  return new;
end;
$$;

create trigger trg_watchlist_limit
  before insert on public.watchlist
  for each row execute function public.enforce_watchlist_limit();
```

### 6.2 `recently_viewed` (M2: 최근 본 종목)

```sql
-- 사용자가 본 종목/섹터/산업 페이지 (최근 50개 보존)
create table public.recently_viewed (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  entity_type   text not null check (entity_type in ('ticker','sector','industry','news')),
  entity_id     text not null,
  display_name  text,
  viewed_at     timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)             -- 동일 entity는 viewed_at 갱신만
);

create index idx_recently_viewed_user_viewed on public.recently_viewed (user_id, viewed_at desc);

alter table public.recently_viewed enable row level security;

create policy "recently_self_select" on public.recently_viewed
  for select using (auth.uid() = user_id);
create policy "recently_self_insert" on public.recently_viewed
  for insert with check (auth.uid() = user_id);
create policy "recently_self_update" on public.recently_viewed
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recently_self_delete" on public.recently_viewed
  for delete using (auth.uid() = user_id);

-- 50개 초과 시 가장 오래된 행 자동 삭제
create or replace function public.prune_recently_viewed()
returns trigger language plpgsql as $$
begin
  delete from public.recently_viewed
   where user_id = new.user_id
     and id in (
       select id from public.recently_viewed
        where user_id = new.user_id
        order by viewed_at desc
        offset 50
     );
  return new;
end;
$$;

create trigger trg_recently_prune
  after insert on public.recently_viewed
  for each row execute function public.prune_recently_viewed();
```

### 6.3 `notes` (M3: 개인 메모)

```sql
-- 종목/섹터/산업/리포트에 대한 자유 메모 (긴 글)
create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  entity_type   text not null check (entity_type in ('ticker','sector','industry','news')),
  entity_id     text not null,
  body          text not null,                       -- markdown 허용
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_notes_user_entity on public.notes (user_id, entity_type, entity_id);
create index idx_notes_user_created on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

create policy "notes_self_all" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- 본문 길이 제한 (10,000자)
create or replace function public.enforce_notes_length()
returns trigger language plpgsql as $$
begin
  if length(new.body) > 10000 then
    raise exception '메모는 10,000자 이하로 작성하세요';
  end if;
  return new;
end;
$$;

create trigger trg_notes_length
  before insert or update on public.notes
  for each row execute function public.enforce_notes_length();
```

### 6.4 `email_subscriptions` (M4: 이메일 구독)

```sql
-- 이메일 구독 (지금은 daily_report 1종만, 미래 확장 대비 구조)
create table public.email_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  channel       text not null check (channel in ('daily_report','watchlist_summary','price_alert')),
  enabled       boolean not null default true,
  preferred_hour int not null default 8 check (preferred_hour between 0 and 23),  -- KST 발송 시각
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, channel)
);

create index idx_email_subs_channel_enabled
  on public.email_subscriptions (channel, enabled)
  where enabled = true;

alter table public.email_subscriptions enable row level security;

create policy "email_subs_self_all" on public.email_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_email_subs_updated_at
  before update on public.email_subscriptions
  for each row execute function public.set_updated_at();
```

### 6.5 `email_log` (발송 추적, 운영용)

```sql
-- 메일 발송 로그 (재발송 방지, 클릭률 측정)
create table public.email_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  channel       text not null,
  subject       text not null,
  message_id    text,                                -- Resend message id
  sent_at       timestamptz not null default now(),
  opened_at     timestamptz,
  clicked_at    timestamptz,
  status        text not null default 'sent'        -- 'sent' | 'failed' | 'bounced'
);

create index idx_email_log_user_sent on public.email_log (user_id, sent_at desc);
create index idx_email_log_channel_sent on public.email_log (channel, sent_at desc);

alter table public.email_log enable row level security;

-- 본인 로그만 조회 (관리자는 service_role로 직접)
create policy "email_log_self_select" on public.email_log
  for select using (auth.uid() = user_id);

-- INSERT/UPDATE는 service_role(서버)만. 정책 없음 = 클라이언트 차단.
```

### 6.6 `activity_log` (M2 보강 + B3 활동 시각화 기반)

```sql
-- 가벼운 클라이언트 이벤트 로그 (analytics 기반)
-- 1차에선 recently_viewed로 충분하지만, B3 활동 시각화·KPI 위해 미리 정의
create table public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  event_type    text not null,                      -- 'page_view'|'watch_add'|'watch_remove'|'note_create'|'email_open'|'email_click' ...
  entity_type   text,
  entity_id     text,
  meta          jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index idx_activity_user_created on public.activity_log (user_id, created_at desc);
create index idx_activity_event_created on public.activity_log (event_type, created_at desc);

alter table public.activity_log enable row level security;

create policy "activity_self_select" on public.activity_log
  for select using (auth.uid() = user_id);
create policy "activity_self_insert" on public.activity_log
  for insert with check (auth.uid() = user_id or user_id is null);
```

### 6.7 마이그레이션 파일 위치
- `drizzle/supabase-migrations/0002_user_perks.sql` (B1 단일 파일)
- 멱등성 보장: 모든 `create` 문 앞에 `if not exists` 또는 별도 `down.sql` 준비.

---

## 7. UI / 페이지 영향도

### 7.1 메인 페이지 (`/` = `IndustryDashboard`)
현재 동선: MarketPulseStrip → 산업별 자금 흐름 → 산업 카드 그리드 → 시장 동향 요약.

**B1 추가 모듈** (로그인 사용자에게만, 비로그인은 가치 미리보기 placeholder):

```
┌── MarketPulseStrip ─────────────────────────┐  (기존)
├── 오늘의 마켓 리포트 카드 (Phase A2) ────────┤  (기존)
├── ▶ 내 워치리스트 (M5) ────────── 신규 ──────┤  ← 로그인 시
│   - "어제 +1.23%" 한 줄 요약                │
│   - 상승 top 3 / 하락 top 3                 │
│   - 비어있으면 "별표 추가하기" CTA           │
├── ▶ 최근 본 종목 (M2) ────────── 신규 ──────┤  ← 로그인 시
│   - 가로 스크롤 카드 5~10개                 │
├── 산업별 자금 흐름 ─────────────────────────┤
├── 산업 패권 지도 ──────────────────────────┤
└── 시장 동향 요약 ─────────────────────────┘
```

비로그인 자리: "내 워치리스트"·"최근 본 종목" 위치에 `LoginValuePromptCard` (가치 설명 + "Google로 시작하기" CTA)

### 7.2 산업 페이지 (`/[industryId]`)
- 페이지 헤더 우측 `WatchStarToggle entityType="industry"` 추가.
- 사용자가 이 산업을 즐겨찾기하면 메인 워치리스트 카드에 "산업" 섹션으로 노출.

### 7.3 섹터 카드 (`components/sector-card.tsx`)
- 카드 우상단에 `WatchStarToggle entityType="sector"`.
- 별 활성 시 호박색(amber-500), 비활성은 muted-foreground.

### 7.4 회사 모달 / 회사 상세 (`components/company-detail.tsx`)
- 헤더에 `WatchStarToggle entityType="ticker"`.
- 본문 하단에 `NoteEditor` (메모 영역, lazy load).

### 7.5 마켓 리포트 카드 / 상세 (`/news/[id]`)
- 카드 우측에 "이메일로 매일 받기" CTA → 옵트인 토스트 (구독 후 X 표시).
- 상세 페이지 하단에 `NoteEditor entityType="news"`.

### 7.6 신규 페이지
- `/me/watchlist` — 워치리스트 풀 페이지 (필터: ticker/sector/industry, 정렬: 최근/등락률/이름).
- `/me/notes` — 메모 전체 검색·정렬.
- `/me/settings` — 이메일 구독 토글, 발송 시각, 계정 삭제(GDPR).
- `/me` — 프로필 대시보드 (위 3개 요약 + 최근 본).

### 7.7 헤더 드롭다운 변경 (auth/user-menu.tsx)
- 기존: 프로필 / 관리자 콘솔(admin) / 로그아웃
- 추가: **내 워치리스트(`/me/watchlist`)** / **내 메모(`/me/notes`)** / **설정(`/me/settings`)**

### 7.8 Onboarding 1-step
- 첫 로그인 콜백 후 `/me/onboarding`에서 단일 화면:
  - "관심 종목 3개 선택해 보세요" (인기 종목 12개 그리드)
  - "매일 아침 8시 마켓 리포트 받기" 토글 (기본 ON)
  - "건너뛰기" 가능 — 이후 메인으로 redirect.
- 한 번만 노출, profiles에 `onboarded_at` 컬럼 추가.

---

## 8. 신규 컴포넌트 카탈로그

### 8.1 핵심 컴포넌트 (B1)
| 컴포넌트 | 위치 | Props (인터페이스) | 용도 |
|----------|------|-------|------|
| `WatchStarToggle` | `components/perks/watch-star-toggle.tsx` | `{ entityType: 'ticker'\|'sector'\|'industry', entityId: string, displayName?: string, size?: 'sm'\|'md' }` | 모든 카드/헤더에 끼우는 별 토글. 로그인 안 했으면 토스트 + 로그인 유도 |
| `MyWatchlistCard` | `components/perks/my-watchlist-card.tsx` | `{ region: Region }` | 메인 페이지 신규 카드. 빈 상태/로딩/에러 처리 포함 |
| `RecentlyViewedRow` | `components/perks/recently-viewed-row.tsx` | `{ limit?: number }` | 가로 스크롤 카드 리스트 |
| `NoteEditor` | `components/perks/note-editor.tsx` | `{ entityType, entityId, initialBody?: string }` | 메모 작성/수정. autosave 3초 debounce |
| `NoteList` | `components/perks/note-list.tsx` | `{ entityType?, entityId? }` | `/me/notes` 본문 |
| `EmailSubscriptionToggle` | `components/perks/email-subscription-toggle.tsx` | `{ channel: 'daily_report' \| ..., label: string }` | 1-click 구독 토글 |
| `LoginValuePromptCard` | `components/perks/login-value-prompt-card.tsx` | `{ variant: 'watchlist' \| 'recently' \| 'notes' }` | 비로그인 사용자 대상 가치 미리보기 + CTA |
| `OnboardingPickerStep` | `components/onboarding/perks-picker-step.tsx` | `{ onComplete: () => void }` | 첫 로그인 직후 종목 3개 선택 |

### 8.2 훅
| 훅 | 위치 | 시그니처 |
|----|------|---------|
| `useWatchlist` | `hooks/use-watchlist.ts` | `(filter?: { entityType? }) => { items, isLoading, add, remove, toggle }` |
| `useRecentlyViewed` | `hooks/use-recently-viewed.ts` | `(limit?) => { items, isLoading, track }` |
| `useNotes` | `hooks/use-notes.ts` | `(filter?) => { items, isLoading, create, update, remove }` |
| `useEmailSubscriptions` | `hooks/use-email-subscriptions.ts` | `() => { subs, isLoading, toggle, setHour }` |
| `useTrackView` | `hooks/use-track-view.ts` | `(entityType, entityId, displayName?) => void` (effect로 자동 적재) |

### 8.3 API 라우트 (서버 측 검증 + Supabase 호출)
| Method | Path | 용도 |
|--------|------|-----|
| GET / POST / DELETE | `/api/me/watchlist` | 조회 / 추가 / 삭제 (단건 또는 toggle) |
| POST | `/api/me/recently-viewed` | 본 페이지 적재 (server-side dedupe) |
| GET / POST / PATCH / DELETE | `/api/me/notes` | CRUD |
| GET / PATCH | `/api/me/email-subscriptions` | 구독 상태 조회 / 토글 |
| GET | `/api/me/summary` | 메인 카드용 워치 + PnL 묶음 (단일 호출) |

> 클라이언트가 Supabase 직접 호출도 가능하나, **요약 집계(`/api/me/summary`)는 서버에서 dailySnapshots(SQLite)와 워치(Postgres)를 join**해야 하므로 API 라우트 필수.

---

## 9. 알림 / 이메일 시스템 설계

### 9.1 1차 (B1): 일별 마켓 리포트 이메일
- **트리거**: 관리자가 `news_reports`를 `published`로 전환 → DB 트리거가 큐에 enqueue → 매일 아침 사용자별 `preferred_hour`(KST 기본 8시) 도달 시 발송.
- **인프라 권장**: **Resend** (Supabase 공식 통합, 한국 발송 가능, 무료 100/일·3000/월 → 초기 충분).
  - 대안: Supabase Edge Function + AWS SES (자체 발송) — 비용 저렴하지만 SES 도메인 인증 부담.
  - 대안: 카톡 알림톡 — 비싸고 사업자 인증 필요. **B3 후보**.
- **실행 흐름**:
  1. GitHub Actions cron (이미 일별 데이터 갱신용 가동 중)에 새 job 추가: `send-daily-report.ts`.
  2. job이 `email_subscriptions` 중 `enabled=true` 사용자 조회.
  3. 사용자 KST 시간 기준 `preferred_hour`에 도달한 사용자에게 발송.
  4. Resend API 호출 + `email_log`에 기록.
- **이메일 콘텐츠** (서버 사이드 React Email 권장):
  - 헤더: 발행일 + 한 줄 결론
  - 본문: 30초 브리핑 + 헤드라인 top 5 (전문가 뷰 추출)
  - 사용자별 개인화 블록: "당신의 워치리스트 어제 +X% / 상승 1위 / 하락 1위"
  - 하단: 웹에서 보기 / 구독 해제 / 발송 시각 변경 링크

### 9.2 2차 (B2): 가격 임계치 알림
- 사용자가 워치리스트 종목당 ±% 임계치 설정 (예: `note` 컬럼 활용 또는 신규 `price_alerts` 테이블).
- 일별 cron이 dailySnapshots 비교 → 임계치 초과 항목만 발송.
- 빈도 제한: 1종목당 24시간 1회.

### 9.3 3차 (B3): 카톡/디스코드
- `email_subscriptions.channel`을 `kakao` / `discord`로 확장.
- 카톡 알림톡: 정보성 메시지 인증 사업자 등록 필수 — 사용자 보유 기준 검토 후.
- 디스코드: 사용자 webhook URL 입력 받아 push.

### 9.4 환경변수 (B1 추가)
```bash
RESEND_API_KEY=re_xxx
EMAIL_FROM=Sector King <noreply@sectorking.co.kr>
EMAIL_REPLY_TO=hello@sectorking.co.kr
```

### 9.5 위험 / 운영
- **스팸 회피**: 도메인 SPF/DKIM/DMARC 설정 필수. Resend 가이드 그대로.
- **opt-out 의무**: 모든 메일 하단 1-click unsubscribe (legally required).
- **bounce/complaint 처리**: webhook 받아 `email_log.status` 업데이트, 3회 bounce 시 자동 disable.
- **빈도 피로**: 1차는 daily 1통 + 발송 시각 사용자 선택. 2차는 임계치 도달 시만.

---

## 10. Phase 분할 (B1 / B2 / B3)

### Phase B1 — Sticky 기반 + 이메일 1통 (예상 5~7일)
**선행 조건**: Phase A2 (뉴스 시스템) 완료.

- DB: `watchlist`, `recently_viewed`, `notes`, `email_subscriptions`, `email_log`, `activity_log` 6개 테이블 + RLS + 트리거 (단일 마이그레이션).
- 컴포넌트: §8.1의 8개.
- 페이지: 메인 카드 2개 + `/me`, `/me/watchlist`, `/me/notes`, `/me/settings` 4개.
- API 라우트: §8.3의 5개.
- 이메일: Resend 통합 + 일별 마켓 리포트 발송 cron.
- Onboarding: 첫 로그인 시 종목 3개 선택 + 이메일 옵트인.
- **수락 기준** (12개):
  1. `pnpm exec tsc --noEmit` PASS
  2. `pnpm build` PASS
  3. RLS: 다른 user 워치/메모 SELECT 시도 → 0행
  4. RLS: anon이 watchlist INSERT 시도 → 거부
  5. 워치 200개 초과 INSERT → 거부
  6. recently_viewed 51번째 추가 → 가장 오래된 행 자동 삭제
  7. note body 10,001자 → 거부
  8. 비로그인 사용자가 별 클릭 → 토스트 + `/login?next=` redirect
  9. 로그인 후 별 자동 추가 (`#watch=` hash 처리)
  10. 워치 비어있을 때 메인 카드 빈 상태 노출
  11. Resend 발송 성공 → `email_log.status='sent'` + message_id 기록
  12. unsubscribe 링크 클릭 → `email_subscriptions.enabled=false` 즉시 반영

### Phase B2 — 알림 확장 (예상 4~5일)
- DB: `price_alerts` 테이블 (또는 `watchlist`에 alert 컬럼 묶기).
- 가격 임계치 UI: `WatchStarToggle` 옆에 종 아이콘 (`Bell`) → 모달.
- cron: 가격 평가 + 발송.
- 새 마켓 리포트 발행 즉시 알림(옵트인).
- 검색·필터 프리셋 저장 (P10).

### Phase B3 — 확장·심화 (예상 2~3주, 별도 PR 단위)
- 모의 포트폴리오 (P14, 큰 기능 → 자체 트랙).
- 산업/섹터 핫 변동 알림 (P9).
- PDF/CSV 내보내기 (P11).
- 공유 카드 개인화 (P12).
- 카톡/디스코드 채널 (P15).
- 활동 시각화 (`/me/activity`, P16).

---

## 11. 무료 vs 프로 경계 (미래 자리만 비워둠)

### 1차 (B1~B3): 모두 무료
사용자 base 확보가 우선. 결제 인프라(Stripe 등) 도입 시점은 **MAU 1000명 + D7 retention 30% 검증 후**.

### 미래 유료(Pro) 후보
| 후보 기능 | 무료 한도 | 프로 한도 | 사유 |
|----------|---------|---------|------|
| 워치리스트 | 200개 | 무제한 | 데이터 비용 적지만 "전문가" 가치 신호 |
| 가격 알림 | 5개/월 | 무제한 + 즉시 푸시 | cron 비용 + 프리미엄 사용자 핵심 가치 |
| 모의 포트폴리오 | 1개 | 5개 + 백테스트 | 큰 가치, 큰 비용 |
| 마켓 리포트 deep insights | 발행 후 24시간 지연 | 즉시 + 과거 30일 아카이브 | 정보 우선권 — 가장 자연스러운 유료화 |
| AI 인사이트 (J6 자동 분석) | 0 | "내 워치 어제 변동 자동 요약" | LLM 호출 비용 직접 전가 |
| 데이터 내보내기 | CSV 100행 | 전체 + API access | 파워 유저 핵심 |

**자리만 비워둠**: `profiles.tier text default 'free' check (tier in ('free','pro'))` 컬럼만 미리 추가하는 옵션. 또는 B1에서는 추가하지 않고 결제 도입 시 한 번에 마이그레이션 — **후자 권장** (premature).

### 가격 가설 (참고)
- 프로 ₩9,900/월 또는 ₩99,000/년. 한국 SaaS 표준.
- 검증 신호: D30 retention ≥ 25% + "프로 기능 수요" 인앱 설문 ≥ 15%.

---

## 12. KPI / 분석 / 이벤트 명세

### 12.1 핵심 KPI
| 카테고리 | 지표 | 목표 (B1 출시 후 30일) |
|---------|-----|--------------------|
| 가입 | 일별 신규 가입 | 데이터 부재 — baseline 측정 우선 |
| 가입 → 첫 액션 | 가입 후 5분 내 워치 1개 추가 비율 | ≥ 50% |
| 워치 retention | D7 워치 보유 사용자 재방문율 | ≥ 45% |
| 메모 retention | 메모 작성 사용자 D30 재방문율 | ≥ 60% |
| 이메일 | daily_report 발송 → open rate | ≥ 30% |
| 이메일 | 발송 → 클릭으로 사이트 복귀 | ≥ 12% |
| 활성도 | 로그인 사용자 D7 retention | ≥ 35% |
| 활성도 | 로그인 사용자 평균 워치 항목 수 | ≥ 4 |

### 12.2 이벤트 명세 (`activity_log.event_type`)
```
auth.signup                         meta: { provider: 'google' }
auth.login                          meta: { provider }
onboarding.complete                 meta: { picked_count, email_optin }
watch.add                           entity_type, entity_id
watch.remove                        entity_type, entity_id
watch.pin                           entity_type, entity_id
note.create                         entity_type, entity_id, length
note.update                         entity_type, entity_id
note.delete                         entity_type, entity_id
email.sent                          meta: { channel, message_id }
email.opened                        meta: { message_id, channel }   ← Resend webhook
email.clicked                       meta: { message_id, url }       ← Resend webhook
email.unsubscribed                  meta: { channel }
page.view                           entity_type, entity_id          ← recently_viewed가 대신함
search.query                        meta: { q, results_count }
```

### 12.3 대시보드 (관리자용)
- `/admin/analytics` — KPI 카드 + 이벤트 타임시리즈 (B2 단계).
- 1차는 Supabase SQL Editor + 즉석 쿼리 + Vercel Analytics로 충분.

---

## 13. 위험 / 완화

| ID | 위험 | 가능성 | 영향 | 완화 |
|----|------|-------|------|------|
| K1 | 가입 마찰 vs 비로그인 가치 보존 | 높음 | 중 | 비로그인에 핵심 가치 유지(MarketPulse·산업 카드·뉴스). 로그인은 "내 데이터" 추가 가치만. 강제 게이팅 X |
| K2 | 알림 피로 → unsubscribe 폭증 | 중 | 높음 | 1차는 daily 1통 + 사용자 발송 시각 선택. B2 임계치 1종목/24시간 cap. unsubscribe 1-click |
| K3 | 워치/메모 데이터로 인한 개인정보 의무 | 중 | 중 | 개인정보처리방침 업데이트, `/me/settings`에 "내 데이터 다운로드" + "계정 삭제" 추가 (GDPR 호환) |
| K4 | RLS 정책 누락으로 타인 데이터 노출 | 낮음 | 매우 높음 | 마이그레이션 SQL 후 staging에서 anon/user1/user2 3주체 SELECT/INSERT/UPDATE/DELETE 매트릭스 검증 |
| K5 | 워치리스트 200개 한도 어뷰즈 | 낮음 | 낮음 | DB 트리거(§6.1)로 강제. 클라이언트 메시지로 안내 |
| K6 | recently_viewed 적재 폭주(스크래퍼) | 중 | 낮음 | API 라우트 rate limit (1초 1회 dedupe), 클라이언트 debounce |
| K7 | 이메일 도메인 평판 하락(스팸 분류) | 중 | 높음 | SPF/DKIM/DMARC 사전 설정, 워밍업 (첫 주 적은 발송), bounce 모니터링 |
| K8 | 노트 본문 XSS | 중 | 높음 | 마크다운 렌더링 시 `rehype-sanitize` 강제, 서버 측 길이 제한, RLS로 본인만 노출 |
| K9 | 가입 후 onboarding skip → 가치 미발견 → 이탈 | 중 | 중 | onboarding skip 사용자에게 D1 메일로 "관심 종목을 추가해보세요" 1회 retargeting |
| K10 | dailySnapshots(SQLite) ↔ watchlist(Postgres) cross-join | 중 | 중 | `/api/me/summary`에서 서버측 join. 클라이언트 Supabase 직접 호출 X. Phase B 데이터 통합 시 자연 해소 |
| K11 | 로그인 후 별 자동 추가 race condition | 낮음 | 낮음 | 콜백에서 `#watch=` hash → 1회만 처리, localStorage flag로 중복 방지 |
| K12 | 이메일 발송 cron 실패 → 미발송 | 중 | 중 | `email_log` 미발송 행 daily 재시도 (최대 3회), 관리자 알림 |
| K13 | 카톡/디스코드 1차 미지원 → 사용자 요청 폭주 | 낮음 | 낮음 | 설정 페이지에 "곧 지원 예정" 명시 + 대기열 form |

---

## 14. 결정 사항 요약 (자동 진행 메모리 규칙)

| 항목 | 결정 |
|------|------|
| MVP 범위 | M1 워치리스트, M2 최근 본, M3 메모, M4 이메일 구독, M5 워치 PnL 카드 |
| 워치리스트 통합 | 단일 `watchlist` 테이블 + `entity_type` discriminator (ticker/sector/industry) |
| 이메일 인프라 | **Resend** 1차 (Supabase 공식, 한국 발송 OK) |
| 발송 시각 | KST 기본 8시 + 사용자 변경 가능 (preferred_hour) |
| 한도 | 워치 200개, 메모 10,000자, recently_viewed 50개 |
| 무료/유료 | B1~B3 전부 무료, profiles.tier 컬럼은 결제 도입 시 추가 |
| 카톡/디스코드 | B3로 미룸 (이메일 안정 후) |
| 모의 포트폴리오 | B3 별도 트랙 (큰 기능) |
| Onboarding | 1-step (종목 3개 + 이메일 토글), skip 허용 |
| 가입 강제 | 안 함 — 비로그인 핵심 가치 보존 |
| 데이터 분리 | dailySnapshots는 SQLite 그대로, 사용자 데이터는 Postgres. `/api/me/summary`에서 서버 join |

---

## 15. 다음 단계 (액션 아이템)

1. **사용자 검토**: 본 문서 §5 MVP 5개와 §10 B1 범위 승인.
2. **Resend 계정 생성**: 도메인 인증 + SPF/DKIM/DMARC. `RESEND_API_KEY` 발급.
3. **sk-data-modeler 호출**: §6 SQL을 단일 마이그레이션 파일(`drizzle/supabase-migrations/0002_user_perks.sql`)로 작성.
4. **sk-auth-architect 검토**: §6 RLS 정책 통과 확인.
5. **sk-ui-planner 호출**: §7 페이지·§8 컴포넌트 와이어프레임 + 빈 상태/로그인 유도 카피 확정.
6. **sk-news-architect 합류**: §9 이메일 콘텐츠 템플릿 (전문가 뷰 추출 로직).
7. **sk-implementer 착수**: B1 6개 테이블 + 8개 컴포넌트 + 5개 API 라우트 + 4개 페이지.
8. **sk-verifier**: §10 B1 수락 기준 12개 검증.

---

## 부록 A — 컴포넌트 인터페이스 상세

### A.1 `WatchStarToggle`
```typescript
interface WatchStarToggleProps {
  entityType: 'ticker' | 'sector' | 'industry'
  entityId: string
  displayName?: string
  size?: 'sm' | 'md'
  variant?: 'icon' | 'icon-label'
  className?: string
  onToggle?: (added: boolean) => void
}
```
- 비로그인 클릭 → `useToast()` + `router.push('/login?next=' + pathname + '#watch=' + entityId)`.
- 로그인 + 미추가 → `add()`, 즉시 amber-500. 추가됨 → `remove()`, muted-foreground.
- a11y: `aria-pressed`, `aria-label` ("AAPL 워치리스트 추가/제거").

### A.2 `MyWatchlistCard`
```typescript
interface MyWatchlistCardProps {
  region: 'all' | 'kr' | 'global'
  limit?: number    // default 8
}
```
- 데이터 소스: `useWatchlist({ entityType: 'ticker' })` + `/api/me/summary`로 dailySnapshots join.
- 빈 상태: `LoginValuePromptCard variant="watchlist"` (비로그인) 또는 "별 표시로 추가" (로그인 후 비어있음).
- 우상단 "전체보기" → `/me/watchlist`.

### A.3 `NoteEditor`
```typescript
interface NoteEditorProps {
  entityType: 'ticker' | 'sector' | 'industry' | 'news'
  entityId: string
  initialBody?: string
  onSave?: (body: string) => void
}
```
- autosave 3초 debounce.
- 글자수 카운터 (`X / 10000`).
- 마크다운 미리보기 토글 (lucide `Eye`/`EyeOff`).
- 비로그인 → 영역 자체를 `LoginValuePromptCard variant="notes"`로 대체.

### A.4 `EmailSubscriptionToggle`
```typescript
interface EmailSubscriptionToggleProps {
  channel: 'daily_report' | 'watchlist_summary' | 'price_alert'
  label: string
  description?: string
}
```
- `Switch` 컴포넌트 사용. 토글 즉시 PATCH.
- 활성 시 발송 시각 선택 (HourPicker 0~23 KST).

---

## 변경 이력
| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-05-10 | sk-product-strategist | 초안 작성 (현황·JTBD·12+ 혜택 평가·MVP 5종·SQL 6테이블·UI 영향도·이메일 설계·B1/B2/B3·KPI·위험) |
