'use client'

import { motion } from 'framer-motion'
import type { SectorMoneyFlow } from '@/types'
import { cn } from '@/lib/utils'
import { formatFlowAmount, formatKrw } from '@/lib/format'

interface FlowCardProps {
  flow: SectorMoneyFlow
  index: number
  maxFlow: number
  onClick?: () => void
  isExpanded?: boolean
}

/* ─── Rising / Falling Arrow Animations ─── */

function RisingArrow({ index, delay, total }: { index: number; delay: number; total: number }) {
  const x = 5 + (index / total) * 80 + Math.random() * 10
  const size = 20 + Math.random() * 12

  return (
    <motion.div
      className="absolute pointer-events-none z-10"
      style={{ left: `${x}%`, bottom: -10 }}
      initial={{ y: 30, opacity: 0 }}
      animate={{
        y: -120,
        opacity: [0, 0.85, 0.85, 0],
      }}
      transition={{
        duration: 1.1 + Math.random() * 0.4,
        delay: delay + index * 0.3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg width={size} height={size * 1.5} viewBox="0 0 20 30" fill="none">
        <path d="M10 0 L19 12 L13 12 L13 30 L7 30 L7 12 L1 12 Z" fill="rgba(239, 68, 68, 0.7)" />
      </svg>
    </motion.div>
  )
}

function FallingArrow({ index, delay, total }: { index: number; delay: number; total: number }) {
  const x = 5 + (index / total) * 80 + Math.random() * 10
  const size = 20 + Math.random() * 12

  return (
    <motion.div
      className="absolute pointer-events-none z-10"
      style={{ left: `${x}%`, top: -10 }}
      initial={{ y: -30, opacity: 0 }}
      animate={{
        y: 120,
        opacity: [0, 0.85, 0.85, 0],
      }}
      transition={{
        duration: 1.1 + Math.random() * 0.4,
        delay: delay + index * 0.3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg width={size} height={size * 1.5} viewBox="0 0 20 30" fill="none">
        <path d="M7 0 L13 0 L13 18 L19 18 L10 30 L1 18 L7 18 Z" fill="rgba(59, 130, 246, 0.7)" />
      </svg>
    </motion.div>
  )
}

export function FlowCard({ flow, index, maxFlow, onClick, isExpanded }: FlowCardProps) {
  const isInflow = flow.flowDirection === 'in'
  const flowRatio = Math.min(flow.flowAmount / maxFlow, 1)
  const arrowCount = Math.max(Math.floor(flowRatio * 3) + 5, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className={cn(
        'relative rounded-xl p-4 min-h-[120px] overflow-hidden cursor-pointer transition-shadow',
        isInflow
          ? 'bg-linear-to-br from-red-50 to-rose-100 dark:from-red-950/40 dark:to-rose-900/30 border border-red-200 dark:border-red-800'
          : 'bg-linear-to-br from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800',
        isExpanded && isInflow && 'ring-2 ring-red-400 dark:ring-red-500',
        isExpanded && !isInflow && 'ring-2 ring-blue-400 dark:ring-blue-500'
      )}
    >
      {/* Animated background pulse */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-xl',
          isInflow ? 'bg-red-400/10' : 'bg-blue-400/10'
        )}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Rising / Falling arrows */}
      {isInflow
        ? Array.from({ length: arrowCount }).map((_, i) => (
            <RisingArrow key={`a-${i}`} index={i} delay={index * 0.1} total={arrowCount} />
          ))
        : Array.from({ length: arrowCount }).map((_, i) => (
            <FallingArrow key={`a-${i}`} index={i} delay={index * 0.1} total={arrowCount} />
          ))}

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {isInflow ? '📈' : '📉'}
            </span>
            <span
              className={cn(
                'text-lg font-bold',
                isInflow
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-blue-700 dark:text-blue-300'
              )}
            >
              {flow.name}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {flow.companyCount}개 기업
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div
              className={cn(
                'text-lg sm:text-2xl font-bold',
                isInflow
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              )}
            >
              {isInflow ? '+' : '-'}
              {formatFlowAmount(flow.flowAmount)}
            </div>
            <div
              className={cn(
                'text-xs sm:text-sm opacity-70',
                isInflow
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              )}
            >
              ({formatKrw(flow.flowAmount)})
            </div>
            <div
              className={cn(
                'text-sm',
                isInflow
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-blue-500 dark:text-blue-400'
              )}
            >
              {isInflow ? '+' : ''}
              {flow.flowPercent.toFixed(2)}%
            </div>
          </div>

          {/* Direction indicator */}
          <span
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
              isInflow
                ? 'bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300'
                : 'bg-blue-200 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300'
            )}
          >
            {isInflow ? '유입 ↑' : '유출 ↓'}
          </span>
        </div>

        {/* MFI Bar */}
        {flow.mfi !== null && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-500 dark:text-slate-400">MFI</span>
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  flow.mfi >= 50 ? 'bg-emerald-500' : 'bg-orange-500'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${flow.mfi}%` }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              />
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                flow.mfi >= 50
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-orange-600 dark:text-orange-400'
              )}
            >
              {flow.mfi.toFixed(0)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
