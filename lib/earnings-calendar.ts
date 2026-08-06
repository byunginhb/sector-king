/**
 * 실적발표(earnings) 캘린더 읽기 계층.
 *
 * 저장소가 매크로 지표와 다르다: 지표는 Supabase(economic_events, 런타임 어드민
 * CRUD 필요), 실적은 SQLite(earnings_calendar, update_data.py 가 이미 들고 있는
 * .info 에서 파생). `/api/economic-calendar` 가 두 소스를 머지해 한 응답으로 낸다.
 * 애널리스트 성적표(Supabase 리포트 + SQLite 주가)와 같은 크로스-스토어 패턴이다.
 *
 * 통화: 시총(market_cap)은 네이티브 통화라 importance 판정 **전에** toUsd 필수
 * (누락 시 KR 종목이 환율배만큼 부풀어 전부 '주요'로 승격된다).
 * 응답 DTO 자체에는 가격성 필드가 없다(제목·날짜·중요도뿐).
 */
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { toUsd } from '@/lib/currency'
import type { EconomicEvent, CalendarCountry, CalendarCountryValue } from '@/types'

/**
 * USD 시총 → 중요도. 종목 600여 개의 실적이 분기마다 3주에 몰리므로 등급이 없으면
 * 월 그리드(칸당 2건)가 알파벳순 잡음으로 채워진다.
 */
const HIGH_CAP_USD = 100_000_000_000 // $100B
const MEDIUM_CAP_USD = 10_000_000_000 // $10B

function importanceFromMarketCap(
  marketCapUsd: number | null
): EconomicEvent['importance'] {
  if (marketCapUsd === null) return 'low'
  if (marketCapUsd >= HIGH_CAP_USD) return 'high'
  if (marketCapUsd >= MEDIUM_CAP_USD) return 'medium'
  return 'low'
}

interface EarningsRow {
  ticker: string
  name: string
  nameKo: string | null
  region: string
  earningsDate: string
  earningsTime: string | null
  isEstimate: number
  marketCap: number | null
}

/**
 * range 안의 실적발표를 EconomicEvent DTO 로 반환한다.
 *
 * - country: companies.region('KR'|'INTL') → 캘린더 축('KR'|'US').
 * - sourceUrl: 종목 상세로 가는 **내부 경로**(EventPill 이 상대경로를 Link 로 렌더).
 * - 유령 추정일 제거: Yahoo 추정일이 옮겨가면 옛 행이 남는다. 살아있는 추정일은
 *   매 수집마다 재-upsert 되므로, 해당 티커의 최신 updated_at 보다 오래된
 *   is_estimate=1 행은 이미 취소된 일정으로 보고 버린다(확정 행은 과거 이력이라 유지).
 * - 테이블 부재(배포~CI 첫 수집 사이 창)는 빈 배열로 흡수 — 지표까지 죽이지 않는다.
 */
export async function getEarningsEvents({
  from,
  to,
  country,
}: {
  from: string
  to: string
  country: CalendarCountry
}): Promise<EconomicEvent[]> {
  try {
    const db = getDb()

    const [latestDateRow] = await db.all<{ date: string }>(
      sql`SELECT date FROM daily_snapshots ORDER BY date DESC LIMIT 1`
    )
    const latestDate = latestDateRow?.date ?? null

    // region 은 DB 컬럼('KR'|'INTL')과 1:1 — 캘린더 country 필터를 SQL 로 내린다.
    const regionValue =
      country === 'kr' ? 'KR' : country === 'us' ? 'INTL' : null

    const rows = await db.all<EarningsRow>(sql`
      SELECT
        e.ticker           AS ticker,
        c.name             AS name,
        c.name_ko          AS nameKo,
        c.region           AS region,
        e.earnings_date    AS earningsDate,
        e.earnings_time    AS earningsTime,
        e.is_estimate      AS isEstimate,
        s.market_cap       AS marketCap
      FROM earnings_calendar e
      JOIN companies c ON c.ticker = e.ticker
      LEFT JOIN daily_snapshots s
        ON s.ticker = e.ticker AND s.date = ${latestDate}
      WHERE e.earnings_date >= ${from}
        AND e.earnings_date <= ${to}
        ${regionValue ? sql`AND c.region = ${regionValue}` : sql``}
        AND NOT (
          e.is_estimate = 1
          AND e.updated_at < (
            SELECT MAX(e2.updated_at) FROM earnings_calendar e2 WHERE e2.ticker = e.ticker
          )
        )
    `)

    return rows.map((row) => {
      const countryValue: CalendarCountryValue = row.region === 'KR' ? 'KR' : 'US'
      const label = row.nameKo || row.name
      // 시총은 네이티브 통화 → 등급 비교 전에 USD 로 정규화.
      const marketCapUsd =
        row.marketCap === null ? null : toUsd(row.marketCap, row.ticker)

      return {
        id: `earnings:${row.ticker}:${row.earningsDate}`,
        country: countryValue,
        category: 'earnings',
        title: `${label} 실적발표${row.isEstimate ? ' (잠정)' : ''}`,
        titleEn: row.name,
        dateKst: row.earningsDate,
        time: row.earningsTime,
        importance: importanceFromMarketCap(marketCapUsd),
        actual: null,
        forecast: null,
        previous: null,
        unit: null,
        source: 'yahoo',
        sourceUrl: `/stock/${encodeURIComponent(row.ticker)}`,
      } satisfies EconomicEvent
    })
  } catch (error) {
    // 첫 CI 수집 전에는 테이블이 없다(no such table) — 지표만으로 캘린더는 살아야 한다.
    console.error('[getEarningsEvents] 실적 일정 조회 실패:', error)
    return []
  }
}
