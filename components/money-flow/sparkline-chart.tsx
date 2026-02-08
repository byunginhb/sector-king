'use client'

import { ResponsiveContainer, Area, AreaChart } from 'recharts'
import type { PriceHistory } from '@/types'

interface SparklineChartProps {
  data: PriceHistory[]
  ticker: string
}

export function SparklineChart({ data, ticker }: SparklineChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-10 w-24 flex items-center justify-center text-xs text-muted-foreground">
        -
      </div>
    )
  }

  const priceChange = data[data.length - 1].price - data[0].price
  const isPositive = priceChange >= 0
  const color = isPositive ? '#10b981' : '#ef4444'
  const gradientId = `sparkline-${ticker}`

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
