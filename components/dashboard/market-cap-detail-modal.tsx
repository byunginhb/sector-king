'use client'

import { useState } from 'react'
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarketCapHistory } from '@/hooks/use-market-cap-history'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { formatDate, formatPriceChange } from '@/lib/format'
import { CHART_POSITIVE, CHART_NEGATIVE } from '@/lib/chart-colors'
import { cn } from '@/lib/utils'
import type { RegionFilter } from '@/types'

interface MarketCapDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  region: RegionFilter
}

const RANGE_OPTIONS = [
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
  { value: 120, label: '전체' },
] as const

type RangeValue = (typeof RANGE_OPTIONS)[number]['value']

export function MarketCapDetailModal({
  open,
  onOpenChange,
  region,
}: MarketCapDetailModalProps) {
  const [range, setRange] = useState<RangeValue>(90)
  const fmt = useCurrencyFormat()
  const { data, isLoading, error } = useMarketCapHistory({
    region,
    range,
    enabled: open, // 모달이 열렸을 때만 fetch
  })

  const history = data?.history ?? []
  // 기간 첫 표시일 시총이 0(스냅샷 전무)일 수 있어 분모 0 가드 — Infinity/NaN 추세색 오판 방지
  const firstCap = history[0]?.marketCapUsd ?? 0
  const lastCap = history[history.length - 1]?.marketCapUsd ?? 0
  const periodChange =
    history.length >= 2 && firstCap > 0 ? ((lastCap - firstCap) / firstCap) * 100 : 0
  const trendColor = periodChange >= 0 ? CHART_POSITIVE : CHART_NEGATIVE

  const chartData = history.map((p) => ({
    label: new Date(p.date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    }),
    value: p.marketCapUsd,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            추적 종목 시총 일자별 추이
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {data?.tickerCount
              ? `미국·한국 주요 ${data.tickerCount.toLocaleString()}개 종목의 합산 시가총액 (중복 제거) · 전체 시장 아님`
              : '추적 종목의 합산 시가총액 (중복 제거) · 전체 시장 아님'}
          </DialogDescription>
        </DialogHeader>

        {/* 기간 토글 */}
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="기간 선택"
        >
          {RANGE_OPTIONS.map((opt) => {
            const isOn = range === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                aria-pressed={isOn}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors sm:py-1.5',
                  isOn
                    ? 'border-transparent bg-primary text-white'
                    : 'border-border-subtle text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
          >
            추이 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : isLoading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-56 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            표시할 추이 데이터가 없습니다.
          </p>
        ) : (
          <>
            {/* 차트 */}
            <figure className="m-0">
              <div className="h-56 w-full rounded-lg bg-muted/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="mcapGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      interval="preserveStartEnd"
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(v) => fmt.marketCap(v as number)}
                      tickLine={false}
                      axisLine={false}
                      width={fmt.currency === 'KRW' ? 72 : 56}
                    />
                    <Tooltip
                      formatter={(v) => [fmt.marketCap(typeof v === 'number' ? v : 0), '시총']}
                      labelStyle={{ color: '#64748b', fontWeight: 500 }}
                      contentStyle={{
                        fontSize: 12,
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={trendColor}
                      strokeWidth={2}
                      fill="url(#mcapGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: trendColor, strokeWidth: 2, stroke: 'white' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="sr-only">
                최근 {history.length}거래일 추적 종목 시총 추이
              </figcaption>
            </figure>

            {/* 일자별 표 (최신순) */}
            <div className="rounded-lg border border-border-subtle overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-1">
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2 text-left font-medium">날짜</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">시가총액</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">전일 대비</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((p) => (
                    <tr
                      key={p.date}
                      className="border-t border-border-subtle"
                    >
                      <td className="px-3 py-2 num-mono text-foreground/90">
                        {formatDate(p.date)}
                      </td>
                      <td className="px-3 py-2 text-right num-mono text-foreground/90">
                        {fmt.marketCap(p.marketCapUsd)}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right num-mono',
                          p.changePct === null
                            ? 'text-muted-foreground'
                            : p.changePct >= 0
                              ? 'text-success'
                              : 'text-danger'
                        )}
                      >
                        {p.changePct === null ? '—' : formatPriceChange(p.changePct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
