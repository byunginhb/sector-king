/**
 * GET /api/economic-calendar — 공개 경제 캘린더 조회 (anon 가능)
 *
 * 쿼리:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD   (누락/오류 시 금주 폴백, to-from>62일 클램프)
 *   ?country=all|kr|us               (기본 all)
 *   ?category=all|indicator|earnings|event (기본 all, MVP 는 indicator 만 데이터)
 *
 * 저장소: Supabase(뉴스와 동일 `createClient()` anon read).
 * 방어심층: RLS 공개정책이 is_hidden=false 를 이미 강제하지만 앱에서도 명시.
 * 값(actual/forecast/previous)은 문자열 원문 → toUsd 불요.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  resolveCountry,
  resolveCategory,
  resolveRange,
  countryFilterToValue,
  categoryFilterToValue,
} from '@/lib/econ-calendar'
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

    const supabase = await createClient()

    let query = supabase
      .from('economic_events')
      .select(SELECT_COLUMNS)
      .gte('event_date', from)
      .lte('event_date', to)
      .eq('is_hidden', false) // RLS + 앱 이중 방어

    if (countryValue) query = query.eq('country', countryValue)
    if (categoryValue) query = query.eq('category', categoryValue)

    // 날짜 → 시각(종일=null 은 마지막) 오름차순.
    const { data, error } = await query
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('[GET /api/economic-calendar] supabase error:', error.message)
      return NextResponse.json(
        { success: false, error: '경제 캘린더 데이터를 불러오지 못했습니다.' },
        { status: 500 }
      )
    }

    const events = (data ?? []).map((row) =>
      rowToDto(row as Parameters<typeof rowToDto>[0])
    )

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
