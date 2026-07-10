/**
 * 경제 캘린더 필터/범위 순수 함수 SoT (14_econ_calendar Phase C).
 *
 * region.ts(티커 접미사 기반 거래소 필터)와 **도메인이 다르다** — 여기는 이벤트
 * 발생 국가(economic_events.country) 축이다. 두 도메인을 섞지 않는다.
 *
 * - 필터 유니온/DB 값 타입은 `@/types` 재사용(중복 정의 금지).
 * - 값(actual/forecast/previous)은 문자열 원문 → 통화 정규화(toUsd) 무관.
 * - 날짜 계산은 'YYYY-MM-DD' 문자열을 UTC 자정으로 파싱해 타임존 오프셋 오차를 배제한다.
 */
import type {
  CalendarCountry,
  CalendarCategory,
  CalendarCountryValue,
  CalendarCategoryValue,
  EconomicEvent,
} from '@/types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
/** range 상한(월뷰 6주 그리드=42일 + 여유). 초과 시 조용히 클램프. */
const MAX_RANGE_DAYS = 62

const COUNTRY_VALUES: readonly CalendarCountry[] = ['all', 'kr', 'us']
const CATEGORY_VALUES: readonly CalendarCategory[] = [
  'all',
  'indicator',
  'earnings',
  'event',
]

/** 'YYYY-MM-DD' 형식 + 실재 날짜 검증(예: 2026-02-30 거부). */
export function isValidDateStr(s: string | null): s is string {
  if (!s || !DATE_RE.test(s)) return false
  const t = Date.parse(`${s}T00:00:00Z`)
  if (Number.isNaN(t)) return false
  // Date.parse 는 02-30 을 03-02 로 보정 → 왕복 비교로 실재성 확인.
  return toYmd(new Date(t)) === s
}

/** 'YYYY-MM-DD' → UTC 자정 Date. 호출부에서 유효성 보장 가정. */
function parseYmd(s: string): Date {
  return new Date(`${s}T00:00:00Z`)
}

/** UTC 컴포넌트로 'YYYY-MM-DD' 포맷. */
function toYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** ymd 에 n 일 가감(불변, 새 문자열 반환). */
function addDays(ymd: string, n: number): string {
  const d = parseYmd(ymd)
  d.setUTCDate(d.getUTCDate() + n)
  return toYmd(d)
}

/** to - from (일수). 음수 가능. */
function diffDays(from: string, to: string): number {
  const ms = parseYmd(to).getTime() - parseYmd(from).getTime()
  return Math.round(ms / 86_400_000)
}

/** anchor 가 속한 주(월~일) 범위. */
function weekRange(anchor: string): { from: string; to: string } {
  const dow = parseYmd(anchor).getUTCDay() // 0=일 … 6=토
  const mondayOffset = (dow + 6) % 7 // 월요일까지 뒤로 갈 일수
  const from = addDays(anchor, -mondayOffset)
  return { from, to: addDays(from, 6) }
}

/** Asia/Seoul 기준 오늘 'YYYY-MM-DD' (날짜 폴백용). */
function kstTodayYmd(): string {
  // en-CA 로케일 = ISO(YYYY-MM-DD) 포맷.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

/** ?country= 파싱. 화이트리스트 외 → 'all' 폴백(관대). SoT. */
export function resolveCountry(sp: URLSearchParams): CalendarCountry {
  const raw = sp.get('country')
  return COUNTRY_VALUES.includes(raw as CalendarCountry)
    ? (raw as CalendarCountry)
    : 'all'
}

/** ?category= 파싱. 화이트리스트 외 → 'all' 폴백(관대). SoT. */
export function resolveCategory(sp: URLSearchParams): CalendarCategory {
  const raw = sp.get('category')
  return CATEGORY_VALUES.includes(raw as CalendarCategory)
    ? (raw as CalendarCategory)
    : 'all'
}

/**
 * ?from=&to= 파싱 + 안전 가드.
 * - 누락/형식오류/역전 → 금주(월~일) 폴백(400 대신 200 경로).
 * - to - from > 62일 → to 를 from+62 로 클램프(clamped:true).
 */
export function resolveRange(sp: URLSearchParams): {
  from: string
  to: string
  clamped: boolean
} {
  const fromRaw = sp.get('from')
  const toRaw = sp.get('to')

  let from: string
  let to: string
  if (isValidDateStr(fromRaw) && isValidDateStr(toRaw) && toRaw >= fromRaw) {
    from = fromRaw
    to = toRaw
  } else {
    const wk = weekRange(kstTodayYmd())
    from = wk.from
    to = wk.to
  }

  let clamped = false
  if (diffDays(from, to) > MAX_RANGE_DAYS) {
    to = addDays(from, MAX_RANGE_DAYS)
    clamped = true
  }
  return { from, to, clamped }
}

/** UI 필터 → DB country 값. all→null(미적용), kr→'KR', us→'US'. */
export function countryFilterToValue(
  c: CalendarCountry
): CalendarCountryValue | null {
  if (c === 'kr') return 'KR'
  if (c === 'us') return 'US'
  return null
}

/** UI 필터 → DB category 값. all→null(미적용), 그 외 그대로. */
export function categoryFilterToValue(
  c: CalendarCategory
): CalendarCategoryValue | null {
  return c === 'all' ? null : c
}

/**
 * 캘린더 뷰(주/월) + 기준일 → 표시 range.
 * - 'week': anchor 가 속한 월~일 7일.
 * - 'month': anchor 달을 덮는 6주 그리드(월 시작 주의 월요일 ~ +41일).
 * 서버 클램프(≤62일)와 정합(월뷰 42일 ≤ 62).
 */
export function getCalendarRange(
  view: 'week' | 'month',
  anchor: string
): { from: string; to: string } {
  if (view === 'week') return weekRange(anchor)

  const d = parseYmd(anchor)
  const firstOfMonth = `${d.getUTCFullYear()}-${String(
    d.getUTCMonth() + 1
  ).padStart(2, '0')}-01`
  const dow = parseYmd(firstOfMonth).getUTCDay()
  const mondayOffset = (dow + 6) % 7
  const gridStart = addDays(firstOfMonth, -mondayOffset)
  return { from: gridStart, to: addDays(gridStart, 41) } // 6주 그리드
}

// ── Phase D 표시 계층 순수 헬퍼 (UI 전용, 통화 무관) ──────────────

/** 한국어 요일 라벨 (0=일). */
const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

/** Asia/Seoul 기준 오늘 'YYYY-MM-DD'. UI 기본 anchor·오늘 강조에 사용. */
export function kstToday(): string {
  return kstTodayYmd()
}

/** 월뷰 6주(42) 그리드 한 칸의 메타. */
export interface CalendarCell {
  dateKey: string
  dayNum: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
}

/**
 * anchor 달을 덮는 6주(월~일 × 6=42칸) 셀 배열.
 * getCalendarRange('month') 와 동일 시작점을 써 그리드/페치 범위가 정합.
 */
export function buildMonthCells(anchor: string, todayKey: string): CalendarCell[] {
  const { from } = getCalendarRange('month', anchor)
  const anchorMonth = parseYmd(anchor).getUTCMonth()
  const cells: CalendarCell[] = []
  let cur = from
  for (let i = 0; i < 42; i += 1) {
    const d = parseYmd(cur)
    const dow = d.getUTCDay()
    cells.push({
      dateKey: cur,
      dayNum: d.getUTCDate(),
      isCurrentMonth: d.getUTCMonth() === anchorMonth,
      isToday: cur === todayKey,
      isWeekend: dow === 0 || dow === 6,
    })
    cur = addDays(cur, 1)
  }
  return cells
}

/** 이벤트를 dateKst 키로 버킷팅(신규 객체 반환, 입력 불변). */
export function groupEventsByDate(
  events: EconomicEvent[]
): Record<string, EconomicEvent[]> {
  return events.reduce<Record<string, EconomicEvent[]>>((acc, e) => {
    const bucket = acc[e.dateKst]
    return bucket
      ? { ...acc, [e.dateKst]: [...bucket, e] }
      : { ...acc, [e.dateKst]: [e] }
  }, {})
}

/** 주별/어젠다 리스트용 날짜 그룹(이벤트 있는 날짜만, 오름차순). */
export interface CalendarDateGroup {
  dateKey: string
  /** '오늘' | '내일' | null (상대 라벨) */
  relativeLabel: '오늘' | '내일' | null
  /** '7월 9일 (수)' */
  dateLabel: string
  events: EconomicEvent[]
}

/** dateKey 의 한국어 요일(예: '수'). */
export function weekdayKo(dateKey: string): string {
  return WEEKDAYS_KO[parseYmd(dateKey).getUTCDay()]
}

/** 'M월 D일 (요일)' 라벨. */
export function formatDayLabel(dateKey: string): string {
  const d = parseYmd(dateKey)
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS_KO[d.getUTCDay()]})`
}

/** todayKey 대비 상대 라벨('오늘'/'내일'/null). */
export function relativeDayLabel(
  dateKey: string,
  todayKey: string
): '오늘' | '내일' | null {
  if (dateKey === todayKey) return '오늘'
  if (dateKey === addDays(todayKey, 1)) return '내일'
  return null
}

/**
 * flat(정렬됨) 이벤트 → 날짜 그룹 배열. 이벤트가 이미 date asc·time asc 로
 * 오므로 최초 등장 순서를 보존해 그룹 순서를 만든다.
 */
export function buildDateGroups(
  events: EconomicEvent[],
  todayKey: string
): CalendarDateGroup[] {
  const order: string[] = []
  const byKey = events.reduce<Record<string, EconomicEvent[]>>((acc, e) => {
    const bucket = acc[e.dateKst]
    if (!bucket) order.push(e.dateKst)
    return bucket
      ? { ...acc, [e.dateKst]: [...bucket, e] }
      : { ...acc, [e.dateKst]: [e] }
  }, {})
  return order.map((dateKey) => ({
    dateKey,
    relativeLabel: relativeDayLabel(dateKey, todayKey),
    dateLabel: formatDayLabel(dateKey),
    events: byKey[dateKey],
  }))
}

/** '2026년 7월' — 월뷰 헤더 라벨. */
export function monthLabel(anchor: string): string {
  const d = parseYmd(anchor)
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월`
}

/** 'M.D – M.D' — 주뷰 헤더 라벨(월~일). */
export function weekRangeLabel(anchor: string): string {
  const { from, to } = weekRange(anchor)
  const f = parseYmd(from)
  const t = parseYmd(to)
  return `${f.getUTCMonth() + 1}.${f.getUTCDate()} – ${t.getUTCMonth() + 1}.${t.getUTCDate()}`
}

/**
 * 기간 이동. week=±7일, month=이전/다음 달 1일로 anchor 이동.
 * 반환 anchor 를 getCalendarRange 에 넣으면 표시 범위가 갱신된다.
 */
export function shiftAnchor(
  view: 'week' | 'month',
  anchor: string,
  dir: -1 | 1
): string {
  if (view === 'week') return addDays(anchor, dir * 7)
  const d = parseYmd(anchor)
  const shifted = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 1)
  )
  return toYmd(shifted)
}
