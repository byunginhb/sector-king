import { describe, it, expect } from 'vitest'
import { roleChangeSchema } from '@/lib/permissions/schema'

const ADMIN_ID = '11111111-2222-4333-8444-555555555555'
const OTHER_ID = '99999999-2222-4333-8444-555555555555'

/**
 * 관리자 권한 변경의 신뢰 경계.
 *
 * role 은 구독과 달리 만료가 없고 RLS 정책 15개 이상이 `is_admin()` 으로 이
 * 값을 본다. 잘못 열리면 되돌리는 경로가 DB 직접 수정뿐이다.
 */
describe('roleChangeSchema — 입력 검증', () => {
  it('user 와 admin 만 받는다', () => {
    for (const role of ['user', 'admin']) {
      expect(roleChangeSchema.safeParse({ userId: OTHER_ID, role }).success).toBe(true)
    }
    for (const role of ['superadmin', 'ADMIN', 'pro', '']) {
      expect(roleChangeSchema.safeParse({ userId: OTHER_ID, role }).success).toBe(false)
    }
  })

  it('알 수 없는 키를 거부한다 (구독 필드가 섞여 들어오지 않게)', () => {
    // 한 요청으로 role 과 tier 를 함께 바꿀 수 있으면 "구독을 주려다 관리자를
    // 만드는" 실수가 가능해진다 — 두 축은 라우트부터 분리돼 있다.
    expect(
      roleChangeSchema.safeParse({
        userId: OTHER_ID,
        role: 'admin',
        tier: 'pro',
      }).success
    ).toBe(false)
  })

  it('userId 는 uuid 여야 한다', () => {
    expect(roleChangeSchema.safeParse({ userId: 'me', role: 'admin' }).success).toBe(false)
  })
})

/**
 * 라우트가 지키는 두 잠금장치의 판정 규칙.
 * (라우트 자체는 Supabase 클라이언트에 묶여 있어, 규칙만 떼어 고정한다.)
 */
function canChangeRole(params: {
  actorId: string
  targetId: string
  targetRole: 'user' | 'admin'
  nextRole: 'user' | 'admin'
  adminCount: number
}): { ok: boolean; reason?: string } {
  if (params.actorId === params.targetId) {
    return { ok: false, reason: 'self' }
  }
  if (params.targetRole === 'admin' && params.nextRole === 'user' && params.adminCount <= 1) {
    return { ok: false, reason: 'last-admin' }
  }
  return { ok: true }
}

describe('권한 변경 잠금장치', () => {
  it('본인의 권한은 바꿀 수 없다', () => {
    // 실수로 자기를 강등하면 그 순간 콘솔에 다시 들어올 수 없다.
    expect(
      canChangeRole({
        actorId: ADMIN_ID,
        targetId: ADMIN_ID,
        targetRole: 'admin',
        nextRole: 'user',
        adminCount: 5,
      })
    ).toEqual({ ok: false, reason: 'self' })
  })

  it('마지막 관리자는 강등할 수 없다', () => {
    expect(
      canChangeRole({
        actorId: ADMIN_ID,
        targetId: OTHER_ID,
        targetRole: 'admin',
        nextRole: 'user',
        adminCount: 1,
      })
    ).toEqual({ ok: false, reason: 'last-admin' })
  })

  it('관리자가 둘 이상이면 강등할 수 있다', () => {
    expect(
      canChangeRole({
        actorId: ADMIN_ID,
        targetId: OTHER_ID,
        targetRole: 'admin',
        nextRole: 'user',
        adminCount: 2,
      }).ok
    ).toBe(true)
  })

  it('승격은 관리자 수와 무관하다 (0명이 되는 방향이 아니다)', () => {
    expect(
      canChangeRole({
        actorId: ADMIN_ID,
        targetId: OTHER_ID,
        targetRole: 'user',
        nextRole: 'admin',
        adminCount: 1,
      }).ok
    ).toBe(true)
  })
})
