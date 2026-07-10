/**
 * FRED(Federal Reserve Economic Data) 경제지표 발표일정 수집 — 순수 로직 SoT.
 *
 * FRED `releases/dates` 엔드포인트는 미국 연방 통계 릴리스의 발표"일"만 제공하고
 * 발표 "시각"은 주지 않는다(스키마: release_id / release_name / date).
 * 매크로 지표의 발표 시각은 사실상 고정(대부분 08:30 ET)이므로
 * `FRED_RELEASE_MAP` 에 릴리스별 표준 발표 시각(ET)을 상수로 매핑한 뒤
 * ET 벽시계 → Asia/Seoul(KST) 로 DST-aware 변환하여 이벤트를 구성한다.
 *
 * 원칙(플랜 §4 Phase B):
 *  - 자동수집 대상은 US 연방 퍼블릭 도메인 릴리스만(CPI/PPI/고용/GDP/PCE/소매판매).
 *  - ISM/FOMC 등 민간·특례 이벤트는 매핑에서 제외 → 관리자 수동 시드.
 *  - 매핑에 없는 release_id 는 스킵(노이즈 배제).
 *  - 멱등 키: external_id = 'fred:{release_id}:{etDate}'.
 *  - 값(actual/forecast/previous/unit)은 MVP 에서 null(발표일 안내가 목적).
 *
 * fetch(네트워크) 는 `fetchFredReleaseDates` 하나에만 격리하고,
 * 나머지 변환/매핑 로직은 순수함수로 분리해 테스트 가능하게 둔다.
 */

/** 자동수집 이벤트 중요도 (economic_events.importance 컬럼 값) */
export type FredImportance = 'high' | 'medium' | 'low'

/** 릴리스 매핑 엔트리 — release_id → 표시 메타 + 표준 발표시각(ET) */
export interface FredReleaseMapEntry {
  /** 한국어 표시명 (economic_events.title) */
  titleKo: string
  /** 영어 표시명 (economic_events.title_en) */
  titleEn: string
  /** 중요도 */
  importance: FredImportance
  /** 표준 발표 시각 'HH:MM' (America/New_York 로컬, 24h) */
  etTime: string
  /** FRED release_name 기대값 — 실호출 시 매핑 검증용(sanity) */
  fredName: string
}

/**
 * 주요 US 매크로 릴리스 매핑.
 *
 * key = FRED release_id(안정적 정수 식별자).
 * 표준 발표 시각은 모두 08:30 ET(BLS/BEA/Census 관행).
 * ISM(민간)·FOMC(특례 시각)는 의도적으로 제외 → 수동 시드.
 *
 * 주: release_id 는 FRED 에서 안정적으로 유지되는 값이나,
 * 최초 실호출 시 fredName 과 응답 release_name 을 대조해
 * 매핑 정합성을 로그로 확인할 것(`assertReleaseNameMatch`).
 */
export const FRED_RELEASE_MAP: Record<number, FredReleaseMapEntry> = {
  10: {
    titleKo: '미국 소비자물가지수(CPI)',
    titleEn: 'Consumer Price Index',
    importance: 'high',
    etTime: '08:30',
    fredName: 'Consumer Price Index',
  },
  46: {
    titleKo: '미국 생산자물가지수(PPI)',
    titleEn: 'Producer Price Index',
    importance: 'medium',
    etTime: '08:30',
    fredName: 'Producer Price Index',
  },
  50: {
    titleKo: '미국 고용보고서(비농업 고용/NFP)',
    titleEn: 'Employment Situation',
    importance: 'high',
    etTime: '08:30',
    fredName: 'Employment Situation',
  },
  53: {
    titleKo: '미국 국내총생산(GDP)',
    titleEn: 'Gross Domestic Product',
    importance: 'high',
    etTime: '08:30',
    fredName: 'Gross Domestic Product',
  },
  54: {
    titleKo: '미국 개인소비지출(PCE)',
    titleEn: 'Personal Income and Outlays',
    importance: 'high',
    etTime: '08:30',
    fredName: 'Personal Income and Outlays',
  },
  8: {
    titleKo: '미국 소매판매',
    titleEn: 'Advance Monthly Sales for Retail and Food Services',
    importance: 'medium',
    etTime: '08:30',
    fredName: 'Advance Monthly Sales for Retail and Food Services',
  },
}

/** FRED `releases/dates` 응답의 개별 발표일 항목 */
export interface FredReleaseDate {
  release_id: number
  release_name: string
  /** 'YYYY-MM-DD' (릴리스 소스가 공지한 발표일, ET 로컬 날짜) */
  date: string
}

/** economic_events 로 upsert 할 스냅샷 행(snake_case, service_role upsert 용) */
export interface EconomicEventUpsertRow {
  source: 'fred'
  external_id: string
  country: 'US'
  category: 'indicator'
  importance: FredImportance
  title: string
  title_en: string
  /** 'YYYY-MM-DD' (KST) */
  event_date: string
  /** 'HH:MM' (KST) */
  event_time: string
  actual: null
  forecast: null
  previous: null
  unit: null
  /** FRED 릴리스 페이지 URL — 이벤트 항목 클릭 시 출처로 이동 */
  source_url: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// 시간대 변환 (DST-aware, 외부 의존성 없음 — Intl API 사용)
// ---------------------------------------------------------------------------

/**
 * 특정 UTC instant 에서 timeZone 의 UTC 오프셋(ms) 을 구한다.
 * (해당 존의 벽시계를 UTC 로 해석한 값 − 실제 instant)
 */
function getZoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  )
  return asUtc - instant.getTime()
}

/**
 * America/New_York 벽시계(etDate + etTime) → Asia/Seoul(KST) 날짜·시각으로 변환.
 *
 * ET 는 DST(EST/EDT) 로 UTC 오프셋이 계절마다 −5/−4 로 바뀌므로 고정 오프셋을
 * 하드코딩하지 않고 tz-aware 로 계산한다. KST 는 고정 +09:00 이나 동일 방식으로
 * Intl 변환해 일자 롤오버(예: 14:00 ET → 익일 KST)까지 정확히 처리한다.
 *
 * @returns eventDate 'YYYY-MM-DD'(KST), eventTime 'HH:MM'(KST)
 */
export function etWallClockToKst(
  etDate: string,
  etTime: string
): { eventDate: string; eventTime: string } {
  const [y, m, d] = etDate.split('-').map(Number)
  const [hh, mm] = etTime.split(':').map(Number)

  if (
    ![y, m, d, hh, mm].every((n) => Number.isFinite(n)) ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    throw new Error(`잘못된 ET 일시: date=${etDate} time=${etTime}`)
  }

  // 1) ET 벽시계를 임시로 UTC 로 해석
  const naiveUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0)
  // 2) 그 시점의 America/New_York 오프셋을 구해 실제 UTC instant 산출
  const nyOffsetMs = getZoneOffsetMs(new Date(naiveUtcMs), 'America/New_York')
  const realUtcMs = naiveUtcMs - nyOffsetMs

  // 3) 실제 instant 를 Asia/Seoul 벽시계로 표기
  const seoul: Record<string, string> = {}
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  for (const part of dtf.formatToParts(new Date(realUtcMs))) {
    if (part.type !== 'literal') seoul[part.type] = part.value
  }

  return {
    eventDate: `${seoul.year}-${seoul.month}-${seoul.day}`,
    eventTime: `${seoul.hour}:${seoul.minute}`,
  }
}

// ---------------------------------------------------------------------------
// 매핑 (순수)
// ---------------------------------------------------------------------------

/**
 * FRED 발표일 배열 → economic_events upsert 행 배열(순수).
 * 매핑(FRED_RELEASE_MAP)에 없는 release_id 는 스킵.
 *
 * @param releaseDates FRED `releases/dates` 응답 항목들
 * @param nowIso updated_at 로 찍을 ISO 문자열(테스트 결정성 위해 주입)
 * @param map 릴리스 매핑(기본 FRED_RELEASE_MAP)
 */
export function mapReleaseDatesToEvents(
  releaseDates: FredReleaseDate[],
  nowIso: string,
  map: Record<number, FredReleaseMapEntry> = FRED_RELEASE_MAP
): EconomicEventUpsertRow[] {
  const rows: EconomicEventUpsertRow[] = []
  const seen = new Set<string>()

  for (const rd of releaseDates) {
    const entry = map[rd.release_id]
    if (!entry) continue // 매핑에 없는 릴리스는 배제

    const externalId = `fred:${rd.release_id}:${rd.date}`
    if (seen.has(externalId)) continue // 중복 방어
    seen.add(externalId)

    const { eventDate, eventTime } = etWallClockToKst(rd.date, entry.etTime)

    rows.push({
      source: 'fred',
      external_id: externalId,
      country: 'US',
      category: 'indicator',
      importance: entry.importance,
      title: entry.titleKo,
      title_en: entry.titleEn,
      event_date: eventDate,
      event_time: eventTime,
      actual: null,
      forecast: null,
      previous: null,
      unit: null,
      source_url: `https://fred.stlouisfed.org/release?rid=${rd.release_id}`,
      updated_at: nowIso,
    })
  }

  return rows
}

/**
 * 실호출 시 매핑 정합성 sanity check.
 * 응답 release_name 이 매핑의 fredName 과 다르면 경고 로그(스킵하지 않음 —
 * release_id 가 정답, 이름은 FRED 표기 변화 가능).
 */
export function assertReleaseNameMatch(rd: FredReleaseDate): void {
  const entry = FRED_RELEASE_MAP[rd.release_id]
  if (!entry) return
  if (entry.fredName !== rd.release_name) {
    console.warn(
      `[fred] release_id=${rd.release_id} 이름 불일치: 기대="${entry.fredName}" 실제="${rd.release_name}"`
    )
  }
}

// ---------------------------------------------------------------------------
// fetch (네트워크 — 격리)
// ---------------------------------------------------------------------------

export interface FetchReleaseDatesRange {
  /** 'YYYY-MM-DD' realtime_start */
  from: string
  /** 'YYYY-MM-DD' realtime_end */
  to: string
}

/**
 * FRED `releases/dates` 호출 → 미래 예정일 포함 발표일 배열 반환.
 *
 * `include_release_dates_with_no_data=true` 필수(미래 예정일 포함).
 * realtime_start/end 로 조회 구간을 지정.
 *
 * @throws API key 미제공, HTTP 오류, 응답 파싱 실패 시
 */
export async function fetchFredReleaseDates(
  apiKey: string,
  range: FetchReleaseDatesRange
): Promise<FredReleaseDate[]> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('FRED_API_KEY 가 필요합니다')
  }

  const url = new URL('https://api.stlouisfed.org/fred/releases/dates')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('file_type', 'json')
  url.searchParams.set('include_release_dates_with_no_data', 'true')
  url.searchParams.set('realtime_start', range.from)
  url.searchParams.set('realtime_end', range.to)
  url.searchParams.set('sort_order', 'asc')
  url.searchParams.set('order_by', 'release_date')
  // ponytail: FRED releases/dates 의 limit 상한은 1000(문서상 max 10000 오기).
  // 수집 창이 ~2개월이라 전체 릴리스 날짜도 1000 미만 → 페이지네이션 불필요.
  // 창을 크게 늘릴 일이 생기면 offset 페이지네이션 추가.
  url.searchParams.set('limit', '1000')

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // 크론/서버 전용 — 캐시 없이 항상 최신
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `FRED releases/dates 호출 실패: HTTP ${res.status} ${body.slice(0, 200)}`
    )
  }

  const json = (await res.json()) as {
    release_dates?: Array<{
      release_id: number
      release_name?: string
      date: string
    }>
  }

  if (!json.release_dates || !Array.isArray(json.release_dates)) {
    throw new Error('FRED 응답에 release_dates 배열이 없습니다')
  }

  return json.release_dates.map((rd) => ({
    release_id: Number(rd.release_id),
    release_name: rd.release_name ?? '',
    date: rd.date,
  }))
}
