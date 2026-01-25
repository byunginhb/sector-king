'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { CategoryMarketCap } from '@/types'
import { formatMarketCap } from '@/lib/format'

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#22c55e',
]

interface CategoryComparisonChartProps {
  data: CategoryMarketCap[]
  isLoading?: boolean
}

export function CategoryComparisonChart({ data, isLoading }: CategoryComparisonChartProps) {
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

  // Take top 10 categories by market cap
  const chartData = data.slice(0, 10).map((item) => ({
    ...item,
    displayName: item.name.length > 8 ? item.name.slice(0, 8) + '...' : item.name,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(value) => {
              if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
              if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`
              return `${(value / 1e6).toFixed(0)}M`
            }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value) => [formatMarketCap(value as number), '시가총액']}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload as CategoryMarketCap | undefined
              return item ? `${item.name} (${item.sectorCount}개 섹터)` : label
            }}
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Bar dataKey="marketCap" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
