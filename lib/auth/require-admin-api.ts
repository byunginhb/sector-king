/**
 * API Route 용 admin 가드 — redirect 가 아닌 401/403 JSON 응답.
 *
 * 사용 예:
 *   const guard = await requireAdminApi()
 *   if (!guard.ok) return guard.response
 *   // guard.profile 사용
 */
import { NextResponse } from 'next/server'
import { getCurrentProfile, type CurrentProfile } from './get-user'
import type { ApiResponse } from '@/types'

type GuardResult =
  | { ok: true; profile: CurrentProfile }
  | { ok: false; response: NextResponse }

export async function requireAdminApi(): Promise<GuardResult> {
  const profile = await getCurrentProfile()
  if (!profile) {
    const body: ApiResponse<never> = {
      success: false,
      error: '로그인이 필요합니다',
    }
    return { ok: false, response: NextResponse.json(body, { status: 401 }) }
  }
  if (profile.role !== 'admin') {
    const body: ApiResponse<never> = {
      success: false,
      error: '관리자 권한이 필요합니다',
    }
    return { ok: false, response: NextResponse.json(body, { status: 403 }) }
  }
  return { ok: true, profile }
}
