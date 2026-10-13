'use client'

import { Banknote, Coins, Landmark, PiggyBank, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Channels } from '@/lib/global-flow/compute'
import { ETF_ASSET } from '@/lib/global-flow/assets'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import { signed, toneOf } from './format'

interface CardProps {
  icon: LucideIcon
  title: string
  value: string
  change?: number | null
  changeLabel: string
  note: string
  formatAbs: (v: number) => string
}

function ChannelCard({
  icon: Icon,
  title,
  value,
  change,
  changeLabel,
  note,
  formatAbs,
}: CardProps) {
  return (
    <div className="sk-card flex flex-col p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </p>
      <p className="mt-2 num-mono text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm">
        {/* undefined = 변화가 의미 없는 지표(합계 자체가 값). null = 데이터 부족 */}
        {change !== undefined && (
          <>
            <span className={cn('num-mono', toneOf(change))}>
              {change == null ? '—' : signed(change, formatAbs)}
            </span>{' '}
          </>
        )}
        <span className="text-xs text-muted-foreground">{changeLabel}</span>
      </p>
      <p className="mt-auto pt-2 text-[11px] leading-relaxed text-muted-foreground">{note}</p>
    </div>
  )
}

interface Props {
  channels: Channels
  periodLabel: string
}

/**
 * ③ 실제 자금 통로 — 돈이 실제로 들어가고 나온 게 기록되는 곳만.
 * 이 섹션만 "유입/유출"이라는 말을 쓸 수 있다(개념 문서 표현 규칙 2).
 */
export function FlowChannels({ channels, periodLabel }: Props) {
  const fmt = useCurrencyFormat()
  const { stablecoin, mmfRetail, krDeposit, krForeign, etf } = channels

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stablecoin && (
          <ChannelCard
            icon={Coins}
            title="스테이블코인 발행량"
            value={fmt.marketCap(stablecoin.latest)}
            change={stablecoin.change}
            changeLabel={`${periodLabel} 변화`}
            note="크립토 시장에 들어온 달러. 늘면 새 달러가 크립토로 진입한 것입니다."
            formatAbs={fmt.flowAmount}
          />
        )}
        {mmfRetail && (
          <ChannelCard
            icon={PiggyBank}
            title="미국 개인 MMF 잔고"
            value={fmt.marketCap(mmfRetail.latest)}
            change={mmfRetail.change}
            changeLabel={`${periodLabel} 변화 · 기준일 ${mmfRetail.date}`}
            note="대기 현금. 발표가 약 6주 늦어 최신 기준일에서 거꾸로 잰 변화입니다."
            formatAbs={fmt.flowAmount}
          />
        )}
        {krDeposit && (
          <ChannelCard
            icon={Landmark}
            title="한국 고객예탁금"
            value={fmt.marketCap(krDeposit.latestUsd)}
            change={krDeposit.changeUsd}
            changeLabel={`${periodLabel} 변화 · 기준일 ${krDeposit.date}`}
            note="국내 증시에 들어와 대기 중인 투자자 자금. 늘면 매수 여력이 쌓이는 중입니다."
            formatAbs={fmt.flowAmount}
          />
        )}
        {krForeign && (
          <ChannelCard
            icon={Users}
            title="외국인 순매수 (코스피+코스닥)"
            value={signed(krForeign.netUsd, fmt.flowAmount)}
            changeLabel={`${periodLabel} 합계 · ${krForeign.days}거래일`}
            note="해외 자금이 한국 주식을 실제로 사고판 금액의 차이입니다."
            formatAbs={fmt.flowAmount}
          />
        )}
      </div>

      <div className="sk-card p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Banknote className="h-3.5 w-3.5" aria-hidden />
          ETF 순설정 (추정) — 자산군별 신규 자금
        </p>
        {!etf ? (
          <p className="mt-2 text-sm text-muted-foreground">아직 수집되지 않았습니다.</p>
        ) : etf.flows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {etf.since} 부터 좌수를 모으는 중입니다. 이틀 이상 쌓이면 이 기간의 순설정액이
            표시됩니다.
          </p>
        ) : (
          <>
            <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {etf.flows.map((f) => (
                <li key={f.assetId} className="flex items-center justify-between gap-3">
                  <span className="text-foreground">{f.name}</span>
                  <span className={cn('num-mono', toneOf(f.flowUsd))}>
                    {signed(f.flowUsd, fmt.flowAmount)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              대표 ETF {Object.keys(ETF_ASSET).length}종의 좌수 변화 × 좌당 가치. 가격 변화는 빠지고
              실제로 새로 들어오거나 빠져나간 돈만 남습니다. {etf.since} 부터 수집 — 기간이 그보다
              길면 수집 이후분만 합산됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
