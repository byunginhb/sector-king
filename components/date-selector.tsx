'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { formatDate, toLocalDateString } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DateSelectorProps {
  availableDates: string[]
  selectedDate: string | null
  latestDate: string | null
  onDateChange: (date: string | null) => void
}

export function DateSelector({
  availableDates,
  selectedDate,
  latestDate,
  onDateChange,
}: DateSelectorProps) {
  const [open, setOpen] = useState(false)
  const isHistorical = selectedDate !== latestDate

  // Convert string dates to Date objects for the calendar
  const availableDateSet = new Set(availableDates)

  // Parse selected date to Date object
  const selectedDateObj = selectedDate ? new Date(selectedDate) : undefined

  // Function to check if a date is available (has saved data)
  const isDateAvailable = (date: Date) => {
    const dateStr = toLocalDateString(date)
    return availableDateSet.has(dateStr)
  }

  // Handle date selection
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const dateStr = toLocalDateString(date)
      if (availableDateSet.has(dateStr)) {
        onDateChange(dateStr)
        setOpen(false)
      }
    }
  }

  // Get the month to display (latest available date's month or current month)
  const defaultMonth = latestDate
    ? new Date(latestDate)
    : new Date()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-tour="date-selector"
          className={cn(
            'gap-2 text-xs font-medium',
            isHistorical &&
              'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50'
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {selectedDate ? formatDate(selectedDate) : '날짜 선택'}
          {isHistorical && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 text-[10px]">
              과거
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-3 border-b border-border">
          <p className="text-xs text-muted-foreground font-medium">저장된 날짜만 선택 가능</p>
        </div>
        <Calendar
          mode="single"
          selected={selectedDateObj}
          onSelect={handleSelect}
          defaultMonth={defaultMonth}
          disabled={(date) => !isDateAvailable(date)}
          modifiers={{
            available: (date) => isDateAvailable(date),
            latest: (date) => {
              const dateStr = toLocalDateString(date)
              return dateStr === latestDate
            },
          }}
          modifiersClassNames={{
            available:
              'font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/50',
            latest: 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-background',
          }}
          classNames={{
            day: 'h-8 w-8 p-0 font-normal aria-selected:opacity-100',
          }}
        />
        {latestDate && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded ring-2 ring-emerald-400" />
              <span>최신 데이터</span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
