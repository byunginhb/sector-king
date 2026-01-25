'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getRankStyle } from '@/lib/styles'
import { formatMarketCap, formatPriceChange } from '@/lib/format'
import { CompanyDetail } from './company-detail'
import type { SectorCompanyWithDetails } from '@/types'

interface CompanyBadgeProps {
  sectorCompany: SectorCompanyWithDetails
  isHistorical?: boolean
}

export function CompanyBadge({ sectorCompany, isHistorical = false }: CompanyBadgeProps) {
  const { company, rank, snapshot, notes, priceChangeFromSnapshot } = sectorCompany
  const style = getRankStyle(rank)

  const priceChangeColor =
    snapshot?.priceChange && snapshot.priceChange > 0
      ? 'text-emerald-700 dark:text-emerald-400'
      : snapshot?.priceChange && snapshot.priceChange < 0
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-slate-600 dark:text-slate-400'

  // Historical mode: price change from snapshot to current
  const historicalChangeColor =
    priceChangeFromSnapshot && priceChangeFromSnapshot > 0
      ? 'text-emerald-700 dark:text-emerald-400'
      : priceChangeFromSnapshot && priceChangeFromSnapshot < 0
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-slate-600 dark:text-slate-400'

  const historicalChangeArrow =
    priceChangeFromSnapshot && priceChangeFromSnapshot > 0
      ? '▲'
      : priceChangeFromSnapshot && priceChangeFromSnapshot < 0
        ? '▼'
        : null

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Badge
              className={cn(
                'cursor-pointer transition-all border font-medium',
                'text-xs md:text-sm',
                'px-2.5 py-1 md:px-3 md:py-1.5',
                style.badge,
                style.hover
              )}
            >
              <span className="flex items-center gap-1.5">
                {rank === 1 && <span className="text-amber-500">★</span>}
                <span className="text-[10px] opacity-70">{rank}위</span>
                {company.nameKo || company.ticker}
                {isHistorical && historicalChangeArrow && (
                  <span className={cn('text-[10px] ml-0.5', historicalChangeColor)}>
                    {historicalChangeArrow}
                  </span>
                )}
              </span>
            </Badge>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold">{company.name}</p>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {style.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{company.ticker}</p>
            {snapshot && (
              <div className="pt-1 border-t border-border space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">시총</span>
                  <span className="font-medium">{formatMarketCap(snapshot.marketCap)}</span>
                </div>
                {!isHistorical && snapshot.priceChange !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">일간 변동</span>
                    <span className={cn('font-medium', priceChangeColor)}>
                      {formatPriceChange(snapshot.priceChange)}
                    </span>
                  </div>
                )}
                {isHistorical && priceChangeFromSnapshot !== null && priceChangeFromSnapshot !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">현재가 변동</span>
                    <span className={cn('font-medium', historicalChangeColor)}>
                      {historicalChangeArrow} {formatPriceChange(priceChangeFromSnapshot)}
                    </span>
                  </div>
                )}
              </div>
            )}
            {notes && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                {notes}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <CompanyDetail ticker={company.ticker} />
      </DialogContent>
    </Dialog>
  )
}
