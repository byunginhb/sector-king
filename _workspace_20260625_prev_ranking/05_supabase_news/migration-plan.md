# Supabase Postgres 마이그레이션 + cron 호환 + 신규 테이블 통합 기획서

작성: sk-data-modeler (2026-05-09)
대상: SQLite(better-sqlite3) → Supabase Postgres 전환, profiles/news_reports 추가, GitHub Actions cron 호환 유지.

---

## 1. 현황 분석 + DDL 차이점 표

### 1-1. 현재 DB 규모 (data/hegemony.db, 실측)

| 테이블                | 행 수    | 비고                                          |
| --------------------- | -------- | --------------------------------------------- |
| `daily_snapshots`     | 19,704   | 최대 — 매일 ~437행씩 누적, cron 핵심 타깃     |
| `score_history`       | 12,772   | 매일 누적                                     |
| `sector_companies`    | 559      | 시드성, 변경 적음                             |
| `companies`           | 437      | region 컬럼 적용 완료                         |
| `sectors`             | 112      | 시드성                                        |
| `industry_categories` | 52       | M:N 매핑                                      |
| `categories`          | 45       | regionScope 컬럼 적용 완료                    |
| `company_scores`      | 203      | 1:1, 매일 UPSERT                              |
| `industries`          | 9        | 시드성                                        |
| `company_profiles`    | 0        | 미사용                                         |

**총 ~33,900행**, 단일 트랜잭션으로 일괄 import 충분히 가능한 규모.

### 1-2. SQLite ↔ Postgres DDL 차이 매핑

| 영역                  | SQLite (현재)                                  | Postgres (전환 후)                                       | 이슈/비고 |
| --------------------- | ---------------------------------------------- | -------------------------------------------------------- | --------- |
| 텍스트 PK             | `text('id').primaryKey()`                      | `text('id').primaryKey()` (그대로)                       | 호환      |
| 자동 증가             | `integer().primaryKey({ autoIncrement: true })`| `integer().primaryKey().generatedAlwaysAsIdentity()` 또는 `bigserial` | Drizzle pg는 `serial()`/`integer().generatedAlwaysAsIdentity()` |
| 부동소수              | `real()`                                       | `doublePrecision()` 또는 `numeric()`                      | 가격은 `numeric(18,6)` 권장(누적 오차) |
| 큰 정수 (marketCap)   | `integer()` (SQLite는 64bit)                   | `bigint()` 필수                                           | marketCap이 INT 한도(2^31) 초과 가능 — **전환 시 bigint 강제** |
| 날짜                  | `text('date')` (`YYYY-MM-DD`)                  | `date` 또는 `text` 유지                                   | text 유지 권장(파이썬 직렬화 단순) |
| timestamp             | `text('updated_at')` (`datetime('now')`)       | `timestamp with time zone` + `defaultNow()`              | application에서 ISO 포맷 사용 |
| Boolean               | (없음) integer 0/1                              | `boolean()`                                              | profiles에서 사용 예정 |
| UPSERT                | `INSERT OR REPLACE`                            | `INSERT ... ON CONFLICT (...) DO UPDATE`                 | **cron 핵심 변경점** |
| 트랜잭션              | `BEGIN; ... COMMIT;`                            | `BEGIN; ... COMMIT;` 동일                                | psycopg2 autocommit 끄고 사용 |
| `datetime('now')`     | SQLite 함수                                    | `now()` 또는 `current_timestamp`                         | Python 측 ISO 문자열로 통일 권장 |
| CHECK 제약            | `CHECK (rank <= 10)` 등                        | `check()` 동일 문법                                       | 호환 |
| 인덱스                | `CREATE INDEX`                                 | 동일                                                      | 호환, partial index 추가 가능 |
| FK CASCADE            | 미설정                                          | `references(..., { onDelete: 'cascade' })`              | profiles → auth.users는 cascade 권장 |
| ROWID                 | 묵시적                                          | 없음                                                      | 직접 사용 부분 없음 (확인 완료) |

---

## 2. Drizzle dialect 전환 계획

### 2-1. `drizzle.config.ts` (전후)

```ts
// before
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: './data/hegemony.db' },
})

// after
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Supabase Pooler URL (5432 또는 6543)
  },
  // Supabase는 schema 'public' 기본, RLS는 별도 SQL로 관리
})
```

### 2-2. `drizzle/schema.ts` 일괄 변환 패턴

**Import 변경:**
```ts
// before
import { sqliteTable, text, integer, real, unique, index } from 'drizzle-orm/sqlite-core'

// after
import {
  pgTable, text, integer, bigint, doublePrecision, numeric,
  serial, timestamp, boolean, uuid, jsonb, unique, index, check
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
```

**테이블별 변환 표 (핵심만):**

| 기존 컬럼                                 | 신규 컬럼                                                         | 사유 |
| ---------------------------------------- | ---------------------------------------------------------------- | ---- |
| `integer('market_cap')`                  | `bigint('market_cap', { mode: 'number' })`                       | 시총 INT 한도 초과 |
| `integer('volume')`, `avg_volume`        | `bigint('volume', { mode: 'number' })`                           | 거래량 동일 |
| `integer('id').primaryKey({autoIncrement})` | `serial('id').primaryKey()`                                    | 자동 증가 |
| `real('price')`                          | `doublePrecision('price')` (또는 `numeric(18,6)`)                | 정밀도 |
| `text('updated_at')`                     | `timestamp('updated_at', { withTimezone: true }).defaultNow()`   | 타입 안전 |
| `text('region_scope').default('ANY')`    | `text('region_scope').default('ANY').notNull()` + `check()`      | 'ANY'/'KR'/'INTL' 강제 |

**전환 전후 예시 (`dailySnapshots`):**

```ts
// after
export const dailySnapshots = pgTable('daily_snapshots', {
  id: serial('id').primaryKey(),
  ticker: text('ticker').references(() => companies.ticker),
  date: text('date').notNull(),
  marketCap: bigint('market_cap', { mode: 'number' }),
  price: doublePrecision('price'),
  priceChange: doublePrecision('price_change'),
  week52High: doublePrecision('week_52_high'),
  week52Low: doublePrecision('week_52_low'),
  dayHigh: doublePrecision('day_high'),
  dayLow: doublePrecision('day_low'),
  volume: bigint('volume', { mode: 'number' }),
  avgVolume: bigint('avg_volume', { mode: 'number' }),
  peRatio: doublePrecision('pe_ratio'),
  pegRatio: doublePrecision('peg_ratio'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  unique('uniq_snapshots_ticker_date').on(t.ticker, t.date),
  index('idx_snapshots_ticker_date').on(t.ticker, t.date),
])
```

### 2-3. 신규 컬럼 default 정책

- `created_at`, `updated_at` → `timestamp().defaultNow()`
- region/region_scope → `text().notNull().default('INTL')` + `check` 제약

---

## 3. 마이그레이션 스크립트 시그니처 + 실행 순서

### 3-1. 신규 스크립트: `scripts/migrate_sqlite_to_pg.py`

Python 권장 (이미 SQLite를 다루는 update_data.py와 동일 런타임).

```python
"""
SQLite → Supabase Postgres 일괄 마이그레이션.

사용:
  DATABASE_URL=postgresql://... python scripts/migrate_sqlite_to_pg.py [--dry-run] [--truncate]

순서:
  1) Postgres에 schema (drizzle migrate) 적용 완료 가정
  2) --truncate: 대상 테이블 TRUNCATE (FK 의존 역순)
  3) FK 의존 정순으로 SELECT * → executemany INSERT
  4) row count 비교 + 5개 sample row 비교
  5) 실패 시 ROLLBACK
"""

# 시그니처
def migrate_table(
    sqlite_conn: sqlite3.Connection,
    pg_conn: psycopg2.extensions.connection,
    table: str,
    columns: list[str],
    pg_columns: list[str] | None = None,  # 컬럼 리네임이 있다면
    transform: Callable[[dict], dict] | None = None,  # bigint 캐스팅 등
    batch: int = 500,
) -> int: ...

def verify_row_count(...) -> dict[str, tuple[int, int]]: ...
def verify_sample(...) -> list[str]: ...  # 차이 있는 row id 반환
```

### 3-2. 실행 순서 (FK 의존)

```
1. industries
2. categories
3. industry_categories
4. sectors
5. companies
6. sector_companies
7. company_profiles
8. company_scores
9. score_history
10. daily_snapshots   (가장 크므로 마지막, batch=500)
```

### 3-3. 멱등 가드

- 기본: `ON CONFLICT DO NOTHING` (재실행 시 skip)
- `--truncate` 플래그: `TRUNCATE table CASCADE` 후 재삽입 (개발 환경)
- 운영 일회성 컷오버는 `--truncate` 사용, 그 외 금지

---

## 4. cron 업데이트 흐름 (권장안)

### 4-1. 옵션 비교

| 옵션 | 구성 | 장점 | 단점 |
| ---- | ---- | ---- | ---- |
| **A. Actions에서 직접 Postgres 쓰기** | `psycopg2-binary` + `DATABASE_URL` (Supabase Pooler 6543) | 기존 update_data.py 변경 최소, git commit 단계 제거 가능, 디버깅 용이 | Supabase 시크릿을 Actions에 보관 |
| B. Edge Function 호출 | Actions → `curl supabase/functions/v1/daily-update` | 시크릿이 Supabase에만 존재 | yfinance를 Deno에서 재구현하거나 별도 워커 필요 — 비용↑ |

**권장: 옵션 A**

이유:
1. yfinance(파이썬) 의존성을 Deno로 옮기는 비용이 매우 큼
2. 데이터 정합성/디버깅이 GitHub Actions 로그로 한 곳에서 추적됨
3. Supabase Edge Function의 cold start와 yfinance rate limit 조합이 위험

### 4-2. update_data.py 변경 핵심

**Connection:**
```python
import os, psycopg2
from psycopg2.extras import execute_values

conn = psycopg2.connect(
    os.environ["DATABASE_URL"],
    sslmode="require",
)
conn.autocommit = False
```

**UPSERT 변경 (가장 큰 변경점):**
```python
# before (SQLite)
INSERT OR REPLACE INTO daily_snapshots (...) VALUES (?, ?, ...)

# after (Postgres)
INSERT INTO daily_snapshots (ticker, date, market_cap, ...)
VALUES %s
ON CONFLICT (ticker, date) DO UPDATE SET
    market_cap = EXCLUDED.market_cap,
    price = EXCLUDED.price,
    -- ... 나머지 컬럼
    updated_at = now();
```

`execute_values`로 배치 INSERT (~437개를 한 번에).

**SKIP_TICKERS, scoring.py도 동일 패턴으로 변환** (`update_sector_rankings`, `calculate_hegemony_scores`의 SQLite 쿼리 → psycopg2).

### 4-3. GitHub Actions 변경

```yaml
# .github/workflows/update-data.yml (after)
name: Daily Data Update
on:
  schedule:
    - cron: '0 15 * * *'
  workflow_dispatch:
    inputs:
      date: { description: 'YYYY-MM-DD', required: false, type: string }

concurrency:
  group: daily-data-update
  cancel-in-progress: false

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r scripts/requirements.txt
      - name: Run data update
        env:
          DATABASE_URL: ${{ secrets.SUPABASE_DB_URL }}  # Pooler URL
        run: python scripts/update_data.py ${{ github.event.inputs.date }}
      # git commit/push 단계 제거 (data/ 폴더 삭제됨)
```

### 4-4. requirements.txt 추가

```
yfinance>=0.2.36
psycopg2-binary>=2.9.9
```

### 4-5. 보안

- `SUPABASE_DB_URL`은 GitHub repo secret으로만 보관 (Pooler URL, RLS 우회 service role 권한 아님 — `postgres` 유저)
- 운영 service role key는 Actions에 두지 않음
- DB URL 누출 대비 Supabase 측 IP allowlist는 사용 불가(GH runner IP 가변) → 강한 비밀번호 + 정기 rotate

---

## 5. 신규 테이블 SQL (sk-auth/sk-news 통합본 초안)

> sk-auth-architect, sk-news-architect와의 합의 후 최종본은 03_impl 단계에서 확정.

### 5-1. profiles (auth.users 1:1)

```ts
// drizzle/schema.ts
import { pgTable, uuid, text, timestamp, pgSchema } from 'drizzle-orm/pg-core'

const authSchema = pgSchema('auth')
const authUsers = authSchema.table('users', { id: uuid('id').primaryKey() })

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  username: text('username').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('user'),  // 'user' | 'admin'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

```sql
-- RLS
alter table public.profiles enable row level security;

create policy "profiles_self_select"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles for update using (auth.uid() = id);

create policy "profiles_public_read"
  on public.profiles for select using (true);  -- 공개 프로필 읽기 허용 시

-- auth.users 생성 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 5-2. news_reports (관리자 작성)

```ts
export const newsReports = pgTable('news_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').references(() => authUsers.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  summary: text('summary'),
  body: text('body').notNull(),  // Markdown
  industryId: text('industry_id').references(() => industries.id),
  status: text('status').notNull().default('draft'),  // 'draft' | 'published'
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_news_reports_industry').on(t.industryId),
  index('idx_news_reports_status_published').on(t.status, t.publishedAt),
])
```

```sql
alter table public.news_reports enable row level security;

-- 누구나 published 읽기
create policy "news_published_read"
  on public.news_reports for select
  using (status = 'published');

-- admin만 작성/수정/삭제 (profiles.role = 'admin' 검사)
create policy "news_admin_write"
  on public.news_reports for all
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));
```

> URL 라우팅은 `/news/[id]` (UUID) 사용 — `slug`는 DB에 저장하되 라우팅 파라미터로 미사용 (CLAUDE 규칙).

---

## 6. 의존성 제거

### 6-1. better-sqlite3 제거 단계

1. **Phase A (병행)**: Postgres 전환 직후에도 better-sqlite3 유지 — `lib/db.ts`에서 분기 가능 상태로 1주일
2. **Phase B (제거)**: 모든 API 라우트가 Postgres만 사용 확인 후
   - `pnpm remove better-sqlite3 @types/better-sqlite3`
   - `lib/db.ts` 재작성:

```ts
// lib/db.ts (after)
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/drizzle/schema'

const connectionString = process.env.DATABASE_URL!

// 서버사이드 풀 — Supabase Pooler(6543) 권장
const queryClient = postgres(connectionString, { prepare: false, max: 10 })
export const db = drizzle(queryClient, { schema })

export { schema }
// withWritableDb / closeDb 제거 (RLS는 ssr 클라이언트에서 처리)
```

3. **Supabase 클라이언트 분리**:
   - `lib/db.ts` — Drizzle (서버 라우트, 관리자 작업)
   - `lib/supabase/server.ts` — `@supabase/ssr` createServerClient (RLS 적용 사용자 세션)
   - `lib/supabase/client.ts` — 브라우저 클라이언트

### 6-2. 파일/폴더 정리

| 대상 | 처리 |
| ---- | ---- |
| `data/hegemony.db`, `data/hegemony.db-wal`, `data/hegemony.db-shm` | 마이그레이션 검증 후 git rm + .gitignore에 `data/` |
| `data/` 폴더 | 삭제 |
| `import path from 'path'` (lib/db.ts) | 제거 |
| `node:fs` 의존 코드 | 검색 후 제거 (있다면) |

### 6-3. next.config.ts (after)

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/money-flow', destination: '/tech/money-flow', permanent: true },
      { source: '/sector-trend', destination: '/tech/money-flow', permanent: true },
    ]
  },
  // outputFileTracingIncludes 제거 (data/ 없음)
  // serverExternalPackages 제거 (better-sqlite3 없음)
}

export default nextConfig
```

---

## 7. 롤백 전략

### 7-1. 컷오버 직전 백업

1. `data/hegemony.db`를 `data/hegemony.db.backup-YYYYMMDD`로 복사 + git tag `pre-supabase-cutover`
2. Supabase 측 자동 백업 (PITR) 활성화 확인
3. cron 워크플로우는 `workflow_dispatch`만 활성화 (schedule 임시 비활성)

### 7-2. 컷오버 절차

```
T-0  schema apply (drizzle migrate)
T+1  migrate_sqlite_to_pg.py 실행 + verify (row count + sample 5 rows × 모든 테이블)
T+2  staging 환경에서 API 라우트 smoke test
T+3  main 머지 + Vercel 배포 (DATABASE_URL 환경변수 추가)
T+4  workflow_dispatch로 update_data.py 1회 실행 → 정상 시 schedule 재활성
```

### 7-3. 롤백 시나리오

| 실패 지점 | 조치 |
| --------- | ---- |
| migrate_sqlite_to_pg.py 도중 | `--truncate` 후 재실행 (DB는 건드리지 않은 상태) |
| 배포 후 API 500 | git tag `pre-supabase-cutover`로 revert + Vercel 이전 배포 promote, cron schedule 비활성 유지 |
| cron 실패 (UPSERT 오류) | 옵션A: workflow에서 다음날까지 차단 + 수동 백필 / 옵션B: SQLite 백업 → Postgres 재import |
| 데이터 손상 | Supabase PITR로 직전 시점 복원 |

---

## 8. 리스크 매트릭스

| # | 리스크 | 가능성 | 영향 | 완화책 |
| - | ------ | ------ | ---- | ------ |
| R1 | bigint 미적용으로 marketCap 오버플로 (Apple ~3.5T 등) | 중 | 높음 | schema 전환 시 `bigint` 강제, 마이그레이션 스크립트에서 INSERT 전 타입 검증 |
| R2 | UPSERT 문법 차이로 cron 첫 실행 실패 | 높음 | 높음 | 컷오버 전 staging에서 `workflow_dispatch` 1회 dry-run 필수 |
| R3 | `@supabase/ssr` vs Drizzle `postgres` driver 동시 사용 시 connection pool 고갈 | 중 | 중 | Drizzle은 max=10, Supabase Pooler(6543/transaction mode) 사용, RLS 필요 라우트만 ssr |
| R4 | RLS 누락으로 profiles/news_reports 데이터 노출 | 중 | 매우 높음 | 모든 신규 테이블에 `enable row level security` 강제, sk-verifier가 별도 테스트 |
| R5 | Actions에서 DB 접속 실패 (SSL/IP/비번) | 중 | 중 | Pooler URL + sslmode=require, 첫 실행은 workflow_dispatch로 검증 |
| R6 | yfinance 컬럼 추가/제거(예: pegRatio) 시 schema drift | 낮 | 중 | drizzle migrate로 컬럼 추가만 허용, 삭제는 보류 |
| R7 | data/ 폴더 git history에 남은 큰 파일(5.4MB) | 낮 | 낮 | `git lfs migrate` 또는 그대로 유지 (단순 .gitignore면 충분) |
| R8 | Drizzle pg dialect와 기존 SQLite 쿼리 호환 차이 (`text` 비교, NULL 정렬 등) | 중 | 중 | API 라우트 단위 테스트 + sk-verifier 회귀 테스트 |

---

## 9. Open Questions (sk-auth/sk-news/sk-implementer 합의 필요)

1. profiles의 `role` enum화 여부 — `text + check` vs Postgres `enum type`
2. news_reports.body — Markdown 그대로 vs Tiptap JSONB
3. 기존 cron이 git commit으로 daily 변경 추적 → 제거 후 데이터 변경 이력은 어떻게 노출할지 (별도 audit 테이블?)
4. better-sqlite3 제거 Phase A→B 사이 기간(권장 1주) 동안 dual-write 할지, read-only 모드만 둘지
