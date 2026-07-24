-- ============================================================================
-- contributors — 섹터킹 소개 페이지 "함께하는 사람들" 목록
-- ============================================================================
-- 실행: Supabase MCP `apply_migration` (Dashboard 핸드오프 금지).
-- 멱등: 모든 DDL 이 IF NOT EXISTS / OR REPLACE, seed 는 ON CONFLICT DO NOTHING.
-- 의존: 0001_init_auth.sql 의 `set_updated_at()`, `is_admin()`.
-- 도메인: 순수 표시용 인물 카드(수동 전용). 자동 수집 없음 → source/lock/hidden 정책 불필요.
--         아바타는 도트 SVG(gender 실루엣 + variant 색상)라 이미지 파일 없음.
-- ============================================================================

create table if not exists public.contributors (
  id            bigint generated always as identity primary key,
  nickname      text not null,
  bio           text,                             -- 한줄 소개
  email         text,
  instagram_url text,
  threads_url   text,
  gender        text not null default 'male'
                  check (gender in ('male', 'female')),
  avatar_variant integer not null default 0,      -- 색상 팔레트 인덱스(0..N, 클라이언트 PixelAvatar 가 매핑)
  sort_order    integer not null default 0,       -- 표시 순서(오름차순)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_contributors_sort
  on public.contributors (sort_order, id);

-- updated_at 트리거 재사용
drop trigger if exists trg_contributors_updated_at on public.contributors;
create trigger trg_contributors_updated_at
  before update on public.contributors
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — 공개 read, 관리자 전권 (economic_events 미러, 단 가시성 게이트 없음)
-- ----------------------------------------------------------------------------
alter table public.contributors enable row level security;

drop policy if exists "contributors_public_read" on public.contributors;
create policy "contributors_public_read"
  on public.contributors for select
  using (true);

drop policy if exists "contributors_admin_insert" on public.contributors;
create policy "contributors_admin_insert"
  on public.contributors for insert to authenticated
  with check (public.is_admin());

drop policy if exists "contributors_admin_update" on public.contributors;
create policy "contributors_admin_update"
  on public.contributors for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "contributors_admin_delete" on public.contributors;
create policy "contributors_admin_delete"
  on public.contributors for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- seed — 샘플 1명 (BEN)
-- ----------------------------------------------------------------------------
insert into public.contributors
  (nickname, bio, email, threads_url, gender, avatar_variant, sort_order)
select 'BEN', '투자에서 도파민을 찾는 금융초보 개발자', 'byunginhb@gmail.com',
       'https://www.threads.com/@ssector.king', 'male', 0, 0
where not exists (
  select 1 from public.contributors where nickname = 'BEN'
);
