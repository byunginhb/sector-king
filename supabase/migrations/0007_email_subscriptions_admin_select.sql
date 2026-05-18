-- ============================================================================
-- Phase B1+ — email_subscriptions admin SELECT 정책 추가
-- ============================================================================
-- 목적: 관리자 콘솔(`/admin/users`)에서 가입자별 메일 구독 여부를 표시하기 위해
--       admin 이 모든 행을 SELECT 할 수 있도록 정책을 추가한다.
--
-- 기존: `email_subs_self_all` 만 존재 (auth.uid() = user_id) → admin 도 본인 행만 보임.
-- 추가: `email_subs_admin_select` (authenticated + is_admin()) → 전체 SELECT 허용.
-- 의존: 0001_init_auth.sql 의 `is_admin()`, 0003_user_perks.sql 의 email_subscriptions
-- 멱등: drop if exists → create
-- ============================================================================

drop policy if exists "email_subs_admin_select" on public.email_subscriptions;
create policy "email_subs_admin_select" on public.email_subscriptions
  for select to authenticated
  using (public.is_admin());
