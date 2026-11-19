create table if not exists public.weekly_match_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (nickname = btrim(nickname)
    and nickname ~ '^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ _-]{2,16}$'),
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index if not exists weekly_match_public_profiles_nickname_unique
  on public.weekly_match_public_profiles (lower(nickname));
alter table public.weekly_match_public_profiles enable row level security;
revoke all on public.weekly_match_public_profiles from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.weekly_match_public_profiles to authenticated;
drop policy if exists weekly_match_own_public_profile on public.weekly_match_public_profiles;
create policy weekly_match_own_public_profile on public.weekly_match_public_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Definer access is limited to aggregate projections; the existing private-table grants stay unchanged.
create or replace function public.weekly_match_participant_counts(p_round_ids text[])
returns table(round_id text, participant_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_round_ids is null or cardinality(p_round_ids) > 12
    or coalesce(array_ndims(p_round_ids), 1) <> 1
    or exists(select 1 from unnest(p_round_ids) as id where id is null or id !~ '^[a-z0-9][a-z0-9_-]{0,79}$') then
    raise exception 'INVALID_ROUND_IDS' using errcode = '22023';
  end if;
  return query
    select r.id, count(distinct e.user_id)
    from public.weekly_match_rounds as r
    left join public.weekly_match_entries as e on e.round_id = r.id
    where r.id = any(p_round_ids)
    group by r.id
    order by r.id;
end;
$$;
revoke all on function public.weekly_match_participant_counts(text[]) from public, anon, authenticated, service_role;
grant execute on function public.weekly_match_participant_counts(text[]) to service_role;

create or replace function public.weekly_match_leaderboard()
returns jsonb language sql stable security definer set search_path = '' as $$
  with season as (
    select to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM') as name,
      date_trunc('month', now() at time zone 'Asia/Seoul')::date as starts_on,
      (date_trunc('month', now() at time zone 'Asia/Seoul') + interval '1 month')::date as ends_on
  ), latest as (
    select distinct on (s.round_id) s.round_id, s.outcome
    from public.weekly_match_settlements as s
    join public.weekly_match_rounds as r on r.id = s.round_id
    cross join season
    where r.end_date >= season.starts_on and r.end_date < season.ends_on
    order by s.round_id, s.version desc
  ), scores as (
    select p.user_id, p.nickname,
      count(*) filter (where s.outcome = e.side) as points,
      count(*) filter (where s.outcome <> e.side) as losses,
      count(*) as valid_entries
    from public.weekly_match_public_profiles as p
    join public.weekly_match_entries as e on e.user_id = p.user_id
    join latest as s on s.round_id = e.round_id
    where p.is_public and s.outcome in ('left', 'right')
    group by p.user_id, p.nickname
  ), ranked as (
    select rank() over (order by points desc) as position, nickname, points, losses, valid_entries
    from scores
  ), leaders as (
    select * from ranked order by position, lower(nickname), nickname limit 50
  )
  select jsonb_build_object(
    'season', (select name from season),
    'total', (select count(*) from ranked),
    'entries', coalesce((select jsonb_agg(jsonb_build_object(
      'rank', position, 'nickname', nickname, 'points', points, 'wins', points,
      'losses', losses, 'validEntries', valid_entries
    ) order by position, lower(nickname), nickname) from leaders), '[]'::jsonb)
  );
$$;
revoke all on function public.weekly_match_leaderboard() from public, anon, authenticated, service_role;
grant execute on function public.weekly_match_leaderboard() to service_role;
