import { NextResponse } from 'next/server'
import type { ApiResponse, IndustryFilterResult } from '@/types'
import { getIndustryFilter } from '@/lib/industry'
import { validateIndustryId } from '@/lib/validate'
import { resolveRegion, type RegionFilter } from '@/lib/region'

type IndustryFilterSuccess = {
  filter: IndustryFilterResult | null
  region: RegionFilter
  errorResponse?: never
}

type IndustryFilterError = {
  filter?: never
  region?: never
  errorResponse: NextResponse<ApiResponse<never>>
}

/**
 * Resolve industry & region filters from search params.
 *
 * - 성공 시 `{ filter, region }`을 반환한다.
 *   - `filter` 가 `null` 이면 산업 미지정 (전 산업 대상).
 *   - `region` 은 항상 `'all' | 'kr' | 'global'` 중 하나 (default `'all'`).
 * - 검증 실패 시 `{ errorResponse }`로 즉시 반환할 NextResponse 를 반환한다.
 *
 * region 은 호출부에서 `applyRegionFilter` 또는 SQL `WHERE region = ?` 로 직교 합성한다.
 * `getIndustryFilter` 시그니처는 단일 책임 유지를 위해 변경하지 않는다.
 */
export async function resolveIndustryFilter(
  searchParams: URLSearchParams
): Promise<IndustryFilterSuccess | IndustryFilterError> {
  const region = resolveRegion(searchParams)
  const industryId = searchParams.get('industry')

  if (!industryId) {
    return { filter: null, region }
  }

  if (!validateIndustryId(industryId)) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Invalid industry ID' },
        { status: 400 }
      ),
    }
  }

  const filter = await getIndustryFilter(industryId)

  if (!filter) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Industry not found' },
        { status: 404 }
      ),
    }
  }

  return { filter, region }
}
