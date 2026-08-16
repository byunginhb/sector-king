-- ============================================================================
-- 0015 — 구독 등급 변경자(관리자)·사유 기록 보정
-- ============================================================================
-- 배경: 0014 의 `log_subscription_change()` 는 `changed_by` 를 `auth.uid()` 로
-- 채운다. 그런데 관리자가 타인의 등급을 바꾸는 경로는 **service_role 뿐이다** —
-- profiles 의 RLS 에는 `profiles_admin_select` 만 있고 admin update 정책이 없다
-- (관리자 update 를 RLS 로 열면 브라우저 토큰으로도 가능해져 공격면이 넓어진다).
--
-- service_role 요청에서는 `auth.uid()` 가 null 이므로, 콘솔로 부여한 등급의
-- 감사 로그가 전부 `changed_by = null` 로 남는다. 이 테이블의 존재 이유가
-- "결제 분쟁 시 언제부터 Pro 였나"의 증거인데, 누가 줬는지가 통째로 비면
-- 절반은 증거 구실을 못 한다.
--
-- 해결: 앱이 업데이트와 **같은 UPDATE 문 안에서** 행위자를 실어 보내고,
-- 트리거가 `auth.uid()` 를 우선하되 없으면 그 값을 쓴다. 별도 UPDATE 로
-- 로그 행을 사후 수정하는 방식은 트리거가 방금 넣은 행을 되찾아야 해서
-- 경합이 생긴다 — 같은 문장 안에 실으면 그 문제가 없다.
--
-- 멱등: 전부 `if not exists` / `create or replace` / `drop … if exists`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) profiles.subscription_updated_by
-- ----------------------------------------------------------------------------
-- 마지막으로 구독 컬럼을 바꾼 주체. 이력은 subscription_change_log 가 들고
-- 있으므로 여기는 "현재 상태를 누가 만들었나" 만 담는다.
-- on delete set null: 관리자 계정이 사라져도 사용자의 구독은 유지되어야 한다.
alter table public.profiles
  add column if not exists subscription_updated_by uuid
    references public.profiles(id) on delete set null;

comment on column public.profiles.subscription_updated_by is
  '마지막으로 구독 컬럼을 변경한 주체. service_role 경로(관리자 콘솔·결제 웹훅)에서 auth.uid() 가 null 이므로 앱이 직접 싣는다. 이력은 subscription_change_log 참조.';


-- ----------------------------------------------------------------------------
-- 1-2) 부여 사유 — profiles 를 거쳐 로그로 흐른다
-- ----------------------------------------------------------------------------
-- "왜 이 사람에게 Pro 를 줬나"(이벤트 당첨·환불 보상·베타 테스터)는 결제 연동
-- 전 수동 부여 기간에 특히 필요하고, 0014 의 `subscriptionGrantSchema` 도 이미
-- `note` 를 받도록 정의돼 있다. 저장할 자리만 없었다.
--
-- 로그에 직접 INSERT 하지 않고 `profiles` 를 경유시키는 이유: 등급 변경 로그는
-- 트리거가 만든다. 앱이 별도 행을 끼워 넣으면 old_tier 가 빈 가짜 이력이 생기고,
-- 트리거가 방금 넣은 행을 되찾아 고치는 방식은 경합이 생긴다. `source` 가 이미
-- 이 경로로 흐르고 있으므로 같은 길을 쓴다.
alter table public.profiles
  add column if not exists subscription_note text;

alter table public.subscription_change_log
  add column if not exists note text;

comment on column public.profiles.subscription_note is
  '마지막 구독 변경의 사유 메모(관리자 입력). 변경마다의 이력은 subscription_change_log.note 가 들고 있다.';


-- ----------------------------------------------------------------------------
-- 2) 자가 변경 차단 — 새 컬럼도 방어선에 포함
-- ----------------------------------------------------------------------------
-- 사용자는 `profiles_self_update` 로 본인 행을 update 할 수 있다. tier 는 이미
-- 막혀 있지만 `subscription_updated_by` 를 빠뜨리면 본인이 그 값을 아무 관리자
-- id 로 써 넣을 수 있고, 그러면 다음 부여 로그의 행위자가 거짓이 된다.
-- (0014 와 같은 이유로 0001·0014 의 함수를 고치지 않고 이 파일에서 교체한다 —
--  옛 마이그레이션 재실행이 방어선을 조용히 되돌리지 않게.)
create or replace function public.prevent_subscription_self_escalation()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if auth.uid() = new.id and (
       old.subscription_tier       is distinct from new.subscription_tier
    or old.subscription_expires_at is distinct from new.subscription_expires_at
    or old.subscription_source     is distinct from new.subscription_source
    or old.subscription_updated_by is distinct from new.subscription_updated_by
    or old.subscription_note       is distinct from new.subscription_note
  ) then
    raise exception '구독 등급 컬럼은 본인이 변경할 수 없습니다';
  end if;
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- 3) 감사 트리거 — auth.uid() 우선, 없으면 앱이 실어 보낸 행위자
-- ----------------------------------------------------------------------------
-- coalesce 순서가 중요하다: `auth.uid()` 가 먼저다. 세션이 있는 경로에서는
-- 앱이 무엇을 싣든 실제 호출자가 이긴다.
create or replace function public.log_subscription_change()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.subscription_change_log
    (user_id, old_tier, new_tier, old_expires_at, new_expires_at, source, note, changed_by)
  values
    (new.id, old.subscription_tier, new.subscription_tier,
     old.subscription_expires_at, new.subscription_expires_at,
     new.subscription_source, new.subscription_note,
     coalesce(auth.uid(), new.subscription_updated_by));  -- 둘 다 null = 시스템 배치
  return new;
end;
$$;
