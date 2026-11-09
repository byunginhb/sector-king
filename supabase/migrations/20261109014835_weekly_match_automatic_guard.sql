-- Replace the old signature; its eight-argument callers retain the false default.
drop function if exists public.record_weekly_match_settlement(text, text, text, numeric, numeric, text, jsonb, text);

create or replace function public.record_weekly_match_settlement(
  p_round_id text, p_input_hash text, p_outcome text, p_left_return numeric,
  p_right_return numeric, p_reason text, p_audit jsonb, p_correction_reason text, p_automatic boolean default false
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
  select * into v_prior from public.weekly_match_settlements where round_id = p_round_id order by version desc limit 1;
  -- A final result may have committed after the scheduler's public read.
  if p_automatic and found and v_prior.outcome <> 'pending' then return v_prior; end if;
  if p_automatic and (p_correction_reason is not null or p_audit->>'voidReason' is not null
    or p_audit->>'correctionReason' is not null) then
    raise exception 'AUTOMATIC_OVERRIDE_FORBIDDEN' using errcode = '22023';
  end if;
  if p_automatic and p_outcome = 'void' and clock_timestamp() < v_round.ends_at + interval '7 days' then
    raise exception 'AUTOMATIC_VOID_TOO_EARLY' using errcode = '22023';
  end if;
  select * into v_prior from public.weekly_match_settlements where round_id = p_round_id and input_hash = p_input_hash;
  if found then return v_prior; end if;
  select coalesce(max(version), 0) + 1 into v_version from public.weekly_match_settlements where round_id = p_round_id;
  if v_version > 1 and length(trim(coalesce(p_correction_reason, ''))) < 5 then
    select * into v_prior from public.weekly_match_settlements where round_id = p_round_id order by version desc limit 1;
    if p_automatic and v_prior.outcome = 'pending' then
      p_correction_reason := '자동 재확인: 미확정 데이터 갱신';
    elsif v_prior.outcome = 'pending' and p_outcome = 'void' and clock_timestamp() >= v_round.ends_at + interval '7 days'
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
revoke all on function public.record_weekly_match_settlement(text, text, text, numeric, numeric, text, jsonb, text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.record_weekly_match_settlement(text, text, text, numeric, numeric, text, jsonb, text, boolean) to service_role;
