-- ============================================================================
-- Phase A2/B1 핫픽스 — admin RLS 정책을 authenticated 역할로 제한
-- ============================================================================
-- 문제: 0003_user_perks.sql 의 보안 강화로 `public.is_admin()` EXECUTE 권한이
--       anon 에서 revoke 됨. PostgREST 가 anon select 호출 시 모든 적용 가능한
--       SELECT 정책을 평가 → admin_select 정책이 is_admin() 호출 → permission
--       denied → 500. 결과적으로 비로그인 사용자가 발행된 news_reports 도
--       못 읽는 회귀 발생.
--
-- 해결: is_admin() 을 호출하는 admin_* 정책들을 `to authenticated` 로 제한.
--       anon 은 public_read 만 평가하므로 함수 호출 안 일어남.
-- 멱등: drop if exists → create.
-- ============================================================================

-- news_reports
drop policy if exists "news_reports_admin_select" on public.news_reports;
create policy "news_reports_admin_select" on public.news_reports
  for select to authenticated
  using (public.is_admin());

drop policy if exists "news_reports_admin_insert" on public.news_reports;
create policy "news_reports_admin_insert" on public.news_reports
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "news_reports_admin_update" on public.news_reports;
create policy "news_reports_admin_update" on public.news_reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "news_reports_admin_delete" on public.news_reports;
create policy "news_reports_admin_delete" on public.news_reports
  for delete to authenticated
  using (public.is_admin());

-- profiles
drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles
  for select to authenticated
  using (public.is_admin());

-- activity_log
drop policy if exists "activity_admin_select" on public.activity_log;
create policy "activity_admin_select" on public.activity_log
  for select to authenticated
  using (public.is_admin());
