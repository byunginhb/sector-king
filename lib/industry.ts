import { getDb } from '@/lib/db'
import {
  industries,
  industryCategories,
  sectors,
  sectorCompanies,
} from '@/drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import type { IndustryFilterResult, Industry } from '@/types'

export async function getIndustryFilter(
  industryId: string
): Promise<IndustryFilterResult | null> {
  const db = getDb()

  // 1. Verify industry exists
  const industry = await db
    .select({ id: industries.id })
    .from(industries)
    .where(eq(industries.id, industryId))
    .limit(1)

  if (industry.length === 0) return null

  // 2. Get categoryIds for this industry
  const icRows = await db
    .select({ categoryId: industryCategories.categoryId })
    .from(industryCategories)
    .where(eq(industryCategories.industryId, industryId))

  const categoryIds = icRows
    .map((r) => r.categoryId)
    .filter((id): id is string => id !== null)

  if (categoryIds.length === 0) {
    return { categoryIds: [], sectorIds: [], tickers: [] }
  }

  // 3. Get sectorIds for those categories
  const sectorRows = await db
    .select({ id: sectors.id })
    .from(sectors)
    .where(inArray(sectors.categoryId, categoryIds))

  const sectorIds = sectorRows.map((r) => r.id)

  if (sectorIds.length === 0) {
    return { categoryIds, sectorIds: [], tickers: [] }
  }

  // 4. Get tickers for those sectors
  const scRows = await db
    .select({ ticker: sectorCompanies.ticker })
    .from(sectorCompanies)
    .where(inArray(sectorCompanies.sectorId, sectorIds))

  const tickerSet = new Set<string>()
  for (const row of scRows) {
    if (row.ticker) tickerSet.add(row.ticker)
  }

  return {
    categoryIds,
    sectorIds,
    tickers: Array.from(tickerSet),
  }
}

export async function getAllIndustries(): Promise<Industry[]> {
  const db = getDb()
  return db.select().from(industries).orderBy(industries.order)
}
