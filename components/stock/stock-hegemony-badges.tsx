'use client'

import { ShieldCheck, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getRankStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { CompanyDetailResponse } from '@/types'

type Sectors = CompanyDetailResponse['sectors']

interface StockHegemonyBadgesProps {
  sectors: Sectors
}

/** 종목이 속한 섹터별 패권 순위 뱃지. */
export function StockHegemonyBadges({ sectors }: StockHegemonyBadgesProps) {
  if (!sectors || sectors.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" aria-hidden />
        패권 영역
      </h3>
      <div className="flex flex-wrap gap-2">
        {sectors.map(({ sector, rank }) => {
          const style = getRankStyle(rank)
          return (
            <Badge key={sector.id} className={cn('border font-medium', style.badge)}>
              {rank === 1 && (
                <Star className="inline h-3 w-3 mr-1 fill-primary text-primary" aria-hidden />
              )}
              {sector.name}: {style.label}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
