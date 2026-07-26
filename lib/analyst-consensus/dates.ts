/** KST(Asia/Seoul) 날짜 유틸 — 크롤 구간 계산 SoT. */

function kstParts(d: Date): { y: number; m: number; day: number; weekday: number } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const p: Record<string, string> = {}
  for (const part of f.formatToParts(d)) p[part.type] = part.value
  const wmap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { y: Number(p.year), m: Number(p.month), day: Number(p.day), weekday: wmap[p.weekday] }
}

function fmt(y: number, m: number, day: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 오늘(KST) 'YYYY-MM-DD'. */
export function kstToday(now: Date = new Date()): string {
  const { y, m, day } = kstParts(now)
  return fmt(y, m, day)
}

/** n일 전(KST) 'YYYY-MM-DD'. UTC 밀리초 기준으로 빼서 월경계 안전. */
export function kstDaysAgo(n: number, now: Date = new Date()): string {
  const past = new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
  const { y, m, day } = kstParts(past)
  return fmt(y, m, day)
}

/** 오늘(KST)이 평일(월~금)인지. */
export function isKstWeekday(now: Date = new Date()): boolean {
  const wd = kstParts(now).weekday
  return wd >= 1 && wd <= 5
}
