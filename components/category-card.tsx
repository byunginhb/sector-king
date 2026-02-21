'use client'

import { Card, CardContent } from '@/components/ui/card'
import { SectorCard } from './sector-card'
import { getCategoryStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { SectorCompanyWithDetails } from '@/types'

interface Sector {
  id: string
  name: string
  nameEn: string | null
  order: number
}

interface SectorWithCompanies extends Sector {
  companies: SectorCompanyWithDetails[]
}

interface Category {
  id: string
  name: string
  nameEn: string | null
}

interface CategoryCardProps {
  category: Category
  sectors: SectorWithCompanies[]
  isHistorical?: boolean
  isFirst?: boolean
}

export function CategoryCard({ category, sectors, isHistorical = false, isFirst = false }: CategoryCardProps) {
  const style = getCategoryStyle(category.id)

  return (
    <Card className={cn('overflow-hidden border shadow-sm', style.card)} {...(isFirst ? { 'data-tour': 'category-card' } : {})}>
      {/* Category Header with accent bar */}
      <div className={cn('px-4 py-3 border-b', style.header)}>
        <div className="flex items-center gap-2">
          <div className={cn('w-1 h-5 rounded-full', style.accent)} />
          <h2 className="text-lg font-bold tracking-tight">{category.name}</h2>
          {category.nameEn && (
            <span className="text-sm font-normal opacity-60">{category.nameEn}</span>
          )}
        </div>
      </div>

      {/* Sectors */}
      <CardContent className="p-3 space-y-2">
        {sectors.map((sector, i) => (
          <SectorCard key={sector.id} sector={sector} companies={sector.companies} isHistorical={isHistorical} isFirstSector={isFirst && i === 0} />
        ))}
      </CardContent>
    </Card>
  )
}
