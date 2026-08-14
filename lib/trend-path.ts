export interface TrendPoint {
  /** 0~100 좌표계 (viewBox 기준). x=시간, y=값(위가 큼) */
  x: number
  y: number
}

export interface TrendPath {
  line: string
  area: string
  points: TrendPoint[]
}

/**
 * 시계열 숫자 배열 → 부드러운 SVG path (선 + 면). 0~100 좌표계라
 * viewBox="0 0 100 100" + preserveAspectRatio="none" 으로 카드 크기에 맞춰
 * 늘려 쓴다(선 굵기는 호출부에서 vectorEffect="non-scaling-stroke" 로 고정).
 *
 * y 도메인에 항상 0 을 포함시킨다 — 자금 흐름 추이는 "시작일 대비 증감"이라
 * 0(=시작선) 이 보여야 오르내림이 읽힌다.
 *
 * 곡선은 monotone cubic(Fritsch–Carlson). 일반 Catmull-Rom 은 급반전 구간에서
 * 오버슈트가 나 봉우리가 viewBox 밖으로 튀는데, 이 방식은 구간 값 범위를
 * 절대 벗어나지 않고 오르내림 방향도 뒤집지 않는다.
 */
export function buildTrendPath(values: number[]): TrendPath | null {
  if (!values || values.length < 2) return null

  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const range = max - min
  const pad = 6 // 상하 여백(%) — 봉우리가 선 굵기에 잘리지 않게

  const points: TrendPoint[] = values.map((v, i) => ({
    x: (i / (values.length - 1)) * 100,
    y: 100 - pad - (range === 0 ? 0.5 : (v - min) / range) * (100 - pad * 2),
  }))

  const line = `M${fmt(points[0].x)},${fmt(points[0].y)}${curveCommands(points)}`
  return { line, area: `${line}L100,100L0,100Z`, points }
}

function fmt(n: number): string {
  return n.toFixed(2)
}

/** monotone cubic Hermite 접선 → 3차 베지어 명령 문자열 */
function curveCommands(points: TrendPoint[]): string {
  const n = points.length
  const dx = points.map((p, i) => (i < n - 1 ? points[i + 1].x - p.x : 0))
  const slope = points.map((p, i) => (i < n - 1 ? (points[i + 1].y - p.y) / dx[i] : 0))

  // 접선 초기값: 양옆 기울기의 평균. 방향이 꺾이는 지점(부호 반전·평탄)은 0 으로 눕혀
  // 극값을 지나칠 때 곡선이 실제 값 위/아래로 부풀지 않게 한다.
  const m = points.map((_, i) => {
    if (i === 0) return slope[0]
    if (i === n - 1) return slope[n - 2]
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  })

  // Fritsch–Carlson 제약: 접선이 구간 기울기의 3배를 넘으면 오버슈트가 생긴다.
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const alpha = m[i] / slope[i]
    const beta = m[i + 1] / slope[i]
    const sq = alpha * alpha + beta * beta
    if (sq > 9) {
      const tau = 3 / Math.sqrt(sq)
      m[i] = tau * alpha * slope[i]
      m[i + 1] = tau * beta * slope[i]
    }
  }

  let d = ''
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3
    const c1x = points[i].x + third
    const c1y = points[i].y + m[i] * third
    const c2x = points[i + 1].x - third
    const c2y = points[i + 1].y - m[i + 1] * third
    d += `C${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(points[i + 1].x)},${fmt(points[i + 1].y)}`
  }
  return d
}
