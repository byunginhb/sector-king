import { NextResponse } from 'next/server'
import { getMarketIndices, type MarketIndexItem } from '@/lib/indices-server'
import type { ApiResponse } from '@/types'

export const revalidate = 3600

export type { MarketIndexItem }

export interface IndicesResponse {
  items: MarketIndexItem[]
}

export async function GET(): Promise<NextResponse<ApiResponse<IndicesResponse>>> {
  try {
    const items = await getMarketIndices()
    return NextResponse.json({ success: true, data: { items } })
  } catch (error) {
    console.error('Indices API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indices' },
      { status: 500 }
    )
  }
}
