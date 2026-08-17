'use client'

import { useCallback, useMemo, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useDailyMovers } from '@/hooks/use-daily-movers'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { RegionFilter } from '@/types'

interface TickerTapeProps {
  region?: RegionFilter
  /** 핫 종목 개수 (상승+하락 합계). 기본 20 */
  limit?: number
  /**
   * 산업 스코프. 지정하면 그 산업 종목만 흐른다 — 자금 흐름 카드 안에서
   * "이 산업에 뭐가 들어 있는지"를 카드를 열기 전에 보여주는 용도.
   */
  industryId?: string
  /** 시총 하한(USD). 잡주가 흐르면 정보가 아니라 소음이다. */
  minMarketCapUsd?: number
  /** 얇은 띠(카드 내부용) — 여백과 글자를 줄인다. */
  compact?: boolean
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
export function TickerTape({
  region = 'all',
  limit = 20,
  industryId,
  minMarketCapUsd,
  compact = false,
}: TickerTapeProps) {
  const { data, isLoading } = useDailyMovers({
    region,
    limit,
    industryId,
    minMarketCapUsd,
  })

  /**
   * 뷰포트 밖에서는 애니메이션을 멈춘다.
   *
   * 홈에 산업 카드가 9개면 띠도 9개다. 전부 동시에 돌면 저사양 기기에서
   * 페인트 비용이 그대로 쌓인다. 보이지 않는 띠는 움직일 이유가 없다.
   */
  const [visible, setVisible] = useState(true)
  const attachVisibility = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setVisible(e.isIntersecting)
      },
      { rootMargin: '100px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const items = useMemo<TickerItem[]>(() => {
    if (!data?.items) return []
    return data.items.map((c) => ({
      ticker: c.ticker,
      name: c.name,
      nameKo: c.nameKo,
      percentChange: c.percentChange,
    }))
  }, [data?.items])

  if (isLoading || items.length === 0) {
    // 카드 안 띠는 비어 있으면 아무것도 그리지 않는다 — 빈 껍데기가 카드
    // 높이를 먹으면 정작 카드 본문이 밀린다.
    if (compact) return null
    return (
      <div className="sk-card px-4 py-3 overflow-hidden">
        <div className="text-xs text-muted-foreground num-mono">
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
        ref={attachVisibility}
        className={cn(
          'ticker-tape group overflow-hidden',
          compact ? 'border-t border-border-subtle/60' : 'sk-card'
        )}
        aria-label={industryId ? '이 산업의 종목 시세' : '오늘의 핫 종목'}
        aria-live="off"
      >
        <div
          className={cn(
            'ticker-track flex will-change-transform',
            compact ? 'gap-4 px-3 py-1.5' : 'gap-6 px-4 py-3'
          )}
          style={visible ? undefined : { animationPlayState: 'paused' }}
        >
          {/*
            항목은 앵커다 — 새 탭·주소 복사 같은 기본 동작이 그대로 살아 있고,
            흐르는 항목을 잡아 누르는 상황에서 그 편이 안전하다.
            (예전 모달은 흐름 위에서 열려 원본 위치를 잃었다.)
          */}
          {dualItems.map((item, i) => (
            <Link
              key={`${item.ticker}-${i}`}
              href={`/stock/${encodeURIComponent(item.ticker)}`}
              aria-label={`${item.nameKo || item.name || item.ticker} 상세 보기, ${item.percentChange > 0 ? '+' : ''}${item.percentChange.toFixed(2)}%`}
              className="inline-flex items-baseline gap-2 shrink-0 rounded-sm px-2 py-1 hover:bg-surface-2 transition-colors text-left border-l border-border-subtle/0 hover:border-primary/40"
            >
              <span className={cn('font-mono font-bold text-foreground tabular-nums tracking-tight', compact ? 'text-[11px]' : 'text-xs')}>
                {item.ticker.replace(/\.(KS|KQ)$/, '')}
              </span>
              <span className={cn('text-muted-foreground line-clamp-1 max-w-[120px]', compact ? 'text-[11px]' : 'text-xs')}>
                {item.nameKo || item.name}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 num-mono text-xs',
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
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
