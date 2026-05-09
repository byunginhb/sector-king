/**
 * 전문가/초보자 segment control.
 */
'use client'

import { cn } from '@/lib/utils'

export type ReportView = 'expert' | 'novice'

interface ViewToggleProps {
  value: ReportView
  onChange: (v: ReportView) => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="리포트 뷰 선택"
      className={cn(
        'inline-flex items-center rounded-lg border border-border-subtle bg-surface-1 p-0.5 text-xs sm:text-sm',
        className
      )}
    >
      <Tab
        active={value === 'expert'}
        onClick={() => onChange('expert')}
        label="전문가용"
      />
      <Tab
        active={value === 'novice'}
        onClick={() => onChange('novice')}
        label="초보자용"
      />
    </div>
  )
}

function Tab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 sm:px-4 rounded-md font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}
