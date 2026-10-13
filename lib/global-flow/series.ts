/** 날짜 정렬 시계열 공용 헬퍼 — 순수 함수. 날짜는 'YYYY-MM-DD' 문자열(사전순 = 시간순). */

export interface Pt {
  date: string
  value: number
}

/** date 이하의 마지막 값(as-of 조회). 주말·휴장·주간 시리즈를 같은 날짜축에 맞출 때 쓴다. */
export function valueAt(series: readonly Pt[], date: string): number | null {
  let lo = 0
  let hi = series.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (series[mid].date <= date) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found === -1 ? null : series[found].value
}

export function last(series: readonly Pt[]): Pt | null {
  return series.length ? series[series.length - 1] : null
}

export function shiftDate(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

/** end 시점 값 − (end − days) 시점 값. 어느 한쪽이 없으면 null. */
export function changeOver(series: readonly Pt[], end: string, days: number): number | null {
  const a = valueAt(series, shiftDate(end, -days))
  const b = valueAt(series, end)
  return a == null || b == null ? null : b - a
}

/** (start, end] 구간 값의 합과 관측 수. 일별 순매수처럼 "흐름" 시계열용. */
export function sumBetween(series: readonly Pt[], start: string, end: string) {
  let sum = 0
  let count = 0
  for (const p of series) {
    if (p.date > start && p.date <= end) {
      sum += p.value
      count += 1
    }
  }
  return { sum, count }
}

/** 원화 등 현지통화 가격 → USD. 같은 날(as-of) 환율로 나눈다. 환율 없는 날은 버린다. */
export function toUsdSeries(series: readonly Pt[], fxPerUsd: readonly Pt[]): Pt[] {
  const out: Pt[] = []
  for (const p of series) {
    const fx = valueAt(fxPerUsd, p.date)
    if (fx) out.push({ date: p.date, value: p.value / fx })
  }
  return out
}

/** 거래일 목록 → 주마다 마지막 거래일. 주 경계는 월요일(UTC). */
export function weeklyDates(dates: readonly string[]): string[] {
  const byWeek = new Map<string, string>()
  for (const d of dates) {
    const t = new Date(`${d}T00:00:00Z`)
    const monday = shiftDate(d, -((t.getUTCDay() + 6) % 7))
    const prev = byWeek.get(monday)
    if (!prev || d > prev) byWeek.set(monday, d)
  }
  return [...byWeek.values()].sort()
}
