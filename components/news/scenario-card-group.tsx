/**
 * Bear / Base / Bull 3분할 시나리오 카드.
 */
import { TrendingDown, Minus, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScenarioItem, ScenarioKind } from '@/drizzle/supabase-schema'

interface ScenarioCardGroupProps {
  scenarios: {
    bear: ScenarioItem
    base: ScenarioItem
    bull: ScenarioItem
  }
}

const META: Record<
  ScenarioKind,
  {
    label: string
    Icon: typeof TrendingDown
    border: string
    accent: string
    bg: string
  }
> = {
  bear: {
    label: 'Bear · 약세',
    Icon: TrendingDown,
    border: 'border-danger/40',
    accent: 'text-danger',
    bg: 'bg-danger/5',
  },
  base: {
    label: 'Base · 기본',
    Icon: Minus,
    border: 'border-border-subtle',
    accent: 'text-muted-foreground',
    bg: 'bg-surface-1',
  },
  bull: {
    label: 'Bull · 강세',
    Icon: TrendingUp,
    border: 'border-success/40',
    accent: 'text-success',
    bg: 'bg-success/5',
  },
}

export function ScenarioCardGroup({ scenarios }: ScenarioCardGroupProps) {
  const order: ScenarioKind[] = ['bear', 'base', 'bull']
  return (
    <div
      role="group"
      aria-label="시나리오 분석"
      className="grid grid-cols-1 lg:grid-cols-3 gap-3"
    >
      {order.map((kind) => {
        const it = scenarios[kind]
        const meta = META[kind]
        const Icon = meta.Icon
        return (
          <article
            key={kind}
            aria-labelledby={`scenario-${kind}`}
            className={cn(
              'rounded-2xl border p-4 sm:p-5 flex flex-col',
              meta.border,
              meta.bg
            )}
          >
            <header className="flex items-center gap-2 mb-2">
              <Icon className={cn('h-4 w-4', meta.accent)} aria-hidden />
              <h3
                id={`scenario-${kind}`}
                className={cn('text-sm font-bold uppercase tracking-wide', meta.accent)}
              >
                {meta.label}
              </h3>
            </header>
            <p className="text-sm text-foreground/90 leading-relaxed flex-1">
              {it.body}
            </p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border-subtle pt-2">
              <span className="font-semibold uppercase tracking-wide">트리거</span>{' '}
              {it.trigger}
            </p>
          </article>
        )
      })}
    </div>
  )
}
