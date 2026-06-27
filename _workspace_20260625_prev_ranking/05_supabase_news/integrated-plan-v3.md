# 통합 기획서 v3 — Supabase 인증 + 마켓 뉴스 시스템

> 입력: `auth-plan.md` (734줄), `migration-plan.md` (490줄), `news-plan.md` (~1000줄), `ui-plan.md`
> 작성: sk-orchestrator (메인 통합)
> 일자: 2026-05-09
> 상태: **사용자 승인 + 환경변수 전달 대기 중**

---

## 1. 한 줄 요약
Supabase Auth(Google OAuth) + Postgres 기반 인증/관리자 시스템과 일별 마켓 리포트(전문가/초보자 듀얼 뷰)를 도입한다. 기존 산업/티커 데이터의 SQLite는 Phase A에서 유지(인증·뉴스만 Supabase Postgres) → Phase B에서 점진 통합 마이그레이션. 매일 자정 cron(`update_data.py`)은 옵션에 따라 Postgres 직접 쓰기로 전환.

---

## 2. 4개 산출물 핵심 종합

### 2.1 인증 (auth-plan)
- **`@supabase/ssr`** + Google OAuth Provider 1차
- 4개 클라이언트 모듈: `lib/supabase/{server,client,middleware,admin}.ts`
- **3중 방어**: middleware(비로그인 차단) → Server Component `requireAdmin()` → DB RLS
- `profiles` 테이블: `id pk fk auth.users / email / name / avatar_url / role('user'|'admin') / created_at`
- **role 자가승격 차단**: BEFORE UPDATE 트리거 + RLS update에서 role 컬럼 제외
- `is_admin()` SECURITY DEFINER 헬퍼 → news_reports RLS 정책 통일

### 2.2 DB 마이그레이션 (migration-plan)
- **Phase A 권장**: 인증·뉴스만 Supabase Postgres, 산업/티커 데이터는 SQLite 유지 → 위험 최소
- **Phase B 후속**: 산업/티커 데이터까지 Postgres 일괄 마이그레이션 (예상 33,900행, daily_snapshots 19,704가 최대)
- Drizzle 전환 핵심:
  - `sqliteTable` → `pgTable`
  - `integer(market_cap/volume)` → **`bigint` 필수** (Apple 3.5T 등 INT 한도 초과 방지)
  - `INSERT OR REPLACE` → `ON CONFLICT ... DO UPDATE SET ... = EXCLUDED.*`
- **cron 옵션 A 채택**: GitHub Actions에서 `psycopg2-binary` + `DATABASE_URL` secret으로 직접 Postgres 쓰기. yfinance(Python)를 Edge Function으로 이식하면 cold start/rate limit 위험 큼.
- **위험**: marketCap bigint 누락 / UPSERT 문법 차이 → staging dry-run 필수

### 2.3 뉴스 (news-plan)
- **데이터 모델**: 단일 `news_reports` 테이블 + JSONB로 섹션 저장 (스키마 변경 유연성, 검색은 후속)
- **컬럼**: `id / title / status('draft'|'published'|'archived') / published_at / cover_keywords / report_date / one_line_conclusion / expert_view JSONB / novice_view JSONB / created_by FK profiles / created_at / updated_at`
- **이중 뷰**: 같은 리포트 안에서 전문가용/초보자용 segment toggle
- **메인 노출**: MarketPulseStrip **바로 아래** "오늘의 마켓 리포트" 카드 (제목 + 30초 브리핑 1줄 + 발행일 + CTA)
- **상세 페이지** `/news/[id]`: sticky TOC + 헤드라인 티커 자동 cross-link → `/{industry}/...` 또는 회사 모달
- **목록 페이지** `/news`: 발행 리스트, 페이지네이션
- **관리자 입력**: 섹션별 폼 + Markdown 부분 허용(헤드라인 본문 등) — 미리보기 토글
- **신규 핵심 컴포넌트 5개**: `NewsHomeCard`, `ExpertReportView`, `NoviceReportView`, `HeadlineCard`, `ScenarioCardGroup`
- zod 검증, 발행 정책, RLS 통합

### 2.4 UI (ui-plan)
- **로그인 진입**: 전용 `/login` 라우트 + `?redirect=` (모달보다 OAuth/접근성/키보드 우월)
- **헤더**: 비로그인 → "로그인" 버튼 / 로그인 → 아바타 + 드롭다운(프로필 / 관리자 페이지(role=admin) / 로그아웃)
- **관리자 보호 3중 가드**: middleware → `app/admin/layout.tsx` role 검증 → `/api/admin/**` 재검증. 비로그인 → `/login` redirect, role=user → 명시적 403
- **메인 카드 위치**: MarketPulseStrip 바로 아래 — KPI(숫자) → 내러티브(뉴스) → 분석(자금흐름/패권) 동선
- 모바일 햄버거 메뉴 + 사용자 시트, ARIA·키보드 탐색 표준

---

## 3. 핵심 결정 (충돌 해결)

### 충돌 1 — Supabase 도입 범위
- auth-plan: 인증·뉴스만 Postgres(저장소 분리)
- migration-plan: Phase A로 인증·뉴스만 / Phase B에서 산업·티커
- → **Phase A 채택** (산업/티커 데이터 SQLite 유지) — 위험 최소화. 향후 평가 후 Phase B.

### 충돌 2 — 뉴스 본문 저장 방식
- news-plan: JSONB(전문가/초보자 분리)
- migration-plan Open Q: Markdown vs JSONB
- → **JSONB 채택** (섹션별 컴포넌트 매핑, 검색은 후속)

### 충돌 3 — role enum
- migration-plan Open Q: enum vs text
- → **text + CHECK constraint** ('user'|'admin') — Postgres enum 변경 비용 vs flexibility

### 충돌 4 — better-sqlite3 제거 시점
- Phase A에서는 산업/티커가 SQLite라 **유지**. `next.config.ts` 변경 불필요.
- Phase B에서 제거.

---

## 4. 단계별 구현 (Phase 정의)

### **Phase A1 — 인증 기반** (3~4일)
- 사용자 액션: Supabase 프로젝트 생성, Google OAuth Client ID 발급, 환경변수 5종 전달
- Drizzle Postgres dialect 추가 (`drizzle/supabase-schema.ts`로 분리 — 기존 SQLite schema 보존)
- `lib/supabase/{server,client,middleware,admin}.ts` 4 모듈
- `profiles` 테이블 + RLS + 트리거 적용
- `/login`, `/auth/callback`, `middleware.ts`
- 헤더 UI (로그인 전/후), 사용자 드롭다운

### **Phase A2 — 관리자 + 뉴스 시스템** (4~6일)
- `news_reports` 테이블 + RLS
- 관리자 라우트 `/admin`, `/admin/news`, `/admin/news/new`, `/admin/news/[id]/edit`
- API 라우트 `GET/POST/PATCH/DELETE` (인증 체크)
- 신규 컴포넌트 5개 (`NewsHomeCard`, `ExpertReportView`, `NoviceReportView`, `HeadlineCard`, `ScenarioCardGroup`)
- 메인 화면 카드 통합 (MarketPulseStrip 아래)
- `/news`(목록), `/news/[id]`(상세)
- samplenews.md를 첫 데이터로 변환·시드

### **Phase B — 산업/티커 데이터 Postgres 마이그레이션** (후속, 별도 PR)
- SQLite → Postgres 일괄 마이그레이션 스크립트
- cron(`update_data.py`) → psycopg2 + DATABASE_URL
- `next.config.ts`에서 better-sqlite3 제거
- 기존 hooks/API 라우트 dual-write 또는 직접 전환

---

## 5. 사용자가 전달해야 할 항목

### Supabase 프로젝트 (사용자 액션)
1. **Supabase 프로젝트 생성** (https://supabase.com/dashboard) — 한국 region 권장 (Northeast Asia (Seoul))
2. **Google OAuth Client ID 발급** (Google Cloud Console → APIs & Services → Credentials)
3. **Supabase Auth → Providers → Google** 활성화 + Client ID/Secret 입력
4. **Site URL / Redirect URLs allowlist** 등록:
   - `http://localhost:3000`
   - `https://sectorking.co.kr` (운영)
   - 콜백: `https://sectorking.co.kr/auth/callback`
5. **Database → Connection string** 복사 (URI 모드)

### 환경변수 (.env.local + Vercel)
```bash
# 클라이언트 노출 가능
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # 운영: https://sectorking.co.kr

# 서버 전용 (절대 클라이언트 노출 금지)
SUPABASE_SERVICE_ROLE=eyJ...
DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
ADMIN_EMAILS=byunginhb@gmail.com  # 쉼표 구분, 첫 가입 시 자동 admin
```

### GitHub Actions Secrets (cron Phase B 시점)
- `DATABASE_URL` — repository secrets에 추가

### 사용자 즉시 액션 (Phase A1 시작 전)
- [ ] Supabase 프로젝트 생성 + 위 5종 환경변수 전달
- [ ] Google OAuth Client ID 발급 + Supabase에 입력
- [ ] Redirect URL allowlist 등록

---

## 6. 위험 / 완화

| ID | 위험 | 가능성 | 영향 | 완화 |
|----|------|--------|------|------|
| R1 | service_role key 클라이언트 유출 | 낮음 | 매우 높음 | `'server-only'` import + `lib/supabase/admin.ts` 단일 진입점 |
| R2 | role 자가승격 | 낮음 | 매우 높음 | BEFORE UPDATE 트리거 + RLS update에서 role 컬럼 제외 |
| R3 | OAuth callback CSRF | 낮음 | 높음 | Supabase가 PKCE 자동 처리, redirect URL allowlist |
| R4 | RLS 우회 (잘못된 정책) | 중 | 높음 | staging에서 anon/admin 양쪽 테스트, `is_admin()` SECURITY DEFINER 일관 사용 |
| R5 | 뉴스 JSONB 스키마 변경 시 마이그레이션 어려움 | 중 | 중 | zod 검증으로 입력 단계에서 강제, 점진적 schema versioning |
| R6 | Phase A 저장소 분리 운영 시 일관성 | 중 | 중 | profile.id ↔ created_by 외래키만 분리 인지, cross-DB join 금지 |
| R7 | cron Phase B 전환 시 일별 데이터 갱신 누락 | 중 | 중 | 컷오버 전 staging dry-run, 첫 7일 SQLite도 dual-write로 보호 |
| R8 | OAuth 1차 이후 다른 provider 추가 비용 | 낮음 | 낮음 | Provider abstract 모듈화 |

---

## 7. 수락 기준 (Phase A 종료 시)

1. `pnpm exec tsc --noEmit` PASS
2. `pnpm build` PASS
3. Supabase 마이그레이션 SQL 멱등 (재실행 변경 0)
4. 비로그인 사용자가 `/admin`/`/admin/**` 접근 시 `/login` redirect
5. `role=user` 사용자가 `/admin/**` 접근 시 403
6. 첫 로그인 사용자(`ADMIN_EMAILS` 매칭)가 자동 admin role 부여
7. samplenews.md 변환본이 `news_reports`에 시드 + `/news/[id]`에 정상 렌더 (전문가/초보자 토글)
8. 메인 화면 MarketPulseStrip 아래 마켓 리포트 카드 노출
9. 뉴스 헤드라인의 티커가 회사 모달 또는 산업 페이지로 cross-link
10. profile.role 자가승격 차단 (PostgREST update 시도 시 RLS 거부)
11. 모바일 320px 폭에서 헤더·드롭다운·뉴스 페이지 레이아웃 정상

---

## 8. 자동 결정 사항 (메모리 규칙 — 권장 방향 자동 진행)
| 항목 | 결정 |
|------|------|
| Supabase 도입 범위 | Phase A: 인증·뉴스만 Postgres / Phase B: 산업·티커 후속 |
| Drizzle Postgres dialect | 신규 `drizzle/supabase-schema.ts`로 분리 작성 |
| 뉴스 본문 | JSONB |
| role | text + CHECK |
| OAuth Provider | Google 1차 |
| 로그인 진입 | `/login` 라우트 |
| 메인 카드 위치 | MarketPulseStrip 아래 |
| 관리자 보호 | 3중 가드 |
| cron 전환 | Phase B에서 옵션 A (psycopg2 직접) |
| samplenews.md | 첫 시드 데이터로 변환 |

---

## 9. 다음 단계
1. **사용자**: §5 환경변수 5~6종 전달 + Supabase 프로젝트 생성
2. **메인**: 환경변수 받으면 `_workspace/05_supabase_news/APPROVED` 마커 생성 + Phase A1 구현 시작
3. **구현 흐름**: A1 (인증 기반) → 검증 → A2 (관리자+뉴스) → 검증 → 배포
4. Phase B는 별도 PR (Phase A 안정 후 평가)

---

## 부록 — 산출물 위치
- `_workspace/05_supabase_news/auth-plan.md` (734줄)
- `_workspace/05_supabase_news/migration-plan.md` (490줄)
- `_workspace/05_supabase_news/news-plan.md` (~1000줄)
- `_workspace/05_supabase_news/ui-plan.md`

## 변경 이력
| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-05-09 | sk-orchestrator | 초안 통합 (인증 + 마이그레이션 + 뉴스 + UI → v3 통합 기획서) |
