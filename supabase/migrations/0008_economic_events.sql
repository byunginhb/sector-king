-- ============================================================================
-- 14_econ_calendar Phase A — 경제 캘린더(economic_events) 마이그레이션
-- ============================================================================
-- 실행 방법: Supabase MCP `apply_migration` (Dashboard 핸드오프 금지, 프로젝트 메모리 규칙)
--            또는 psql/SQL Editor 로 본 파일 전체 실행.
-- 멱등: 재실행 시 변경 0 (모든 DDL 이 IF NOT EXISTS / OR REPLACE, seed 는 ON CONFLICT DO NOTHING).
-- 의존: 0001_init_auth.sql 의 `set_updated_at()`, `is_admin()`, `profiles`.
--       0005 의 "admin 정책은 to authenticated" 규칙을 처음부터 반영(anon 500 회귀 방지).
-- 도메인: 매크로 경제지표 이벤트 캘린더(MVP=indicator). 종목/통화 도메인과 독립.
--         값(actual/forecast/previous)은 원문 문자열 → toUsd 불요.
--         일시는 KST 확정값(수집 파이프라인이 현지시간→Asia/Seoul 변환 후 저장).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) economic_events — 경제 이벤트(경제지표/실적/이벤트)
-- ----------------------------------------------------------------------------
create table if not exists public.economic_events (
  id                  bigint generated always as identity primary key,

  -- ── 출처/멱등 ──
  source              text not null,                 -- 'fred' | 'manual' | ...
  external_id         text not null,                 -- 소스 고유 키. manual 은 'manual:{country}:{slug}:{date}' 또는 'manual:{uuid}'

  -- ── 분류/필터 ──
  country             text not null
                        check (country in ('KR', 'US')),
  category            text not null default 'indicator'
                        check (category in ('indicator', 'earnings', 'event')),
  importance          text not null default 'medium'
                        check (importance in ('high', 'medium', 'low')),

  -- ── 표시 ──
  title               text not null,                 -- 한국어 이벤트명
  title_en            text,                          -- 원문/영문명

  -- ── 일시 (KST) ──
  event_date          date not null,                 -- 'YYYY-MM-DD' (KST). 캘린더 range 축
  event_time          time,                          -- 'HH:MM' (KST). null=종일/미정

  -- ── 지표 값 (원문 문자열) ──
  actual              text,
  forecast            text,
  previous            text,
  unit                text,

  -- ── 후속 확장 (MVP NULL) ──
  related_industry_id text,                          -- SQLite industries.id 참조(논리적). Postgres 측 FK 없음

  -- ── 충돌 정책 플래그 (admin-crud §4) ──
  is_hidden           boolean not null default false, -- 소프트 삭제
  is_locked           boolean not null default false, -- 수동 고정(재수집 값 미갱신)

  -- ── 감사 ──
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 멱등 upsert 키
create unique index if not exists economic_events_source_external
  on public.economic_events (source, external_id);

-- range 조회 인덱스
create index if not exists idx_econ_events_date
  on public.economic_events (event_date);
create index if not exists idx_econ_events_country_date
  on public.economic_events (country, event_date);
create index if not exists idx_econ_events_cat_date
  on public.economic_events (category, event_date);

-- ----------------------------------------------------------------------------
-- 2) updated_at 트리거 (set_updated_at 재사용)
-- ----------------------------------------------------------------------------
drop trigger if exists trg_economic_events_updated_at on public.economic_events;
create trigger trg_economic_events_updated_at
  before update on public.economic_events
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3) RLS — 공개 read(숨김 제외), 관리자 전권, service_role 우회(수집기)
-- ----------------------------------------------------------------------------
-- news_reports RLS 미러링. 뉴스의 status='published' 게이트를 캘린더의
-- is_hidden=false 로 치환(동형: boolean 가시성 게이트). 공개 API 도 앱 레이어에서
-- is_hidden=false 를 재차 필터(방어 심층화). service_role 은 RLS 우회(BYPASSRLS)라
-- 별도 정책 불필요 — 수집기/인제스트가 사용.
alter table public.economic_events enable row level security;

-- 누구나 노출본 SELECT (anon + authenticated)
drop policy if exists "economic_events_public_read" on public.economic_events;
create policy "economic_events_public_read"
  on public.economic_events for select
  using (is_hidden = false);

-- 관리자: 모든 행 SELECT (숨김 포함). 0005 규칙대로 to authenticated 로 제한.
drop policy if exists "economic_events_admin_select" on public.economic_events;
create policy "economic_events_admin_select"
  on public.economic_events for select to authenticated
  using (public.is_admin());

-- 관리자: INSERT
drop policy if exists "economic_events_admin_insert" on public.economic_events;
create policy "economic_events_admin_insert"
  on public.economic_events for insert to authenticated
  with check (public.is_admin());

-- 관리자: UPDATE
drop policy if exists "economic_events_admin_update" on public.economic_events;
create policy "economic_events_admin_update"
  on public.economic_events for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 관리자: DELETE
drop policy if exists "economic_events_admin_delete" on public.economic_events;
create policy "economic_events_admin_delete"
  on public.economic_events for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4) 최소 seed — FRED 자동수집이 커버하지 않는 이벤트만 (source='manual', is_locked=true)
-- ----------------------------------------------------------------------------
-- 기준일 2026-07-10. 미국 발표는 현지시간(ET)→KST 변환값으로 저장.
--   FOMC ET 14:00 → KST 03:00(익일).
-- 미국 지표(CPI/PPI/고용/GDP/PCE/소매판매)는 FRED 자동수집(source='fred')이 담당하므로
--   수동 시드에서 제외. 수동 = FRED 미커버(FOMC) + 한국 전량.
-- 멱등: ON CONFLICT (source, external_id) DO NOTHING.
insert into public.economic_events
  (source, external_id, country, category, importance, title, title_en,
   event_date, event_time, actual, forecast, previous, unit, is_hidden, is_locked)
values
  -- ── 미국 (FRED 미커버) ──
  ('manual', 'manual:US:fomc-rate:2026-07-30', 'US', 'indicator', 'high',
   '미국 FOMC 기준금리 결정', 'FOMC Interest Rate Decision',
   '2026-07-30', '03:00', null, '4.25%', '4.25%', '%', false, true),

  -- ── 한국 ──
  ('manual', 'manual:KR:gdp-q2-adv:2026-07-24', 'KR', 'indicator', 'medium',
   '한국 GDP (2분기 속보치)', 'Korea GDP (Q2 Advance)',
   '2026-07-24', '08:00', null, '0.5%', '0.6%', '%', false, true),

  ('manual', 'manual:KR:cpi:2026-08-04', 'KR', 'indicator', 'medium',
   '한국 소비자물가지수(CPI)', 'Korea CPI (YoY)',
   '2026-08-04', '08:00', null, '2.2%', '2.3%', '%', false, true),

  ('manual', 'manual:KR:bok-rate:2026-08-27', 'KR', 'indicator', 'high',
   '한국은행 기준금리 결정(금통위)', 'BOK Base Rate Decision',
   '2026-08-27', '09:50', null, '2.50%', '2.50%', '%', false, true)
on conflict (source, external_id) do nothing;

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (실행 후 수동 확인용)
-- ----------------------------------------------------------------------------
-- select count(*) from public.economic_events;                     -- 4 (수동 시드: US FOMC 1 + KR 3)
-- select country, count(*) from public.economic_events group by country;  -- US 1(FOMC), KR 3
-- select policyname from pg_policies where tablename = 'economic_events'; -- 5개
-- select tgname from pg_trigger where tgrelid = 'public.economic_events'::regclass;
