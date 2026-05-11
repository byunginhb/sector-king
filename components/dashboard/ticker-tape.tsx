'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useDailyMovers } from '@/hooks/use-daily-movers'
import { CompanyDetail } from '@/components/company-detail'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { RegionFilter } from '@/types'

interface TickerTapeProps {
  region?: RegionFilter
  /** 핫 종목 개수 (상승+하락 합계). 기본 20 */
  limit?: number
}

interface TickerItem {
  ticker: string
  name: string | null
  nameKo?: string | null
  percentChange: number
}

/**
 * 핫 종목 marquee 띠
 *
 * - 가장 최근 영업일 기준 등락률 절댓값 Top N 종목을 무한 가로 스크롤
 * - hover 시 정지 (CSS animation-play-state)
 * - 항목 클릭 시 회사 상세 모달 오픈
 * - reduced-motion 사용자에게는 정적으로 노출 (CSS 단)
 *
 * 데이터 소스: `useDailyMovers` (`daily_snapshots.price_change` percent 컬럼).
 * `usePriceChanges({ days: 1 })` 의 0% 캐리 이슈(한국 휴장일)를 우회한다.
 */
export function TickerTape({ region = 'all', limit = 20 }: TickerTapeProps) {
  const { data, isLoading } = useDailyMovers({ region, limit })

  const items = useMemo<TickerItem[]>(() => {
    if (!data?.items) return []
    return data.items.map((c) => ({
      ticker: c.ticker,
      name: c.name,
      nameKo: c.nameKo,
      percentChange: c.percentChange,
    }))
  }, [data?.items])

  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  if (isLoading || items.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3 overflow-hidden">
        <div className="text-xs text-muted-foreground tabular-nums">
          {isLoading ? '핫 종목 불러오는 중…' : '오늘 추적할 핫 종목이 없습니다'}
        </div>
      </div>
    )
  }

  // 트리플 트랙 (무한 루프 — items가 적을수록 더 많이 복제하여 와이드 데스크탑 빈 영역 방지)
  const dualItems = items.length < 6
    ? [...items, ...items, ...items, ...items]
    : [...items, ...items, ...items]

  return (
    <>
      <div
        className="ticker-tape group rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden"
        aria-label="오늘의 핫 종목"
        aria-live="off"
      >
        <div className="ticker-track flex gap-6 px-4 py-3 will-change-transform">
          {dualItems.map((item, i) => (
            <button
              key={`${item.ticker}-${i}`}
              type="button"
              onClick={() => setSelectedTicker(item.ticker)}
              aria-label={`${item.nameKo || item.name || item.ticker} 상세 보기, ${item.percentChange > 0 ? '+' : ''}${item.percentChange.toFixed(2)}%`}
              className="inline-flex items-center gap-2 shrink-0 rounded-md px-2 py-1 hover:bg-surface-2 transition-colors text-left"
            >
              <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                {item.ticker.replace(/\.(KS|KQ)$/, '')}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-1 max-w-[120px]">
                {item.nameKo || item.name}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
                  item.percentChange > 0
                    ? 'text-success'
                    : item.percentChange < 0
                      ? 'text-danger'
                      : 'text-muted-foreground'
                )}
              >
                {item.percentChange > 0 ? (
                  <TrendingUp className="h-3 w-3" aria-hidden />
                ) : item.percentChange < 0 ? (
                  <TrendingDown className="h-3 w-3" aria-hidden />
                ) : null}
                {item.percentChange > 0 ? '+' : ''}
                {item.percentChange.toFixed(2)}%
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog
        open={!!selectedTicker}
        onOpenChange={(open) => !open && setSelectedTicker(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicker && <CompanyDetail ticker={selectedTicker} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
