-- ============================================================================
-- 구독 등급별 기능 게이팅 Phase A — profiles 구독 컬럼 + feature_permissions + 감사
-- ============================================================================
-- 실행: Supabase MCP `apply_migration` (Dashboard 핸드오프 금지, 프로젝트 규칙).
--       또는 psql / SQL Editor 로 본 파일 전체를 한 번에 실행.
-- 멱등: 재실행 시 변경 0. 모든 DDL 이 IF NOT EXISTS / OR REPLACE,
--       제약은 drop constraint if exists → add, 정책·트리거는 drop if exists → create.
-- 의존: 0001_init_auth.sql 의 `profiles`, `set_updated_at()`, `is_admin()`.
--       0004 규칙 — SECURITY DEFINER / 트리거 함수는 `set search_path = public`.
--       0005 규칙 — `is_admin()` 을 호출하는 정책은 반드시 `to authenticated`
--                   (anon 이 평가하면 permission denied → 500, 전 페이지 회귀).
-- 도메인: 권한/정책. 통화·시세와 무관 → toUsd 불요.
--         등급 사다리 anon(0) < free(10) < basic(20) < pro(30) < admin(100).
--         관리자는 `profiles.role` 이 SoT — `subscription_tier` 에 'admin' 저장 금지(CHECK).
--         기능 카탈로그 SoT 는 코드(`lib/permissions/features.ts`). 본 테이블은
--         **오버라이드만** 저장하므로 seed 가 없다(빈 테이블이 정상 상태).
--         DB 조회가 실패하면 코드 기본값이 그대로 적용된다 = 유료 기능이 열리지 않는다.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) profiles — 구독 컬럼 추가 (추가 → 백필 → 제약 3단계)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists subscription_tier       text,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists subscription_source     text,
  add column if not exists subscription_updated_at timestamptz;

-- 기존 행 백필. 2회차 실행에서는 대상 0행이라 멱등.
update public.profiles
   set subscription_tier = 'free'
 where subscription_tier is null;

alter table public.profiles
  alter column subscription_tier set default 'free';

alter table public.profiles
  alter column subscription_tier set not null;

-- CHECK 은 IF NOT EXISTS 미지원 → drop-then-add (0004 notes_user_entity_unique 패턴)
alter table public.profiles
  drop constraint if exists profiles_subscription_tier_check;
alter table public.profiles
  add constraint profiles_subscription_tier_check
  check (subscription_tier in ('free', 'basic', 'pro'));
-- NOTE: 'anon' 은 세션 부재의 파생값, 'admin' 은 role 축의 파생값이라 저장 금지.

-- 부분 인덱스 — 절대다수가 free + expires_at null 이라 전체 인덱스는 낭비.
-- (0001 의 `idx_profiles_role ... where role='admin'` 과 같은 형태)
create index if not exists idx_profiles_subscription_tier
  on public.profiles (subscription_tier)
  where subscription_tier <> 'free';

create index if not exists idx_profiles_subscription_expiry
  on public.profiles (subscription_expires_at)
  where subscription_expires_at is not null;


-- ----------------------------------------------------------------------------
-- 2) 등급 사다리 함수 (앱 `lib/permissions/tier.ts` 와 규칙 1:1)
-- ----------------------------------------------------------------------------
-- 사다리 숫자. 알 수 없는 값은 NULL → 비교가 false(=차단)가 되는 fail-safe.
-- 0 을 반환하면 오타난 min_tier 가 전면 개방이 된다 — 정반대의 사고.
create or replace function public.tier_rank(p_tier text)
returns int language sql immutable
set search_path = public as $$
  select case p_tier
    when 'anon'  then 0
    when 'free'  then 10
    when 'basic' then 20
    when 'pro'   then 30
    when 'admin' then 100
    else null
  end;
$$;

-- 유효 등급 = 만료 반영 + role 축 접기. 앱의 resolveTier() 와 동일 규칙.
--   프로필 없음                                   → 'anon'
--   role = 'admin'                                → 'admin' (만료 무관 — 별도 축)
--   expires_at is not null and expires_at <= now() → 'free'
--   그 외                                          → subscription_tier
create or replace function public.effective_tier(p_user_id uuid)
returns text language sql security definer stable
set search_path = public as $$
  select coalesce(
    (
      select case
        when p.role = 'admin' then 'admin'
        when p.subscription_tier = 'free' then 'free'
        when p.subscription_expires_at is not null
             and p.subscription_expires_at <= now() then 'free'
        else p.subscription_tier
      end
      from public.profiles p
      where p.id = p_user_id
    ),
    'anon'
  );
$$;

-- 현재 세션의 유효 등급. 향후 다른 테이블 RLS 에서 재사용할 헬퍼.
create or replace function public.current_tier()
returns text language sql security definer stable
set search_path = public as $$
  select case
    when auth.uid() is null then 'anon'
    else public.effective_tier(auth.uid())
  end;
$$;

-- anon EXECUTE 차단. anon 세션은 정의상 'anon' 등급이라 DB 에 물어볼 것이 없다.
-- 새 함수는 기본적으로 PUBLIC 에 EXECUTE 가 붙으므로 PUBLIC 에서 먼저 회수해야
-- 실제로 차단된다(anon 은 PUBLIC 을 통해 상속받는다).
-- feature_permissions 의 RLS 는 이 함수들을 쓰지 않으므로 0005 형태의 anon 500 회귀 없음.
revoke execute on function public.effective_tier(uuid) from public, anon;
revoke execute on function public.current_tier()       from public, anon;
grant  execute on function public.effective_tier(uuid) to authenticated, service_role;
grant  execute on function public.current_tier()       to authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3) 구독 컬럼 자가승격 차단 — 신규 함수 + 신규 트리거
-- ----------------------------------------------------------------------------
-- 0001 의 prevent_role_self_escalation() 을 create or replace 로 확장하지 않는다:
-- 0001 을 재실행하면(재적용·새 환경 부트스트랩·로컬 복제) 확장분이 옛 정의로
-- 조용히 되돌아가고 트리거는 그대로 붙어 있어 tier 방어선만 소리 없이 사라진다.
-- 별도 함수 + 별도 트리거라야 옛 마이그레이션 재실행에 영향받지 않는다.
--
-- 차단 범위는 tier 뿐 아니라 expires_at·source 세 컬럼 전부다. tier 만 막으면
-- 사용자가 자기 expires_at 을 2099년으로 늘려 만료를 무력화한다(만료가 곧 권한).
--
-- 통과 조건:
--   auth.uid() is null   → 통과 (service_role: 결제 웹훅·관리자 API)
--   auth.uid() <> new.id → 통과 (현재 RLS 상 이 경로는 존재하지 않음)
--   auth.uid() = new.id + 3컬럼 중 변경 → 예외
create or replace function public.prevent_subscription_self_escalation()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if auth.uid() = new.id and (
       old.subscription_tier       is distinct from new.subscription_tier
    or old.subscription_expires_at is distinct from new.subscription_expires_at
    or old.subscription_source     is distinct from new.subscription_source
  ) then
    raise exception '구독 등급 컬럼은 본인이 변경할 수 없습니다';
  end if;
  return new;
end;
$$;

-- 트리거 실행 순서(이름 오름차순): trg_prevent_role_escalation →
--   trg_prevent_subscription_escalation → trg_profiles_updated_at. 셋은 서로 독립.
-- profiles_self_update 정책이 살아 있어 이름·아바타 변경 시에도 이 트리거가 돌지만
-- 구독 컬럼이 그대로면 통과하므로 무해하다.
drop trigger if exists trg_prevent_subscription_escalation on public.profiles;
create trigger trg_prevent_subscription_escalation
  before update on public.profiles
  for each row execute function public.prevent_subscription_self_escalation();


-- ----------------------------------------------------------------------------
-- 4) feature_permissions — 정책 오버라이드
-- ----------------------------------------------------------------------------
create table if not exists public.feature_permissions (
  feature_id  text primary key,
  min_tier    text not null default 'free'
                check (min_tier in ('anon', 'free', 'basic', 'pro', 'admin')),
  gate_mode   text not null default 'hidden'
                check (gate_mode in ('hidden', 'blur', 'partial', 'teaser', 'open')),
  params      jsonb not null default '{}'::jsonb
                check (jsonb_typeof(params) = 'object'),
  enabled     boolean not null default true,   -- false = 킬 스위치(admin 포함 전원 차단)
  note        text,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- min_tier 는 요구 하한선이라 5개 값 전량을 받는다(subscription_tier 와 도메인이 다르다).
-- 'anon' = 전체 공개, 'admin' = 관리자 전용(내부 디버그·실험 기능).

-- feature_id 형식 — 코드 레지스트리 키 규칙의 상위집합.
-- (코드 FEATURE_ID_PATTERN 이 더 엄격하다: 점 정확히 1개, 세그먼트는 영문 시작)
alter table public.feature_permissions
  drop constraint if exists feature_permissions_feature_id_format;
alter table public.feature_permissions
  add constraint feature_permissions_feature_id_format
  check (feature_id ~ '^[a-z0-9]+([._-][a-z0-9]+)*$');

-- 콘솔의 "꺼진 기능" 조회용(행 수가 작아 그 외 인덱스는 불필요)
create index if not exists idx_feature_permissions_disabled
  on public.feature_permissions (feature_id)
  where enabled = false;

drop trigger if exists trg_feature_permissions_updated_at on public.feature_permissions;
create trigger trg_feature_permissions_updated_at
  before update on public.feature_permissions
  for each row execute function public.set_updated_at();

-- RLS — 공개 read(정책은 자물쇠이지 열쇠가 아니다) + 관리자 write.
-- contributors(0010) 구성 미러. admin 정책은 0005 규칙대로 전부 to authenticated.
-- enabled=false 행도 공개한다: SELECT 정책에 가시성 게이트를 넣으면 anon 과 admin 이
-- 보는 행 집합이 달라져 캐시가 역할별로 갈라진다(§3.5).
alter table public.feature_permissions enable row level security;

drop policy if exists "feature_permissions_public_read" on public.feature_permissions;
create policy "feature_permissions_public_read"
  on public.feature_permissions for select
  using (true);

drop policy if exists "feature_permissions_admin_insert" on public.feature_permissions;
create policy "feature_permissions_admin_insert"
  on public.feature_permissions for insert to authenticated
  with check (public.is_admin());

drop policy if exists "feature_permissions_admin_update" on public.feature_permissions;
create policy "feature_permissions_admin_update"
  on public.feature_permissions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "feature_permissions_admin_delete" on public.feature_permissions;
create policy "feature_permissions_admin_delete"
  on public.feature_permissions for delete to authenticated
  using (public.is_admin());

-- seed 없음: 카탈로그 SoT 가 코드(lib/permissions/features.ts)이므로 빈 테이블이
-- 정상 상태다. 여기에 기본값을 seed 하면 코드와 DB 두 벌의 기본값이 즉시 생긴다.


-- ----------------------------------------------------------------------------
-- 5) feature_permission_audit — 정책 변경 이력
-- ----------------------------------------------------------------------------
-- updated_by/updated_at 만으로는 "바뀌기 전 값"을 복원할 수 없다. 사고 대응에
-- 필요한 것은 마지막 변경자가 아니라 before 스냅샷이다.
create table if not exists public.feature_permission_audit (
  id          bigint generated always as identity primary key,
  feature_id  text not null,                  -- FK 없음: 삭제된 정책의 이력도 남아야 함
  action      text not null check (action in ('insert', 'update', 'delete')),
  before      jsonb,
  after       jsonb,
  changed_by  uuid references public.profiles(id) on delete set null,
  changed_at  timestamptz not null default now()
);

create index if not exists idx_fp_audit_feature_changed
  on public.feature_permission_audit (feature_id, changed_at desc);
create index if not exists idx_fp_audit_changed
  on public.feature_permission_audit (changed_at desc);

-- 트리거로 자동 적재 — 앱 코드가 잊어도 남게.
-- service_role 경로는 auth.uid() 가 null 이므로 updated_by 로 폴백한다.
-- (API 라우트 규약: requireAdminApi() 의 guard.profile.id 를 updated_by 에 넣을 것)
create or replace function public.log_feature_permission_change()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into public.feature_permission_audit (feature_id, action, before, after, changed_by)
    values (old.feature_id, 'delete', to_jsonb(old), null,
            coalesce(auth.uid(), old.updated_by));
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.feature_permission_audit (feature_id, action, before, after, changed_by)
    values (new.feature_id, 'update', to_jsonb(old), to_jsonb(new),
            coalesce(auth.uid(), new.updated_by));
    return new;
  else
    insert into public.feature_permission_audit (feature_id, action, before, after, changed_by)
    values (new.feature_id, 'insert', null, to_jsonb(new),
            coalesce(auth.uid(), new.updated_by));
    return new;
  end if;
end;
$$;

drop trigger if exists trg_feature_permissions_audit on public.feature_permissions;
create trigger trg_feature_permissions_audit
  after insert or update or delete on public.feature_permissions
  for each row execute function public.log_feature_permission_change();

-- RLS — 비공개. 관리자 SELECT 만. INSERT/UPDATE/DELETE 정책 부재 =
-- security definer 트리거만 적재 가능(0003 email_log 선례: "정책을 의도적으로 정의하지 않는다").
alter table public.feature_permission_audit enable row level security;

drop policy if exists "fp_audit_admin_select" on public.feature_permission_audit;
create policy "fp_audit_admin_select"
  on public.feature_permission_audit for select to authenticated
  using (public.is_admin());


-- ----------------------------------------------------------------------------
-- 6) subscription_change_log — 구독 등급 변경 이력
-- ----------------------------------------------------------------------------
-- 나중에 추가하면 그 사이 이력이 영구 소실된다(소급 복원 수단이 없는 유일한 종류).
-- 결제 분쟁 시 "언제부터 Pro 였나"의 증거.
create table if not exists public.subscription_change_log (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  old_tier        text,
  new_tier        text,
  old_expires_at  timestamptz,
  new_expires_at  timestamptz,
  source          text,
  changed_by      uuid references public.profiles(id) on delete set null,
  changed_at      timestamptz not null default now()
);
-- on delete cascade: 탈퇴 사용자의 구독 이력을 남기면 개인정보 보관 근거가 필요해진다.
-- profiles 가 이미 auth.users cascade 이므로 동일하게 따라간다.

create index if not exists idx_sub_change_user_changed
  on public.subscription_change_log (user_id, changed_at desc);
create index if not exists idx_sub_change_changed
  on public.subscription_change_log (changed_at desc);

create or replace function public.log_subscription_change()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.subscription_change_log
    (user_id, old_tier, new_tier, old_expires_at, new_expires_at, source, changed_by)
  values
    (new.id, old.subscription_tier, new.subscription_tier,
     old.subscription_expires_at, new.subscription_expires_at,
     new.subscription_source, auth.uid());   -- null = 시스템/결제 웹훅(service_role)
  return new;
end;
$$;

-- WHEN 절로 구독 컬럼이 실제로 바뀔 때만 발화 — 이름/아바타 수정에 오버헤드 없음
drop trigger if exists trg_profiles_subscription_audit on public.profiles;
create trigger trg_profiles_subscription_audit
  after update on public.profiles
  for each row
  when (
       old.subscription_tier       is distinct from new.subscription_tier
    or old.subscription_expires_at is distinct from new.subscription_expires_at
  )
  execute function public.log_subscription_change();

alter table public.subscription_change_log enable row level security;

drop policy if exists "sub_change_admin_select" on public.subscription_change_log;
create policy "sub_change_admin_select"
  on public.subscription_change_log for select to authenticated
  using (public.is_admin());
-- 본인 열람 정책은 두지 않는다 — 마이페이지에 구독 이력이 필요해지면 그때
-- `for select using (auth.uid() = user_id)` 를 별도 마이그레이션으로 연다.


-- ----------------------------------------------------------------------------
-- 7) expire_subscriptions() — 표시/집계 정합성용 정리 배치 (권한 판정과 무관)
-- ----------------------------------------------------------------------------
-- 권한 판정은 effective_tier() 의 파생 계산이 담당하므로 이 함수가 안 돌아도
-- 게이트는 정확하다. 이 함수는 /admin/users 목록과 유료 사용자 집계가
-- 만료분을 유료로 세지 않게 하는 청소 용도다. service_role 로만 호출.
create or replace function public.expire_subscriptions()
returns integer language plpgsql security definer
set search_path = public as $$
declare
  affected integer;
begin
  update public.profiles
     set subscription_tier       = 'free',
         subscription_expires_at = null,
         subscription_updated_at = now()
   where subscription_tier <> 'free'
     and subscription_expires_at is not null
     and subscription_expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke execute on function public.expire_subscriptions() from public, anon, authenticated;
grant  execute on function public.expire_subscriptions() to service_role;


-- ============================================================================
-- 적용 후 검증 쿼리 (수동 실행 — 6개 전부 통과해야 완료)
-- ============================================================================
--
-- [1] profiles 구독 컬럼 4개 존재 + NOT NULL/기본값
--     기대: 4행. subscription_tier = NO(nullable) / default 'free'::text,
--           나머지 3개는 YES(nullable) / default null.
-- select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'profiles'
--    and column_name like 'subscription%'
--  order by column_name;
--
-- [2] 기존 프로필 전원 free 백필 확인 (role 무회귀)
--     기대: subscription_tier 가 전부 'free', role 은 기존 분포 그대로. NULL 0행.
-- select subscription_tier, role, count(*)
--   from public.profiles group by 1, 2 order by 1, 2;
--
-- [3] 사다리 함수 정상값
--     기대: 30
-- select public.tier_rank('pro');
--
-- [4] 사다리 함수 fail-safe — 알 수 없는 값은 NULL(0 이 아니다)
--     기대: t
-- select public.tier_rank('prro') is null as fails_closed;
--
-- [5] 관리자는 만료와 무관하게 effective_tier = 'admin'
--     기대: 관리자 행 전부 'admin'. 관리자가 없으면 0행(그 경우 아래 anon 확인만).
-- select p.email, public.effective_tier(p.id) as tier
--   from public.profiles p where p.role = 'admin';
-- select public.effective_tier('00000000-0000-0000-0000-000000000000') = 'anon' as anon_ok;
--
-- [6] RLS 정책 roles — is_admin() 호출 정책이 전부 {authenticated} 인가 (0005 규칙)
--     기대: public_read 만 {public}, 나머지 5개(admin_insert/update/delete,
--           fp_audit_admin_select, sub_change_admin_select)는 {authenticated}.
--           하나라도 {public} 이면 anon 요청이 500 으로 깨진다.
-- select tablename, policyname, cmd, roles
--   from pg_policies
--  where tablename in ('feature_permissions', 'feature_permission_audit',
--                      'subscription_change_log')
--  order by tablename, policyname;
--
-- ----------------------------------------------------------------------------
-- 선택 검증 (원인 추적용, 통과 조건 아님)
-- ----------------------------------------------------------------------------
-- 함수 search_path 고정 + security definer 확인
-- select proname, prosecdef, proconfig from pg_proc
--  where proname in ('tier_rank','effective_tier','current_tier',
--                    'prevent_subscription_self_escalation',
--                    'log_feature_permission_change','log_subscription_change',
--                    'expire_subscriptions');
--
-- profiles 트리거 목록 (기대: role 차단 / subscription 차단 / updated_at / subscription 감사)
-- select tgname from pg_trigger
--  where tgrelid = 'public.profiles'::regclass and not tgisinternal order by tgname;
--
-- 감사 트리거 왕복 (insert→update→delete 후 3행, 확인 뒤 정리)
-- insert into public.feature_permissions (feature_id, min_tier, gate_mode)
--   values ('test.audit', 'pro', 'blur');
-- update public.feature_permissions set min_tier = 'basic' where feature_id = 'test.audit';
-- delete from public.feature_permissions where feature_id = 'test.audit';
-- select action, before->>'min_tier', after->>'min_tier'
--   from public.feature_permission_audit where feature_id = 'test.audit' order by id;
-- delete from public.feature_permission_audit where feature_id = 'test.audit';
--
-- 자가승격 차단 (인증 세션에서 실행 시 예외여야 정상)
-- update public.profiles set subscription_tier = 'pro' where id = auth.uid();
