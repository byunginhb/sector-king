/**
 * 정책 저장소 — 코드 레지스트리 기본값 + DB 오버라이드 병합. **서버 전용.**
 *
 * ────────────────────────────────────────────────────────────────────
 *  SoT 와 실패 모드
 * ────────────────────────────────────────────────────────────────────
 *
 * 카탈로그 SoT 는 코드(`features.ts`)이고 `feature_permissions` 는 오버라이드만
 * 저장한다. 그래서 **DB 조회가 실패하면 코드 기본값이 그대로 적용된다** —
 * 유료로 잠근 기능이 장애 때 열리지 않는다. 카탈로그가 DB 에 있었다면 장애 시
 * 선택지가 "전면 차단(서비스 정지)" 아니면 "전면 개방(매출 유출)" 둘뿐이다.
 *
 * 테이블 부재(배포 ~ 마이그레이션 적용 사이의 창)도 같은 경로로 흡수한다.
 * 이 저장소가 두 번 채택한 패턴이다(CLAUDE.md 2026-08-04 `analyst_recommendation_trend`,
 * 2026-08-14 `ipo_calendar`: "테이블 없으면 빈 배열로 흡수, 나머지는 살린다").
 *
 * ────────────────────────────────────────────────────────────────────
 *  캐시 2단 (기획서 §6.2)
 * ────────────────────────────────────────────────────────────────────
 *
 *   unstable_cache(tag) ─ 인스턴스 간 공유 + revalidateTag 로 즉시 무효화
 *        └ react.cache ─ 한 요청 안에서 1회로 병합
 *
 * module-scope Map(in-memory TTL)을 쓰지 않는 이유: 서버리스는 인스턴스가
 * 여럿이고 무효화 경로가 없다. 정책 변경 직후 A 인스턴스는 새 정책, B 는 옛
 * 정책을 들고 있어 새로고침마다 기능이 나타났다 사라진다.
 *
 * **오류는 반드시 `unstable_cache` 안에서 throw 한다.** 밖에서 잡아 빈 값을
 * 반환하면 그 빈 값이 캐시되어 최대 5분간 "오버라이드 없음"이 고정된다.
 */
import 'server-only'

import { cache } from 'react'
import { revalidateTag, unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { POLICY_CACHE_REVALIDATE_SEC, POLICY_CACHE_TAG } from './constants'
import { FEATURE_IDS, getFeature } from './features'
import { featurePermissionRowSchema } from './schema'
import type { FeaturePermissionRow, FeaturePolicy, PolicyMap } from './types'

/** 조회 컬럼 — 판정에 쓰는 것 + 콘솔 표시용. `select *` 로 두면 컬럼 추가가 조용히 페이로드를 늘린다. */
const ROW_COLUMNS = 'feature_id, min_tier, gate_mode, params, note, updated_by, updated_at'

/** PostgreSQL undefined_table — 마이그레이션 적용 전 창. */
const UNDEFINED_TABLE = '42P01'

/**
 * 레지스트리에 없는 featureId 의 기본값.
 *
 * **개방(open)이 맞다.** 레지스트리에 없다는 것은 아무도 이 기능에 게이트를
 * 정의한 적이 없다는 뜻이고, 레지스트리 규약상 잠기지 않은 기능은 전부
 * `anon/open` 이다. 여기서 차단으로 떨어뜨리면 레지스트리 반영이 한 배포
 * 늦은 순간 사이트가 통째로 잠긴다. 대신 아래에서 한 번 경고 로그를 남긴다.
 */
const UNREGISTERED_DEFAULT = { minTier: 'anon', gateMode: 'open' } as const

/** 경고 중복 방지 — 요청마다 같은 id 로 로그가 쏟아지지 않게. */
const warnedUnregistered = new Set<string>()

function warnUnregisteredOnce(featureId: string) {
  if (warnedUnregistered.has(featureId)) return
  warnedUnregistered.add(featureId)
  console.warn(
    `[permissions] 레지스트리에 없는 featureId: "${featureId}" — 개방(open)으로 처리했습니다. lib/permissions/features.ts 에 등록하세요.`
  )
}

/**
 * 쿠키 없는 anon 클라이언트.
 *
 * `lib/supabase/server.ts` 의 `createClient()` 는 `cookies()` 를 읽는데,
 * Next 는 `unstable_cache` 안에서의 `cookies()` 호출을 금지한다(캐시된 값이
 * 요청별 데이터에 오염되므로). `feature_permissions` 는 RLS public read 라
 * 세션이 필요 없으므로 익명 클라이언트로 조회한다.
 * (같은 이유로 `app/sitemap.ts` 도 이 형태를 쓴다.)
 */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase 환경변수 누락 (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)')
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } })
}

/** 원시 행 배열 → featureId 색인. 파싱 실패 행은 버린다(= 코드 기본값 적용). */
function indexRows(rows: unknown[]): Record<string, FeaturePermissionRow> {
  const map: Record<string, FeaturePermissionRow> = {}
  for (const raw of rows) {
    const parsed = featurePermissionRowSchema.safeParse(raw)
    if (!parsed.success) {
      console.error('[permissions] 정책 행 파싱 실패 — 무시하고 코드 기본값 사용', raw)
      continue
    }
    map[parsed.data.featureId] = parsed.data
  }
  return map
}

/**
 * DB 오버라이드 전량 로드 (Data Cache).
 *
 * 전량을 한 번에 받아 색인한다. featureId 별 개별 조회를 하면 게이트 수만큼
 * 캐시 엔트리가 생기고 태그 무효화 후 콜드 스타트가 그만큼 늘어난다.
 * 행 수는 기능 수(수백) 상한이라 전량 로드가 명백히 싸다.
 */
const loadOverrides = unstable_cache(
  async (): Promise<Record<string, FeaturePermissionRow>> => {
    const supabase = createAnonClient()
    const { data, error } = await supabase
      .from('feature_permissions')
      .select(ROW_COLUMNS)

    // throw 해야 실패가 캐시되지 않는다. 호출부가 잡아 코드 기본값으로 폴백한다.
    if (error) throw error
    return indexRows(data ?? [])
  },
  ['feature-permissions:v1'],
  { tags: [POLICY_CACHE_TAG], revalidate: POLICY_CACHE_REVALIDATE_SEC }
)

/** 요청 1회로 병합된 오버라이드 맵. 실패는 빈 맵(= 코드 기본값)으로 흡수. */
const getOverrideMap = cache(
  async (): Promise<Record<string, FeaturePermissionRow>> => {
    try {
      return await loadOverrides()
    } catch (error) {
      const code = (error as { code?: string } | null)?.code
      if (code === UNDEFINED_TABLE) {
        // 배포 ~ 0014 마이그레이션 적용 사이의 창. 게이트는 코드 기본값으로 동작한다.
        console.warn(
          '[permissions] feature_permissions 테이블이 없습니다 — 코드 기본값으로 동작합니다(0014 마이그레이션 미적용).'
        )
      } else {
        console.error('[permissions] 정책 오버라이드 조회 실패 — 코드 기본값 사용', error)
      }
      return {}
    }
  }
)

/**
 * 정책 1건 해석 — 레지스트리 기본값 위에 오버라이드 행을 통째로 얹는다.
 *
 * 부분 병합(컬럼별 null 폴백)을 하지 않는 이유: DB 컬럼이 전부 NOT NULL +
 * DEFAULT 라 행이 존재하면 네 값이 항상 채워져 있다. 부분 병합을 허용하면
 * "행은 있는데 minTier 만 기본값" 같은 상태가 생겨 콘솔이 무엇을 보여줄지
 * 애매해진다. 오버라이드는 전체 교체, 되돌리기는 행 삭제 — 두 가지뿐이다.
 *
 * `enabled` 컬럼은 더 이상 읽지 않는다(킬 스위치 폐지 — `gate.ts` 참조).
 * DEFAULT true 라 INSERT 에서 생략해도 되므로 컬럼을 남겨 둔다.
 * ponytail: 컬럼 DROP 은 되돌릴 수 없고 얻는 게 없어 하지 않는다.
 */
export function resolvePolicy(
  featureId: string,
  overrides: Record<string, FeaturePermissionRow>
): FeaturePolicy {
  const def = getFeature(featureId)
  if (!def) warnUnregisteredOnce(featureId)

  const fallback = def?.defaultPolicy ?? UNREGISTERED_DEFAULT
  const row = overrides[featureId]

  if (row) {
    return {
      featureId,
      minTier: row.minTier,
      gateMode: row.gateMode,
      params: row.params ?? {},
      overridden: true,
    }
  }

  return {
    featureId,
    minTier: fallback.minTier,
    gateMode: fallback.gateMode,
    params: ('params' in fallback ? fallback.params : undefined) ?? {},
    overridden: false,
  }
}

/**
 * 전체 정책 맵 — 키는 **레지스트리 기준**이다.
 *
 * DB 에만 있고 코드에 없는 고아 행은 여기 들어오지 않는다(§3.4: 고아는 어떤
 * 판정에도 참여하지 않는다). 고아 목록은 어드민 콘솔이 `getOverrideRows()` 와
 * `FEATURE_IDS` 를 diff 해서 따로 보여준다.
 */
export const getPolicyMap = cache(async (): Promise<PolicyMap> => {
  const overrides = await getOverrideMap()
  const map: PolicyMap = {}
  for (const featureId of FEATURE_IDS) {
    map[featureId] = resolvePolicy(featureId, overrides)
  }
  return map
})

/** 단건 정책. 레지스트리에 없는 id 도 안전하게 해석된다(개방 + 경고). */
export const getPolicy = cache(
  async (featureId: string): Promise<FeaturePolicy> => {
    const overrides = await getOverrideMap()
    return resolvePolicy(featureId, overrides)
  }
)

/**
 * 오버라이드 행 전량 — **캐시를 거치지 않는 직접 조회.** 어드민 콘솔 전용.
 *
 * 방금 저장한 값이 안 보이면 운영이 불가능하다. 콘솔은 Data Cache 를 우회하고
 * 항상 DB 를 본다(`/admin/features` 는 `force-dynamic` 이어야 한다).
 * 고아 행 진단이 목적이므로 레지스트리로 거르지 않고 전량을 반환한다.
 */
export async function getOverrideRows(): Promise<FeaturePermissionRow[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('feature_permissions')
    .select(ROW_COLUMNS)
    .order('feature_id', { ascending: true })

  if (error) {
    if (error.code === UNDEFINED_TABLE) {
      console.warn('[permissions] feature_permissions 테이블 없음 — 오버라이드 0건으로 표시합니다.')
      return []
    }
    throw error
  }

  return Object.values(indexRows(data ?? []))
}

/**
 * 정책 캐시 무효화 — 어드민 저장/삭제 성공 **직후** 호출한다.
 *
 * 전 인스턴스가 즉시 무효화된다. 태그 무효화가 실패해도
 * `POLICY_CACHE_REVALIDATE_SEC`(5분) 백스톱이 있다. 단 psql·대시보드로 DB 를
 * 직접 고친 경우엔 이 함수가 호출되지 않으므로 최대 5분을 기다려야 한다.
 *
 * 두 번째 인자 `'max'`: Next 16 부터 `revalidateTag(tag)` 단독 호출은
 * deprecated 라 경고를 찍는다. `'max'` 가 옛 동작(=즉시 만료)에 대응한다.
 * `updateTag()` 는 Server Action 전용이라 Route Handler 에서 던진다 —
 * 어드민 저장이 라우트 핸들러이므로 여기서는 쓸 수 없다.
 */
export function invalidatePolicyCache(): void {
  revalidateTag(POLICY_CACHE_TAG, 'max')
}
