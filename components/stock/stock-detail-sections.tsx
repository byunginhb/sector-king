'use client'

import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { PriceChart } from '@/components/price-chart'
import { StockPriceBanner } from './stock-price-banner'
import { StockHegemonyBadges } from './stock-hegemony-badges'
import { StockScoreAnalysis } from './stock-score-analysis'
import type { CompanyDetailResponse } from '@/types'

interface StockDetailSectionsProps {
  ticker: string
  data: CompanyDetailResponse
  /** 가격 차트 노출 여부 (모달은 공간 절약 위해 숨김, 페이지는 노출) */
  showChart?: boolean
}

/**
 * 종목 상세 본문 — 모달(`CompanyDetail`)과 페이지(`StockDetailPage`)가 공유하는 콘텐츠 조립부.
 * 제목/헤더는 호출부가 담당하고, 여기서는 배너·차트·패권·점수 섹션만 렌더한다.
 */
export function StockDetailSections({ ticker, data, showChart = false }: StockDetailSectionsProps) {
  const { snapshot, score, sectors, history } = data

  return (
    <>
      <StockPriceBanner ticker={ticker} snapshot={snapshot} history={history} />

      {showChart && history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">30일 가격 추이</h3>
          <PriceChart data={history} />
        </div>
      )}

      <StockHegemonyBadges sectors={sectors} />

      {score ? (
        <StockScoreAnalysis score={score} snapshot={snapshot} />
      ) : (
        <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border-subtle p-4">
          패권 점수를 산출 중입니다. 데이터가 모이면 표시됩니다.
        </p>
      )}
    </>
  )
}

/** 종목 상세 로딩 스켈레톤 — 모달·페이지 공용. */
export function StockDetailSkeleton({ showChart = false }: { showChart?: boolean }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">종목 데이터를 불러오는 중입니다.</span>
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      {showChart && <Skeleton className="h-48 w-full rounded-lg" />}
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

/** 종목 상세 에러 상태 — 모달·페이지 공용. */
export function StockDetailError({ message }: { message?: string }) {
  return (
    <div className="p-6 text-center" role="alert">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-danger-bg flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-danger" aria-hidden />
      </div>
      <p className="text-muted-foreground">
        {message ?? '종목 데이터를 불러오지 못했습니다.'}
      </p>
    </div>
  )
}
