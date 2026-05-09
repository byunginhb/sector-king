import type { RegionFilter } from '@/lib/region'

const INDUSTRY_ID_PATTERN = /^[a-z0-9_-]+$/

export function validateIndustryId(industryId: string): boolean {
  return industryId.length <= 50 && INDUSTRY_ID_PATTERN.test(industryId)
}

const REGION_VALUES: readonly RegionFilter[] = ['all', 'kr', 'global'] as const

/**
 * 화이트리스트 기반 region 검증. URL 쿼리/외부 입력에 사용.
 * `resolveRegion` 은 관대 파싱이므로 strict 검증이 필요할 때만 사용.
 */
export function validateRegion(value: string): value is RegionFilter {
  return (REGION_VALUES as readonly string[]).includes(value)
}
