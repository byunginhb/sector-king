-- ============================================================================
-- Phase B1 — 코드 리뷰 H+M 보강 마이그레이션
-- ============================================================================
-- 목적:
--   H1) 0003 의 SECURITY DEFINER 함수 search_path 누락 정정
--       (실제로는 plpgsql trigger functions; search_path 고정으로 schema 탈취 방지)
--   H2) 워치리스트 200 한도 트리거 race condition 차단 (advisory lock)
--   M2) activity_log 관리자 select 정책 추가 (분석용)
--   M3) notes (user_id, item_type, item_key) UNIQUE 제약 + dedupe
-- 멱등: create or replace + drop policy if exists + 안전한 dedupe SQL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- H1 + H2) 워치리스트 한도 트리거 — search_path 고정 + advisory lock
-- ----------------------------------------------------------------------------
create or replace function public.enforce_watchlist_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- 동일 user_id 의 동시 INSERT 트랜잭션을 직렬화 — 정확히 200 보장
  perform pg_advisory_xact_lock(hashtext('watchlist:' || new.user_id::text));

  if (select count(*) from public.watchlist where user_id = new.user_id) >= 200 then
    raise exception '워치리스트는 최대 200개까지 추가 가능합니다';
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- H1) recently_viewed prune 함수 — search_path 고정
-- ----------------------------------------------------------------------------
create or replace function public.prune_recently_viewed()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  excess_count int;
begin
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

-- ----------------------------------------------------------------------------
-- H1) notes 길이 트리거 — search_path 고정
-- ----------------------------------------------------------------------------
create or replace function public.enforce_notes_length()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if length(new.body) > 10000 then
    raise exception '메모는 최대 10,000자까지 작성 가능합니다';
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- M2) activity_log — 관리자 SELECT 정책 추가 (분석용)
-- ----------------------------------------------------------------------------
drop policy if exists "activity_admin_select" on public.activity_log;
create policy "activity_admin_select" on public.activity_log
  for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- M3) notes — (user_id, item_type, item_key) UNIQUE 제약
--   1) 기존 중복 dedupe (가장 최근 id 만 보존)
--   2) UNIQUE 제약 추가 (멱등: drop if exists → add)
-- ----------------------------------------------------------------------------
delete from public.notes a
 using public.notes b
 where a.id < b.id
   and a.user_id   = b.user_id
   and a.item_type = b.item_type
   and a.item_key  = b.item_key;

alter table public.notes drop constraint if exists notes_user_entity_unique;
alter table public.notes
  add constraint notes_user_entity_unique unique (user_id, item_type, item_key);

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (수동)
-- ----------------------------------------------------------------------------
-- select proname, prosecdef, proconfig from pg_proc
--  where proname in ('enforce_watchlist_limit','prune_recently_viewed','enforce_notes_length');
-- select conname from pg_constraint where conrelid='public.notes'::regclass;
-- select policyname from pg_policies where tablename='activity_log';
