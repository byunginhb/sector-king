-- Native prices remain in the private audit JSON; public routes expose only returns.
create table if not exists public.weekly_match_rounds (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  title text not null,
  base_date date not null,
  end_date date not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  ends_at timestamptz not null,
  left_sector jsonb not null,
  right_sector jsonb not null,
  audit jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  check (base_date < end_date and opens_at < closes_at and closes_at < ends_at)
);

create table if not exists public.weekly_match_entries (
  round_id text not null references public.weekly_match_rounds(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('left', 'right')),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (round_id, user_id)
);

create table if not exists public.weekly_match_settlements (
  round_id text not null references public.weekly_match_rounds(id),
  version integer not null check (version > 0),
  outcome text not null check (outcome in ('left', 'right', 'tie', 'void', 'pending')),
  left_return numeric,
  right_return numeric,
  reason text,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  audit jsonb not null,
  settled_at timestamptz not null default clock_timestamp(),
  primary key (round_id, version),
  unique (round_id, input_hash),
  check ((outcome in ('pending', 'void') and left_return is null and right_return is null)
    or (outcome in ('left', 'right', 'tie') and left_return is not null and right_return is not null
      and left_return > '-Infinity'::numeric and left_return < 'Infinity'::numeric
      and right_return > '-Infinity'::numeric and right_return < 'Infinity'::numeric))
);

alter table public.weekly_match_rounds enable row level security;
alter table public.weekly_match_entries enable row level security;
alter table public.weekly_match_settlements enable row level security;
revoke all on public.weekly_match_rounds, public.weekly_match_entries, public.weekly_match_settlements from public, anon, authenticated, service_role;
grant select on public.weekly_match_entries to authenticated;
grant select, insert on public.weekly_match_rounds, public.weekly_match_settlements to service_role;
drop policy if exists weekly_match_own_entries on public.weekly_match_entries;
create policy weekly_match_own_entries on public.weekly_match_entries for select to authenticated using ((select auth.uid()) = user_id);

-- This narrow RPC is the only user write path; user identity never comes from its arguments.
create or replace function public.submit_weekly_match_pick(p_round_id text, p_side text)
returns public.weekly_match_entries
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_round public.weekly_match_rounds;
  v_entry public.weekly_match_entries;
  v_now timestamptz;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_side not in ('left', 'right') or p_side is null then raise exception 'INVALID_SIDE' using errcode = '22023'; end if;
  select * into v_round from public.weekly_match_rounds where id = p_round_id for update;
  if not found then raise exception 'ROUND_UNAVAILABLE' using errcode = 'P0002'; end if;
  -- Evaluate after acquiring the lock: transaction timestamps can precede a deadline wait.
  v_now := clock_timestamp();
  if v_now < v_round.opens_at or v_now >= v_round.closes_at then raise exception 'ROUND_CLOSED' using errcode = 'P0001'; end if;
  insert into public.weekly_match_entries(round_id, user_id, side, updated_at)
    values (p_round_id, v_user, p_side, v_now)
    on conflict (round_id, user_id) do update set side = excluded.side, updated_at = excluded.updated_at
    returning * into v_entry;
  return v_entry;
end;
$$;
revoke all on function public.submit_weekly_match_pick(text, text) from public, anon, authenticated, service_role;
grant execute on function public.submit_weekly_match_pick(text, text) to authenticated;

create or replace function public.publish_weekly_match(p_round jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_existing public.weekly_match_rounds;
  v_left jsonb;
  v_right jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('weekly-match:' || (p_round->>'id'), 0));
  select * into v_existing from public.weekly_match_rounds where id = p_round->>'id';
  if found then
    if v_existing.audit = p_round then return v_existing.id; end if;
    raise exception 'ROUND_IMMUTABLE' using errcode = 'P0001';
  end if;
  if clock_timestamp() >= (p_round->>'closesAt')::timestamptz
    or clock_timestamp() < ((p_round->>'baseDate') || 'T15:30:00+09:00')::timestamptz
    or (p_round->>'calendarVerifiedAt')::timestamptz > clock_timestamp()
    or (p_round->>'opensAt')::timestamptz < ((p_round->>'baseDate') || 'T15:30:00+09:00')::timestamptz
    or ((p_round->>'closesAt')::timestamptz at time zone 'Asia/Seoul')::time > time '09:00:00'
    or ((p_round->>'endsAt')::timestamptz at time zone 'Asia/Seoul')::date <> (p_round->>'endDate')::date then
    raise exception 'INVALID_ROUND_WINDOW' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements((p_round->'left'->'tickers') || (p_round->'right'->'tickers')) quote
    where (quote->>'retrievedAt')::timestamptz > clock_timestamp()) then
    raise exception 'INVALID_ROUND_WINDOW' using errcode = '22023';
  end if;
  select jsonb_build_object('id', p_round->'left'->'id', 'name', p_round->'left'->'name',
    'tickers', jsonb_agg(jsonb_build_object('ticker', value->'ticker', 'name', value->'name')))
    into v_left from jsonb_array_elements(p_round->'left'->'tickers');
  select jsonb_build_object('id', p_round->'right'->'id', 'name', p_round->'right'->'name',
    'tickers', jsonb_agg(jsonb_build_object('ticker', value->'ticker', 'name', value->'name')))
    into v_right from jsonb_array_elements(p_round->'right'->'tickers');
  insert into public.weekly_match_rounds(id, title, base_date, end_date, opens_at, closes_at, ends_at, left_sector, right_sector, audit)
    values(p_round->>'id', p_round->>'title', (p_round->>'baseDate')::date, (p_round->>'endDate')::date,
      (p_round->>'opensAt')::timestamptz, (p_round->>'closesAt')::timestamptz, (p_round->>'endsAt')::timestamptz, v_left, v_right, p_round);
  return p_round->>'id';
end;
$$;
revoke all on function public.publish_weekly_match(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.publish_weekly_match(jsonb) to service_role;

create or replace function public.record_weekly_match_settlement(
  p_round_id text, p_input_hash text, p_outcome text, p_left_return numeric,
  p_right_return numeric, p_reason text, p_audit jsonb, p_correction_reason text
)
returns public.weekly_match_settlements language plpgsql security invoker set search_path = '' as $$
declare
  v_round public.weekly_match_rounds;
  v_prior public.weekly_match_settlements;
  v_result public.weekly_match_settlements;
  v_version integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('weekly-match:' || p_round_id, 0));
  select * into v_round from public.weekly_match_rounds where id = p_round_id;
  if not found then raise exception 'ROUND_UNAVAILABLE' using errcode = 'P0002'; end if;
  if clock_timestamp() < v_round.ends_at then raise exception 'ROUND_NOT_ENDED' using errcode = 'P0001'; end if;
  select * into v_prior from public.weekly_match_settlements where round_id = p_round_id and input_hash = p_input_hash;
  if found then return v_prior; end if;
  select coalesce(max(version), 0) + 1 into v_version from public.weekly_match_settlements where round_id = p_round_id;
  if v_version > 1 and length(trim(coalesce(p_correction_reason, ''))) < 5 then
    select * into v_prior from public.weekly_match_settlements where round_id = p_round_id order by version desc limit 1;
    if v_prior.outcome = 'pending' and p_outcome = 'void' and clock_timestamp() >= v_round.ends_at + interval '7 days'
      and p_audit->>'voidReason' is null then
      p_correction_reason := '종료 7일 후 미확인 데이터로 무효 전환';
    else
      raise exception 'CORRECTION_REASON_REQUIRED' using errcode = '22023';
    end if;
  end if;
  insert into public.weekly_match_settlements(round_id, version, outcome, left_return, right_return, reason, input_hash, audit)
    values(p_round_id, v_version, p_outcome, p_left_return, p_right_return, coalesce(p_correction_reason, p_reason), p_input_hash, p_audit)
    returning * into v_result;
  return v_result;
end;
$$;
revoke all on function public.record_weekly_match_settlement(text, text, text, numeric, numeric, text, jsonb, text) from public, anon, authenticated, service_role;
grant execute on function public.record_weekly_match_settlement(text, text, text, numeric, numeric, text, jsonb, text) to service_role;
