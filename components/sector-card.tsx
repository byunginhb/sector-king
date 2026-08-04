'use client'

import { CompanyBadge } from './company-badge'
import type { SectorCompanyWithDetails } from '@/types'

interface Sector {
  id: string
  name: string
  nameEn: string | null
}

interface SectorCardProps {
  sector: Sector
  companies: SectorCompanyWithDetails[]
  isHistorical?: boolean
  isFirstSector?: boolean
}

export function SectorCard({ sector, companies, isHistorical = false, isFirstSector = false }: SectorCardProps) {
  return (
    <div className="bg-surface-1 rounded-md border border-border-subtle p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md transition-all dark:bg-card/80 dark:border-border dark:shadow-none dark:hover:bg-card">
      {/* Sector Header */}
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">{sector.name}</h3>
        {sector.nameEn && (
          <span className="text-xs text-muted-foreground">{sector.nameEn}</span>
        )}
      </div>

      {/* Company Badges */}
      <div className="flex flex-wrap gap-2">
        {companies.map((sc, i) => (
          <CompanyBadge key={`${sc.sectorId}-${sc.ticker}`} sectorCompany={sc} isHistorical={isHistorical} isFirst={isFirstSector && i === 0} />
        ))}
      </div>
    </div>
  )
}
