import { NextResponse } from 'next/server'
import type { ApiResponse, IndustryFilterResult } from '@/types'
import { getIndustryFilter } from '@/lib/industry'
import { validateIndustryId } from '@/lib/validate'

type IndustryFilterSuccess = {
  filter: IndustryFilterResult | null
  errorResponse?: never
}

type IndustryFilterError = {
  filter?: never
  errorResponse: NextResponse<ApiResponse<never>>
}

/**
 * Resolve industry filter from search params.
 * Returns `{ filter }` on success (null if no industry param),
 * or `{ errorResponse }` with a ready-to-return NextResponse on validation failure.
 */
export async function resolveIndustryFilter(
  searchParams: URLSearchParams
): Promise<IndustryFilterSuccess | IndustryFilterError> {
  const industryId = searchParams.get('industry')

  if (!industryId) {
    return { filter: null }
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

  return { filter }
}
