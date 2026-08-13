/**
 * GET /api/economic-calendar — 공개 경제 캘린더 조회 (anon 가능)
 *
 * 쿼리:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD   (누락/오류 시 금주 폴백, to-from>62일 클램프)
 *   ?country=all|kr|us                   (기본 all)
 *   ?category=all|indicator|ipo|earnings (기본 all)
 *
 * 저장소가 카테고리마다 다르다 — 크로스-스토어 머지:
 *   indicator = Supabase economic_events (런타임 어드민 CRUD 필요)
 *   ipo       = SQLite ipo_calendar      (scripts/ipo_calendar.py 수집, lib/ipo-calendar)
 *   earnings  = SQLite earnings_calendar (update_data.py 수집, lib/earnings-calendar)
 * 방어심층: RLS 공개정책이 is_hidden=false 를 이미 강제하지만 앱에서도 명시.
 * 값(actual/forecast/previous)은 문자열 원문 → toUsd 불요.
 * (실적 쪽 시총→중요도 환산은 lib/earnings-calendar 에서 toUsd 후 판정)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  resolveCountry,
  resolveCategory,
  resolveRange,
  countryFilterToValue,
  categoryFilterToValue,
  compareEvents,
} from '@/lib/econ-calendar'
import { getEarningsEvents } from '@/lib/earnings-calendar'
import { getIpoEvents } from '@/lib/ipo-calendar'
import type {
  ApiResponse,
  EconomicCalendarResponse,
  EconomicEvent,
} from '@/types'

// actual 값은 발표 후 채워지므로 스냅샷(3600)보다 짧게.
export const revalidate = 1800

const SELECT_COLUMNS =
  'id, country, category, title, title_en, event_date, event_time, importance, actual, forecast, previous, unit, source, source_url'

/** Supabase row → API DTO (snake→camel, dateKst/time 서버 파생). */
function rowToDto(row: {
  id: number | string
  country: EconomicEvent['country']
  category: EconomicEvent['category']
  title: string
  title_en: string | null
  event_date: string
  event_time: string | null
  importance: EconomicEvent['importance']
  actual: string | null
  forecast: string | null
  previous: string | null
  unit: string | null
  source: string | null
  source_url: string | null
}): EconomicEvent {
  return {
    id: String(row.id),
    country: row.country,
    category: row.category,
    title: row.title,
    titleEn: row.title_en ?? null,
    dateKst: String(row.event_date).slice(0, 10),
    time: row.event_time ? String(row.event_time).slice(0, 5) : null,
    importance: row.importance,
    actual: row.actual ?? null,
    forecast: row.forecast ?? null,
    previous: row.previous ?? null,
    unit: row.unit ?? null,
    source: row.source ?? null,
    sourceUrl: row.source_url ?? null,
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<EconomicCalendarResponse>>> {
  try {
    const sp = request.nextUrl.searchParams
    const country = resolveCountry(sp)
    const category = resolveCategory(sp)
    const { from, to, clamped } = resolveRange(sp)

    const countryValue = countryFilterToValue(country) // null=미적용
    const categoryValue = categoryFilterToValue(category) // null=미적용

    // 카테고리 필터는 소스 선택으로 내려간다 — 안 보여줄 소스는 아예 조회하지 않는다.
    const wantsIndicators = category === 'all' || category === 'indicator'
    const wantsIpo = category === 'all' || category === 'ipo'
    const wantsEarnings = category === 'all' || category === 'earnings'

    const [indicatorResult, ipo, earnings] = await Promise.all([
      wantsIndicators
        ? (async () => {
            const supabase = await createClient()
            let query = supabase
              .from('economic_events')
              .select(SELECT_COLUMNS)
              .gte('event_date', from)
              .lte('event_date', to)
              .eq('is_hidden', false) // RLS + 앱 이중 방어

            if (countryValue) query = query.eq('country', countryValue)
            if (categoryValue) query = query.eq('category', categoryValue)

            return query
          })()
        : Promise.resolve({ data: [], error: null }),
      wantsIpo
        ? getIpoEvents({ from, to, country })
        : Promise.resolve([] as EconomicEvent[]),
      wantsEarnings
        ? getEarningsEvents({ from, to, country })
        : Promise.resolve([] as EconomicEvent[]),
    ])

    const { data, error } = indicatorResult

    if (error) {
      console.error('[GET /api/economic-calendar] supabase error:', error.message)
      return NextResponse.json(
        { success: false, error: '경제 캘린더 데이터를 불러오지 못했습니다.' },
        { status: 500 }
      )
    }

    const indicators = (data ?? []).map((row) =>
      rowToDto(row as Parameters<typeof rowToDto>[0])
    )
    // 세 소스를 합친 뒤 한 번에 정렬 — DB order 로는 크로스-스토어 순서를 못 만든다.
    const events = [...indicators, ...ipo, ...earnings].sort(compareEvents)

    return NextResponse.json({
      success: true,
      data: {
        events, // flat, 정렬됨 — 데이터 없음/범위밖이면 []
        range: { from, to },
        appliedCountry: country,
        appliedCategory: category,
        clamped,
      },
    })
  } catch (error) {
    console.error('[GET /api/economic-calendar] 실패:', error)
    return NextResponse.json(
      { success: false, error: '경제 캘린더 데이터를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
