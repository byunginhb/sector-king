'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TrendItem } from '@/types'

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
]

interface SectorTrendChartProps {
  data: TrendItem[]
  isLoading?: boolean
}

export function SectorTrendChart({ data, isLoading }: SectorTrendChartProps) {
  if (isLoading) {
    return (
      <div className="h-72 bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">로딩 중...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-72 bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">데이터가 없습니다</span>
      </div>
    )
  }

  // Transform data for recharts - calculate percent change from first date
  const dates = data[0]?.data.map((d) => d.date) || []

  // Get first date market cap as baseline for each sector
  const baselines: Record<string, number> = {}
  for (const item of data) {
    const firstDataPoint = item.data[0]
    if (firstDataPoint?.marketCap) {
      baselines[item.id] = firstDataPoint.marketCap
    }
  }

  const chartData = dates.map((date) => {
    const point: Record<string, string | number> = {
      date: new Date(date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
    }
    for (const item of data) {
      const found = item.data.find((d) => d.date === date)
      const baseline = baselines[item.id]
      if (found?.marketCap && baseline) {
        // Calculate percent change from baseline
        point[item.id] = ((found.marketCap - baseline) / baseline) * 100
      } else {
        point[item.id] = 0
      }
    }
    return point
  })

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip
            formatter={(value, name) => {
              const item = data.find((d) => d.id === name)
              const numValue = value as number
              const formatted = `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2)}%`
              return [formatted, item?.name || (name as string)]
            }}
            labelStyle={{ color: '#64748b', fontWeight: 500 }}
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend
            formatter={(value) => {
              const item = data.find((d) => d.id === value)
              return item?.name || value
            }}
            wrapperStyle={{ fontSize: 12 }}
          />
          {data.map((item, index) => (
            <Line
              key={item.id}
              type="monotone"
              dataKey={item.id}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'white' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
