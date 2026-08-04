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
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { CHART_AXIS, CHART_AXIS_LINE, CHART_NEGATIVE, CHART_POSITIVE, CHART_PRIMARY } from '@/lib/chart-colors'
import { CHART_SERIES } from '@/lib/chart-colors'

const CATEGORY_COLORS = [
  CHART_PRIMARY, CHART_POSITIVE, CHART_SERIES[0], CHART_NEGATIVE, CHART_SERIES[1],
  CHART_SERIES[2], CHART_SERIES[3], CHART_SERIES[4], CHART_SERIES[5], CHART_SERIES[6],
  CHART_SERIES[7], CHART_SERIES[0], CHART_SERIES[1],
]

interface CategoryComparisonChartProps {
  data: CategoryMarketCap[]
  isLoading?: boolean
}

export function CategoryComparisonChart({ data, isLoading }: CategoryComparisonChartProps) {
  const fmt = useCurrencyFormat()
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
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            tickFormatter={(value) => fmt.marketCap(value as number)}
            tickLine={false}
            axisLine={{ stroke: CHART_AXIS_LINE }}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value) => [fmt.marketCap(value as number), '시가총액']}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload as CategoryMarketCap | undefined
              return item ? `${item.name} (${item.sectorCount}개 섹터)` : label
            }}
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: `1px solid ${CHART_AXIS_LINE}`,
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
