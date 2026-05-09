'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

export interface MiniSparklineProps {
  /** 시계열 값 (보통 14일치). 길이가 2 미만이면 빈 영역 렌더 */
  data: number[]
  /** 자동 추론을 덮어쓸 때 사용 */
  trend?: 'up' | 'down' | 'flat'
  /** SVG 너비 (기본 80) */
  width?: number
  /** SVG 높이 (기본 24) */
  height?: number
  /** 마지막 점 강조 표시 여부 (기본 true) */
  showDot?: boolean
  /** 영역 채우기 여부 (기본 true) */
  fill?: boolean
  className?: string
  ariaLabel?: string
}

/**
 * 가벼운 SVG 기반 sparkline.
 *
 * - recharts를 쓰지 않아 카드 그리드에서 N×그리기 비용 절감.
 * - trend 자동 추론: data[last] >= data[0] → up, < → down. data 길이 0 → flat.
 * - 색상은 design tokens(`text-success`/`text-danger`/`text-muted-foreground`)을 사용.
 */
export function MiniSparkline({
  data,
  trend,
  width = 80,
  height = 24,
  showDot = true,
  fill = true,
  className,
  ariaLabel,
}: MiniSparklineProps) {
  const { pathD, areaD, lastPoint, resolvedTrend, hasData } = useMemo(() => {
    if (!data || data.length < 2) {
      return {
        pathD: '',
        areaD: '',
        lastPoint: null as { x: number; y: number } | null,
        resolvedTrend: (trend ?? 'flat') as 'up' | 'down' | 'flat',
        hasData: false,
      }
    }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    // 패딩(상하 stroke 잘림 방지)
    const padY = 2
    const usableH = height - padY * 2

    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = padY + usableH - ((v - min) / range) * usableH
      return { x, y }
    })

    const path = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ')

    const area = `${path} L${width.toFixed(2)},${height} L0,${height} Z`

    const last = pts[pts.length - 1]

    const auto: 'up' | 'down' | 'flat' =
      data[data.length - 1] > data[0]
        ? 'up'
        : data[data.length - 1] < data[0]
          ? 'down'
          : 'flat'

    return {
      pathD: path,
      areaD: area,
      lastPoint: last,
      resolvedTrend: trend ?? auto,
      hasData: true,
    }
  }, [data, trend, width, height])

  const colorClass =
    resolvedTrend === 'up'
      ? 'text-success'
      : resolvedTrend === 'down'
        ? 'text-danger'
        : 'text-muted-foreground'

  if (!hasData) {
    return (
      <div
        className={cn('flex items-center text-muted-foreground/40', className)}
        style={{ width, height }}
        aria-hidden
      >
        <div className="h-px w-full bg-border-subtle" />
      </div>
    )
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? `${resolvedTrend} 추세`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn(colorClass, className)}
      preserveAspectRatio="none"
    >
      {fill && (
        <path
          d={areaD}
          fill="currentColor"
          fillOpacity={0.12}
          stroke="none"
        />
      )}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showDot && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={1.75}
          fill="currentColor"
        />
      )}
    </svg>
  )
}
