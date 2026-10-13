import type { Quadrant } from '@/lib/global-flow/rrg'
import type { AssetGroup } from '@/lib/global-flow/assets'

export function fmtPct(v: number | null, digits = 1): string {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`
}

export function toneOf(v: number | null): string {
  if (v == null || v === 0) return 'text-muted-foreground'
  return v > 0 ? 'text-success' : 'text-danger'
}

/** 부호를 붙인 금액. flowAmount 는 절댓값만 돌려주므로 부호는 여기서 붙인다. */
export function signed(v: number, abs: (x: number) => string): string {
  return `${v >= 0 ? '+' : '−'}${abs(v)}`
}

/** 'YYYY-MM-DD' → 'M.D' */
export function shortDate(d: string): string {
  const [, m, day] = d.split('-')
  return `${Number(m)}.${Number(day)}`
}

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  leading: '주도',
  weakening: '둔화',
  lagging: '약세',
  improving: '개선',
}

export const QUADRANT_DESC: Record<Quadrant, string> = {
  leading: '전체 대비 강하고 더 강해지는 중',
  weakening: '아직 강하지만 힘이 빠지는 중',
  lagging: '전체 대비 약하고 더 약해지는 중',
  improving: '아직 약하지만 힘이 붙는 중',
}

/** 자산군 색 — 디자인 토큰. amber(--chart-1)는 신호색이라 쓰지 않는다. */
export const GROUP_COLOR: Record<AssetGroup, string> = {
  equity: 'hsl(var(--chart-3))',
  bond: 'hsl(var(--chart-2))',
  commodity: 'hsl(var(--chart-6))',
  crypto: 'hsl(var(--chart-4))',
  cash: 'hsl(var(--chart-7))',
}
