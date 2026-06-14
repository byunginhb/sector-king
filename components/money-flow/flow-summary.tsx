'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useCurrencyFormat } from '@/hooks/use-currency-format'

interface FlowSummaryProps {
  totalInflow: number
  totalOutflow: number
  netFlow: number
}

export function FlowSummary({ totalInflow, totalOutflow, netFlow }: FlowSummaryProps) {
  const isNetPositive = netFlow >= 0
  const fmt = useCurrencyFormat()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      data-tour="flow-summary"
    >
      <p className="text-xs text-muted-foreground mb-2">
        기간 시가총액 변화 기준 · 주가 상승에 의한 평가액 증가를 포함하며 실제 순매수 자금이 아닙니다
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Inflow */}
      <div className="bg-success-bg/40 border border-success/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-success" aria-hidden />
          <span className="text-sm text-success font-medium">
            총 유입
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-success tabular-nums">
          +{fmt.flowAmount(totalInflow)}
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
          -{fmt.flowAmount(totalOutflow)}
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
          {isNetPositive ? '+' : '-'}{fmt.flowAmount(Math.abs(netFlow))}
        </div>
      </div>
      </div>
    </motion.div>
  )
}
