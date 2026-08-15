/**
 * 기능 레지스트리 무결성 테스트.
 *
 * 이 파일이 지키는 것은 두 가지다.
 *
 * 1. **형식 무결성** — featureId 형식·길이·중복, 고아 pageId, order 중복,
 *    supportedGateModes 와 실제 값의 정합.
 *
 * 2. **"배포해도 화면이 안 바뀐다"는 약속** — `defaultPolicy` 는 오늘 실제로
 *    동작하는 상태여야 한다. 잠겨 있지 않은 기능이 잠긴 기본값을 갖게 되면
 *    시스템을 켜는 순간 사용자 화면이 조용히 바뀐다. 그래서 잠긴 기본값을
 *    가질 수 있는 기능을 `PRE_GATED` 로 열거해 두고, 그 밖의 기능이 잠기면
 *    테스트가 깨지게 했다. 새로 잠글 때는 게이트 코드와 함께 이 목록을
 *    고치는 것이 정상 절차다 — 여기를 고치는 diff 가 곧 리뷰 신호다.
 */

import { describe, it, expect } from 'vitest'
import {
  FEATURE_ID_PATTERN,
  FEATURES,
  FEATURE_IDS,
  PAGES,
  featuresByPage,
  getFeature,
  getPage,
  WIRED_FEATURE_IDS,
} from '@/lib/permissions/features'
import { GATE_MODES, type GateMode } from '@/lib/permissions/types'
import { TIER_RANK, type Tier } from '@/lib/permissions/tier'

/** 카탈로그 §6.1 이 정한 상한. DB 키가 되므로 넉넉히 잡지 않는다. */
const MAX_FEATURE_ID_LENGTH = 40

/**
 * 오늘 이미 잠겨 있는 기능 — 전부 **기존 배포 코드**가 만든 상태다.
 * 값은 실제 가드를 그대로 옮긴 것이며, 새 게이트를 여기 추가하려면
 * 같은 커밋에 게이트 코드가 함께 있어야 한다.
 */
const PRE_GATED: Record<string, { minTier: Tier; gateMode: GateMode }> = {
  // app/admin/layout.tsx — requireAdmin('/admin')
  'admin.dashboard': { minTier: 'admin', gateMode: 'hidden' },
  'admin.news-list': { minTier: 'admin', gateMode: 'hidden' },
  'admin.news-create': { minTier: 'admin', gateMode: 'hidden' },
  'admin.news-edit': { minTier: 'admin', gateMode: 'hidden' },
  'admin.news-email-preview': { minTier: 'admin', gateMode: 'hidden' },
  'admin.econ-calendar-list': { minTier: 'admin', gateMode: 'hidden' },
  'admin.econ-calendar-create': { minTier: 'admin', gateMode: 'hidden' },
  'admin.econ-calendar-edit': { minTier: 'admin', gateMode: 'hidden' },
  'admin.contributors-list': { minTier: 'admin', gateMode: 'hidden' },
  'admin.contributors-create': { minTier: 'admin', gateMode: 'hidden' },
  'admin.contributors-edit': { minTier: 'admin', gateMode: 'hidden' },
  'admin.contact-list': { minTier: 'admin', gateMode: 'hidden' },
  'admin.contact-detail': { minTier: 'admin', gateMode: 'hidden' },
  'admin.users': { minTier: 'admin', gateMode: 'hidden' },
  'admin.email-log': { minTier: 'admin', gateMode: 'hidden' },

  // app/me/**/page.tsx — requireUser(...)
  'me.home': { minTier: 'free', gateMode: 'hidden' },
  'me.watchlist': { minTier: 'free', gateMode: 'hidden' },
  'me.notes': { minTier: 'free', gateMode: 'hidden' },
  'me.recently-viewed': { minTier: 'free', gateMode: 'hidden' },
  'me.email-subscription': { minTier: 'free', gateMode: 'hidden' },
  'me.settings-profile': { minTier: 'free', gateMode: 'hidden' },
  'me.onboarding': { minTier: 'free', gateMode: 'hidden' },

  // components/news/locked-section.tsx — 비로그인 잠금 (카탈로그 §0.2)
  'news.novice-korea': { minTier: 'free', gateMode: 'blur' },
  'news.expert-locked': { minTier: 'free', gateMode: 'teaser' },
  'news.monthly-korea-coverage': { minTier: 'free', gateMode: 'partial' },
  'news.monthly-outlook': { minTier: 'free', gateMode: 'teaser' },
}

/**
 * 자체 기능이 없는 페이지.
 *
 * `/[industryId]/rankings` 는 `/rankings` 와 동일한 `RankingsPage` 를 렌더하고,
 * 카탈로그 §F 가 "featureId 는 공유하고 pageId 만 둘로 둔다"로 결정했다.
 * 라우트 인벤토리(50개)를 잃지 않기 위해 페이지 항목은 남기되, 기능 0개가
 * 정상인 유일한 예외로 명시한다.
 */
const PAGES_WITHOUT_OWN_FEATURES = new Set(['industry-rankings'])

const featureEntries = Object.entries(FEATURES)

describe('permissions registry — featureId 형식', () => {
  it('모든 featureId 가 네이밍 규칙을 만족한다', () => {
    const invalid = featureEntries
      .map(([id]) => id)
      .filter((id) => !FEATURE_ID_PATTERN.test(id))
    expect(invalid).toEqual([])
  })

  it('모든 featureId 가 40자 이하다', () => {
    const tooLong = featureEntries
      .map(([id]) => id)
      .filter((id) => id.length > MAX_FEATURE_ID_LENGTH)
    expect(tooLong).toEqual([])
  })

  it('점(.)이 정확히 하나다 — 2단 계층을 넘지 않는다', () => {
    const bad = featureEntries
      .map(([id]) => id)
      .filter((id) => id.split('.').length !== 2)
    expect(bad).toEqual([])
  })

  it('FEATURE_IDS 가 FEATURES 키와 개수·내용이 일치한다 (중복 0)', () => {
    expect(FEATURE_IDS).toHaveLength(featureEntries.length)
    expect(new Set(FEATURE_IDS).size).toBe(FEATURE_IDS.length)
    expect([...FEATURE_IDS].sort()).toEqual(featureEntries.map(([id]) => id).sort())
  })

  it('카탈로그 전수 이관 — 기능 160개가 등록돼 있다', () => {
    expect(FEATURE_IDS).toHaveLength(160)
  })
})

describe('permissions registry — 페이지', () => {
  it('pageId 중복이 없다', () => {
    const ids = PAGES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('order 중복이 없다', () => {
    const orders = PAGES.map((p) => p.order)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('모든 페이지가 id·label·route 를 갖는다', () => {
    for (const page of PAGES) {
      expect(page.id.length, page.id).toBeGreaterThan(0)
      expect(page.label.length, page.id).toBeGreaterThan(0)
      expect(page.route.length, page.id).toBeGreaterThan(0)
    }
  })

  it('모든 FeatureDef.pageId 가 PAGES 에 실재한다 (고아 0)', () => {
    const known = new Set(PAGES.map((p) => p.id))
    const orphans = featureEntries
      .filter(([, def]) => !known.has(def.pageId))
      .map(([id, def]) => `${id} → ${def.pageId}`)
    expect(orphans).toEqual([])
  })

  it('기능이 0개인 페이지가 없다 (명시된 공유 라우트 제외)', () => {
    const empty = PAGES.filter(
      (p) => featuresByPage(p.id).length === 0 && !PAGES_WITHOUT_OWN_FEATURES.has(p.id)
    ).map((p) => p.id)
    expect(empty).toEqual([])
  })

  it('예외로 등록한 페이지는 실제로 기능이 0개다 (죽은 예외 방지)', () => {
    for (const pageId of PAGES_WITHOUT_OWN_FEATURES) {
      expect(getPage(pageId), pageId).toBeDefined()
      expect(featuresByPage(pageId), pageId).toHaveLength(0)
    }
  })

  it('admin 페이지 15개가 adminOnly 로 표시돼 있다', () => {
    const adminPages = PAGES.filter((p) => p.id.startsWith('admin-'))
    expect(adminPages).toHaveLength(15)
    for (const page of adminPages) {
      expect(page.adminOnly, page.id).toBe(true)
    }
  })
})

describe('permissions registry — defaultPolicy 는 현재 배포 동작이다', () => {
  it('PRE_GATED 에 없는 기능은 전부 anon/open 이다', () => {
    const unexpected = featureEntries
      .filter(([id]) => !(id in PRE_GATED))
      .filter(
        ([, def]) =>
          def.defaultPolicy.minTier !== 'anon' || def.defaultPolicy.gateMode !== 'open'
      )
      .map(([id, def]) => `${id} → ${def.defaultPolicy.minTier}/${def.defaultPolicy.gateMode}`)
    expect(unexpected).toEqual([])
  })

  it('PRE_GATED 기능은 실제 가드와 같은 값을 갖는다', () => {
    for (const [id, expected] of Object.entries(PRE_GATED)) {
      const def = getFeature(id)
      expect(def, id).toBeDefined()
      expect(def!.defaultPolicy.minTier, id).toBe(expected.minTier)
      expect(def!.defaultPolicy.gateMode, id).toBe(expected.gateMode)
    }
  })

  it('PRE_GATED 에 유령 키가 없다', () => {
    const ghosts = Object.keys(PRE_GATED).filter((id) => !(id in FEATURES))
    expect(ghosts).toEqual([])
  })

  /*
   * 배선(`wired`)과 기본 정책은 서로 독립이다. 이 테스트가 지키는 것은
   * "배선했다고 표시했으면 게이트를 읽는 코드가 실제로 있어야 한다" 는 규약이고,
   * 그 증거는 커밋에 `FeatureGate`(또는 서버 마스킹) 가 함께 들어왔는지다.
   * 현재는 0건이므로 목록을 고정해 두고, 배선 커밋이 이 숫자를 올린다 —
   * 여기를 고치는 diff 가 곧 "화면에 게이트를 붙였다" 는 리뷰 신호다.
   */
  it('배선된 기능은 아직 없다 (Phase A: 정책 저장·판정까지만)', () => {
    expect(WIRED_FEATURE_IDS).toEqual([])
  })

  it('wired 를 켠 기능은 open 이 아닌 게이트를 지원해야 한다', () => {
    // open 만 지원하는 기능(카탈로그 §5 잠금 봉인)에 배선은 성립하지 않는다.
    const nonsense = featureEntries
      .filter(([, def]) => def.wired === true)
      .filter(
        ([, def]) =>
          def.supportedGateModes?.length === 1 &&
          def.supportedGateModes[0] === 'open'
      )
      .map(([id]) => id)
    expect(nonsense).toEqual([])
  })

  it('admin 네임스페이스는 전부 admin/hidden 이다', () => {
    const adminFeatures = featureEntries.filter(([id]) => id.startsWith('admin.'))
    expect(adminFeatures).toHaveLength(15)
    for (const [id, def] of adminFeatures) {
      expect(def.defaultPolicy.minTier, id).toBe('admin')
      expect(def.defaultPolicy.gateMode, id).toBe('hidden')
    }
  })

  it('adminOnly 페이지의 기능은 admin 등급이고, 그 반대도 성립한다', () => {
    const adminOnlyPages = new Set(PAGES.filter((p) => p.adminOnly).map((p) => p.id))
    for (const [id, def] of featureEntries) {
      const onAdminPage = adminOnlyPages.has(def.pageId)
      const requiresAdmin = def.defaultPolicy.minTier === 'admin'
      expect(onAdminPage, id).toBe(requiresAdmin)
    }
  })
})

describe('permissions registry — 값 도메인', () => {
  it('모든 등급 값이 사다리에 존재한다', () => {
    for (const [id, def] of featureEntries) {
      expect(TIER_RANK[def.defaultPolicy.minTier], id).toBeTypeOf('number')
      if (def.recommendedMinTier !== undefined) {
        expect(TIER_RANK[def.recommendedMinTier], id).toBeTypeOf('number')
      }
    }
  })

  it('모든 게이트 방식이 GATE_MODES 안에 있다', () => {
    for (const [id, def] of featureEntries) {
      expect(GATE_MODES, id).toContain(def.defaultPolicy.gateMode)
      if (def.recommendedGateMode !== undefined) {
        expect(GATE_MODES, id).toContain(def.recommendedGateMode)
      }
      for (const mode of def.supportedGateModes ?? []) {
        expect(GATE_MODES, id).toContain(mode)
      }
    }
  })

  it('supportedGateModes 가 defaultPolicy.gateMode 와 recommendedGateMode 를 포함한다', () => {
    const violations: string[] = []
    for (const [id, def] of featureEntries) {
      const supported = def.supportedGateModes
      if (!supported) continue
      if (!supported.includes(def.defaultPolicy.gateMode)) {
        violations.push(`${id}: default ${def.defaultPolicy.gateMode} ∉ [${supported.join(',')}]`)
      }
      if (def.recommendedGateMode && !supported.includes(def.recommendedGateMode)) {
        violations.push(
          `${id}: recommended ${def.recommendedGateMode} ∉ [${supported.join(',')}]`
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('supportedGateModes 에 중복이 없고 비어 있지 않다', () => {
    for (const [id, def] of featureEntries) {
      const supported = def.supportedGateModes
      if (!supported) continue
      expect(supported.length, id).toBeGreaterThan(0)
      expect(new Set(supported).size, id).toBe(supported.length)
    }
  })

  it('masking 은 server 또는 display 다', () => {
    for (const [id, def] of featureEntries) {
      expect(['server', 'display'], id).toContain(def.masking)
    }
  })

  it('label 과 description 이 비어 있지 않다', () => {
    for (const [id, def] of featureEntries) {
      expect(def.label.trim().length, id).toBeGreaterThan(0)
      expect(def.description?.trim().length ?? 0, id).toBeGreaterThan(0)
    }
  })

  it('location 이 지정돼 있다 — 어드민에서 게이트 지점을 추적할 수 있어야 한다', () => {
    const missing = featureEntries.filter(([, def]) => !def.location?.trim()).map(([id]) => id)
    expect(missing).toEqual([])
  })
})

describe('permissions registry — 잠금 봉인 (카탈로그 §5)', () => {
  /** 게이팅하면 안 되는 것. 어드민 셀렉트에서 open 외 선택지가 없어야 한다. */
  const SEALED = [
    // SEO 착지면 / 크롤 경로
    'stock.seo-facts',
    'stock.price-banner',
    'sectors.index',
    'sector.company-table',
    'sector.period-change',
    'sector.related',
    // 무료 공개 정책 콘텐츠
    'news.list',
    'news.novice-body',
    // 신뢰 문서 · 전환 퍼널 입구
    'guide.hub',
    'guide.money-flow',
    'guide.mcap-vs-netbuy',
    'guide.sector-rotation',
    'methodology.doc',
    'data-sources.doc',
    'editorial-policy.doc',
    'about.doc',
    // 법적 문서
    'terms.doc',
    'privacy.doc',
    // 인증 · 수신거부 · 문의 창구
    'login.page',
    'email.unsubscribed',
    'shell.auth-button',
    'contact.form',
  ]

  it('§5 목록이 전부 open 으로 봉인돼 있다', () => {
    for (const id of SEALED) {
      const def = getFeature(id)
      expect(def, id).toBeDefined()
      expect(def!.supportedGateModes, id).toEqual(['open'])
      expect(def!.defaultPolicy.gateMode, id).toBe('open')
      expect(def!.defaultPolicy.minTier, id).toBe('anon')
    }
  })

  it('봉인된 기능 수가 22개다 — 조용히 줄어들면 금지 목록이 무력화된다', () => {
    const sealed = featureEntries
      .filter(([, def]) => def.supportedGateModes?.length === 1 && def.supportedGateModes[0] === 'open')
      .map(([id]) => id)
    expect(sealed.sort()).toEqual([...SEALED].sort())
    expect(sealed).toHaveLength(22)
  })

  it('admin.* 는 hidden 으로 고정돼 운영자가 바꿀 수 없다', () => {
    for (const [id, def] of featureEntries.filter(([id]) => id.startsWith('admin.'))) {
      expect(def.supportedGateModes, id).toEqual(['hidden'])
    }
  })

  it('seoIndexed 기능은 기본값이 open 이다 — 색인 붕괴 방지', () => {
    const broken = featureEntries
      .filter(([, def]) => def.seoIndexed)
      .filter(([, def]) => def.defaultPolicy.gateMode !== 'open')
      .map(([id]) => id)
    expect(broken).toEqual([])
  })
})

describe('permissions registry — 조회 헬퍼', () => {
  it('getFeature 는 존재하는 키를 찾고 없는 키에 undefined 를 준다', () => {
    expect(getFeature('stock.dcf')?.pageId).toBe('stock')
    expect(getFeature('stock.does-not-exist')).toBeUndefined()
  })

  it('getPage 는 존재하는 페이지를 찾고 없는 페이지에 undefined 를 준다', () => {
    expect(getPage('stock')?.route).toBe('/stock/[ticker]')
    expect(getPage('nope')).toBeUndefined()
  })

  it('featuresByPage 의 합이 전체 기능 수와 같다 (누락·중복 0)', () => {
    const total = PAGES.reduce((sum, p) => sum + featuresByPage(p.id).length, 0)
    expect(total).toBe(FEATURE_IDS.length)
  })

  it('카탈로그 §7.2 의 페이지 그룹별 기능 개수와 일치한다', () => {
    const counts: Record<string, number> = {
      home: 18, // 카탈로그 16 + 미마운트 me.home-slot·me.login-prompt
      calendar: 7,
      industry: 5,
      'industry-money-flow': 6,
      'industry-price-changes': 5,
      'industry-statistics': 7,
      rankings: 13,
      'industry-rankings': 0, // rankings 와 공유
      'market-size': 8,
      analysts: 9,
      'analyst-detail': 4, // analysts 계 합계 13
      stock: 18,
      sectors: 1,
      'sector-detail': 3,
      indices: 2,
      shell: 6,
      news: 2,
      'news-detail': 10, // news 계 합계 12
    }
    for (const [pageId, expected] of Object.entries(counts)) {
      expect(featuresByPage(pageId).length, pageId).toBe(expected)
    }
  })
})
