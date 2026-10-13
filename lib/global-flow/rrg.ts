/**
 * 상대 회전 그래프(RRG) — 공개 단순화판. JdK RRG(독점 공식)가 아니다.
 *
 *   norm_i(t) = p_i(t) / p_i(t0)                   (USD 가격, 주간)
 *   basket(t) = mean_i norm_i(t)                    (추적 자산 동일가중 = "돈 전체")
 *   RS_i(t)   = norm_i(t) / basket(t)
 *   x = 100 × RS(t) / SMA(RS, N)                     상대 강도 (100 = 자기 평균)
 *   y = 100 × x(t) / x(t − K)                        상대 모멘텀 (x 가 오르는 중이면 > 100)
 *
 * 사분면은 시계 방향으로 돈다: 개선(좌상) → 주도(우상) → 둔화(우하) → 약세(좌하).
 */

import { valueAt, type Pt } from './series'

export type Quadrant = 'leading' | 'weakening' | 'lagging' | 'improving'

export interface RrgPoint {
  date: string
  x: number
  y: number
}

export interface RrgInput {
  id: string
  usd: readonly Pt[]
}

export interface RrgResult {
  id: string
  tail: RrgPoint[]
  quadrant: Quadrant
}

export const RRG_PARAMS = { n: 10, k: 4, tail: 8 } as const

export function quadrantOf(x: number, y: number): Quadrant {
  if (x >= 100) return y >= 100 ? 'leading' : 'weakening'
  return y >= 100 ? 'improving' : 'lagging'
}

const mean = (xs: readonly number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

export function computeRrg(
  inputs: readonly RrgInput[],
  weeks: readonly string[],
  { n, k, tail }: { n: number; k: number; tail: number } = RRG_PARAMS,
): RrgResult[] {
  const span = weeks.slice(-(n + k + tail - 1))
  if (span.length < n + k + tail - 1) return []

  // 구간 전체에 가격이 있는 자산만 — 하나라도 비면 바스켓이 날짜마다 다른 집합이 된다.
  const priced = inputs
    .map((a) => ({ id: a.id, p: span.map((d) => valueAt(a.usd, d)) }))
    .filter((a): a is { id: string; p: number[] } => a.p.every((v) => v != null && v > 0))
  if (priced.length < 2) return []

  const norm = priced.map((a) => a.p.map((v) => v / a.p[0]))
  const basket = span.map((_, t) => mean(norm.map((row) => row[t])))

  return priced.map((a, i) => {
    const rs = norm[i].map((v, t) => v / basket[t])
    const x = rs.map((v, t) => (t < n - 1 ? NaN : (100 * v) / mean(rs.slice(t - n + 1, t + 1))))
    const points: RrgPoint[] = []
    for (let t = n - 1 + k; t < span.length; t++) {
      points.push({ date: span[t], x: x[t], y: (100 * x[t]) / x[t - k] })
    }
    const tailPts = points.slice(-tail)
    const lastPt = tailPts[tailPts.length - 1]
    return {
      id: a.id,
      tail: tailPts,
      quadrant: quadrantOf(lastPt.x, lastPt.y),
    }
  })
}
