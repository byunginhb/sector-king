/**
 * recharts 차트 색상 상수 (SoT).
 *
 * recharts 의 stroke/fill 은 CSS 변수/Tailwind 토큰을 직접 받지 못하므로
 * 리터럴 hex 가 필요하다. 기존에 price-chart / company-trend-chart 등이
 * `#10b981` / `#ef4444` 등을 산발적으로 하드코딩하던 것을 여기로 통일한다.
 */

/** 상승(긍정) — emerald-500 */
export const CHART_POSITIVE = '#10b981'
/** 하락(부정) — rose-500 */
export const CHART_NEGATIVE = '#ef4444'
/** 중립/주축 — blue-500 */
export const CHART_PRIMARY = '#3b82f6'
/** 보조 라벨/그리드 텍스트 — slate-400 */
export const CHART_AXIS = '#94a3b8'
/** 축 라인 — slate-200 */
export const CHART_AXIS_LINE = '#e2e8f0'

/** 다중 시리즈용 팔레트 (score 4구성요소 등). */
export const CHART_SERIES = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // rose-500
] as const

/** recharts Tooltip 공용 스타일 (라이트 테마 기준, 기존 차트들과 동일 톤). */
export const CHART_TOOLTIP_CONTENT_STYLE = {
  fontSize: 12,
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
} as const

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: '#64748b',
  fontWeight: 500,
} as const
