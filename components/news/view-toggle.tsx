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
  /** md(default) — 기존 헤더용 / lg — 콘텐츠 상단에 강조 노출용 */
  size?: 'md' | 'lg'
}

export function ViewToggle({ value, onChange, className, size = 'md' }: ViewToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="리포트 뷰 선택"
      className={cn(
        'inline-flex items-center rounded-lg border border-border-subtle bg-surface-1 p-0.5',
        size === 'lg' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm',
        className
      )}
    >
      <Tab
        active={value === 'novice'}
        onClick={() => onChange('novice')}
        label="초보자용"
        size={size}
      />
      <Tab
        active={value === 'expert'}
        onClick={() => onChange('expert')}
        label="전문가용"
        size={size}
      />
    </div>
  )
}

function Tab({
  active,
  onClick,
  label,
  size,
}: {
  active: boolean
  onClick: () => void
  label: string
  size: 'md' | 'lg'
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-md font-medium transition-colors',
        size === 'lg' ? 'px-4 py-2 sm:px-6 sm:py-2.5' : 'px-3 py-1.5 sm:px-4',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}
