'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { SectorGrowth } from '@/types'
import { formatMarketCap } from '@/lib/format'

interface TopSectorsGrowthChartProps {
  data: SectorGrowth[]
  isLoading?: boolean
}

export function TopSectorsGrowthChart({ data, isLoading }: TopSectorsGrowthChartProps) {
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

  // Take top 10 and bottom 5 for visualization
  const topSectors = data.slice(0, 5)
  const bottomSectors = data.slice(-5).reverse()
  const chartData = [...topSectors, ...bottomSectors].map((item) => ({
    ...item,
    displayName: item.name.length > 10 ? item.name.slice(0, 10) + '...' : item.name,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            formatter={(value, _name, props) => {
              const item = props.payload as SectorGrowth
              const numValue = value as number
              return [
                <div key="growth" className="space-y-1">
                  <div className="font-medium">{numValue.toFixed(2)}%</div>
                  <div className="text-xs text-gray-500">
                    {formatMarketCap(item.startMarketCap)} → {formatMarketCap(item.endMarketCap)}
                  </div>
                </div>,
                '성장률',
              ]
            }}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload as SectorGrowth | undefined
              return item?.name || label
            }}
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
          <Bar dataKey="growthRate" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.growthRate >= 0 ? '#10b981' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
