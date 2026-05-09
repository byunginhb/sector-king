-- ============================================================================
-- Phase B1 — 로그인 유저 혜택 MVP 5종 마이그레이션
-- ============================================================================
-- 목적: 워치리스트, 최근 본 종목, 메모, 이메일 구독, 이메일 로그, 활동 로그
-- 6개 테이블 + RLS + 한도 트리거.
-- 멱등: 재실행 시 변경 0 (모든 DDL이 IF NOT EXISTS / OR REPLACE 사용).
-- 의존: 0001_init_auth.sql 의 `set_updated_at()`, `is_admin()`, `profiles`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) watchlist — 통합 워치리스트 (ticker / sector / industry)
-- ----------------------------------------------------------------------------
create table if not exists public.watchlist (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  item_type     text not null check (item_type in ('ticker','sector','industry')),
  item_key      text not null,
  display_name  text,
  note          text,
  pinned        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, item_type, item_key)
);

create index if not exists idx_watchlist_user_created
  on public.watchlist (user_id, created_at desc);

create index if not exists idx_watchlist_user_type
  on public.watchlist (user_id, item_type);

alter table public.watchlist enable row level security;

drop policy if exists "watchlist_self_select" on public.watchlist;
create policy "watchlist_self_select" on public.watchlist
  for select using (auth.uid() = user_id);

drop policy if exists "watchlist_self_insert" on public.watchlist;
create policy "watchlist_self_insert" on public.watchlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "watchlist_self_update" on public.watchlist;
create policy "watchlist_self_update" on public.watchlist
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "watchlist_self_delete" on public.watchlist;
create policy "watchlist_self_delete" on public.watchlist
  for delete using (auth.uid() = user_id);

drop trigger if exists trg_watchlist_updated_at on public.watchlist;
create trigger trg_watchlist_updated_at
  before update on public.watchlist
  for each row execute function public.set_updated_at();

-- 1인당 최대 200개 (어뷰즈 방지)
create or replace function public.enforce_watchlist_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.watchlist where user_id = new.user_id) >= 200 then
    raise exception '워치리스트는 최대 200개까지 추가 가능합니다';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_watchlist_limit on public.watchlist;
create trigger trg_watchlist_limit
  before insert on public.watchlist
  for each row execute function public.enforce_watchlist_limit();

-- ----------------------------------------------------------------------------
-- 2) recently_viewed — 최근 본 종목/섹터/산업/뉴스 (사용자당 50개)
-- ----------------------------------------------------------------------------
create table if not exists public.recently_viewed (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  item_type     text not null check (item_type in ('ticker','sector','industry','news')),
  item_key      text not null,
  display_name  text,
  viewed_at     timestamptz not null default now(),
  unique (user_id, item_type, item_key)
);

create index if not exists idx_recently_viewed_user_viewed
  on public.recently_viewed (user_id, viewed_at desc);

alter table public.recently_viewed enable row level security;

drop policy if exists "recently_self_select" on public.recently_viewed;
create policy "recently_self_select" on public.recently_viewed
  for select using (auth.uid() = user_id);

drop policy if exists "recently_self_insert" on public.recently_viewed;
create policy "recently_self_insert" on public.recently_viewed
  for insert with check (auth.uid() = user_id);

drop policy if exists "recently_self_update" on public.recently_viewed;
create policy "recently_self_update" on public.recently_viewed
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recently_self_delete" on public.recently_viewed;
create policy "recently_self_delete" on public.recently_viewed
  for delete using (auth.uid() = user_id);

-- BEFORE INSERT: 50개 초과 시 가장 오래된 행을 미리 삭제 (사용자별)
create or replace function public.prune_recently_viewed()
returns trigger language plpgsql as $$
declare
  excess_count int;
begin
  -- 신규 INSERT 직전 기존 보유 개수 50개 이상이면 (50 - 1 = 49개로 맞춤)
  -- 가장 오래된 (49 - count + 1) 개 삭제
  select count(*) into excess_count from public.recently_viewed where user_id = new.user_id;
  if excess_count >= 50 then
    delete from public.recently_viewed
     where id in (
       select id from public.recently_viewed
        where user_id = new.user_id
        order by viewed_at asc
        limit (excess_count - 49)
     );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recently_prune on public.recently_viewed;
create trigger trg_recently_prune
  before insert on public.recently_viewed
  for each row execute function public.prune_recently_viewed();

-- ----------------------------------------------------------------------------
-- 3) notes — 개인 메모 (마크다운, 본인만)
-- ----------------------------------------------------------------------------
create table if not exists public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  item_type     text not null check (item_type in ('ticker','sector','industry','news')),
  item_key      text not null,
  body          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_notes_user_entity
  on public.notes (user_id, item_type, item_key);

create index if not exists idx_notes_user_created
  on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_self_all" on public.notes;
create policy "notes_self_all" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- 본문 최대 10,000자
create or replace function public.enforce_notes_length()
returns trigger language plpgsql as $$
begin
  if length(new.body) > 10000 then
    raise exception '메모는 최대 10,000자까지 작성 가능합니다';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notes_length on public.notes;
create trigger trg_notes_length
  before insert or update on public.notes
  for each row execute function public.enforce_notes_length();

-- ----------------------------------------------------------------------------
-- 4) email_subscriptions — 일별 마켓 리포트 구독 (사용자 당 1행)
-- ----------------------------------------------------------------------------
create table if not exists public.email_subscriptions (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  daily_report  boolean not null default false,
  hour_kst      int not null default 8 check (hour_kst between 0 and 23),
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_email_subs_daily_enabled
  on public.email_subscriptions (daily_report)
  where daily_report = true;

alter table public.email_subscriptions enable row level security;

drop policy if exists "email_subs_self_all" on public.email_subscriptions;
create policy "email_subs_self_all" on public.email_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trg_email_subs_updated_at on public.email_subscriptions;
create trigger trg_email_subs_updated_at
  before update on public.email_subscriptions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5) email_log — 발송 이력
-- ----------------------------------------------------------------------------
create table if not exists public.email_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null,
  subject       text not null,
  sent_at       timestamptz not null default now(),
  status        text not null default 'sent' check (status in ('sent','failed','skipped','bounced')),
  error         text
);

create index if not exists idx_email_log_user_sent
  on public.email_log (user_id, sent_at desc);

create index if not exists idx_email_log_kind_sent
  on public.email_log (kind, sent_at desc);

alter table public.email_log enable row level security;

-- 본인 로그만 SELECT (INSERT/UPDATE 는 service_role 전용)
-- NOTE: INSERT/UPDATE/DELETE 정책을 의도적으로 정의하지 않는다.
--       RLS 정책 부재 = 일반 user 차단. service_role 키만 RLS 우회 가능.
--       cron/edge function 발송 워크플로우는 SUPABASE_SERVICE_ROLE 환경변수로
--       admin client(`lib/supabase/admin.ts`)를 사용해 적재한다.
drop policy if exists "email_log_self_select" on public.email_log;
create policy "email_log_self_select" on public.email_log
  for select using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6) activity_log — 사용자 활동 분석 (B3 대비)
-- ----------------------------------------------------------------------------
create table if not exists public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  action        text not null,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_activity_user_created
  on public.activity_log (user_id, created_at desc);

create index if not exists idx_activity_action_created
  on public.activity_log (action, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_self_select" on public.activity_log;
create policy "activity_self_select" on public.activity_log
  for select using (auth.uid() = user_id);

drop policy if exists "activity_self_insert" on public.activity_log;
create policy "activity_self_insert" on public.activity_log
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (수동 확인용)
-- ----------------------------------------------------------------------------
-- select tablename from pg_tables where schemaname='public' and tablename in
--   ('watchlist','recently_viewed','notes','email_subscriptions','email_log','activity_log');
-- select policyname, tablename from pg_policies where tablename in
--   ('watchlist','recently_viewed','notes','email_subscriptions','email_log','activity_log');
-- select tgname from pg_trigger where tgrelid in (
--   'public.watchlist'::regclass, 'public.recently_viewed'::regclass,
--   'public.notes'::regclass, 'public.email_subscriptions'::regclass);
