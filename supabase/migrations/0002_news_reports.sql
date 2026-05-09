-- ============================================================================
-- Phase A2 — 마켓 리포트(news_reports) 마이그레이션
-- ============================================================================
-- 실행 방법: Supabase Dashboard → SQL Editor 또는 메인이 MCP `apply_migration` 실행
-- 멱등: 재실행 시 변경 0 (모든 DDL이 IF NOT EXISTS / OR REPLACE 사용)
-- 의존: 0001_init_auth.sql 의 `set_updated_at()`, `is_admin()`, `profiles`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) news_reports — 일별 마켓 리포트 (전문가/초보자 듀얼 뷰)
-- ----------------------------------------------------------------------------
create table if not exists public.news_reports (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  status              text not null default 'draft'
                        check (status in ('draft', 'published', 'archived')),
  published_at        timestamptz,
  report_date         date not null,
  one_line_conclusion text,
  cover_keywords      text[] not null default '{}',
  expert_view         jsonb not null default '{}'::jsonb,
  novice_view         jsonb not null default '{}'::jsonb,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_news_reports_status_published_at
  on public.news_reports (status, published_at desc);

create index if not exists idx_news_reports_report_date
  on public.news_reports (report_date desc);

-- ----------------------------------------------------------------------------
-- 2) updated_at 트리거 (set_updated_at 재사용)
-- ----------------------------------------------------------------------------
drop trigger if exists trg_news_reports_updated_at on public.news_reports;
create trigger trg_news_reports_updated_at
  before update on public.news_reports
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3) RLS — 발행본은 누구나 read, 관리자는 전권
-- ----------------------------------------------------------------------------
alter table public.news_reports enable row level security;

-- 누구나 발행본 SELECT (anon + authenticated)
drop policy if exists "news_reports_public_read" on public.news_reports;
create policy "news_reports_public_read"
  on public.news_reports for select
  using (status = 'published');

-- 관리자: 모든 행 SELECT (draft / archived 포함)
drop policy if exists "news_reports_admin_select" on public.news_reports;
create policy "news_reports_admin_select"
  on public.news_reports for select
  using (public.is_admin());

-- 관리자: INSERT
drop policy if exists "news_reports_admin_insert" on public.news_reports;
create policy "news_reports_admin_insert"
  on public.news_reports for insert
  with check (public.is_admin());

-- 관리자: UPDATE
drop policy if exists "news_reports_admin_update" on public.news_reports;
create policy "news_reports_admin_update"
  on public.news_reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- 관리자: DELETE
drop policy if exists "news_reports_admin_delete" on public.news_reports;
create policy "news_reports_admin_delete"
  on public.news_reports for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (실행 후 수동 확인용)
-- ----------------------------------------------------------------------------
-- select * from public.news_reports order by published_at desc nulls last limit 5;
-- select policyname from pg_policies where tablename = 'news_reports';
-- select tgname from pg_trigger where tgrelid = 'public.news_reports'::regclass;
