/**
 * PATCH /api/admin/users/role — 관리자 권한 부여/회수.
 *
 * ────────────────────────────────────────────────────────────────────
 *  구독 등급과 분리된 라우트인 이유
 * ────────────────────────────────────────────────────────────────────
 *
 * `role` 은 구독과 다른 축이다(`tier.ts` §3): 만료가 없고, 결제 웹훅이 건드리지
 * 않으며, RLS 정책 15개 이상이 `is_admin()` 으로 이 값을 본다. 한 요청으로 둘 다
 * 바꿀 수 있게 만들면 "구독을 주려다 관리자를 만드는" 실수가 가능해진다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  두 개의 잠금장치
 * ────────────────────────────────────────────────────────────────────
 *
 * 1. **자기 자신은 못 바꾼다.** 관리자가 실수로 스스로를 강등하면 그 순간
 *    콘솔에 다시 들어올 수 없다 — 복구는 DB 직접 수정뿐이다. DB 트리거
 *    (`prevent_role_self_escalation`)도 같은 것을 막지만 그건 세션 경로 한정이라
 *    (service_role 은 `auth.uid()` 가 null) 이 라우트에서 다시 막는다.
 * 2. **마지막 관리자는 강등할 수 없다.** 관리자가 0명이 되면 아무도 서로를
 *    되살릴 수 없다. 1번 때문에 "자기 자신"으로는 못 만드는 상황이지만,
 *    관리자 A 가 관리자 B 를 강등하는 경로로는 도달 가능하다.
 *
 * 행위자·이력은 0016 의 `role_change_log` 가 트리거로 기록한다. service_role 은
 * `auth.uid()` 가 없으므로 **같은 UPDATE 문 안에** `role_updated_by` 를 싣는다.
 */
import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { roleChangeSchema } from '@/lib/permissions/schema'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

export type RoleChangeResult = {
  userId: string
  email: string
  role: 'user' | 'admin'
}

function fail(error: string, status: number) {
  const body: ApiResponse<never> = { success: false, error }
  return NextResponse.json(body, { status })
}

export async function PATCH(req: Request) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return fail('요청 본문을 읽을 수 없습니다', 400)
  }

  const parsed = roleChangeSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('입력값이 올바르지 않습니다', 400)
  }
  const { userId, role } = parsed.data

  // 잠금장치 1 — 자기 자신.
  if (userId === guard.profile.id) {
    return fail(
      '본인의 권한은 변경할 수 없습니다. 다른 관리자에게 요청하세요.',
      400
    )
  }

  const admin = createAdminClient()

  const { data: target, error: findError } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', userId)
    .maybeSingle()

  if (findError) {
    console.error('[PATCH /api/admin/users/role] lookup', findError.message)
    return fail('사용자를 조회할 수 없습니다', 500)
  }
  if (!target) return fail('존재하지 않는 사용자입니다', 404)

  // 이미 그 상태면 조용히 성공 — 감사 로그에 의미 없는 행을 만들지 않는다.
  if (target.role === role) {
    const body: ApiResponse<RoleChangeResult> = {
      success: true,
      data: { userId: target.id, email: target.email, role },
    }
    return NextResponse.json(body)
  }

  // 잠금장치 2 — 마지막 관리자 강등 차단.
  if (target.role === 'admin' && role === 'user') {
    const { count, error: countError } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (countError) {
      console.error('[PATCH /api/admin/users/role] count', countError.message)
      return fail('관리자 수를 확인할 수 없습니다', 500)
    }
    if ((count ?? 0) <= 1) {
      return fail(
        '마지막 관리자는 해제할 수 없습니다. 다른 관리자를 먼저 지정하세요.',
        409
      )
    }
  }

  const { data, error } = await admin
    .from('profiles')
    .update({
      role,
      // 감사 트리거가 이 값을 changed_by 로 쓴다(0016).
      role_updated_by: guard.profile.id,
    })
    .eq('id', userId)
    .select('id, email, role')
    .single()

  if (error || !data) {
    console.error('[PATCH /api/admin/users/role] update', error?.message ?? 'no row')
    return fail('권한을 변경할 수 없습니다', 500)
  }

  const body: ApiResponse<RoleChangeResult> = {
    success: true,
    data: { userId: data.id, email: data.email, role: data.role },
  }
  return NextResponse.json(body)
}
