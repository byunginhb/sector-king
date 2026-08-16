import { describe, it, expect } from 'vitest'
import { subscriptionGrantSchema } from '@/lib/permissions/schema'
import {
  TIER_ORDER,
  TIER_RANK,
  hasTier,
  isStorableTier,
  isTier,
  resolveTier,
  type Tier,
  type TierSubject,
} from '@/lib/permissions/tier'

/** 기준 시각 — 만료 경계 테스트가 실행 시각에 흔들리지 않게 고정한다. */
const NOW = new Date('2026-08-15T00:00:00.000Z')

function subject(overrides: Partial<NonNullable<TierSubject>> = {}): TierSubject {
  return {
    role: 'user',
    subscriptionTier: 'pro',
    subscriptionExpiresAt: null,
    ...overrides,
  }
}

describe('TIER_RANK / 사다리 불변식', () => {
  it('anon < free < basic < pro < admin 순으로 단조 증가한다', () => {
    const ranks = TIER_ORDER.map((t) => TIER_RANK[t])
    expect(ranks).toEqual([0, 10, 20, 30, 100])
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1])
    }
  })

  it('중간 등급 삽입 여지를 위해 인접 간격이 최소 10이다', () => {
    for (let i = 1; i < TIER_ORDER.length; i++) {
      const gap = TIER_RANK[TIER_ORDER[i]] - TIER_RANK[TIER_ORDER[i - 1]]
      expect(gap).toBeGreaterThanOrEqual(10)
    }
  })
})

describe('isTier / isStorableTier', () => {
  it('5개 등급만 Tier 로 인정한다', () => {
    for (const t of TIER_ORDER) expect(isTier(t)).toBe(true)
    for (const v of ['', 'prro', 'PRO', 'plus', null, undefined, 30, {}]) {
      expect(isTier(v)).toBe(false)
    }
  })

  it('저장 가능한 등급은 free/basic/pro 뿐이다 (anon·admin 은 파생값)', () => {
    expect(isStorableTier('free')).toBe(true)
    expect(isStorableTier('basic')).toBe(true)
    expect(isStorableTier('pro')).toBe(true)
    expect(isStorableTier('anon')).toBe(false)
    expect(isStorableTier('admin')).toBe(false)
  })
})

describe('hasTier — 사다리 전수', () => {
  it('모든 (actual, required) 조합이 rank 비교와 일치한다', () => {
    for (const actual of TIER_ORDER) {
      for (const required of TIER_ORDER) {
        expect(hasTier(actual, required)).toBe(
          TIER_RANK[actual] >= TIER_RANK[required]
        )
      }
    }
  })

  it('같은 등급은 통과한다(경계 >=)', () => {
    for (const t of TIER_ORDER) expect(hasTier(t, t)).toBe(true)
  })

  it('관리자는 모든 요구 등급을 통과한다', () => {
    for (const t of TIER_ORDER) expect(hasTier('admin', t)).toBe(true)
  })

  it('비로그인은 free 이상을 전부 통과하지 못한다', () => {
    expect(hasTier('anon', 'anon')).toBe(true)
    expect(hasTier('anon', 'free')).toBe(false)
    expect(hasTier('anon', 'basic')).toBe(false)
    expect(hasTier('anon', 'pro')).toBe(false)
  })

  it('알 수 없는 값은 개방이 아니라 차단으로 떨어진다 (fail-safe)', () => {
    const bogus = 'prro' as Tier
    // actual 이 오타 → 아무 것도 통과 못 함
    expect(hasTier(bogus, 'anon')).toBe(false)
    expect(hasTier(bogus, 'free')).toBe(false)
    // required 가 오타 → 관리자도 통과 못 함 (0 을 반환했다면 전면 개방이 된다)
    expect(hasTier('admin', bogus)).toBe(false)
    expect(hasTier('pro', bogus)).toBe(false)
  })
})

describe('resolveTier — 두 축(role/subscription)을 한 축으로 접기', () => {
  it('프로필 없음 → anon', () => {
    expect(resolveTier(null, NOW)).toBe('anon')
  })

  it('관리자는 만료 여부와 무관하게 admin', () => {
    expect(
      resolveTier(
        subject({ role: 'admin', subscriptionTier: 'free', subscriptionExpiresAt: null }),
        NOW
      )
    ).toBe('admin')

    // 만료가 한참 지났어도 운영 권한은 만료 축이 아니다
    expect(
      resolveTier(
        subject({
          role: 'admin',
          subscriptionTier: 'pro',
          subscriptionExpiresAt: '2020-01-01T00:00:00.000Z',
        }),
        NOW
      )
    ).toBe('admin')
  })

  it('만료 없음(null)이면 저장된 등급 그대로', () => {
    expect(resolveTier(subject({ subscriptionTier: 'pro' }), NOW)).toBe('pro')
    expect(resolveTier(subject({ subscriptionTier: 'basic' }), NOW)).toBe('basic')
    expect(resolveTier(subject({ subscriptionTier: 'free' }), NOW)).toBe('free')
  })

  it('만료일이 지나면 free 로 강등된다', () => {
    expect(
      resolveTier(
        subject({ subscriptionExpiresAt: '2026-08-14T23:59:59.000Z' }),
        NOW
      )
    ).toBe('free')
  })

  it('만료 시각 정각은 만료로 본다 (경계 <=)', () => {
    expect(
      resolveTier(subject({ subscriptionExpiresAt: NOW.toISOString() }), NOW)
    ).toBe('free')
  })

  it('만료일이 미래면 등급 유지', () => {
    expect(
      resolveTier(
        subject({ subscriptionExpiresAt: '2026-08-15T00:00:01.000Z' }),
        NOW
      )
    ).toBe('pro')
  })

  it('파싱 불가한 만료일은 만료로 본다 (fail-safe)', () => {
    expect(
      resolveTier(subject({ subscriptionExpiresAt: 'not-a-date' }), NOW)
    ).toBe('free')
    expect(resolveTier(subject({ subscriptionExpiresAt: '' }), NOW)).toBe('pro') // 빈 문자열 = 만료 없음
  })

  it('알 수 없는 subscription_tier 는 free 로 접힌다 (승격되지 않는다)', () => {
    expect(
      resolveTier(
        subject({ subscriptionTier: 'admin' as never, subscriptionExpiresAt: null }),
        NOW
      )
    ).toBe('free')
    expect(
      resolveTier(subject({ subscriptionTier: 'enterprise' as never }), NOW)
    ).toBe('free')
    expect(resolveTier(subject({ subscriptionTier: null }), NOW)).toBe('free')
  })

  it('만료 판정은 UTC 절대시각 비교라 표기 형식에 흔들리지 않는다', () => {
    // 같은 순간을 KST 오프셋으로 적어도 결과가 같아야 한다.
    const utc = '2026-08-14T15:00:00.000Z'
    const kst = '2026-08-15T00:00:00.000+09:00'
    expect(Date.parse(utc)).toBe(Date.parse(kst))
    expect(resolveTier(subject({ subscriptionExpiresAt: utc }), NOW)).toBe('free')
    expect(resolveTier(subject({ subscriptionExpiresAt: kst }), NOW)).toBe('free')
  })
})

/**
 * 등급 부여 API(`PATCH /api/admin/users/subscription`)의 신뢰 경계.
 *
 * 이 스키마가 무르면 관리자 실수 하나가 곧바로 권한 사고가 된다 —
 * 'admin' 저장은 두 번째 관리자 원천을 만들고(tier.ts §3), 타임존 없는
 * 만료일은 서버 해석에 따라 하루치 권한을 새게 한다.
 */
describe('subscriptionGrantSchema — 등급 부여 입력', () => {
  const base = {
    userId: '11111111-2222-4333-8444-555555555555',
    tier: 'pro',
  }

  it('저장 가능한 등급만 받는다 (admin·anon 거부)', () => {
    for (const tier of ['free', 'basic', 'pro']) {
      expect(subscriptionGrantSchema.safeParse({ ...base, tier }).success).toBe(true)
    }
    for (const tier of ['admin', 'anon', 'enterprise']) {
      expect(subscriptionGrantSchema.safeParse({ ...base, tier }).success).toBe(false)
    }
  })

  it('만료일은 오프셋이 있는 절대시각만 받는다', () => {
    const ok = subscriptionGrantSchema.safeParse({
      ...base,
      expiresAt: '2026-12-31T14:59:59.000Z',
    })
    expect(ok.success).toBe(true)

    // 날짜만 주면 서버가 KST/UTC 중 무엇으로 읽을지 정해야 하고, 그 결정이
    // `expires_at <= now()` 와 어긋나면 하루치 권한이 새거나 사라진다.
    for (const bad of ['2026-12-31', '2026-12-31T23:59:59', 'tomorrow']) {
      expect(
        subscriptionGrantSchema.safeParse({ ...base, expiresAt: bad }).success
      ).toBe(false)
    }
  })

  it('만료 없음은 null 로 표현되고 빈 문자열도 null 로 접힌다', () => {
    expect(
      subscriptionGrantSchema.parse({ ...base, expiresAt: null }).expiresAt
    ).toBe(null)
    expect(
      subscriptionGrantSchema.parse({ ...base, expiresAt: '' }).expiresAt
    ).toBe(null)
  })

  it('userId 는 uuid 여야 하고 알 수 없는 키는 거부한다', () => {
    expect(
      subscriptionGrantSchema.safeParse({ ...base, userId: 'me' }).success
    ).toBe(false)
    // `role: 'admin'` 같은 키가 조용히 통과해 update 에 실리면 권한 상승이 된다.
    expect(
      subscriptionGrantSchema.safeParse({ ...base, role: 'admin' }).success
    ).toBe(false)
  })
})
