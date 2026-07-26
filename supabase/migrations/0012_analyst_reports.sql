-- ============================================================================
-- 애널리스트 성적표 Phase A — analysts / analyst_reports / report_authors
-- ============================================================================
-- 실행 방법: Supabase MCP `apply_migration` (Dashboard 핸드오프 금지, 프로젝트 메모리 규칙).
-- 멱등: 재실행 시 변경 0 (모든 DDL 이 IF NOT EXISTS / OR REPLACE).
-- 의존: 0001_init_auth.sql 의 `set_updated_at()`.
-- 도메인: 한경 컨센서스(기업 리포트) 크롤 누적. 크롤러(service_role)만 write,
--         공개 read 전량. 애널리스트 모더레이션(is_hidden 등) 없음 — 객관 데이터.
-- 통화: target_price / old_target_price 는 KRW 네이티브 원문 저장.
--       API 응답 직전 toUsd() 로 변환(프로젝트 필수 규칙, CLAUDE.md).
-- 식별: 애널리스트 = (name + firm). 공동저자는 report_authors 로 전원 귀속(M:N).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) analysts — 애널리스트 (이름 + 발행기관 = 1명)
-- ----------------------------------------------------------------------------
create table if not exists public.analysts (
  id          bigint generated always as identity primary key,
  name        text not null,                 -- 작성자 개별 이름(콤마 분해 후)
  firm        text not null,                 -- 발행기관 (OFFICE_NAME)
  firm_code   text,                          -- PUBLISH_CODE (nullable)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- (이름+기관) 유일 — 동명이인/이직은 별도 트랙레코드로 분리(설계 Q7)
create unique index if not exists analysts_name_firm
  on public.analysts (name, firm);

-- ----------------------------------------------------------------------------
-- 2) analyst_reports — 크롤 리포트(REPORT_IDX 당 1행)
-- ----------------------------------------------------------------------------
create table if not exists public.analyst_reports (
  id                bigint generated always as identity primary key,

  -- ── 출처/멱등 ──
  source            text not null default 'hankyung',
  external_id       text not null,                 -- 'hankyung:{REPORT_IDX}'
  report_idx        bigint,                        -- 원본 REPORT_IDX

  -- ── 종목 (구조화 필드 — 제목 파싱 불요) ──
  business_code     text not null,                 -- 6자리 종목코드 (BUSINESS_CODE)
  business_name     text not null,                 -- 기업명 (BUSINESS_NAME)
  market_type       text,                          -- '1'=KOSPI(.KS) '2'=KOSDAQ(.KQ)
  ticker            text,                          -- 매칭 시 접미사 포함(028050.KS), 미매칭 null
  matched           boolean not null default false,-- 우리 추적 종목(dailySnapshots)에 존재하는지

  -- ── 발행 ──
  office_name       text not null,                 -- 발행기관(= analysts.firm)
  publish_code      text,                          -- PUBLISH_CODE
  report_writer     text not null,                 -- 작성자 원문 콤마 문자열(보존)
  report_title      text,
  report_date       date not null,                 -- 발표일 (REPORT_DATE)

  -- ── 목표가 (KRW 네이티브 원문) ──
  target_price      numeric,                       -- TARGET_STOCK_PRICES (0/공백 → null)
  old_target_price  numeric,                       -- OLD_TARGET_STOCK_PRICES (직전, 0=신규커버)
  grade_value       text,                          -- 투자의견 (Buy 등)
  old_grade_value   text,

  -- ── 원문 자산 ──
  pdf_url           text,                          -- REPORT_FILEPATH
  pdf_filename      text,                          -- REPORT_FILENAME
  thumbnail_url     text,                          -- THUMBNAIL

  -- ── 원본 통째(펀더멘털 EPS/PER/PBR/ROE 등 — 스키마 불변 확장) ──
  raw               jsonb,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 멱등 upsert 키
create unique index if not exists analyst_reports_source_external
  on public.analyst_reports (source, external_id);

-- 조회 인덱스
create index if not exists idx_areports_code_date
  on public.analyst_reports (business_code, report_date);
create index if not exists idx_areports_ticker
  on public.analyst_reports (ticker) where ticker is not null;
create index if not exists idx_areports_matched
  on public.analyst_reports (matched) where matched = true;
create index if not exists idx_areports_date
  on public.analyst_reports (report_date);

-- ----------------------------------------------------------------------------
-- 3) report_authors — 리포트 ↔ 애널리스트 (M:N, 공동저자 전원 귀속)
-- ----------------------------------------------------------------------------
create table if not exists public.report_authors (
  report_id   bigint not null references public.analyst_reports(id) on delete cascade,
  analyst_id  bigint not null references public.analysts(id) on delete cascade,
  primary key (report_id, analyst_id)
);

-- 애널리스트별 리포트 역참조
create index if not exists idx_report_authors_analyst
  on public.report_authors (analyst_id);

-- ----------------------------------------------------------------------------
-- 4) updated_at 트리거 (set_updated_at 재사용, 0001)
-- ----------------------------------------------------------------------------
drop trigger if exists trg_analysts_updated_at on public.analysts;
create trigger trg_analysts_updated_at
  before update on public.analysts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_analyst_reports_updated_at on public.analyst_reports;
create trigger trg_analyst_reports_updated_at
  before update on public.analyst_reports
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5) RLS — 공개 read 전량, service_role(크롤러)은 BYPASSRLS 로 write
-- ----------------------------------------------------------------------------
-- 관리자 CRUD 없음(크롤 객관 데이터). anon+authenticated SELECT 만 허용.
alter table public.analysts        enable row level security;
alter table public.analyst_reports enable row level security;
alter table public.report_authors  enable row level security;

drop policy if exists "analysts_public_read" on public.analysts;
create policy "analysts_public_read"
  on public.analysts for select using (true);

drop policy if exists "analyst_reports_public_read" on public.analyst_reports;
create policy "analyst_reports_public_read"
  on public.analyst_reports for select using (true);

drop policy if exists "report_authors_public_read" on public.report_authors;
create policy "report_authors_public_read"
  on public.report_authors for select using (true);

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (실행 후 수동 확인용)
-- ----------------------------------------------------------------------------
-- select count(*) from public.analyst_reports;                              -- 백필 후 ~3884
-- select matched, count(*) from public.analyst_reports group by matched;    -- 매칭/미매칭 분포
-- select count(*) from public.analysts;                                     -- 고유 (이름+기관)
-- select policyname from pg_policies where tablename in ('analysts','analyst_reports','report_authors'); -- 3개
