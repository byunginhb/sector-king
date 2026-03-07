'use client'

import { motion } from 'framer-motion'
import { formatFlowAmount, formatKrw } from '@/lib/format'

interface FlowSummaryProps {
  totalInflow: number
  totalOutflow: number
  netFlow: number
}

export function FlowSummary({ totalInflow, totalOutflow, netFlow }: FlowSummaryProps) {
  const isNetPositive = netFlow >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      data-tour="flow-summary"
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {/* Total Inflow */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📈</span>
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            총 유입
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">
          +{formatFlowAmount(totalInflow)}
        </div>
        <div className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
          ({formatKrw(totalInflow)})
        </div>
      </div>

      {/* Total Outflow */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📉</span>
          <span className="text-sm text-red-600 dark:text-red-400 font-medium">
            총 유출
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300">
          -{formatFlowAmount(totalOutflow)}
        </div>
        <div className="text-sm text-red-600/70 dark:text-red-400/70">
          ({formatKrw(totalOutflow)})
        </div>
      </div>

      {/* Net Flow */}
      <div
        className={
          isNetPositive
            ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4'
            : 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4'
        }
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">💰</span>
          <span
            className={
              isNetPositive
                ? 'text-sm text-blue-600 dark:text-blue-400 font-medium'
                : 'text-sm text-orange-600 dark:text-orange-400 font-medium'
            }
          >
            순 유입
          </span>
        </div>
        <div
          className={
            isNetPositive
              ? 'text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300'
              : 'text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-300'
          }
        >
          {isNetPositive ? '+' : '-'}{formatFlowAmount(Math.abs(netFlow))}
        </div>
        <div
          className={
            isNetPositive
              ? 'text-sm text-blue-600/70 dark:text-blue-400/70'
              : 'text-sm text-orange-600/70 dark:text-orange-400/70'
          }
        >
          ({formatKrw(netFlow)})
        </div>
      </div>
    </motion.div>
  )
}
