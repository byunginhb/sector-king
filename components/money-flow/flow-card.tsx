'use client'

import { motion } from 'framer-motion'
import type { SectorMoneyFlow } from '@/types'
import { cn } from '@/lib/utils'

interface FlowCardProps {
  flow: SectorMoneyFlow
  index: number
  maxFlow: number
  onClick?: () => void
  isExpanded?: boolean
}

function formatAmount(amount: number): string {
  const absAmount = Math.abs(amount)
  if (absAmount >= 1e12) {
    return `$${(absAmount / 1e12).toFixed(1)}T`
  }
  if (absAmount >= 1e9) {
    return `$${(absAmount / 1e9).toFixed(1)}B`
  }
  if (absAmount >= 1e6) {
    return `$${(absAmount / 1e6).toFixed(1)}M`
  }
  return `$${absAmount.toLocaleString()}`
}

// Money particle for inflow - from LEFT side
function InflowParticleLeft({ index, delay }: { index: number; delay: number }) {
  const startX = -60 - Math.random() * 40
  const startY = 30 + Math.random() * 60
  const endX = 80 + Math.random() * 60
  const endY = 40 + Math.random() * 40

  return (
    <motion.div
      className="absolute text-2xl pointer-events-none select-none z-20"
      style={{ left: 0, top: 0 }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0.3 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0.5, 0],
        scale: [0.3, 1.3, 1.1, 0.8, 0],
        rotate: [0, 15, 5, -5, 0],
      }}
      transition={{
        duration: 2.5,
        delay: delay + index * 0.5,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.2, 0.5, 0.8, 1],
      }}
    >
      💵
    </motion.div>
  )
}

// Money particle for inflow - from RIGHT side
function InflowParticleRight({ index, delay }: { index: number; delay: number }) {
  const startX = 280 + Math.random() * 40
  const startY = 30 + Math.random() * 60
  const endX = 120 + Math.random() * 60
  const endY = 40 + Math.random() * 40

  return (
    <motion.div
      className="absolute text-2xl pointer-events-none select-none z-20"
      style={{ left: 0, top: 0 }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0.3 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0.5, 0],
        scale: [0.3, 1.3, 1.1, 0.8, 0],
        rotate: [0, -15, -5, 5, 0],
      }}
      transition={{
        duration: 2.5,
        delay: delay + index * 0.5 + 0.2,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.2, 0.5, 0.8, 1],
      }}
    >
      💵
    </motion.div>
  )
}

// Money particle for outflow - to LEFT side
function OutflowParticleLeft({ index, delay }: { index: number; delay: number }) {
  const startX = 100 + Math.random() * 60
  const startY = 40 + Math.random() * 40
  const endX = -60 - Math.random() * 40
  const endY = 20 + Math.random() * 80

  return (
    <motion.div
      className="absolute text-2xl pointer-events-none select-none z-20"
      style={{ left: 0, top: 0 }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 1 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0.5, 0],
        scale: [0.8, 1.2, 1, 0.6, 0.2],
        rotate: [0, -20, -45, -70, -90],
      }}
      transition={{
        duration: 2,
        delay: delay + index * 0.4,
        repeat: Infinity,
        ease: 'easeIn',
        times: [0, 0.15, 0.5, 0.8, 1],
      }}
    >
      💸
    </motion.div>
  )
}

// Money particle for outflow - to RIGHT side
function OutflowParticleRight({ index, delay }: { index: number; delay: number }) {
  const startX = 100 + Math.random() * 60
  const startY = 40 + Math.random() * 40
  const endX = 280 + Math.random() * 40
  const endY = 20 + Math.random() * 80

  return (
    <motion.div
      className="absolute text-2xl pointer-events-none select-none z-20"
      style={{ left: 0, top: 0 }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 1 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0.5, 0],
        scale: [0.8, 1.2, 1, 0.6, 0.2],
        rotate: [0, 20, 45, 70, 90],
      }}
      transition={{
        duration: 2,
        delay: delay + index * 0.4 + 0.2,
        repeat: Infinity,
        ease: 'easeIn',
        times: [0, 0.15, 0.5, 0.8, 1],
      }}
    >
      💸
    </motion.div>
  )
}

// Coin particle for inflow - from left
function CoinParticleInflowLeft({ index, delay }: { index: number; delay: number }) {
  const size = 10 + Math.random() * 6
  const startX = -40 - Math.random() * 30
  const startY = 40 + Math.random() * 50
  const endX = 70 + Math.random() * 50
  const endY = 50 + Math.random() * 30

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        boxShadow: '0 2px 10px rgba(251, 191, 36, 0.6)',
      }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0],
        scale: [0.2, 1.2, 1, 0.3],
      }}
      transition={{
        duration: 2,
        delay: delay + index * 0.35,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.25, 0.7, 1],
      }}
    />
  )
}

// Coin particle for inflow - from right
function CoinParticleInflowRight({ index, delay }: { index: number; delay: number }) {
  const size = 10 + Math.random() * 6
  const startX = 260 + Math.random() * 30
  const startY = 40 + Math.random() * 50
  const endX = 130 + Math.random() * 50
  const endY = 50 + Math.random() * 30

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        boxShadow: '0 2px 10px rgba(251, 191, 36, 0.6)',
      }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0],
        scale: [0.2, 1.2, 1, 0.3],
      }}
      transition={{
        duration: 2,
        delay: delay + index * 0.35 + 0.15,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.25, 0.7, 1],
      }}
    />
  )
}

// Coin particle for outflow - to left
function CoinParticleOutflowLeft({ index, delay }: { index: number; delay: number }) {
  const size = 10 + Math.random() * 6
  const startX = 100 + Math.random() * 40
  const startY = 50 + Math.random() * 30
  const endX = -50 - Math.random() * 30
  const endY = 30 + Math.random() * 60

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
        boxShadow: '0 2px 10px rgba(148, 163, 184, 0.6)',
      }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 1 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 0.8, 0],
        scale: [0.8, 1.1, 0.7, 0.2],
      }}
      transition={{
        duration: 1.8,
        delay: delay + index * 0.3,
        repeat: Infinity,
        ease: 'easeIn',
        times: [0, 0.2, 0.6, 1],
      }}
    />
  )
}

// Coin particle for outflow - to right
function CoinParticleOutflowRight({ index, delay }: { index: number; delay: number }) {
  const size = 10 + Math.random() * 6
  const startX = 100 + Math.random() * 40
  const startY = 50 + Math.random() * 30
  const endX = 270 + Math.random() * 30
  const endY = 30 + Math.random() * 60

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
        boxShadow: '0 2px 10px rgba(148, 163, 184, 0.6)',
      }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 1 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 0.8, 0],
        scale: [0.8, 1.1, 0.7, 0.2],
      }}
      transition={{
        duration: 1.8,
        delay: delay + index * 0.3 + 0.15,
        repeat: Infinity,
        ease: 'easeIn',
        times: [0, 0.2, 0.6, 1],
      }}
    />
  )
}

export function FlowCard({ flow, index, maxFlow, onClick, isExpanded }: FlowCardProps) {
  const isInflow = flow.flowDirection === 'in'
  const flowRatio = Math.min(flow.flowAmount / maxFlow, 1)
  const particleCount = Math.max(Math.floor(flowRatio * 4), 2)
  const coinCount = Math.max(Math.floor(flowRatio * 3), 2)

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

      {/* Money particles - one direction only */}
      {isInflow ? (
        <>
          {/* From LEFT into card */}
          {Array.from({ length: particleCount }).map((_, i) => (
            <InflowParticleLeft key={`inflow-${i}`} index={i} delay={index * 0.15} />
          ))}
          {/* Coins from LEFT */}
          {Array.from({ length: coinCount }).map((_, i) => (
            <CoinParticleInflowLeft key={`coin-${i}`} index={i} delay={index * 0.1} />
          ))}
        </>
      ) : (
        <>
          {/* To RIGHT out of card */}
          {Array.from({ length: particleCount }).map((_, i) => (
            <OutflowParticleRight key={`outflow-${i}`} index={i} delay={index * 0.15} />
          ))}
          {/* Coins to RIGHT */}
          {Array.from({ length: coinCount }).map((_, i) => (
            <CoinParticleOutflowRight key={`coin-${i}`} index={i} delay={index * 0.1} />
          ))}
        </>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.span
              className="text-2xl"
              animate={{
                scale: [1, 1.2, 1],
                rotate: isInflow ? [0, 10, 0] : [0, -10, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {isInflow ? '💰' : '💸'}
            </motion.span>
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
            <motion.div
              className={cn(
                'text-2xl font-bold',
                isInflow
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              )}
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {isInflow ? '+' : '-'}
              {formatAmount(flow.flowAmount)}
            </motion.div>
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
          <motion.div
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
              isInflow
                ? 'bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300'
                : 'bg-blue-200 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300'
            )}
            animate={{
              x: isInflow ? [5, 0, 5] : [-5, 0, -5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {isInflow ? (
              <>
                <span>유입</span>
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  →
                </motion.span>
              </>
            ) : (
              <>
                <motion.span
                  animate={{ x: [0, -3, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  ←
                </motion.span>
                <span>유출</span>
              </>
            )}
          </motion.div>
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
