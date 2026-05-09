'use client'

import { useIndustries } from '@/hooks/use-industries'
import { IndustryIcon } from '@/components/ui/industry-icon'
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
      <IndustryIcon
        iconKey={industry.id}
        className="h-4 w-4 text-muted-foreground"
      />
      <span>{industry.name}</span>
    </span>
  )
}
