'use client'

import type { ReactNode } from 'react'
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

/** DCF 빈값 사유별 초보자 친화 캡션. */
function dcfReasonCaption(reason: string | null): string {
  switch (reason) {
    case 'negativeFcf':
      return '현금흐름 마이너스라 제외'
    case 'finance':
      return '현금흐름으로 보기 어려운 업종'
    default:
      return '자료 부족'
  }
}

interface RankingTableProps {
  items: RankingItem[]
  horizon: RankingHorizon
  sortKey: RankingSortKey
  sortDir: RankingSortDir
  onSort: (key: RankingSortKey) => void
  onRowClick: (ticker: string) => void
  /** 추가 지표(PER·PEG·베타 등) 컬럼 확장 여부. */
  showAdvanced?: boolean
}

interface ColumnDef {
  key: RankingSortKey | null
  label: string
  /** 헤더 옆 초보자 설명. */
  tip?: string
  /** 헤더 th 추가 클래스(고정 컬럼 등). */
  headClass?: string
  align?: 'left' | 'right' | 'center'
}

// 좌측 고정 컬럼 — 가로 스크롤 시 순위·종목은 제자리에 고정된다.
// 헤더 좌측 고정 셀은 세로(top-0)·가로(left) 동시 고정 → 코너라 z 최상위(z-30).
const TH_STICKY_RANK = 'sticky left-0 top-0 z-30 w-11 bg-surface-1'
const TH_STICKY_NAME = 'sticky left-11 top-0 z-30 bg-surface-1'
const TD_STICKY_RANK = 'sticky left-0 z-10 w-11 bg-background group-hover:bg-surface-2'
const TD_STICKY_NAME = 'sticky left-11 z-10 bg-background group-hover:bg-surface-2'

const BASE_COLUMNS: ColumnDef[] = [
  { key: null, label: '순위', align: 'center', headClass: TH_STICKY_RANK },
  { key: 'name', label: '종목', align: 'left', headClass: TH_STICKY_NAME },
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
    key: 'dcf',
    label: '가치 점수',
    tip: '현재 주가가 회사의 적정 가치 대비 싼지를 0~100으로 나타낸 점수예요(높을수록 저평가). 미래 현금흐름을 보수적으로 가정해 계산(DCF)하므로, 빠르게 크거나 비싸게 거래되는 인기주는 낮게 나오는 경향이 있어요. 가정에 따라 크게 달라지는 참고용 값이며 미래 수익을 보장하지 않아요.',
    align: 'left',
  },
  {
    key: 'dcfUpside',
    label: '적정가 대비',
    tip: '적정 가치(DCF 추정)와 현재가의 차이예요. +면 적정가보다 싸서 오를 여지가 있다는 뜻, −면 적정가보다 비싸다(고평가)는 뜻입니다. 예: −63%는 적정가가 현재가보다 63% 낮다는 의미예요. 애널리스트 목표가 기반 상승여력과는 다른 현금흐름 기준 추정치입니다.',
    align: 'right',
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
    tip: '애널리스트들이 제시한 목표 주가의 평균값.',
    align: 'right',
  },
  {
    key: null,
    label: '현재가',
    tip: '지금 실제로 거래되는 가격.',
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
    align: 'right',
  },
  {
    key: 'margin',
    label: '영업이익률',
    tip: '매출 중 본업으로 남긴 이익의 비율.',
    align: 'right',
  },
]

// "추가 지표" 토글을 켜면 붙는 컬럼들 (우리가 보유한 지표).
const ADVANCED_COLUMNS: ColumnDef[] = [
  {
    key: 'pe',
    label: 'PER',
    tip: '주가가 순이익의 몇 배인지. 낮을수록 이익 대비 싸게 거래되는 편.',
    align: 'right',
  },
  {
    key: null,
    label: 'PEG',
    tip: 'PER을 이익 성장으로 나눈 값. 1보다 낮으면 성장 대비 싼 편.',
    align: 'right',
  },
  {
    key: null,
    label: '이익성장',
    tip: '순이익이 1년 전보다 얼마나 늘었는지.',
    align: 'right',
  },
  {
    key: null,
    label: '베타',
    tip: '시장보다 얼마나 더 출렁이는지. 1보다 크면 변동이 큰 편.',
    align: 'right',
  },
  {
    key: null,
    label: '부채비율',
    tip: '자본 대비 빚의 비율. 높을수록 빚이 많은 편.',
    align: 'right',
  },
  {
    key: 'marketcap',
    label: '시가총액',
    tip: '회사 전체의 시장 가치(주가 × 주식 수).',
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
  const isHorizonCol = col.key === horizon
  const ariaSort = isActive ? (dir === 'asc' ? 'ascending' : 'descending') : undefined
  const alignClass =
    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'

  if (col.key === null) {
    return (
      <th
        scope="col"
        className={cn(
          'sticky top-0 z-20 whitespace-nowrap bg-surface-1 px-3 py-2.5 text-xs font-medium text-muted-foreground',
          alignClass,
          col.headClass
        )}
      >
        <span
          className={cn(
            'inline-flex items-center gap-1',
            col.align === 'right' && 'flex-row-reverse'
          )}
        >
          <span>{col.label}</span>
          {col.tip && <InfoTip text={col.tip} label={col.label} />}
        </span>
      </th>
    )
  }

  const Arrow = dir === 'asc' ? ChevronUp : ChevronDown

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        // sticky 헤더는 불투명 배경 필수(스크롤되는 행이 비쳐 보이면 안 됨) → bg-surface-1.
        // 부각 컬럼 표시는 반투명 bg-primary/5 대신 버튼 텍스트(text-primary)로 유지.
        'sticky top-0 z-20 whitespace-nowrap bg-surface-1 px-3 py-2.5 text-xs font-medium',
        alignClass,
        col.headClass
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

/** 우측 정렬 숫자 셀. value 가 null 이면 N/A. */
function NumCell({
  value,
  render,
  className,
}: {
  value: number | null | undefined
  render: (n: number) => ReactNode
  className?: string
}) {
  return (
    <td className={cn('whitespace-nowrap px-3 py-2.5 text-right num-mono tabular-nums', className)}>
      {value == null ? <span className="text-muted-foreground">N/A</span> : render(value)}
    </td>
  )
}

export function RankingTable({
  items,
  horizon,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  showAdvanced = false,
}: RankingTableProps) {
  const fmt = useCurrencyFormat()
  const columns = showAdvanced ? [...BASE_COLUMNS, ...ADVANCED_COLUMNS] : BASE_COLUMNS

  return (
    <div className="max-h-[calc(100vh-7rem)] overflow-auto rounded-md border border-border-subtle">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <caption className="sr-only">
          종목 단기·장기 점수 랭킹 — 순위, 종목명, 단기 점수, 장기 점수, 가치 점수, 적정가 대비,
          투자의견, 목표주가, 현재가, 상승여력, 재무 지표를 함께 표시합니다.
        </caption>
        <thead>
          <tr className="border-b border-border bg-surface-1">
            {columns.map((col, idx) => (
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
            const dcfTone =
              item.dcfUpsidePct == null
                ? 'text-muted-foreground'
                : item.dcfUpsidePct >= 0
                  ? 'text-success'
                  : 'text-danger'

            return (
              <tr
                key={item.ticker}
                onClick={() => onRowClick(item.ticker)}
                className="group cursor-pointer border-b border-border-subtle/70 transition-colors last:border-b-0 hover:bg-surface-2"
              >
                {/* 순위 (고정) */}
                <td
                  className={cn(
                    'px-3 py-2.5 text-center',
                    TD_STICKY_RANK,
                    isTop3 && 'border-l-2 border-l-primary/40'
                  )}
                >
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

                {/* 종목 (고정) */}
                <td className={cn('px-3 py-2.5', TD_STICKY_NAME)}>
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

                {/* DCF 점수 */}
                <td className="px-3 py-2.5">
                  <ScoreBar score={item.dcfScore} label="DCF 점수" />
                  {item.dcfScore === null && (
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {dcfReasonCaption(item.dcfReason)}
                    </span>
                  )}
                </td>

                {/* DCF 상승예측 */}
                <NumCell
                  value={item.dcfUpsidePct}
                  render={(v) => formatPercent(v)}
                  className={dcfTone}
                />

                {/* 투자의견 */}
                <td className="px-3 py-2.5">
                  <RecommendationBadge
                    recommendationKey={item.recommendationKey}
                    analystCount={item.analystCount}
                  />
                </td>

                {/* 목표주가 */}
                <NumCell value={item.targetMeanPriceUsd} render={(v) => fmt.price(v)} />

                {/* 현재가 */}
                <NumCell value={item.priceUsd} render={(v) => fmt.price(v)} />

                {/* 상승여력 */}
                <NumCell
                  value={item.upsidePct}
                  render={(v) => formatPercent(v)}
                  className={upTone}
                />

                {/* ROE */}
                <NumCell value={item.returnOnEquity} render={(v) => formatPercent(v)} />

                {/* 영업이익률 */}
                <NumCell value={item.operatingMargin} render={(v) => formatPercent(v)} />

                {/* ── 추가 지표 ── */}
                {showAdvanced && (
                  <>
                    <NumCell value={item.peRatio} render={(v) => v.toFixed(1)} />
                    <NumCell value={item.pegRatio} render={(v) => v.toFixed(2)} />
                    <NumCell value={item.earningsGrowth} render={(v) => formatPercent(v)} />
                    <NumCell value={item.beta} render={(v) => v.toFixed(2)} />
                    <NumCell value={item.debtToEquity} render={(v) => v.toFixed(1)} />
                    <NumCell value={item.marketCapUsd} render={(v) => fmt.marketCap(v)} />
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
