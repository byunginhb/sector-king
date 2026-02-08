'use client'

import { motion } from 'framer-motion'
import { useSectorCompanies } from '@/hooks/use-sector-companies'
import { SparklineChart } from './sparkline-chart'
import { cn } from '@/lib/utils'

interface SectorCompanyListProps {
  sectorId: string
  sectorName: string
  period: number
  flowDirection: 'in' | 'out'
  onClose: () => void
}

function formatPrice(price: number | null): string {
  if (price === null) return '-'
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (price >= 1) return `$${price.toFixed(2)}`
  return `$${price.toFixed(4)}`
}

function formatMarketCap(cap: number | null): string {
  if (cap === null) return '-'
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`
  return `$${cap.toLocaleString()}`
}

export function SectorCompanyList({
  sectorId,
  sectorName,
  period,
  flowDirection,
  onClose,
}: SectorCompanyListProps) {
  const { data, isLoading, error } = useSectorCompanies({
    sectorId,
    period,
  })

  const isInflow = flowDirection === 'in'

  return (
    <motion.div
      key={sectorId}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div
          className={cn(
            'rounded-xl border p-4 mt-4',
            isInflow
              ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3
              className={cn(
                'text-base font-semibold flex items-center gap-2',
                isInflow
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-blue-700 dark:text-blue-300'
              )}
            >
              <span>{isInflow ? '💰' : '💸'}</span>
              {sectorName} 포함 종목
              {data?.dateRange && (
                <span className="text-xs font-normal text-gray-500 dark:text-slate-400">
                  ({data.dateRange.start} ~ {data.dateRange.end})
                </span>
              )}
            </h3>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-slate-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-6 text-red-500 text-sm">
              {error.message}
            </div>
          )}

          {/* Company List */}
          {data && data.companies.length > 0 && (
            <div className="space-y-1">
              {/* Table Header */}
              <div className="grid grid-cols-[2rem_1fr_6rem_5rem_6rem] sm:grid-cols-[2rem_1fr_7rem_6rem_6rem_6rem] gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">
                <span>#</span>
                <span>종목</span>
                <span className="text-right">현재가</span>
                <span className="text-right">변동률</span>
                <span className="hidden sm:block text-right">시가총액</span>
                <span className="text-right">추이</span>
              </div>

              {data.companies.map((company, idx) => (
                <motion.div
                  key={company.ticker}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="grid grid-cols-[2rem_1fr_6rem_5rem_6rem] sm:grid-cols-[2rem_1fr_7rem_6rem_6rem_6rem] gap-2 px-3 py-2.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors items-center"
                >
                  {/* Rank */}
                  <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                    {idx + 1}
                  </span>

                  {/* Company Name */}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {company.nameKo || company.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 truncate">
                      {company.ticker}
                    </div>
                  </div>

                  {/* Price */}
                  <span className="text-sm text-right text-gray-900 dark:text-slate-100 font-mono">
                    {formatPrice(company.endPrice)}
                  </span>

                  {/* Change % */}
                  <span
                    className={cn(
                      'text-sm text-right font-medium font-mono',
                      company.priceChangePercent === null
                        ? 'text-gray-400'
                        : company.priceChangePercent >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {company.priceChangePercent !== null
                      ? `${company.priceChangePercent >= 0 ? '+' : ''}${company.priceChangePercent.toFixed(2)}%`
                      : '-'}
                  </span>

                  {/* Market Cap (hidden on mobile) */}
                  <span className="hidden sm:block text-xs text-right text-gray-500 dark:text-slate-400 font-mono">
                    {formatMarketCap(company.marketCap)}
                  </span>

                  {/* Sparkline */}
                  <div className="flex justify-end">
                    <SparklineChart
                      data={company.priceHistory}
                      ticker={company.ticker}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty */}
          {data && data.companies.length === 0 && (
            <div className="text-center py-6 text-gray-500 dark:text-slate-400 text-sm">
              해당 기간에 데이터가 없습니다.
            </div>
          )}
        </div>
      </motion.div>
  )
}
