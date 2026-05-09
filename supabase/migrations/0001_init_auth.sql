-- ============================================================================
-- Phase A1 — Supabase 인증 기반 초기 마이그레이션
-- ============================================================================
-- 실행 방법: Supabase Dashboard → SQL Editor → New query → 본 파일 전체 복사 → Run
-- 멱등: 재실행 시 변경 0 (모든 DDL이 IF NOT EXISTS / OR REPLACE 사용)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) app_settings — 관리자 이메일 화이트리스트 등 서버 설정 보관
--    클라이언트 접근 전면 차단 (RLS 정책 없음 = deny)
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- 초기값 (멱등): ADMIN_EMAILS 화이트리스트.
-- 이 값은 환경변수와 별개 — 트리거가 안전하게 읽기 위함.
-- 운영 시 사용자가 직접 UPDATE 가능 (service_role 만).
insert into public.app_settings (key, value)
values ('admin_emails', 'byunginhb@gmail.com')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 2) profiles — auth.users 와 1:1 매핑
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role
  on public.profiles(role) where role = 'admin';

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------------------
-- 3) 공통 트리거 함수 — updated_at 자동 갱신
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4) role 자가승격 차단 — 본인이 자신의 role 컬럼 변경 시 거부
-- ----------------------------------------------------------------------------
create or replace function public.prevent_role_self_escalation()
returns trigger language plpgsql security definer as $$
begin
  if old.role is distinct from new.role and auth.uid() = new.id then
    raise exception 'role 컬럼은 본인이 변경할 수 없습니다';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ----------------------------------------------------------------------------
-- 5) is_admin() — RLS 정책에서 일관 사용할 헬퍼
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
  returns boolean language sql security definer stable
  set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 6) auth.users INSERT → profiles 자동 생성 + ADMIN_EMAILS 매칭 시 admin 부여
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text;
  is_admin_user boolean := false;
begin
  select value into admin_emails
    from public.app_settings
    where key = 'admin_emails';

  if admin_emails is not null then
    -- 콤마 구분 화이트리스트에서 신규 사용자 이메일 매칭 (대소문자 무시)
    is_admin_user := position(lower(new.email) in lower(admin_emails)) > 0;
  end if;

  insert into public.profiles (id, email, name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url',
    case when is_admin_user then 'admin' else 'user' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 7) RLS 정책 — profiles
-- ----------------------------------------------------------------------------
-- 본인 프로필 SELECT
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

-- 본인 프로필 UPDATE (role 컬럼 변경은 트리거가 차단)
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 관리자: 모든 프로필 SELECT
drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select"
  on public.profiles for select
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (실행 후 수동 확인용)
-- ----------------------------------------------------------------------------
-- select * from public.app_settings;
-- select * from public.profiles;
-- select rolname from pg_roles where rolname = 'authenticated';
-- select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass;
