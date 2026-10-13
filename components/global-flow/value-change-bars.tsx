'use client'

import { useMemo } from 'react'
import type { AssetRow } from '@/lib/global-flow/compute'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import { fmtPct, signed, toneOf } from './format'

interface Props {
  assets: AssetRow[]
  focusId: string | null
  onFocus: (id: string) => void
}

/**
 * ② 가치 증감 순위 — 0 을 가운데 둔 발산 막대.
 * 막대 사이에 화살표를 그리지 않는다: A 의 감소와 B 의 증가는 같은 돈의 이동이 아니다.
 */
export function ValueChangeBars({ assets, focusId, onFocus }: Props) {
  const fmt = useCurrencyFormat()
  const { rows, unsized, max } = useMemo(() => {
    const sized = assets
      .filter((a): a is AssetRow & { valueChangeUsd: number } => a.valueChangeUsd != null)
      .sort((a, b) => b.valueChangeUsd - a.valueChangeUsd)
    return {
      rows: sized,
      unsized: assets.filter((a) => a.valueChangeUsd == null && a.returnPct != null),
      max: Math.max(...sized.map((a) => Math.abs(a.valueChangeUsd)), 1),
    }
  }, [assets])

  return (
    <div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((a) => {
          const width = Math.max(1.5, (Math.abs(a.valueChangeUsd) / max) * 50)
          const up = a.valueChangeUsd >= 0
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onFocus(a.id)}
                aria-pressed={focusId === a.id}
                className={cn(
                  'grid w-full grid-cols-[6.5rem_1fr_5.5rem] items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors hover:bg-surface-2 sm:grid-cols-[8rem_1fr_7rem] sm:text-sm',
                  focusId === a.id && 'bg-surface-2',
                )}
              >
                <span className="truncate font-medium text-foreground">{a.name}</span>
                <span className="relative h-4" aria-hidden>
                  <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <span
                    className={cn(
                      'absolute inset-y-0.5 rounded-sm',
                      up ? 'bg-success/70' : 'bg-danger/70',
                    )}
                    style={
                      up
                        ? { left: '50%', width: `${width}%` }
                        : { right: '50%', width: `${width}%` }
                    }
                  />
                </span>
                <span className="text-right">
                  <span className={cn('block num-mono', toneOf(a.valueChangeUsd))}>
                    {signed(a.valueChangeUsd, fmt.flowAmount)}
                  </span>
                  <span className="block num-mono text-[11px] text-muted-foreground">
                    {fmtPct(a.returnPct)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {unsized.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          가치 미집계(수익률만):{' '}
          {unsized.map((a, i) => (
            <span key={a.id}>
              {i > 0 && ' · '}
              {a.name}{' '}
              <span className={cn('num-mono', toneOf(a.returnPct))}>{fmtPct(a.returnPct)}</span>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
