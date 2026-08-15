import { describe, it, expect } from 'vitest'
import {
  TEASER_DEFAULT_VISIBLE_ROWS,
  decideGate,
  maskList,
  maskValue,
  resolveCtaHref,
} from '@/lib/permissions/gate'
import { LOGIN_HREF, UPGRADE_HREF } from '@/lib/permissions/constants'
import { featurePolicyBodySchema, parseParams } from '@/lib/permissions/schema'
import { TIER_ORDER, hasTier, type Tier } from '@/lib/permissions/tier'
import type { FeaturePolicy, GateMode, GateParams } from '@/lib/permissions/types'

function policy(overrides: Partial<FeaturePolicy> = {}): FeaturePolicy {
  return {
    featureId: 'rankings.dcf',
    minTier: 'basic',
    gateMode: 'blur',
    params: {},
    enabled: true,
    overridden: false,
    ...overrides,
  }
}

/** 마스킹 테스트용 고정 리스트. 값이 남았는지 눈으로 확인 가능한 형태. */
const ROWS = ['a', 'b', 'c', 'd', 'e']

describe('decideGate — 판정 순서', () => {
  it('등급 충족이면 통과하고 gateMode 는 open 으로 접힌다', () => {
    const d = decideGate(policy({ minTier: 'basic', gateMode: 'blur' }), 'pro')
    expect(d.allowed).toBe(true)
    expect(d.gateMode).toBe('open')
    expect(d.requiredTier).toBe('basic')
    expect(d.actualTier).toBe('pro')
  })

  it('같은 등급이면 통과한다 (경계)', () => {
    expect(decideGate(policy({ minTier: 'basic' }), 'basic').allowed).toBe(true)
  })

  it('등급 미충족이면 정책의 gateMode 가 그대로 나온다', () => {
    const modes: GateMode[] = ['hidden', 'blur', 'partial', 'teaser']
    for (const gateMode of modes) {
      const d = decideGate(policy({ minTier: 'pro', gateMode }), 'free')
      expect(d.allowed).toBe(false)
      expect(d.gateMode).toBe(gateMode)
      expect(d.requiredTier).toBe('pro')
      expect(d.actualTier).toBe('free')
    }
  })

  it('gateMode=open 은 등급이 모자라도 통과시킨다 (게이트 없음의 뜻)', () => {
    const d = decideGate(policy({ minTier: 'pro', gateMode: 'open' }), 'anon')
    expect(d.allowed).toBe(true)
    expect(d.gateMode).toBe('open')
  })

  it('enabled=false 는 킬 스위치 — 관리자도 막는다', () => {
    for (const tier of TIER_ORDER) {
      const d = decideGate(
        policy({ minTier: 'anon', gateMode: 'open', enabled: false }),
        tier
      )
      expect(d.allowed).toBe(false)
      expect(d.gateMode).toBe('hidden')
    }
  })

  it('킬 스위치는 등급 비교보다 먼저다 (open + admin 조합도 차단)', () => {
    const d = decideGate(policy({ gateMode: 'open', enabled: false }), 'admin')
    expect(d.allowed).toBe(false)
  })

  it('전 등급 × 전 요구등급 조합이 hasTier 와 일치한다', () => {
    for (const actual of TIER_ORDER) {
      for (const required of TIER_ORDER) {
        const d = decideGate(
          policy({ minTier: required, gateMode: 'hidden' }),
          actual
        )
        expect(d.allowed).toBe(hasTier(actual, required))
      }
    }
  })

  it('params 는 판정 결과에 그대로 실린다', () => {
    const params: GateParams = { visibleRows: 3, ctaLabel: '업그레이드' }
    const d = decideGate(policy({ minTier: 'pro', gateMode: 'partial', params }), 'free')
    expect(d.params).toEqual(params)
  })

  it('알 수 없는 등급은 차단으로 떨어진다 (fail-safe)', () => {
    const d = decideGate(policy({ minTier: 'basic' }), 'prro' as Tier)
    expect(d.allowed).toBe(false)
  })
})

describe('maskList — 허용', () => {
  it('통과면 원본 그대로, gated=false, lockedCount=0', () => {
    const d = decideGate(policy({ minTier: 'free' }), 'pro')
    const out = maskList(ROWS, d)
    expect(out.items).toEqual(ROWS)
    expect(out.gated).toBe(false)
    expect(out.lockedCount).toBe(0)
    expect(out.gateMode).toBe('open')
  })
})

describe('maskList — hidden / blur', () => {
  it('전부 제거하고 개수만 남긴다', () => {
    for (const gateMode of ['hidden', 'blur'] as GateMode[]) {
      const d = decideGate(policy({ minTier: 'pro', gateMode }), 'anon')
      const out = maskList(ROWS, d)
      expect(out.items).toEqual([])
      expect(out.lockedCount).toBe(ROWS.length)
      expect(out.gated).toBe(true)
      expect(out.gateMode).toBe(gateMode)
    }
  })
})

describe('maskList — partial + visibleRows', () => {
  it('상위 N개만 실값으로 남는다', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { visibleRows: 2 } }),
      'free'
    )
    const out = maskList(ROWS, d)
    expect(out.items).toEqual(['a', 'b'])
    expect(out.lockedCount).toBe(3)
    expect(out.gated).toBe(true)
  })

  it('N이 길이보다 크면 전부 남고 lockedCount=0', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { visibleRows: 99 } }),
      'free'
    )
    const out = maskList(ROWS, d)
    expect(out.items).toEqual(ROWS)
    expect(out.lockedCount).toBe(0)
    // 값은 다 나갔지만 게이트가 걸린 상태라는 사실은 유지된다
    expect(out.gated).toBe(true)
  })

  it('N=0 이면 전부 제거된다', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { visibleRows: 0 } }),
      'free'
    )
    const out = maskList(ROWS, d)
    expect(out.items).toEqual([])
    expect(out.lockedCount).toBe(5)
  })

  it('파라미터가 아예 없으면 전면 차단으로 떨어진다 (fail-close)', () => {
    const d = decideGate(policy({ minTier: 'pro', gateMode: 'partial' }), 'free')
    const out = maskList(ROWS, d)
    expect(out.items).toEqual([])
    expect(out.lockedCount).toBe(5)
  })

  it('음수·NaN 같은 이상값도 개방이 아니라 차단이다', () => {
    for (const bad of [-1, Number.NaN, Infinity, '3' as unknown as number]) {
      const d = decideGate(
        policy({
          minTier: 'pro',
          gateMode: 'partial',
          params: { visibleRows: bad },
        }),
        'free'
      )
      expect(maskList(ROWS, d).items).toEqual([])
    }
  })
})

describe('maskList — partial + blurTopK (상위가 곧 상품인 순위표)', () => {
  it('상위 K개를 제거하고 K+1번째부터 실값', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { blurTopK: 3 } }),
      'free'
    )
    const out = maskList(ROWS, d)
    expect(out.items).toEqual(['d', 'e'])
    expect(out.lockedCount).toBe(3)
  })

  it('K가 길이 이상이면 전부 제거된다', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { blurTopK: 99 } }),
      'free'
    )
    const out = maskList(ROWS, d)
    expect(out.items).toEqual([])
    expect(out.lockedCount).toBe(5)
  })

  it('K=0 이면 아무것도 가리지 않는다', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { blurTopK: 0 } }),
      'free'
    )
    const out = maskList(ROWS, d)
    expect(out.items).toEqual(ROWS)
    expect(out.lockedCount).toBe(0)
  })

  it('visibleRows 와 동시 지정되면 blurTopK 가 우선한다', () => {
    const d = decideGate(
      policy({
        minTier: 'pro',
        gateMode: 'partial',
        params: { blurTopK: 2, visibleRows: 4 },
      }),
      'free'
    )
    expect(maskList(ROWS, d).items).toEqual(['c', 'd', 'e'])
  })
})

describe('maskList — teaser', () => {
  it('visibleRows 미지정이면 기본 1건', () => {
    const d = decideGate(policy({ minTier: 'pro', gateMode: 'teaser' }), 'free')
    const out = maskList(ROWS, d)
    expect(TEASER_DEFAULT_VISIBLE_ROWS).toBe(1)
    expect(out.items).toEqual(['a'])
    expect(out.lockedCount).toBe(4)
  })

  it('visibleRows 지정 시 그 값을 따른다', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'teaser', params: { visibleRows: 3 } }),
      'free'
    )
    expect(maskList(ROWS, d).items).toEqual(['a', 'b', 'c'])
  })
})

describe('maskList — 경계', () => {
  it('빈 배열은 lockedCount 0 으로 조용히 통과한다', () => {
    const d = decideGate(policy({ minTier: 'pro', gateMode: 'blur' }), 'free')
    const out = maskList<string>([], d)
    expect(out.items).toEqual([])
    expect(out.lockedCount).toBe(0)
    expect(out.gated).toBe(true)
  })

  it('원본 배열을 변형하지 않는다 (불변)', () => {
    const source = [...ROWS]
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { visibleRows: 1 } }),
      'free'
    )
    maskList(source, d)
    expect(source).toEqual(ROWS)
  })
})

describe('maskList — maskFn (형상 유지 더미 치환)', () => {
  type Row = { rank: number; name: string; score: number }
  const objRows: Row[] = [
    { rank: 1, name: '엔비디아', score: 98 },
    { rank: 2, name: '테슬라', score: 91 },
    { rank: 3, name: '애플', score: 88 },
  ]
  const dummy = (item: Row, i: number): Row => ({
    rank: i + 1,
    name: '●●●',
    score: 0,
  })

  it('제거 대신 더미로 치환하고 항목 수를 유지한다', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { visibleRows: 1 } }),
      'free'
    )
    const out = maskList(objRows, d, dummy)
    expect(out.items).toHaveLength(3)
    expect(out.items[0]).toEqual(objRows[0])
    expect(out.items[1].name).toBe('●●●')
    expect(out.items[2].name).toBe('●●●')
    // 항목 수를 유지해도 "몇 개가 잠겼는지"는 같은 값이다
    expect(out.lockedCount).toBe(2)
  })

  it('더미 치환에도 원본 값이 응답에 남지 않는다', () => {
    const d = decideGate(policy({ minTier: 'pro', gateMode: 'blur' }), 'anon')
    const out = maskList(objRows, d, dummy)
    const serialized = JSON.stringify(out)
    expect(serialized).not.toContain('엔비디아')
    expect(serialized).not.toContain('98')
    expect(out.lockedCount).toBe(3)
  })

  it('blurTopK 는 상위 K개를 더미로 바꾸고 순서를 유지한다', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: { blurTopK: 2 } }),
      'free'
    )
    const out = maskList(objRows, d, dummy)
    expect(out.items.map((r) => r.name)).toEqual(['●●●', '●●●', '애플'])
  })
})

describe('maskValue', () => {
  it('허용이면 실값, 차단이면 null', () => {
    const allow = decideGate(policy({ minTier: 'free' }), 'pro')
    const deny = decideGate(policy({ minTier: 'pro' }), 'free')
    expect(maskValue(42, allow)).toBe(42)
    expect(maskValue(42, deny)).toBe(null)
    expect(maskValue(42, deny, '***')).toBe('***')
  })
})

/**
 * 스키마 회귀 가드.
 *
 * 초기 구현은 `z.object({...}).and(gateConfigSchema)` 로 DTO 를 합쳤는데,
 * zod 4 의 교집합이 오른쪽 객체의 strict 위반과 refine 실패를 **조용히
 * 삼켰다**(params 오타가 `{}` 로 성공). 그 결과는 게이팅에서 "0건 노출"이라
 * 기능이 통째로 사라지면서 400 도 안 나온다. 아래 3개가 그 회귀를 막는다.
 */
describe('featurePolicyBodySchema — 저장 시점 검증', () => {
  it('params 키 오타를 통과시키지 않는다', () => {
    const r = featurePolicyBodySchema.safeParse({
      minTier: 'pro',
      gateMode: 'partial',
      params: { visibleRow: 3 },
    })
    expect(r.success).toBe(false)
  })

  it('partial 은 visibleRows/blurTopK 중 하나를 요구한다', () => {
    expect(
      featurePolicyBodySchema.safeParse({
        minTier: 'pro',
        gateMode: 'partial',
        params: {},
      }).success
    ).toBe(false)
    expect(
      featurePolicyBodySchema.safeParse({
        minTier: 'pro',
        gateMode: 'partial',
        params: { blurTopK: 3 },
      }).success
    ).toBe(true)
  })

  it('open 은 파라미터를 받지 않는다', () => {
    expect(
      featurePolicyBodySchema.safeParse({
        minTier: 'free',
        gateMode: 'open',
        params: { visibleRows: 3 },
      }).success
    ).toBe(false)
  })

  it('CTA 링크는 내부 경로만 허용한다 (오픈 리다이렉트 차단)', () => {
    expect(
      featurePolicyBodySchema.safeParse({
        minTier: 'pro',
        gateMode: 'blur',
        params: { ctaHref: 'https://evil.example.com' },
      }).success
    ).toBe(false)
    expect(
      featurePolicyBodySchema.safeParse({
        minTier: 'pro',
        gateMode: 'blur',
        params: { ctaHref: '//evil.example.com' },
      }).success
    ).toBe(false)
  })
})

describe('parseParams — 읽기는 관대하게, 단 fail-close', () => {
  it('깨진 params 는 {} 로 떨어지고, 게이트는 그때 전면 차단한다', () => {
    expect(parseParams('partial', { nope: 1 })).toEqual({})
    expect(parseParams('teaser', null)).toEqual({})

    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'partial', params: parseParams('partial', 'garbage') }),
      'free'
    )
    expect(maskList(ROWS, d).items).toEqual([])
  })
})

describe('resolveCtaHref', () => {
  it('free 요구는 로그인, 유료 요구는 업그레이드로 보낸다', () => {
    const login = decideGate(policy({ minTier: 'free', gateMode: 'hidden' }), 'anon')
    expect(resolveCtaHref(login)).toBe(LOGIN_HREF)

    for (const tier of ['basic', 'pro', 'admin'] as Tier[]) {
      const d = decideGate(policy({ minTier: tier, gateMode: 'hidden' }), 'free')
      expect(resolveCtaHref(d)).toBe(UPGRADE_HREF)
    }
  })

  it('params.ctaHref 가 있으면 그것이 최우선이다', () => {
    const d = decideGate(
      policy({ minTier: 'pro', gateMode: 'hidden', params: { ctaHref: '/pricing/pro' } }),
      'free'
    )
    expect(resolveCtaHref(d)).toBe('/pricing/pro')
  })
})
