'use client'

import { useState } from 'react'
import { useMapData } from '@/hooks/use-map-data'
import { CategoryCard } from './category-card'
import { DateSelector } from './date-selector'
import { ThemeToggle } from './theme-toggle'
import { CompanyStatistics } from './company-statistics'
import { PriceChangeCard } from './price-change-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function HegemonyMap() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const { data, isLoading, error } = useMapData({ date: selectedDate })

  if (isLoading) return <MapSkeleton />
  if (error) return <MapError error={error} />
  if (!data) return null

  const {
    categories,
    sectors,
    sectorCompanies,
    lastUpdated,
    availableDates,
    isHistorical,
  } = data

  // Group sectors by category, and companies by sector
  const sectorsByCategory = categories.map((cat) => ({
    ...cat,
    sectors: sectors
      .filter((s) => s.categoryId === cat.id)
      .map((sector) => ({
        ...sector,
        companies: sectorCompanies.filter((sc) => sc.sectorId === sector.id),
      }))
      .sort((a, b) => a.order - b.order),
  }))

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <span className="bg-linear-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                  Sector King
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                투자 패권 지도 - 2026년 테크 산업편
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <DateSelector
                availableDates={availableDates}
                selectedDate={data.selectedDate}
                latestDate={lastUpdated}
                onDateChange={setSelectedDate}
              />
            </div>
          </div>

          {/* Historical Mode Banner */}
          {isHistorical && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">
                  {formatDate(data.selectedDate || '')} 기준 데이터를 보고 있습니다.
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  뱃지에 표시된 변화율은 현재가 대비 변화입니다.
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Mobile: Tab Navigation */}
        <div className="block lg:hidden">
          <Tabs defaultValue={categories[0]?.id}>
            <ScrollArea className="w-full whitespace-nowrap pb-3">
              <TabsList className="inline-flex bg-muted p-1">
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="text-sm px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {sectorsByCategory.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-4">
                <CategoryCard
                  category={cat}
                  sectors={cat.sectors}
                  isHistorical={isHistorical}
                />
              </TabsContent>
            ))}
          </Tabs>

          {/* Mobile Statistics Cards - Below category cards */}
          <div className="mt-6 space-y-4">
            <CompanyStatistics sectorCompanies={sectorCompanies} />
            <PriceChangeCard />
          </div>
        </div>

        {/* Desktop: Grid Layout with Statistics Sidebar */}
        <div className="hidden lg:flex gap-6">
          <div className="flex-1 min-w-0 grid grid-cols-3 gap-5">
            {sectorsByCategory.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                sectors={cat.sectors}
                isHistorical={isHistorical}
              />
            ))}
          </div>
          <div className="w-64 shrink-0">
            <div className="sticky top-24 space-y-4">
              <CompanyStatistics sectorCompanies={sectorCompanies} />
              <PriceChangeCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function MapSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/50 overflow-hidden">
              <Skeleton className="h-12 w-full" />
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="p-3 border border-border rounded-lg bg-card/60">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-7 w-16 rounded-full" />
                      <Skeleton className="h-7 w-16 rounded-full" />
                      <Skeleton className="h-7 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function MapError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center py-12 px-6 max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    </div>
  )
}
