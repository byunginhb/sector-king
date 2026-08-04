/**
 * recharts 차트 색상 상수 (SoT). 전부 globals.css 의 디자인 토큰을 가리킨다.
 *
 * 예전 주석은 "recharts 의 stroke/fill 은 CSS 변수를 직접 받지 못하므로 리터럴
 * hex 가 필요하다"고 적혀 있었는데 사실이 아니다 — recharts 는 stroke/fill 을
 * 그대로 SVG 속성으로 넘기고, SVG paint 속성은 CSS 변수를 해석한다.
 * 그 잘못된 전제 하나 때문에 차트 레이어 전체가 Tailwind 기본 500 색상
 * (#10b981 emerald / #3b82f6 blue / #8b5cf6 violet …)으로 굳어 있었다.
 * globals.css 가 "형광 emerald·red 사용 금지"로 배제한 바로 그 팔레트다.
 *
 * 부수 효과로 다크 모드도 고쳐진다. 예전 값은 라이트 기준 slate hex 라
 * (축 #94a3b8, 축선 #e2e8f0, 툴팁 배경 white) 다크에서 축선이 배경에 묻히고
 * 툴팁만 흰 판으로 떠 있었다. CSS 변수는 .dark 스코프에서 값이 바뀌므로
 * 테마 분기 자체가 필요 없어진다.
 */

/** 상승(긍정) — slate-teal */
export const CHART_POSITIVE = 'hsl(var(--success))'
/** 하락(부정) — slate-rose */
export const CHART_NEGATIVE = 'hsl(var(--danger))'
/** 중립/주축 — 에디토리얼 앰버(신호) */
export const CHART_PRIMARY = 'hsl(var(--chart-1))'
/** 보조 라벨/그리드 텍스트 */
export const CHART_AXIS = 'hsl(var(--muted-foreground))'
/** 축 라인 — 헤어라인 */
export const CHART_AXIS_LINE = 'hsl(var(--border))'

/**
 * 다중 시리즈용 팔레트 — --chart-1 ~ --chart-8 만 사용한다.
 * amber(--chart-1)는 신호색이라 항상 첫 시리즈(주축)에만 온다.
 */
export const CHART_SERIES = [
  'hsl(var(--chart-1))', // amber (signal)
  'hsl(var(--chart-2))', // slate teal
  'hsl(var(--chart-3))', // slate blue
  'hsl(var(--chart-4))', // aubergine
  'hsl(var(--chart-5))', // slate rose
  'hsl(var(--chart-6))', // burnt orange
  'hsl(var(--chart-7))', // slate cyan
  'hsl(var(--chart-8))', // moss
] as const

/** recharts Tooltip 공용 스타일 — 토큰 기반이라 라이트/다크 자동 대응. */
export const CHART_TOOLTIP_CONTENT_STYLE = {
  fontSize: 12,
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  boxShadow: 'none',
} as const

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: 'hsl(var(--muted-foreground))',
  fontWeight: 500,
} as const
