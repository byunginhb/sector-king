'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { PriceChangeItem } from '@/types'

interface PriceChangeChartProps {
  data: PriceChangeItem[]
  isLoading?: boolean
}

export function PriceChangeChart({ data, isLoading }: PriceChangeChartProps) {
  if (isLoading) {
    return (
      <div className="h-96 bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground">로딩 중...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-96 bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">데이터가 없습니다</span>
      </div>
    )
  }

  // Take top 20 companies
  const chartData = data.slice(0, 20).map((item) => ({
    name: item.nameKo || item.name,
    ticker: item.ticker,
    value: item.percentChange ?? 0,
  }))

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            type="number"
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            className="text-xs fill-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={75}
            tick={{ fontSize: 11 }}
            interval={0}
            className="text-xs fill-muted-foreground"
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, '변화율']}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value >= 0 ? '#10b981' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
