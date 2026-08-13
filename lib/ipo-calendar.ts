/**
 * 공모주(IPO) 캘린더 읽기 계층.
 *
 * 저장소는 실적발표와 같은 SQLite(`ipo_calendar`, scripts/ipo_calendar.py 가 수집).
 * 경제지표만 어드민 CRUD 때문에 Supabase 에 있고, `/api/economic-calendar` 가
 * 세 소스를 머지해 한 응답으로 낸다.
 *
 * 통화: 공모가는 **원화 표시용 원문 문자열**('23,000')이라 toUsd 대상이 아니다.
 * economic_events 의 actual/forecast 와 같은 규약(숫자 필드가 아니라 라벨).
 * 수집이 KR 전용이므로 country='us' 필터에서는 아예 조회하지 않는다.
 */
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import type { EconomicEvent, CalendarCountry } from '@/types'

interface IpoRow {
  name: string
  eventType: string
  eventDate: string
  endDate: string | null
  offerPrice: string | null
  priceBand: string | null
  detailUrl: string | null
}

/**
 * 스팩(기업인수목적회사)은 공모가가 2,000원으로 고정된 껍데기 법인이라 개별
 * 사업 뉴스가 없다. KR 공모 건수의 상당수를 차지하므로 등급을 낮춰 월 그리드
 * (칸당 2건)에서 실제 사업회사 IPO 를 밀어내지 않게 한다.
 */
const SPAC_RE = /스팩|기업인수목적/

/** 'YYYY-MM-DD' → 'M.D' (청약 종료일 꼬리표용). */
function shortDate(ymd: string): string {
  const [, m, d] = ymd.split('-')
  return `${Number(m)}.${Number(d)}`
}

function toEvent(row: IpoRow): EconomicEvent {
  const isSubscription = row.eventType === 'subscription'
  // 청약은 보통 이틀이지만 캘린더에는 시작일 한 칸에만 놓는다(같은 건이 두 칸을
  // 차지하면 이미 빡빡한 월 그리드가 두 배로 밀린다). 대신 마감일을 제목에 단다.
  const tail =
    isSubscription && row.endDate && row.endDate !== row.eventDate
      ? ` (~${shortDate(row.endDate)})`
      : ''

  return {
    id: `ipo:${row.eventType}:${row.name}:${row.eventDate}`,
    country: 'KR',
    category: 'ipo',
    title: `${row.name} ${isSubscription ? '공모청약' : '신규상장'}${tail}`,
    titleEn: null,
    dateKst: row.eventDate,
    time: null, // 청약/상장은 종일 이벤트
    importance: SPAC_RE.test(row.name) ? 'low' : 'medium',
    // 확정공모가=실제, 희망공모가 밴드=예상. 확정가가 밴드 하단을 넘겼는지가
    // EventPill 의 방향 색으로 그대로 드러난다(둘 다 천 단위 콤마 표기라 비교 성립).
    actual: row.offerPrice,
    forecast: isSubscription ? row.priceBand : null,
    previous: null,
    unit: '원',
    source: '38커뮤니케이션',
    sourceUrl: row.detailUrl,
  }
}

/** range 안의 공모 청약·상장 일정을 EconomicEvent DTO 로 반환한다. */
export async function getIpoEvents({
  from,
  to,
  country,
}: {
  from: string
  to: string
  country: CalendarCountry
}): Promise<EconomicEvent[]> {
  if (country === 'us') return [] // 수집 범위가 KR 전용

  try {
    const db = getDb()
    const rows = await db.all<IpoRow>(sql`
      SELECT
        name         AS name,
        event_type   AS eventType,
        event_date   AS eventDate,
        end_date     AS endDate,
        offer_price  AS offerPrice,
        price_band   AS priceBand,
        detail_url   AS detailUrl
      FROM ipo_calendar
      WHERE event_date >= ${from} AND event_date <= ${to}
    `)
    return rows.map(toEvent)
  } catch (error) {
    // 배포~CI 첫 수집 사이에는 테이블이 없다(no such table) — 지표·실적은 살아야 한다.
    console.error('[getIpoEvents] 공모주 일정 조회 실패:', error)
    return []
  }
}

/** 테스트용 export (행→DTO 순수 변환). */
export const __test = { toEvent, shortDate }
