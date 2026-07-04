import { CalendarRange, CalendarDays, Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReportKind } from '@/lib/news/report-kind'

const CONFIG: Record<
  ReportKind,
  { label: string; Icon: typeof Newspaper; className: string }
> = {
  monthly: {
    label: '월간',
    Icon: CalendarRange,
    className: 'bg-primary/12 text-primary border-primary/30',
  },
  weekly: {
    label: '주간',
    Icon: CalendarDays,
    className: 'bg-info/12 text-info border-info/30',
  },
  daily: {
    label: '일간',
    Icon: Newspaper,
    className: 'bg-surface-2 text-muted-foreground border-border-subtle',
  },
}

/** 리포트 종류 뱃지 — lucide 아이콘만(이모지 금지). 순수 표시. */
export function ReportKindBadge({
  kind,
  className,
}: {
  kind: ReportKind
  className?: string
}) {
  const { label, Icon, className: tone } = CONFIG[kind]
  return (
    <span
      role="img"
      aria-label={`${label} 리포트`}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:text-[11px]',
        tone,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  )
}
