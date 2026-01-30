'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TrendItem } from '@/types'

const CHART_COLORS = [
  { stroke: '#3b82f6', fill: '#3b82f6' },
  { stroke: '#10b981', fill: '#10b981' },
  { stroke: '#f59e0b', fill: '#f59e0b' },
  { stroke: '#ef4444', fill: '#ef4444' },
  { stroke: '#8b5cf6', fill: '#8b5cf6' },
]

interface CompanyTrendChartProps {
  data: TrendItem[]
  isLoading?: boolean
}

export function CompanyTrendChart({ data, isLoading }: CompanyTrendChartProps) {
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

  // Transform data for recharts - calculate percentage change from first data point
  const dates = data[0]?.data.map((d) => d.date) || []
  const chartData = dates.map((date) => {
    const point: Record<string, string | number> = {
      date: new Date(date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
    }
    for (const item of data) {
      const found = item.data.find((d) => d.date === date)
      const firstMarketCap = item.data[0]?.marketCap
      if (firstMarketCap && found?.marketCap) {
        point[item.id] = ((found.marketCap - firstMarketCap) / firstMarketCap) * 100
      } else {
        point[item.id] = 0
      }
    }
    return point
  })

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {CHART_COLORS.map((color, index) => (
              <linearGradient
                key={`gradient-${index}`}
                id={`colorGradient${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color.fill} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color.fill} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            formatter={(value, name) => [`${(value as number).toFixed(2)}%`, name as string]}
            labelStyle={{ color: '#64748b', fontWeight: 500 }}
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            wrapperStyle={{ zIndex: 1000 }}
            itemSorter={(item) => -(item.value as number)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {data.map((item, index) => (
            <Area
              key={item.id}
              type="monotone"
              dataKey={item.id}
              name={item.nameKo || item.name}
              stroke={CHART_COLORS[index % CHART_COLORS.length].stroke}
              strokeWidth={2}
              fill={`url(#colorGradient${index % CHART_COLORS.length})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'white' }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
