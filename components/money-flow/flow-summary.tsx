'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
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
      <div className="bg-success-bg/40 border border-success/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-success" aria-hidden />
          <span className="text-sm text-success font-medium">
            총 유입
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-success tabular-nums">
          +{formatFlowAmount(totalInflow)}
        </div>
        <div className="text-sm text-success/70 tabular-nums">
          ({formatKrw(totalInflow)})
        </div>
      </div>

      {/* Total Outflow */}
      <div className="bg-danger-bg/40 border border-danger/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="h-5 w-5 text-danger" aria-hidden />
          <span className="text-sm text-danger font-medium">
            총 유출
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-danger tabular-nums">
          -{formatFlowAmount(totalOutflow)}
        </div>
        <div className="text-sm text-danger/70 tabular-nums">
          ({formatKrw(totalOutflow)})
        </div>
      </div>

      {/* Net Flow */}
      <div
        className={
          isNetPositive
            ? 'bg-info/10 border border-info/30 rounded-xl p-4'
            : 'bg-warning/10 border border-warning/30 rounded-xl p-4'
        }
      >
        <div className="flex items-center gap-2 mb-2">
          <Wallet
            className={
              isNetPositive
                ? 'h-5 w-5 text-info'
                : 'h-5 w-5 text-warning'
            }
            aria-hidden
          />
          <span
            className={
              isNetPositive
                ? 'text-sm text-info font-medium'
                : 'text-sm text-warning font-medium'
            }
          >
            순 유입
          </span>
        </div>
        <div
          className={
            isNetPositive
              ? 'text-xl sm:text-2xl font-bold text-info tabular-nums'
              : 'text-xl sm:text-2xl font-bold text-warning tabular-nums'
          }
        >
          {isNetPositive ? '+' : '-'}{formatFlowAmount(Math.abs(netFlow))}
        </div>
        <div
          className={
            isNetPositive
              ? 'text-sm text-info/70 tabular-nums'
              : 'text-sm text-warning/70 tabular-nums'
          }
        >
          ({formatKrw(netFlow)})
        </div>
      </div>
    </motion.div>
  )
}
