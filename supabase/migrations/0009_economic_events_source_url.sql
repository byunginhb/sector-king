-- ============================================================================
-- 14_econ_calendar 후속 — economic_events.source_url 컬럼 추가 + 수동 시드 backfill
-- ============================================================================
-- 실행 방법: Supabase MCP `apply_migration` (Dashboard 핸드오프 금지, 프로젝트 메모리 규칙)
--            또는 psql/SQL Editor 로 본 파일 전체 실행.
-- 멱등: 재실행 시 변경 0 (add column if not exists + external_id 조건 update).
-- 의존: 0008_economic_events.sql (economic_events 테이블 + 수동 시드 4행).
-- 배경: 날짜/이벤트 클릭 팝업(DayDetailModal) 제거 → 이벤트 항목 클릭 시
--       출처(source_url)로 이동. FRED 자동수집분은 크론 재수집으로 채워진다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) source_url 컬럼 추가 (nullable — 출처 미상 이벤트 허용)
-- ----------------------------------------------------------------------------
alter table public.economic_events
  add column if not exists source_url text;

-- ----------------------------------------------------------------------------
-- 2) 기존 수동 시드 4행 backfill (external_id 로 정확 매칭)
-- ----------------------------------------------------------------------------
-- 재실행해도 값이 동일하므로 멱등. FRED 자동수집분(source='fred')은
-- 크론 재수집이 source_url 을 upsert 하므로 여기서 다루지 않는다.
update public.economic_events
  set source_url = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'
  where external_id = 'manual:US:fomc-rate:2026-07-30';

update public.economic_events
  set source_url = 'https://www.bok.or.kr'
  where external_id = 'manual:KR:gdp-q2-adv:2026-07-24';

update public.economic_events
  set source_url = 'https://kostat.go.kr'
  where external_id = 'manual:KR:cpi:2026-08-04';

update public.economic_events
  set source_url = 'https://www.bok.or.kr/portal/singl/baseRate/list.do'
  where external_id = 'manual:KR:bok-rate:2026-08-27';

-- ----------------------------------------------------------------------------
-- 검증 쿼리 (실행 후 수동 확인용)
-- ----------------------------------------------------------------------------
-- select external_id, source_url from public.economic_events
--   where source = 'manual' order by event_date;  -- 4행 모두 source_url 채워짐
