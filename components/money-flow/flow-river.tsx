'use client'

import { motion } from 'framer-motion'
import type { SectorMoneyFlow } from '@/types'
import { cn } from '@/lib/utils'

interface FlowRiverProps {
  flow: SectorMoneyFlow
  index: number
  maxFlow: number
}

// Format large numbers
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

// Coin particle component
function CoinParticle({
  flowId,
  isInflow,
  index,
  flowRatio,
  colors,
}: {
  flowId: string
  isInflow: boolean
  index: number
  flowRatio: number
  colors: { particle: string; particleLight: string }
}) {
  // Randomize particle properties for variety
  const size = 3 + Math.random() * 4 + flowRatio * 3
  const speed = 1.5 + Math.random() * 1.5 + (1 - flowRatio) * 1.5
  const delay = index * (0.25 + Math.random() * 0.15)
  const yOffset = (Math.random() - 0.5) * 12

  return (
    <motion.g key={index}>
      {/* Coin body */}
      <motion.circle
        r={size}
        fill={colors.particle}
        filter={`url(#coin-glow-${flowId})`}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 1, 1, 1, 0],
          scale: [0.5, 1, 1, 1, 0.5],
          cx: isInflow ? [-20, 420] : [420, -20],
          cy: [24 + yOffset, 24 + yOffset * 0.5],
        }}
        transition={{
          duration: speed,
          delay: delay,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.1, 0.5, 0.9, 1],
        }}
      />
      {/* Coin shine effect */}
      <motion.circle
        r={size * 0.4}
        fill={colors.particleLight}
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.8, 0.8, 0.8, 0],
          cx: isInflow ? [-20 - size * 0.3, 420 - size * 0.3] : [420 + size * 0.3, -20 + size * 0.3],
          cy: [24 + yOffset - size * 0.3, 24 + yOffset * 0.5 - size * 0.3],
        }}
        transition={{
          duration: speed,
          delay: delay,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.1, 0.5, 0.9, 1],
        }}
      />
    </motion.g>
  )
}

// Sparkle effect
function Sparkle({
  flowId,
  isInflow,
  index,
}: {
  flowId: string
  isInflow: boolean
  index: number
}) {
  const x = 50 + Math.random() * 300
  const y = 12 + Math.random() * 24

  return (
    <motion.circle
      r={1.5}
      fill="#fff"
      cx={x}
      cy={y}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 0.8,
        delay: index * 0.4 + Math.random() * 2,
        repeat: Infinity,
        repeatDelay: 1 + Math.random() * 2,
      }}
    />
  )
}

export function FlowRiver({ flow, index, maxFlow }: FlowRiverProps) {
  const isInflow = flow.flowDirection === 'in'
  const flowRatio = Math.min(flow.flowAmount / maxFlow, 1)
  const strokeWidth = Math.max(flowRatio * 20, 10) // Min 10px, max 20px

  // Number of particles based on flow amount
  const particleCount = Math.max(Math.floor(flowRatio * 10), 4)
  const sparkleCount = Math.max(Math.floor(flowRatio * 5), 2)

  // Colors
  const colors = isInflow
    ? {
        gradient: ['#10b981', '#34d399', '#6ee7b7'],
        particle: '#fbbf24', // Gold
        particleLight: '#fef3c7', // Light gold
        glow: 'rgba(16, 185, 129, 0.5)',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        riverGlow: '#10b981',
      }
    : {
        gradient: ['#ef4444', '#f87171', '#fca5a5'],
        particle: '#fb923c', // Orange
        particleLight: '#fed7aa', // Light orange
        glow: 'rgba(239, 68, 68, 0.5)',
        bg: 'bg-red-50 dark:bg-red-950/30',
        text: 'text-red-600 dark:text-red-400',
        riverGlow: '#ef4444',
      }

  // River path - slightly wavy
  const riverPath = isInflow
    ? 'M 0,24 C 80,20 120,28 200,24 C 280,20 320,28 400,24'
    : 'M 400,24 C 320,20 280,28 200,24 C 120,20 80,28 0,24'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn('relative rounded-xl p-4 overflow-hidden', colors.bg)}
    >
      {/* Sector Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {flow.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {flow.companyCount}개 기업
          </span>
        </div>
        <div className="text-right">
          <div className={cn('text-lg font-bold', colors.text)}>
            {isInflow ? '+' : '-'}
            {formatAmount(flow.flowAmount)}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            {isInflow ? '+' : ''}
            {flow.flowPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* River SVG */}
      <div className="relative h-14">
        <svg className="w-full h-full" viewBox="0 0 400 48" preserveAspectRatio="none">
          <defs>
            {/* Gradient for river */}
            <linearGradient
              id={`river-gradient-${flow.id}`}
              x1={isInflow ? '0%' : '100%'}
              y1="0%"
              x2={isInflow ? '100%' : '0%'}
              y2="0%"
            >
              <stop offset="0%" stopColor={colors.gradient[0]} stopOpacity={0.2} />
              <stop offset="50%" stopColor={colors.gradient[1]} stopOpacity={0.5} />
              <stop offset="100%" stopColor={colors.gradient[2]} stopOpacity={0.8} />
            </linearGradient>

            {/* Animated gradient for flowing effect */}
            <linearGradient id={`flow-gradient-${flow.id}`}>
              <motion.stop
                offset="0%"
                stopColor={colors.gradient[1]}
                stopOpacity={0.8}
                animate={{ stopOpacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.stop
                offset="100%"
                stopColor={colors.gradient[2]}
                stopOpacity={0.9}
                animate={{ stopOpacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
            </linearGradient>

            {/* Coin glow filter */}
            <filter
              id={`coin-glow-${flow.id}`}
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* River glow filter */}
            <filter
              id={`river-glow-${flow.id}`}
              x="-20%"
              y="-50%"
              width="140%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor={colors.riverGlow} floodOpacity="0.3" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* River glow background */}
          <motion.path
            d={riverPath}
            fill="none"
            stroke={colors.riverGlow}
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
            strokeOpacity={0.15}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
          />

          {/* Main River Path */}
          <motion.path
            d={riverPath}
            fill="none"
            stroke={`url(#river-gradient-${flow.id})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#river-glow-${flow.id})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
          />

          {/* Flowing highlight effect */}
          <motion.path
            d={riverPath}
            fill="none"
            stroke={colors.gradient[2]}
            strokeWidth={strokeWidth * 0.3}
            strokeLinecap="round"
            strokeOpacity={0.6}
            initial={{ pathLength: 0, pathOffset: 0 }}
            animate={{
              pathLength: [0.2, 0.2],
              pathOffset: isInflow ? [0, 1] : [1, 0],
            }}
            transition={{
              duration: 2,
              delay: index * 0.1 + 0.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Sparkles */}
          {Array.from({ length: sparkleCount }).map((_, i) => (
            <Sparkle key={`sparkle-${i}`} flowId={flow.id} isInflow={isInflow} index={i} />
          ))}

          {/* Coin Particles */}
          {Array.from({ length: particleCount }).map((_, i) => (
            <CoinParticle
              key={`coin-${i}`}
              flowId={flow.id}
              isInflow={isInflow}
              index={i}
              flowRatio={flowRatio}
              colors={colors}
            />
          ))}

        </svg>
      </div>

      {/* MFI Indicator */}
      {flow.mfi !== null && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500 dark:text-slate-400">MFI:</span>
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                flow.mfi >= 50 ? 'bg-emerald-500' : 'bg-red-500'
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
                : 'text-red-600 dark:text-red-400'
            )}
          >
            {flow.mfi.toFixed(1)}
          </span>
        </div>
      )}
    </motion.div>
  )
}
