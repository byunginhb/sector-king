# sk-auth-architect 기획서: Supabase Auth + Google OAuth + Admin 게이팅

작성일: 2026-05-09  
대상: sector-king (Next.js 15 App Router + TypeScript)  
작성자: sk-auth-architect

---

## 1. 현황·목표 요약

### 현황
- **인증 시스템 부재**: 로그인/사용자/권한 개념이 코드베이스에 전혀 없다. 모든 페이지가 익명 접근 가능.
- **데이터 계층**: Drizzle + better-sqlite3 (`drizzle/schema.ts`, `lib/db.ts`)로 SQLite 파일 기반.
- **신규 요구**: 마켓 리포트(news_reports)를 관리자만 작성·발행. 일반 사용자는 조회만. 추후 즐겨찾기/구독 등 사용자 식별 기능 확장 여지.
- **렌더링 모델**: App Router (RSC + Client) 혼용. `app/[industryId]/layout.tsx`에서 `generateStaticParams()`로 빌드 타임 prerender, API는 SSR.

### 목표
1. **Supabase Auth + Google OAuth 1차 도입** (Email magic link 등은 후속).
2. **role 기반 게이팅**: `admin` / `user` 두 단계만 1차 운영. ADMIN_EMAILS env 매칭 시 자동 승격.
3. **Next.js 15 SSR 호환**: `@supabase/ssr` 기반 server/client/middleware 3개 클라이언트 모듈 표준화.
4. **RLS 디폴트 deny**: 모든 신규 Supabase 테이블에 RLS enable, 명시적 정책만 허용.
5. **점진적 DB 전환**: 1차에서는 **인증·신규 테이블(profiles, news_reports)만 Supabase Postgres**에 두고, 기존 산업/섹터/티커/dailySnapshots는 SQLite 유지(이중 저장 분리 운영). 데이터 전체 이관은 별도 트랙 (sk-data-modeler와 후속 합의).
6. **로그인 UI**: 헤더 우측 버튼/아바타 드롭다운, `/login` 단독 페이지, `/auth/callback` 처리.
7. **관리자 진입**: `/admin/*` 전체를 middleware + RSC 이중 게이팅.

### 핵심 결정
- **저장소 분리 운영**: 산업/티커 데이터는 SQLite 유지, 인증/뉴스는 Supabase. 향후 통합 마이그레이션 트랙은 별도 기획.
- **세션 저장**: `@supabase/ssr` 표준대로 httpOnly 쿠키. localStorage 사용 안 함.
- **콜백 라우트**: `app/auth/callback/route.ts` Route Handler에서 `exchangeCodeForSession()`.

---

## 2. 테이블 스키마

Supabase Postgres에 생성한다. 모든 테이블은 RLS enable.

### 2-1. `profiles` 테이블

```sql
-- 사용자 프로필 (auth.users와 1:1)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role) where role = 'admin';
```

### 2-2. `auth.users → profiles` 자동 생성 트리거

```sql
-- 신규 가입자에 대해 profiles 행 자동 생성 + ADMIN_EMAILS 매칭 시 admin 승격
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text;
  is_admin boolean := false;
begin
  -- env 대신 vault 또는 app_settings 테이블에서 읽음 (아래 2-3 참조)
  select value into admin_emails
    from public.app_settings
    where key = 'admin_emails';

  if admin_emails is not null then
    is_admin := position(lower(new.email) in lower(admin_emails)) > 0;
  end if;

  insert into public.profiles (id, email, name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when is_admin then 'admin' else 'user' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 2-3. `app_settings` 테이블 (관리자 이메일 화이트리스트)

```sql
-- 환경변수 대신 DB에 보관 (트리거에서 안전하게 읽기 위해)
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- 초기값: 사용자 이메일을 콤마 구분으로 입력
insert into public.app_settings (key, value)
values ('admin_emails', 'byunginhb@gmail.com');
```

### 2-4. `updated_at` 자동 갱신 트리거 (공통)

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
```

### 2-5. (참고) `news_reports` — sk-news-architect와 합의 후 최종 확정

```sql
create table public.news_reports (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text,
  sections jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_news_reports_status_published on public.news_reports(status, published_at desc);
```

---

## 3. RLS 정책 SQL

### 3-1. profiles

```sql
alter table public.profiles enable row level security;

-- 본인 행 조회
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

-- 본인 행 수정 (role 컬럼은 별도 가드 필요 — 트리거에서 차단 권장)
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 관리자는 모든 프로필 조회 (관리 콘솔용)
create policy "profiles_admin_select"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- role 변경 차단 (관리자도 SQL/대시보드에서만 수정 가능)
create or replace function public.prevent_role_self_escalation()
returns trigger language plpgsql security definer as $$
begin
  if old.role is distinct from new.role and auth.uid() = new.id then
    raise exception 'role 컬럼은 본인이 변경할 수 없습니다';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
```

### 3-2. app_settings

```sql
alter table public.app_settings enable row level security;
-- 클라이언트 접근 전면 차단. service_role만 사용.
-- (정책 없음 = 모두 차단)
```

### 3-3. news_reports (sk-news-architect와 동기화)

```sql
alter table public.news_reports enable row level security;

-- 익명/일반 사용자: published 만 읽기
create policy "news_published_select"
  on public.news_reports for select
  using (status = 'published');

-- 관리자: 모든 행 SELECT
create policy "news_admin_select_all"
  on public.news_reports for select
  using (
    exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin')
  );

-- 관리자: INSERT / UPDATE / DELETE
create policy "news_admin_insert"
  on public.news_reports for insert
  with check (
    exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin')
  );

create policy "news_admin_update"
  on public.news_reports for update
  using (
    exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin')
  );

create policy "news_admin_delete"
  on public.news_reports for delete
  using (
    exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin')
  );
```

> **헬퍼 함수**: 위 `exists(...)`이 반복되므로 `is_admin()` SECURITY DEFINER 함수로 추출 권장.
>
> ```sql
> create or replace function public.is_admin()
>   returns boolean language sql security definer stable as $$
>   select exists (select 1 from public.profiles
>     where id = auth.uid() and role = 'admin');
> $$;
> ```

---

## 4. 클라이언트 모듈 계획

`@supabase/ssr` + `@supabase/supabase-js` 사용. App Router 표준 패턴.

### 4-1. `lib/supabase/client.ts` (브라우저용)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**사용처**: Client Component (`'use client'`) 내 인증 액션(로그인 버튼, 로그아웃, 실시간 세션 구독).

### 4-2. `lib/supabase/server.ts` (RSC + Route Handler + Server Action)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // RSC에서 호출 시 무시 (middleware가 갱신 책임)
          }
        },
      },
    }
  )
}

// 권한 헬퍼
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, email, name, avatar_url, role')
    .eq('id', user.id)
    .single()
  return data
}

export async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return profile
}
```

### 4-3. `lib/supabase/middleware.ts` (세션 갱신 헬퍼)

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 토큰 자동 refresh
  const { data: { user } } = await supabase.auth.getUser()

  // /admin 보호
  const path = request.nextUrl.pathname
  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('error', 'forbidden')
      return NextResponse.redirect(url)
    }
  }

  return response
}
```

### 4-4. `middleware.ts` (루트)

```typescript
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 4-5. `lib/supabase/admin.ts` (service_role, server-only)

```typescript
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// RLS 우회 — 관리자 콘솔의 server action에서만 사용
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  )
}
```

> 주의: `createAdminClient`는 **반드시 server-only 모듈에서만** import. `'server-only'` import로 클라이언트 번들 유출 차단.

---

## 5. 인증 흐름 다이어그램

```
[Browser]
  │  사용자 "Google로 로그인" 클릭
  ▼
[/login (Client Component)]
  │  supabase.auth.signInWithOAuth({
  │    provider: 'google',
  │    options: { redirectTo: `${origin}/auth/callback?next=${nextPath}` }
  │  })
  ▼
[Google OAuth Consent]
  │  사용자 승인
  ▼
[Supabase Auth Provider]
  │  PKCE code 발급
  ▼
[/auth/callback (Route Handler)]
  │  exchangeCodeForSession(code)
  │  → access_token / refresh_token httpOnly 쿠키 SET
  │  → trigger handle_new_user() (최초 1회)
  │     → profiles 행 자동 생성 + admin 판정
  ▼
[redirect to ?next= or /]
  │
  ▼
[middleware.ts]
  │  매 요청마다 updateSession() → 토큰 refresh
  │  /admin/** 진입 시 role='admin' 검증
  ▼
[RSC] getCurrentProfile() → role 분기 렌더
[Client] supabase.auth.onAuthStateChange() → UI 갱신
```

### 5-1. `/auth/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('exchangeCodeForSession 실패:', error)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // open redirect 방어: next는 same-origin path만 허용
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
```

---

## 6. admin 게이팅 전략

**3중 방어선**으로 구성한다.

### 6-1. Layer 1: middleware.ts (네트워크 경계)
- `/admin/**` 경로 진입 시 미인증 → `/login?next=/admin/...` 리다이렉트
- 인증되었으나 role !== 'admin' → `/?error=forbidden` 리다이렉트
- 응답 캐싱 방지 (`Cache-Control: no-store` 헤더 추가)

### 6-2. Layer 2: Server Component (`app/admin/layout.tsx`)
```typescript
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login?next=/admin')
  if (profile.role !== 'admin') redirect('/?error=forbidden')

  return (
    <AdminShell profile={profile}>
      {children}
    </AdminShell>
  )
}
```
- middleware 우회 가능성(엣지 케이스, 직접 호출)에 대비한 SSR 재검증
- profile 객체를 ServerComponent → ClientComponent로 props 전달 (avatar 등)

### 6-3. Layer 3: API Route Handler / Server Action
```typescript
// app/api/admin/news/route.ts
import { requireAdmin } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    // ... 처리
  } catch (e) {
    return Response.json({ success: false, error: 'forbidden' }, { status: 403 })
  }
}
```
- 모든 `/api/admin/**` 라우트 진입 시 `requireAdmin()` 호출
- RLS 정책이 최후 방어선 — 클라이언트가 직접 Supabase 호출해도 admin이 아니면 row 반환 X

### 6-4. Client UI 게이팅 (UX용, 보안 X)
- 헤더 드롭다운에 `role === 'admin'`일 때만 "관리자 콘솔" 링크 표시
- 드롭다운은 RSC에서 profile 받아 렌더 (Hydration 불일치 방지)

---

## 7. 로그인 UI 와이어프레임

### 7-1. 헤더 우측 (모든 페이지 공통)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [SK Logo] sector-king        [검색]  [국내|해외|전체] [테마]  [로그인] │
└──────────────────────────────────────────────────────────────────────┘
                                                                  ▲
                                                                  │
                                            미인증: 텍스트 버튼
                                            인증: 아바타(원형) + 이름 첫글자

[로그인 후 아바타 클릭 시 드롭다운]
┌────────────────────────────┐
│ 홍길동                      │
│ user@example.com           │
├────────────────────────────┤
│ ⚙  설정 (후속)              │
│ 🛡  관리자 콘솔  ← admin만   │
├────────────────────────────┤
│ ↪  로그아웃                 │
└────────────────────────────┘
```

- 컴포넌트: `components/auth/auth-button.tsx` (Server Component, profile 직접 조회) + `components/auth/user-menu.tsx` (Client, dropdown은 `@radix-ui/react-dropdown-menu` 기존 사용 중)
- 아이콘: lucide-react `LogIn`, `LogOut`, `Settings`, `Shield`, `User` (이모지 절대 금지 — 코딩 스타일 규칙)

### 7-2. `/login` 페이지

```
┌─────────────────────────────────────┐
│           sector-king               │
│                                     │
│      마켓 인사이트, 한 곳에서        │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  [G]  Google로 계속하기        │ │
│  └───────────────────────────────┘ │
│                                     │
│  로그인 시 서비스 약관과 개인정보     │
│  처리방침에 동의한 것으로 간주됩니다. │
└─────────────────────────────────────┘
```

- 디자인 토큰: 배경 `bg-stone-50 dark:bg-slate-950`, 카드 `bg-white dark:bg-slate-900`, 강조 amber-500
- `?next=` 쿼리스트링 보존하여 callback에 전달
- 이미 인증된 사용자는 RSC에서 `redirect(next ?? '/')`

### 7-3. `/admin/*` 레이아웃

```
┌─ AdminShell ─────────────────────────────────────────┐
│ [← 메인으로] sector-king · 관리자                     │
├──────────────┬───────────────────────────────────────┤
│ 사이드바      │                                        │
│  · 대시보드   │  영역별 컨텐츠                          │
│  · 뉴스       │                                        │
│  · 사용자     │                                        │
│  · 설정       │                                        │
└──────────────┴───────────────────────────────────────┘
```

---

## 8. 환경변수 목록

### 8-1. `.env.local` (사용자가 입력)

| 변수 | 노출 | 용도 | 사용자 액션 |
|------|------|------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | client | Supabase 프로젝트 URL | Supabase 대시보드 → Project Settings → API → Project URL 복사 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | anon (publishable) key | 동일 화면 → anon public key 복사 |
| `SUPABASE_SERVICE_ROLE` | server only | RLS 우회 관리자 작업 | 동일 화면 → service_role key 복사 (절대 client에 노출 금지) |
| `ADMIN_EMAILS` | server | (선택) 트리거가 app_settings 대신 이걸 읽도록 변경 가능 | 콤마 구분 이메일 목록 — `byunginhb@gmail.com` |
| `NEXT_PUBLIC_SITE_URL` | client | OAuth redirect 베이스 URL | dev: `http://localhost:3000`, prod: 실제 도메인 |

### 8-2. Supabase 대시보드 설정 (사용자가 직접 진행)

1. **Auth → Providers → Google 활성화**
   - Google Cloud Console에서 OAuth 2.0 Client ID 발급
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Supabase에 Client ID / Secret 입력
2. **Auth → URL Configuration**
   - Site URL: `https://sector-king.vercel.app` (프로덕션)
   - Redirect URLs (allow list):
     - `http://localhost:3000/auth/callback`
     - `https://sector-king.vercel.app/auth/callback`
     - PR preview 도메인 와일드카드(`https://*-byunginhb.vercel.app/auth/callback`) 검토
3. **Database → Triggers** 위 SQL 적용
4. **Auth → Email Templates** Google OAuth만 1차에서는 그대로 둠

### 8-3. `.env.example` 추가 (커밋)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE=eyJ... # server-only, 절대 NEXT_PUBLIC_ prefix 금지

# Auth
ADMIN_EMAILS=byunginhb@gmail.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 8-4. `.gitignore` 점검
- `.env.local`, `.env*.local` 이미 무시되는지 확인
- service_role 키가 git에 커밋된 적 없는지 `git log -p | grep -i 'service_role'` 검증

---

## 9. 기존 next.config.ts와의 호환

### 9-1. 현재 설정 영향 분석

```typescript
output: 'standalone',                                       // OK — Vercel/Docker 모두 대응
serverExternalPackages: ['better-sqlite3'],                 // OK — 유지
outputFileTracingIncludes: { '/api/**/*': ['./data/**/*'] } // OK — SQLite 데이터 파일 포함
```

**결론**: 1차 출시(저장소 분리 운영)에서는 **next.config.ts 변경 불필요**. better-sqlite3는 그대로 산업/티커 데이터에 사용. Supabase는 인증/뉴스만 담당.

### 9-2. 후속(전체 Postgres 이관 시) 변경 후보 (sk-data-modeler와 합의 필요)
- `serverExternalPackages` 에서 `better-sqlite3` 제거
- `outputFileTracingIncludes` 의 `./data/**/*` 제거
- `package.json`의 `pnpm.onlyBuiltDependencies`에서 `better-sqlite3` 제거
- `lib/db.ts` 추상화 레이어 도입 → `lib/db/sqlite.ts` + `lib/db/postgres.ts`

### 9-3. 미들웨어 추가에 따른 점검
- 정적 자산은 matcher에서 제외 (위 4-4 참조)
- `generateStaticParams()`로 prerender되는 산업 페이지는 middleware 통과해도 캐시 영향 없음 (no-store 헤더는 admin에만 적용)

### 9-4. `pnpm` 의존성 추가

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

타입 생성:
```bash
pnpm dlx supabase gen types typescript --project-id <ref> --schema public > types/supabase.ts
```

---

## 10. 위험과 완화 (OWASP 관점)

| ID | 위험 | OWASP | 영향 | 완화 |
|----|------|-------|------|------|
| R1 | OAuth open redirect | A01 Broken Access Control | 피싱 → 자격증명 탈취 | callback `?next=` 파라미터를 same-origin path(`/` 시작 + `//` 차단)로만 허용 (5-1 코드 참조) |
| R2 | service_role key 클라이언트 유출 | A02 Cryptographic Failures | DB 전체 RLS 우회 | `'server-only'` import + `NEXT_PUBLIC_` prefix 금지 + `lib/supabase/admin.ts` 단일 진입점 + 빌드 시 grep 검증 스크립트 |
| R3 | 본인 role 자가승격 | A04 Insecure Design | 일반 사용자 → admin 탈취 | `prevent_role_self_escalation` 트리거(3-1) + RLS update 정책에서 role 컬럼 제외 옵션 검토 |
| R4 | RLS bypass via PostgREST | A01 | 무권한 데이터 노출 | (a) 모든 신규 테이블 RLS enable 강제 (b) `supabase db lint` 사전 실행 (c) anon에 대한 default deny 정책 작성 |
| R5 | 세션 토큰 XSS 탈취 | A03 Injection | 계정 탈취 | httpOnly 쿠키만 사용, localStorage 금지(`@supabase/ssr` 기본값), CSP 헤더 도입 검토 (`next.config.ts` headers) |
| R6 | CSRF (Server Action 악용) | A01 | 의도치 않은 admin 액션 | Next 15 Server Actions는 same-origin + encrypted action ID로 기본 보호. 추가로 `requireAdmin()` 호출 |
| R7 | OAuth state/PKCE 검증 누락 | A07 Identification Failures | code injection | `@supabase/ssr`이 PKCE 자동 처리 — 직접 구현 금지 |
| R8 | 미들웨어 우회 (Edge runtime 한계) | A01 | admin 페이지 노출 | Layer 2(RSC redirect) + Layer 3(API requireAdmin) + RLS = 3중 방어 |
| R9 | 프로필 enumeration | A01 | 이메일 수집 | `profiles_admin_select` 정책으로 admin만 전체 조회. anon은 공개 컬럼 view 따로 두는 것 권장 (1차에선 미공개) |
| R10 | trigger SQL injection (`admin_emails` 변조) | A03 | 자가승격 | `app_settings`는 RLS로 anon 차단, service_role만 수정. 변조 감사 로그(향후 audit_log 테이블) |
| R11 | 토큰 refresh 폭주 (DDoS) | A05 Security Misconfig | 비용 폭증 | middleware matcher로 정적 자산 제외(4-4) + Supabase rate limit 활성화 |
| R12 | Google OAuth 스코프 과다 | A05 | 개인정보 과수집 | scope는 `email profile`만. additional scope 요청 금지 |
| R13 | 로그아웃 후 캐시된 RSC | A02 | 개인정보 노출 | `/admin/**` 응답에 `Cache-Control: private, no-store` + `revalidatePath('/')` 호출 |
| R14 | callback 라우트 GET log 노출 | A09 Logging Failures | code 파라미터 로그 유출 | Vercel/Sentry에서 `?code=` 마스킹 규칙. `code`는 1회용이지만 보수적으로 마스킹 |

### 우선순위
- **즉시 적용 (S1 마일스톤)**: R1, R2, R3, R4, R5, R7, R8
- **출시 전 (S2)**: R6, R9, R10, R12, R13
- **운영 단계 (S3+)**: R11, R14, audit_log

---

## 부록 A: 마일스톤 제안

| 마일스톤 | 산출물 | 의존 |
|---------|--------|------|
| S1. Supabase 초기화 | 프로젝트 생성, profiles + 트리거 + RLS, env 세팅 | 사용자 액션 (8-2) |
| S2. 클라이언트 모듈 + middleware | `lib/supabase/{client,server,middleware,admin}.ts`, `middleware.ts` | S1 |
| S3. 로그인 UI | `/login`, `/auth/callback`, 헤더 auth-button + user-menu | S2 |
| S4. admin 게이팅 | `/admin/layout.tsx`, `requireAdmin()` 적용 | S3 |
| S5. news_reports 통합 | sk-news-architect 산출물과 합쳐 RLS·API 구현 | S4 + sk-news-architect |

## 부록 B: 협업 인터페이스

- **sk-data-modeler**: profiles/news_reports 마이그레이션 SQL을 `scripts/migrations/0001_supabase_init.sql` 단일 파일로 통합. SQLite ↔ Postgres 듀얼 운영 기간의 schema 추상화는 별도 트랙.
- **sk-news-architect**: `news_reports.sections` JSONB 스키마 합의 후 RLS 정책 최종 fixate. admin write 권한은 본 문서 3-3 그대로 사용.
- **sk-ui-planner**: 헤더 auth-button placement, `/admin` 좌측 사이드바 IA, `/login` 카피 톤 합의.
