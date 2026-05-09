/**
 * Supabase Server 클라이언트.
 *
 * 사용처: Server Component(`async function Page`), Route Handler(`app/api/*`),
 * Server Action.
 *
 * 사용 예:
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *
 * 주의:
 * - `cookies()` 는 Next.js 15 에서 async 이므로 await 필수.
 * - 페이지 RSC 내부에서 `setAll` 호출은 throw 가능 — try/catch 로 무시.
 *   세션 쿠키 갱신은 middleware 가 책임.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // RSC 에서는 set 이 throw — middleware 가 토큰 갱신 책임.
          }
        },
      },
    }
  )
}
