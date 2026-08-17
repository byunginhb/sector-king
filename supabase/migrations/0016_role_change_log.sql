-- ============================================================================
-- 0016 — 관리자 권한(role) 변경 이력
-- ============================================================================
-- 배경: 콘솔에서 관리자 권한을 주고받을 수 있게 하면서, 그 이력이 **어디에도
-- 남지 않는** 상태로 두면 안 된다. 구독 등급은 `subscription_change_log` 가
-- 잡지만 `role` 은 그 트리거의 관심사가 아니다.
--
-- role 은 구독보다 더 위험하다: 관리자는 전 사용자 데이터를 보고, 뉴스를
-- 발행하고, 다른 사람의 권한까지 바꾼다. "언제 누가 누구에게 줬는지"가 없으면
-- 사고가 났을 때 되짚을 방법이 없다.
--
-- 감사 테이블은 **나중에 추가하면 그 사이 이력이 영구 소실된다** — 소급 복원
-- 수단이 없는 유일한 종류라서 기능과 같은 커밋에 넣는다(0014 가
-- subscription_change_log 를 같은 이유로 먼저 만들었다).
--
-- 멱등: `if not exists` / `create or replace` / `drop … if exists`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) profiles.role_updated_by — 행위자 전달 통로
-- ----------------------------------------------------------------------------
-- 관리자가 타인의 role 을 바꾸는 경로는 service_role 뿐이고(profiles 에 admin
-- update RLS 정책이 없다), 그때 `auth.uid()` 는 null 이다. 0015 에서 구독에
-- 쓴 것과 같은 방식으로 **같은 UPDATE 문 안에** 행위자를 실어 보낸다.
alter table public.profiles
  add column if not exists role_updated_by uuid
    references public.profiles(id) on delete set null;

comment on column public.profiles.role_updated_by is
  '마지막으로 role 을 변경한 주체. service_role 경로에서 auth.uid() 가 null 이므로 앱이 직접 싣는다. 이력은 role_change_log 참조.';


-- ----------------------------------------------------------------------------
-- 2) 자가 변경 차단 — 새 컬럼도 방어선에 포함
-- ----------------------------------------------------------------------------
-- 0001 의 함수는 `role` 만 본다. `role_updated_by` 를 본인이 위조할 수 있으면
-- 다음 변경의 행위자 기록이 거짓이 된다.
-- (0001 을 재실행해도 이 정의가 되살아나도록 별도 파일에서 교체한다 —
--  0014·0015 가 같은 이유로 택한 방식.)
create or replace function public.prevent_role_self_escalation()
returns trigger language plpgsql security definer as $$
begin
  if auth.uid() = new.id and (
       old.role            is distinct from new.role
    or old.role_updated_by is distinct from new.role_updated_by
  ) then
    raise exception 'role 컬럼은 본인이 변경할 수 없습니다';
  end if;
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- 3) role_change_log
-- ----------------------------------------------------------------------------
create table if not exists public.role_change_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  old_role    text,
  new_role    text,
  note        text,
  changed_by  uuid references public.profiles(id) on delete set null,
  changed_at  timestamptz not null default now()
);

create index if not exists idx_role_change_user
  on public.role_change_log (user_id, changed_at desc);
create index if not exists idx_role_change_changed
  on public.role_change_log (changed_at desc);

create or replace function public.log_role_change()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.role_change_log (user_id, old_role, new_role, changed_by)
  values (
    new.id, old.role, new.role,
    coalesce(auth.uid(), new.role_updated_by)   -- 둘 다 null = 시스템/수동 SQL
  );
  return new;
end;
$$;

-- role 이 실제로 바뀔 때만 발화 — 이름·아바타 수정에 오버헤드 없음.
drop trigger if exists trg_profiles_role_audit on public.profiles;
create trigger trg_profiles_role_audit
  after update on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function public.log_role_change();

alter table public.role_change_log enable row level security;

-- 관리자만 열람. 본인 열람 정책은 두지 않는다 — 필요해지면 별도 마이그레이션.
drop policy if exists "role_change_admin_select" on public.role_change_log;
create policy "role_change_admin_select"
  on public.role_change_log for select to authenticated
  using (public.is_admin());
