'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
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
        <path d="M10 0 L19 12 L13 12 L13 30 L7 30 L7 12 L1 12 Z" fill="rgba(16, 185, 129, 0.7)" />
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
        <path d="M7 0 L13 0 L13 18 L19 18 L10 30 L1 18 L7 18 Z" fill="rgba(244, 63, 94, 0.7)" />
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
        'relative rounded-xl p-4 min-h-[120px] overflow-hidden cursor-pointer transition-shadow border',
        isInflow
          ? 'bg-success/5 border-success/30'
          : 'bg-danger/5 border-danger/30',
        isExpanded && isInflow && 'ring-2 ring-success/50',
        isExpanded && !isInflow && 'ring-2 ring-danger/50'
      )}
    >
      {/* Animated background pulse */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-xl',
          isInflow ? 'bg-success/10' : 'bg-danger/10'
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
            {isInflow ? (
              <TrendingUp className="h-6 w-6 text-success" aria-hidden />
            ) : (
              <TrendingDown className="h-6 w-6 text-danger" aria-hidden />
            )}
            <span
              className={cn(
                'text-lg font-bold',
                isInflow ? 'text-success' : 'text-danger'
              )}
            >
              {flow.name}
            </span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {flow.companyCount}개 기업
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div
              className={cn(
                'text-lg sm:text-2xl font-bold tabular-nums',
                isInflow ? 'text-success' : 'text-danger'
              )}
            >
              {isInflow ? '+' : '-'}
              {formatFlowAmount(flow.flowAmount)}
            </div>
            <div
              className={cn(
                'text-xs sm:text-sm opacity-70 tabular-nums',
                isInflow ? 'text-success' : 'text-danger'
              )}
            >
              ({formatKrw(flow.flowAmount)})
            </div>
            <div
              className={cn(
                'text-sm tabular-nums',
                isInflow ? 'text-success' : 'text-danger'
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
                ? 'bg-success/15 text-success'
                : 'bg-danger/15 text-danger'
            )}
          >
            {isInflow ? '유입 ↑' : '유출 ↓'}
          </span>
        </div>

        {/* MFI Bar */}
        {flow.mfi !== null && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">MFI</span>
            <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  flow.mfi >= 50 ? 'bg-success' : 'bg-warning'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${flow.mfi}%` }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              />
            </div>
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                flow.mfi >= 50 ? 'text-success' : 'text-warning'
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
