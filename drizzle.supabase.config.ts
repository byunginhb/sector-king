import { defineConfig } from 'drizzle-kit'

/**
 * Supabase Postgres 전용 Drizzle 설정.
 *
 * 기존 SQLite 설정(`drizzle.config.ts`)과 별도 운영.
 * 마이그레이션은 `supabase/migrations/*.sql` 을 SoT로 두고,
 * 본 설정은 타입 생성/스키마 검증 용도.
 *
 * 사용 예:
 *   pnpm drizzle-kit generate --config=drizzle.supabase.config.ts
 *   pnpm drizzle-kit push --config=drizzle.supabase.config.ts
 */
export default defineConfig({
  schema: './drizzle/supabase-schema.ts',
  out: './drizzle/supabase-migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
