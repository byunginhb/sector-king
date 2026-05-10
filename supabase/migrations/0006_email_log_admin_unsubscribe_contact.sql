-- ============================================================================
-- Phase B2 — email_log 관리자 정책 + 1-click unsubscribe 토큰 + contact 폼
-- ============================================================================
-- 목적:
--   1) email_log_admin_select 정책 추가 (관리자 대시보드용)
--   2) email_subscriptions.unsubscribe_token 컬럼 추가 + 백필 + unique 인덱스
--   3) contact_submissions 테이블 생성 (RLS, 트리거, 길이 제한)
-- 멱등: 모든 DDL 이 IF NOT EXISTS / OR REPLACE / drop if exists 사용.
-- 의존: 0001_init_auth.sql 의 set_updated_at(), is_admin(), profiles
--        0003_user_perks.sql 의 email_subscriptions, email_log
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) email_log — 관리자 SELECT 정책 추가 (분석/대시보드용)
--    기존 email_log_self_select 는 그대로 유지 (본인 행만 select).
-- ----------------------------------------------------------------------------
drop policy if exists "email_log_admin_select" on public.email_log;
create policy "email_log_admin_select" on public.email_log
  for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2) email_subscriptions — unsubscribe_token 컬럼 + 백필 + unique 인덱스
-- ----------------------------------------------------------------------------
alter table public.email_subscriptions
  add column if not exists unsubscribe_token uuid;

-- 백필: 기존 row 의 NULL 토큰을 채움 (멱등)
update public.email_subscriptions
   set unsubscribe_token = gen_random_uuid()
 where unsubscribe_token is null;

-- NOT NULL + DEFAULT (백필 후 안전하게 적용)
alter table public.email_subscriptions
  alter column unsubscribe_token set default gen_random_uuid();

alter table public.email_subscriptions
  alter column unsubscribe_token set not null;

create unique index if not exists idx_email_subs_unsubscribe_token
  on public.email_subscriptions (unsubscribe_token);

-- ----------------------------------------------------------------------------
-- 3) contact_submissions — 문의/제보 폼
-- ----------------------------------------------------------------------------
create table if not exists public.contact_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  email         text not null,
  category      text not null
                  check (category in ('inquiry','report','bug','feature','other')),
  subject       text not null,
  body          text not null,
  status        text not null default 'open'
                  check (status in ('open','replied','closed')),
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_contact_submissions_status_created
  on public.contact_submissions (status, created_at desc);

create index if not exists idx_contact_submissions_user_created
  on public.contact_submissions (user_id, created_at desc);

alter table public.contact_submissions enable row level security;

-- 본인 SELECT (로그인 사용자가 본인 제출 이력 조회)
drop policy if exists "contact_self_select" on public.contact_submissions;
create policy "contact_self_select" on public.contact_submissions
  for select to authenticated
  using (auth.uid() = user_id);

-- 관리자 SELECT (전체 조회)
drop policy if exists "contact_admin_select" on public.contact_submissions;
create policy "contact_admin_select" on public.contact_submissions
  for select to authenticated
  using (public.is_admin());

-- 관리자 UPDATE (status, admin_note 등)
drop policy if exists "contact_admin_update" on public.contact_submissions;
create policy "contact_admin_update" on public.contact_submissions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- INSERT — anon + authenticated 모두 허용 (비로그인 문의 가능)
drop policy if exists "contact_anon_insert" on public.contact_submissions;
create policy "contact_anon_insert" on public.contact_submissions
  for insert to anon
  with check (user_id is null);

drop policy if exists "contact_auth_insert" on public.contact_submissions;
create policy "contact_auth_insert" on public.contact_submissions
  for insert to authenticated
  with check (
    user_id is null or user_id = auth.uid()
  );

-- updated_at 트리거 (set_updated_at 재사용)
drop trigger if exists trg_contact_submissions_updated_at
  on public.contact_submissions;
create trigger trg_contact_submissions_updated_at
  before update on public.contact_submissions
  for each row execute function public.set_updated_at();

-- 본문 길이 제한 (5000자)
create or replace function public.enforce_contact_body_length()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if length(new.body) > 5000 then
    raise exception '문의 본문은 최대 5,000자까지 작성 가능합니다';
  end if;
  if length(new.subject) > 200 then
    raise exception '제목은 최대 200자까지 작성 가능합니다';
  end if;
  if length(new.email) > 320 then
    raise exception '이메일은 최대 320자까지 입력 가능합니다';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contact_body_length on public.contact_submissions;
create trigger trg_contact_body_length
  before insert or update on public.contact_submissions
  for each row execute function public.enforce_contact_body_length();

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (수동)
-- ----------------------------------------------------------------------------
-- select policyname from pg_policies where tablename = 'email_log';
-- select column_name, data_type, is_nullable from information_schema.columns
--   where table_name = 'email_subscriptions' and column_name = 'unsubscribe_token';
-- select indexname from pg_indexes where indexname = 'idx_email_subs_unsubscribe_token';
-- select tablename from pg_tables where tablename = 'contact_submissions';
-- select policyname from pg_policies where tablename = 'contact_submissions';
-- select tgname from pg_trigger where tgrelid = 'public.contact_submissions'::regclass;
