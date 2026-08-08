import 'server-only'
import { cache } from 'react'
import { desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  companies,
  dailySnapshots,
  industries,
  industryCategories,
  sectorCompanies,
  sectors,
} from '@/drizzle/schema'
import { toUsd } from '@/lib/currency'

/**
 * 초기 HTML(= JS 를 실행하지 않는 크롤러·답변 엔진이 보는 화면)에 실을 데이터 스냅샷.
 *
 * 왜 별도 모듈인가: 대시보드·랭킹·지도는 전부 `useRegion()` → `useSearchParams()` 를 쓰는
 * 클라이언트 트리라, 정적 프리렌더 중 Next 가 가장 가까운 <Suspense> 경계를 CSR 로 떨어뜨린다.
 * 그 결과 `fallback={null}` 이던 홈·산업·랭킹·시장규모의 초기 HTML 에는 푸터밖에 없었다.
 * 여기서 만든 값을 그 fallback 자리에 서버 렌더링해서, JS 없이도 페이지가 무엇을 말하는지
 * 읽히게 한다. 하이드레이션 후에는 기존 인터랙티브 화면이 그 자리를 대체한다.
 *
 * 통화 규칙: 시가총액은 반드시 `toUsd(value, ticker)` 로 변환한 뒤 합산한다.
 *
 * 산업 간 합계는 내지 않는다 — industry_categories 는 M:N 이라 한 종목이 여러 산업에
 * 잡히고, 합치면 실제 추적 시총의 2배 가까이 부풀려진다(시총 지도가 같은 이유로 배분한다).
 */

const CHANGE_WINDOW = 14

export interface SnapshotDates {
  latest: string | null
  /** 비교 기준일 (최신에서 최대 CHANGE_WINDOW 거래일 이전). */
  base: string | null
}

export interface IndustrySnapshotRow {
  id: string
  name: string
  description: string | null
  sectorCount: number
  companyCount: number
  marketCapUsd: number
  changePct: number | null
}

export interface SectorSnapshotRow {
  id: string
  name: string
  companyCount: number
  marketCapUsd: number
  changePct: number | null
  topCompanies: { ticker: string; name: string }[]
}

/** ticker → 최신/기준일 USD 시총. 두 날짜만 읽으므로 전체 스캔보다 훨씬 싸다. */
type CapIndex = Map<string, { latest: number; base: number | null }>

interface SnapshotBase {
  dates: SnapshotDates
  caps: CapIndex
}

const loadBase = cache(async (): Promise<SnapshotBase> => {
  const db = getDb()

  const dateRows = await db
    .selectDistinct({ date: dailySnapshots.date })
    .from(dailySnapshots)
    .orderBy(desc(dailySnapshots.date))
    .limit(CHANGE_WINDOW + 1)

  const dates = dateRows.map((r) => r.date).filter((d): d is string => !!d)
  const latest = dates[0] ?? null
  // 거래일이 CHANGE_WINDOW 만큼 안 쌓였으면 가장 오래된 날을 기준일로 쓴다.
  const base = latest ? (dates[dates.length - 1] ?? null) : null

  const caps: CapIndex = new Map()
  if (!latest) return { dates: { latest, base }, caps }

  const wanted = base && base !== latest ? [latest, base] : [latest]
  const rows = await db
    .select({
      ticker: dailySnapshots.ticker,
      date: dailySnapshots.date,
      marketCap: dailySnapshots.marketCap,
    })
    .from(dailySnapshots)
    .where(inArray(dailySnapshots.date, wanted))

  for (const row of rows) {
    if (!row.ticker || !row.date) continue
    const usd = toUsd(row.marketCap ?? 0, row.ticker)
    const entry = caps.get(row.ticker) ?? { latest: 0, base: null }
    if (row.date === latest) entry.latest = usd
    else entry.base = usd
    caps.set(row.ticker, entry)
  }

  return { dates: { latest, base: base === latest ? null : base }, caps }
})

/** 티커 집합의 USD 시총 합과 기간 변화율. 양쪽 날짜에 다 있는 종목만 변화율 분모에 넣는다. */
function aggregate(
  tickers: Iterable<string>,
  caps: CapIndex
): { marketCapUsd: number; changePct: number | null } {
  let total = 0
  let pairedLatest = 0
  let pairedBase = 0

  for (const ticker of tickers) {
    const entry = caps.get(ticker)
    if (!entry) continue
    total += entry.latest
    if (entry.base !== null && entry.base > 0) {
      pairedLatest += entry.latest
      pairedBase += entry.base
    }
  }

  return {
    marketCapUsd: total,
    changePct: pairedBase > 0 ? ((pairedLatest - pairedBase) / pairedBase) * 100 : null,
  }
}

export const getSnapshotDates = cache(async (): Promise<SnapshotDates> => {
  const { dates } = await loadBase()
  return dates
})

/** 홈 초기 HTML 용 — 산업 9개의 섹터 수·종목 수·시총·기간 변화율. */
export const getIndustrySnapshot = cache(async (): Promise<IndustrySnapshotRow[]> => {
  const db = getDb()
  const { caps } = await loadBase()

  const [allIndustries, allIC, allSectors, allSC] = await Promise.all([
    db.select().from(industries).orderBy(industries.order),
    db
      .select({
        industryId: industryCategories.industryId,
        categoryId: industryCategories.categoryId,
      })
      .from(industryCategories),
    db.select({ id: sectors.id, categoryId: sectors.categoryId }).from(sectors),
    db
      .select({ sectorId: sectorCompanies.sectorId, ticker: sectorCompanies.ticker })
      .from(sectorCompanies),
  ])

  const sectorsByCategory = new Map<string, string[]>()
  for (const s of allSectors) {
    if (!s.categoryId) continue
    const list = sectorsByCategory.get(s.categoryId) ?? []
    list.push(s.id)
    sectorsByCategory.set(s.categoryId, list)
  }

  const tickersBySector = new Map<string, string[]>()
  for (const sc of allSC) {
    if (!sc.sectorId || !sc.ticker) continue
    const list = tickersBySector.get(sc.sectorId) ?? []
    list.push(sc.ticker)
    tickersBySector.set(sc.sectorId, list)
  }

  const categoriesByIndustry = new Map<string, string[]>()
  for (const ic of allIC) {
    if (!ic.industryId || !ic.categoryId) continue
    const list = categoriesByIndustry.get(ic.industryId) ?? []
    list.push(ic.categoryId)
    categoriesByIndustry.set(ic.industryId, list)
  }

  return allIndustries.map((industry) => {
    const sectorIds = new Set<string>()
    for (const categoryId of categoriesByIndustry.get(industry.id) ?? []) {
      for (const sectorId of sectorsByCategory.get(categoryId) ?? []) sectorIds.add(sectorId)
    }

    const tickers = new Set<string>()
    for (const sectorId of sectorIds) {
      for (const ticker of tickersBySector.get(sectorId) ?? []) tickers.add(ticker)
    }

    return {
      id: industry.id,
      name: industry.name,
      description: industry.description,
      sectorCount: sectorIds.size,
      companyCount: tickers.size,
      ...aggregate(tickers, caps),
    }
  })
})

/** 산업 상세 초기 HTML 용 — 해당 산업의 섹터별 시총·변화율·대표 종목(상위 3). */
export const getSectorSnapshot = cache(
  async (industryId: string): Promise<SectorSnapshotRow[]> => {
    const db = getDb()
    const { caps } = await loadBase()

    const icRows = await db
      .select({ categoryId: industryCategories.categoryId })
      .from(industryCategories)
      .where(eq(industryCategories.industryId, industryId))

    const categoryIds = icRows
      .map((r) => r.categoryId)
      .filter((id): id is string => id !== null)
    if (categoryIds.length === 0) return []

    const sectorRows = await db
      .select({ id: sectors.id, name: sectors.name })
      .from(sectors)
      .where(inArray(sectors.categoryId, categoryIds))
    if (sectorRows.length === 0) return []

    const scRows = await db
      .select({
        sectorId: sectorCompanies.sectorId,
        ticker: sectorCompanies.ticker,
        name: companies.name,
        nameKo: companies.nameKo,
      })
      .from(sectorCompanies)
      .innerJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
      .where(
        inArray(
          sectorCompanies.sectorId,
          sectorRows.map((s) => s.id)
        )
      )

    const bySector = new Map<string, { ticker: string; name: string }[]>()
    for (const row of scRows) {
      if (!row.sectorId || !row.ticker) continue
      const list = bySector.get(row.sectorId) ?? []
      list.push({ ticker: row.ticker, name: row.nameKo || row.name })
      bySector.set(row.sectorId, list)
    }

    return sectorRows
      .map((sector) => {
        const members = bySector.get(sector.id) ?? []
        const topCompanies = [...members]
          .sort((a, b) => (caps.get(b.ticker)?.latest ?? 0) - (caps.get(a.ticker)?.latest ?? 0))
          .slice(0, 3)

        return {
          id: sector.id,
          name: sector.name,
          companyCount: members.length,
          topCompanies,
          ...aggregate(
            members.map((m) => m.ticker),
            caps
          ),
        }
      })
      .sort((a, b) => b.marketCapUsd - a.marketCapUsd)
  }
)
