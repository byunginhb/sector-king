'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import type { RankingItem } from '@/app/api/rankings/route'
import type { RankingHorizon, RankingSortDir } from '@/lib/api-helpers'
import type { RankingSortKey } from '@/hooks/use-rankings'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ScoreBar } from './score-bar'
import { RecommendationBadge } from './recommendation-badge'
import { InfoTip } from './info-tip'

interface RankingTableProps {
  items: RankingItem[]
  horizon: RankingHorizon
  sortKey: RankingSortKey
  sortDir: RankingSortDir
  onSort: (key: RankingSortKey) => void
  onRowClick: (ticker: string) => void
}

interface ColumnDef {
  key: RankingSortKey | null
  label: string
  /** 헤더 옆 초보자 설명. */
  tip?: string
  /** 반응형 노출 클래스(좁은 화면 숨김). */
  cellClass?: string
  align?: 'left' | 'right' | 'center'
}

const COLUMNS: ColumnDef[] = [
  { key: null, label: '순위', align: 'center' },
  { key: 'name', label: '종목', align: 'left' },
  {
    key: 'short',
    label: '단기 점수',
    tip: '지금 분위기·흐름이 좋은지 0~100으로 나타낸 값.',
    align: 'left',
  },
  {
    key: 'long',
    label: '장기 점수',
    tip: '오래 묵힐 만한 가치가 있는지 0~100으로 나타낸 값.',
    align: 'left',
  },
  {
    key: 'rec',
    label: '투자의견',
    tip: '증권사들이 사라/팔라 등 어떻게 보는지 모은 의견.',
    align: 'left',
  },
  {
    key: 'target',
    label: '목표주가',
    tip: '증권사들이 적정하다고 본 주가의 평균.',
    align: 'right',
  },
  {
    key: 'upside',
    label: '상승여력',
    tip: '목표주가까지 현재가가 얼마나 오를 여지가 있는지.',
    align: 'right',
  },
  {
    key: 'roe',
    label: 'ROE',
    tip: '자기 돈으로 얼마나 잘 버는지(자본 대비 이익률).',
    cellClass: 'hidden lg:table-cell',
    align: 'right',
  },
  {
    key: 'margin',
    label: '영업이익률',
    tip: '매출 중 본업으로 남긴 이익의 비율.',
    cellClass: 'hidden xl:table-cell',
    align: 'right',
  },
]

function SortHeader({
  col,
  activeKey,
  dir,
  horizon,
  onSort,
}: {
  col: ColumnDef
  activeKey: RankingSortKey
  dir: RankingSortDir
  horizon: RankingHorizon
  onSort: (key: RankingSortKey) => void
}) {
  const isActive = col.key !== null && col.key === activeKey
  // 토글이 부각하는 점수 컬럼: 헤더에 amber 밑줄로 선택 상태 연동.
  const isHorizonCol = col.key === horizon
  const ariaSort = isActive ? (dir === 'asc' ? 'ascending' : 'descending') : undefined
  const alignClass =
    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'

  if (col.key === null) {
    return (
      <th
        scope="col"
        className={cn(
          'eyebrow px-3 py-2.5 font-medium normal-case tracking-normal',
          alignClass,
          col.cellClass
        )}
      >
        {col.label}
      </th>
    )
  }

  const Arrow = dir === 'asc' ? ChevronUp : ChevronDown

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        'px-3 py-2.5 text-xs font-medium',
        alignClass,
        isHorizonCol && 'bg-primary/5',
        col.cellClass
      )}
    >
      <span
        className={cn(
          'relative inline-flex items-center gap-1',
          col.align === 'right' && 'flex-row-reverse'
        )}
      >
        <button
          type="button"
          onClick={() => col.key && onSort(col.key)}
          className={cn(
            'inline-flex items-center gap-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isHorizonCol
              ? 'text-primary font-semibold'
              : isActive
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span>{col.label}</span>
          {isActive && <Arrow className="h-3 w-3 shrink-0" aria-hidden />}
        </button>
        {col.tip && <InfoTip text={col.tip} label={col.label} />}
      </span>
    </th>
  )
}

export function RankingTable({
  items,
  horizon,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
}: RankingTableProps) {
  const fmt = useCurrencyFormat()

  return (
    <div className="overflow-x-auto rounded-md border border-border-subtle">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-1">
            {COLUMNS.map((col, idx) => (
              <SortHeader
                key={col.key ?? `col-${idx}`}
                col={col}
                activeKey={sortKey}
                dir={sortDir}
                horizon={horizon}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const rank = idx + 1
            const isTop3 = rank <= 3
            const displayName = item.nameKo ?? item.name ?? item.ticker
            const upTone =
              item.upsidePct == null
                ? 'text-muted-foreground'
                : item.upsidePct >= 0
                  ? 'text-success'
                  : 'text-danger'

            return (
              <tr
                key={item.ticker}
                onClick={() => onRowClick(item.ticker)}
                className={cn(
                  'cursor-pointer border-b border-border-subtle/70 transition-colors last:border-b-0 hover:bg-surface-2',
                  isTop3 && 'border-l-2 border-l-primary/40'
                )}
              >
                {/* 순위 */}
                <td className="px-3 py-2.5 text-center">
                  <span
                    className={cn(
                      'num-mono tabular-nums',
                      isTop3
                        ? 'text-base font-bold text-primary'
                        : 'text-sm text-muted-foreground'
                    )}
                  >
                    {rank}
                  </span>
                </td>

                {/* 종목 */}
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRowClick(item.ticker)
                    }}
                    className="rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="block font-semibold leading-tight text-foreground line-clamp-1">
                      {displayName}
                    </span>
                    <span className="num-mono mt-0.5 block text-[11px] text-muted-foreground">
                      {item.ticker}
                    </span>
                  </button>
                </td>

                {/* 단기 점수 */}
                <td className={cn('px-3 py-2.5', horizon === 'short' && 'bg-primary/5')}>
                  <ScoreBar
                    score={item.shortScore}
                    emphasized={horizon === 'short'}
                    label="단기 점수"
                  />
                  {item.momentumPartial && (
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      추세 데이터 짧음
                    </span>
                  )}
                </td>

                {/* 장기 점수 */}
                <td className={cn('px-3 py-2.5', horizon === 'long' && 'bg-primary/5')}>
                  <ScoreBar
                    score={item.longScore}
                    emphasized={horizon === 'long'}
                    label="장기 점수"
                  />
                </td>

                {/* 투자의견 */}
                <td className="px-3 py-2.5">
                  <RecommendationBadge
                    recommendationKey={item.recommendationKey}
                    analystCount={item.analystCount}
                  />
                </td>

                {/* 목표주가 */}
                <td className="px-3 py-2.5 text-right num-mono tabular-nums">
                  {item.targetMeanPriceUsd != null ? (
                    fmt.price(item.targetMeanPriceUsd)
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>

                {/* 상승여력 */}
                <td className={cn('px-3 py-2.5 text-right num-mono tabular-nums', upTone)}>
                  {item.upsidePct != null ? (
                    formatPercent(item.upsidePct)
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>

                {/* ROE */}
                <td className="px-3 py-2.5 text-right num-mono tabular-nums hidden lg:table-cell">
                  {item.returnOnEquity != null ? (
                    formatPercent(item.returnOnEquity)
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>

                {/* 영업이익률 */}
                <td className="px-3 py-2.5 text-right num-mono tabular-nums hidden xl:table-cell">
                  {item.operatingMargin != null ? (
                    formatPercent(item.operatingMargin)
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
