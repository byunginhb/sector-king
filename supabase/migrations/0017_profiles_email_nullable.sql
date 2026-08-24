-- 이메일을 주지 않는 소셜 제공자에서도 가입이 되게 한다.
--
-- 증상: 네이버 로그인이 `Database error saving new user` 로 실패했다.
-- 원인: profiles.email 이 NOT NULL 인데 `handle_new_user` 가 auth.users.email 을
--       그대로 넣는다. 네이버는 이메일을 안 넘겨줬고(속성 매핑 미해결), 그래서
--       회원 생성 트랜잭션 전체가 롤백됐다.
--
-- 네이버만의 문제가 아니다. 카카오의 account_email 은 **선택 동의**라 사용자가
-- 거부하면 같은 경로로 터진다. 제공자마다 막는 대신 모든 가입이 지나가는
-- 길목(트리거 + 스키마)을 고친다.
--
-- UNIQUE(email) 은 그대로 둔다 — Postgres 는 NULL 을 서로 다른 값으로 보므로
-- 이메일 없는 계정이 여럿이어도 충돌하지 않는다.

alter table public.profiles alter column email drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  admin_emails text;
  is_admin_user boolean := false;
begin
  select value into admin_emails
    from public.app_settings
    where key = 'admin_emails';

  -- new.email 이 null 이면 position(null in ...) 이 null 을 돌려주고 그 null 이
  -- is_admin_user 에 들어간다. 뒤의 case 가 조용히 'user' 로 떨어져 결과는
  -- 같지만, 의도를 드러내려고 null 을 먼저 막는다.
  if admin_emails is not null and new.email is not null then
    is_admin_user := position(lower(new.email) in lower(admin_emails)) > 0;
  end if;

  insert into public.profiles (id, email, name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      -- 네이버는 nickname 으로 준다. 이름이 비면 화면에서 아바타 이니셜까지
      -- '?' 가 되므로 흔한 키를 몇 개 더 본다.
      new.raw_user_meta_data->>'nickname',
      new.raw_user_meta_data->>'user_name'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      new.raw_user_meta_data->>'profile_image'
    ),
    case when is_admin_user then 'admin' else 'user' end
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;
