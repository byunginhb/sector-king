'use client'

import { useIndustries } from '@/hooks/use-industries'
import { cn } from '@/lib/utils'

interface IndustryTitleProps {
  industryId: string
  className?: string
}

export function IndustryTitle({ industryId, className }: IndustryTitleProps) {
  const { data } = useIndustries()

  const industry = data?.industries.find((i) => i.id === industryId)

  if (!industry) return null

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {industry.icon && <span>{industry.icon}</span>}
      <span>{industry.name}</span>
    </span>
  )
}
