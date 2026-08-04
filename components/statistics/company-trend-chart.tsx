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
import { CHART_AXIS, CHART_AXIS_LINE, CHART_NEGATIVE, CHART_POSITIVE, CHART_PRIMARY } from '@/lib/chart-colors'
import { CHART_SERIES } from '@/lib/chart-colors'

const CHART_COLORS = [
  { stroke: CHART_PRIMARY, fill: CHART_PRIMARY },
  { stroke: CHART_POSITIVE, fill: CHART_POSITIVE },
  { stroke: CHART_SERIES[0], fill: CHART_SERIES[1] },
  { stroke: CHART_NEGATIVE, fill: CHART_NEGATIVE },
  { stroke: CHART_SERIES[2], fill: CHART_SERIES[3] },
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
        {/* key: 기간(30일 등) 토글·종목 변경 시 데이터 길이가 바뀌면 recharts 의 stale 한
            활성 인덱스가 남아 십자선/툴팁이 어긋난다. 시그니처가 바뀌면 차트를 remount 한다. */}
        <AreaChart
          key={`${chartData.length}:${data.map((d) => d.id).join(',')}`}
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
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
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={{ stroke: CHART_AXIS_LINE }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            formatter={(value, name) => [`${(value as number).toFixed(2)}%`, name as string]}
            labelStyle={{ color: CHART_AXIS, fontWeight: 500 }}
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: `1px solid ${CHART_AXIS_LINE}`,
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
