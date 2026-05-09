/**
 * API Route 용 user 가드 — 비로그인 시 401 JSON 응답.
 *
 * 사용 예:
 *   const guard = await requireUserApi()
 *   if (!guard.ok) return guard.response
 *   // guard.profile 로 본인 데이터만 조작
 */
import { NextResponse } from 'next/server'
import { getCurrentProfile, type CurrentProfile } from './get-user'
import type { ApiResponse } from '@/types'

type GuardResult =
  | { ok: true; profile: CurrentProfile }
  | { ok: false; response: NextResponse }

export async function requireUserApi(): Promise<GuardResult> {
  const profile = await getCurrentProfile()
  if (!profile) {
    const body: ApiResponse<never> = {
      success: false,
      error: '로그인이 필요합니다',
    }
    return { ok: false, response: NextResponse.json(body, { status: 401 }) }
  }
  return { ok: true, profile }
}
