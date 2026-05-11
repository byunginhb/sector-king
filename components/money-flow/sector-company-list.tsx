'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, TrendingDown } from 'lucide-react'
import { useSectorCompanies } from '@/hooks/use-sector-companies'
import { SparklineChart } from './sparkline-chart'
import { cn } from '@/lib/utils'
import type { RegionFilter } from '@/types'

interface SectorCompanyListProps {
  sectorId: string
  sectorName: string
  period: number
  flowDirection: 'in' | 'out'
  region?: RegionFilter
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
  region = 'all',
  onClose,
}: SectorCompanyListProps) {
  const { data, isLoading, error } = useSectorCompanies({
    sectorId,
    period,
    region,
  })

  const isInflow = flowDirection === 'in'

  // Lock body scroll when modal is open
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div
      key={sectorId}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sector-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full overflow-y-auto',
          'max-h-[90vh] rounded-t-2xl',
          'sm:max-w-2xl sm:max-h-[85vh] sm:rounded-xl sm:mx-4',
          isInflow
            ? 'bg-danger-bg border-danger/30'
            : 'bg-info-bg border-info/30',
          'border shadow-2xl'
        )}
      >
        {/* Header */}
        <div className={cn(
          'sticky top-0 z-10 flex items-center justify-between p-4 border-b',
          isInflow
            ? 'bg-danger-bg border-danger/30'
            : 'bg-info-bg border-info/30'
        )}>
          <h3
            id="sector-modal-title"
            className={cn(
              'text-base font-semibold flex items-center gap-2',
              isInflow
                ? 'text-danger'
                : 'text-info'
            )}
          >
            {isInflow ? (
              <Wallet className="h-4 w-4" aria-hidden />
            ) : (
              <TrendingDown className="h-4 w-4" aria-hidden />
            )}
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

        {/* Content */}
        <div className="p-4">
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
            <div className="text-center py-6 text-danger text-sm">
              {error.message}
            </div>
          )}

          {/* Company List */}
          {data && data.companies.length > 0 && (
            <div className="space-y-1">
              {/* Table Header */}
              <div className="grid grid-cols-[1.5rem_1fr_4.5rem_4rem_4.5rem] sm:grid-cols-[2rem_1fr_7rem_6rem_6rem_6rem] gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">
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
                  className="grid grid-cols-[1.5rem_1fr_4.5rem_4rem_4.5rem] sm:grid-cols-[2rem_1fr_7rem_6rem_6rem_6rem] gap-2 px-3 py-2.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors items-center"
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
                          ? 'text-success'
                          : 'text-danger'
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
              {region !== 'all'
                ? `선택한 region(${region === 'kr' ? '국내' : '해외'})에 해당하는 종목이 없습니다.`
                : '해당 기간에 데이터가 없습니다.'}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
