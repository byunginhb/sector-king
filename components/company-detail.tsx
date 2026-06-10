'use client'

import Link from 'next/link'
import { Maximize2 } from 'lucide-react'
import { useCompany } from '@/hooks/use-company'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  StockDetailSections,
  StockDetailSkeleton,
  StockDetailError,
} from '@/components/stock/stock-detail-sections'
import { RegionBadge } from '@/components/stock/stock-price-banner'

interface CompanyDetailProps {
  ticker: string
}

/**
 * 모달용 종목 상세.
 * 본문 섹션(배너/패권/점수)은 `components/stock/*` 에서 추출한 공용 컴포넌트를 페이지와 공유한다.
 */
export function CompanyDetail({ ticker }: CompanyDetailProps) {
  const { data, isLoading, error } = useCompany(ticker)

  if (isLoading) {
    return <StockDetailSkeleton />
  }

  if (error || !data) {
    return <StockDetailError message="종목 데이터를 불러오지 못했습니다." />
  }

  const { company } = data

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          <span className="inline-flex flex-wrap items-center gap-2">
            {company.nameKo || company.name}
            <span className="text-muted-foreground text-base font-normal">
              ({company.ticker})
            </span>
            <RegionBadge ticker={company.ticker} />
          </span>
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">{company.name}</DialogDescription>
      </DialogHeader>

      <Link
        href={`/stock/${company.ticker}`}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-sm font-medium text-info transition-colors hover:bg-accent"
        aria-label={`${company.nameKo || company.name} 종목 전체 페이지로 이동`}
      >
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
        전체 페이지로 보기
      </Link>

      <StockDetailSections ticker={company.ticker} data={data} />
    </div>
  )
}
