/**
 * Server Component 에서 관리자 권한을 강제하는 가드.
 *
 * 사용 예:
 *   // app/admin/layout.tsx
 *   export default async function AdminLayout({ children }) {
 *     await requireAdmin('/admin')
 *     return <div>{children}</div>
 *   }
 *
 * 동작:
 * - 비로그인 → `/login?redirect=<현재경로>` 로 redirect
 * - role !== 'admin' → `/?error=forbidden` 으로 redirect
 *
 * Layer 2 (Server Component). middleware (Layer 1) 와 RLS (Layer 3) 사이.
 */
import { redirect } from 'next/navigation'
import { getCurrentProfile, type CurrentProfile } from './get-user'

export async function requireAdmin(redirectPath = '/admin'): Promise<CurrentProfile> {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`)
  }
  if (profile.role !== 'admin') {
    redirect('/?error=forbidden')
  }
  return profile
}

export async function requireUser(redirectPath = '/'): Promise<CurrentProfile> {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`)
  }
  return profile
}
