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

interface ResolveRangeOptions {
  /** 허용 일수 화이트리스트 (예: [30, 60, 74, 120]) */
  allowed: readonly number[]
  /** 화이트리스트 외/누락 시 적용할 기본 일수 */
  fallback: number
}

/**
 * `?range=<int>` 일수 파라미터를 화이트리스트로 정규화한다.
 *
 * - 정수 파싱 실패 / 누락 / 화이트리스트 외 값 → `fallback` 반환.
 * - 화이트리스트에 포함된 값만 그대로 통과.
 * - 보유 데이터로의 클램프(예: 120 요청인데 74일만 보유)는 호출부 책임
 *   (보유 일수에 의존하므로 헬퍼는 화이트리스트 검증까지만 담당).
 *
 * movers 라우트의 인라인 `parseInt + Math.min/max` 중복을 제거하는 SSOT.
 */
export function resolveRange(
  searchParams: URLSearchParams,
  { allowed, fallback }: ResolveRangeOptions
): number {
  const raw = searchParams.get('range')
  if (raw === null) return fallback
  const parsed = parseInt(raw, 10)
  if (Number.isNaN(parsed)) return fallback
  return allowed.includes(parsed) ? parsed : fallback
}

interface ClampIntParamOptions {
  fallback: number
  min: number
  max: number
}

/**
 * 정수 search param 을 `[min, max]` 로 클램프한다 (연속 범위, 화이트리스트 아님).
 *
 * 파싱 실패/누락 → `fallback`. movers 의 `limit`(1~100) 같은 연속 클램프 SSOT.
 * 이산 화이트리스트가 필요하면 `resolveRange` 를 사용한다.
 */
export function clampIntParam(
  searchParams: URLSearchParams,
  key: string,
  { fallback, min, max }: ClampIntParamOptions
): number {
  const parsed = parseInt(searchParams.get(key) || '', 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.max(min, Math.min(parsed, max))
}
