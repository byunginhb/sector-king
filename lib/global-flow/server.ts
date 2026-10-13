import 'server-only'
import { cache } from 'react'
import { asc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { globalAssetHistory, macroSeries } from '@/drizzle/schema'
import { buildGlobalFlow, type GlobalFlowPayload } from './compute'
import type { Pt } from './series'

function group<T>(rows: T[], key: (r: T) => string, pt: (r: T) => Pt): Map<string, Pt[]> {
  const out = new Map<string, Pt[]>()
  for (const r of rows) {
    const k = key(r)
    const list = out.get(k)
    if (list) list.push(pt(r))
    else out.set(k, [pt(r)])
  }
  return out
}

/**
 * 글로벌 자금 지도 payload — 페이지(SSR)·API 가 공유한다. 4개 기간을 한 번에 계산해
 * 기간 토글이 네트워크 왕복 없이 바뀌게 한다(전체 ~20k행, 계산 수 ms).
 *
 * 배포~CI 첫 수집 사이에는 테이블이 없다(no such table) → null 을 돌려 페이지가 안내 문구를 띄운다.
 */
export const getGlobalFlow = cache(async (): Promise<GlobalFlowPayload | null> => {
  try {
    const db = getDb()
    const [prices, macro] = await Promise.all([
      db
        .select()
        .from(globalAssetHistory)
        .orderBy(asc(globalAssetHistory.symbol), asc(globalAssetHistory.date)),
      db.select().from(macroSeries).orderBy(asc(macroSeries.seriesId), asc(macroSeries.date)),
    ])
    return buildGlobalFlow({
      prices: group(
        prices,
        (r) => r.symbol,
        (r) => ({ date: r.date, value: r.close }),
      ),
      macro: group(
        macro,
        (r) => r.seriesId,
        (r) => ({ date: r.date, value: r.value }),
      ),
    })
  } catch (error) {
    console.error('[global-flow] 조회 실패:', error)
    return null
  }
})
