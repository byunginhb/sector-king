'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Waves } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import {
  MarketSizeIndustryMap,
  type MapGroup,
} from '@/components/market-size/market-size-industry-map'
import { useGlobalFlow } from '@/hooks/use-global-flow'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import {
  GROUP_LABEL,
  PERIODS,
  PERIOD_LABEL,
  type AssetGroup,
  type Period,
} from '@/lib/global-flow/assets'
import type { AssetRow, GlobalFlowPayload } from '@/lib/global-flow/compute'
import { cn } from '@/lib/utils'
import { VerdictHeader } from './verdict-header'
import { LiquidityPanel } from './liquidity-panel'
import { ValueChangeBars } from './value-change-bars'
import { RotationChart } from './rotation-chart'
import { FlowChannels } from './flow-channels'
import { GlobalFlowExplainer } from './global-flow-explainer'
import { signed } from './format'

function SectionTitle({
  eyebrow,
  title,
  caption,
}: {
  eyebrow: string
  title: string
  caption?: string
}) {
  return (
    <div className="mb-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      {caption && (
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground sm:text-sm">{caption}</p>
      )}
    </div>
  )
}

function toMapGroups(assets: AssetRow[], flow: (v: number) => string): MapGroup[] {
  const byGroup = new Map<AssetGroup, MapGroup>()
  for (const a of assets) {
    if (a.sizeUsd == null) continue
    const g = byGroup.get(a.group) ?? {
      id: a.group,
      name: GROUP_LABEL[a.group],
      marketCap: 0,
      tiles: [],
    }
    byGroup.set(a.group, {
      ...g,
      marketCap: g.marketCap + a.sizeUsd,
      tiles: [
        ...g.tiles,
        {
          id: a.id,
          name: a.name,
          marketCap: a.sizeUsd,
          colorValue: a.returnPct,
          detail:
            a.valueChangeUsd != null ? `가치 변화 ${signed(a.valueChangeUsd, flow)}` : undefined,
        },
      ],
    })
  }
  return [...byGroup.values()]
}

export function GlobalFlowPage({ initialData }: { initialData: GlobalFlowPayload | null }) {
  const { data } = useGlobalFlow(initialData)
  const fmt = useCurrencyFormat()
  const [period, setPeriod] = useState<Period>('1m')
  const [focusId, setFocusId] = useState<string | null>(null)
  const toggleFocus = (id: string) => setFocusId((cur) => (cur === id ? null : id))

  const view = data?.periods[period]
  const groups = useMemo(() => (view ? toMapGroups(view.assets, fmt.flowAmount) : []), [view, fmt])

  return (
    <div className="min-h-screen">
      <GlobalTopBar
        shareTitle="글로벌 자금 지도 | Sector King"
        shareDescription="주식·채권·금·달러·비트코인 — 돈은 지금 어디로 흐르는가"
        subtitle={<span>글로벌 자금 지도</span>}
      />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow eyebrow-accent mb-1.5 flex items-center gap-1.5">
              <Waves className="h-3 w-3" aria-hidden />
              글로벌 자금
            </p>
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              돈은 지금 어디로 흐르는가 — 주식 밖까지
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs text-foreground/70 sm:text-sm">
              주식·채권·금·원자재·크립토·현금을 한 화면에 놓고, 시장 전체에 풀린 돈의 양과 자산군별
              몸집 변화, 실제로 돈이 드나든 통로를 함께 봅니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <div role="group" aria-label="비교 기간" className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  aria-pressed={period === p}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm',
                    period === p
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border-subtle text-muted-foreground hover:text-foreground',
                  )}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
            {view && (
              <p className="text-xs text-muted-foreground">
                {view.startDate} ~ {view.endDate} 기준
              </p>
            )}
          </div>
        </div>

        {!data || !view ? (
          <div className="sk-card p-8 text-center text-sm text-muted-foreground">
            글로벌 자금 데이터를 모으는 중입니다. 다음 정기 수집(평일 하루 4회) 이후 표시됩니다.
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <VerdictHeader view={view} rulerLevels={data.rulerLevels} />

            {data.liquidity && <LiquidityPanel liquidity={data.liquidity} view={view} />}

            <section>
              <SectionTitle
                eyebrow="② 가치 변화"
                title="자산군 몸집이 얼마나 커지고 작아졌나"
                caption="지도의 면적은 자산군 추정 규모, 색은 기간 수익률입니다. 막대는 기간 시가 가치 변화 — 자산 간에 옮겨간 금액이 아닙니다."
              />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
                {/* 모바일은 막대만 — 트리맵은 최소 폭이 커서 가로 스크롤이 생긴다 */}
                <div className="hidden lg:block">
                  <MarketSizeIndustryMap
                    groups={groups}
                    colorScale="change"
                    colorLabel={`${PERIOD_LABEL[period]} 수익률`}
                    tileNoun="자산"
                    tileActionLabel={(t) => `${t.name} 회전 궤적에서 강조`}
                    onSelectTile={(t) => toggleFocus(t.id)}
                  />
                </div>
                <div className="sk-card p-4">
                  <ValueChangeBars assets={view.assets} focusId={focusId} onFocus={toggleFocus} />
                </div>
              </div>
            </section>

            <section>
              <SectionTitle
                eyebrow="④ 회전 궤적"
                title="상대 강도는 어디서 빠져 어디로 가는가"
                caption="오른쪽일수록 전체 자산 대비 강하고, 위쪽일수록 그 강도가 붙는 중입니다. 점은 이번 주, 꼬리는 최근 3주 — 자산을 누르면 8주 전체 궤적이 나옵니다. 주간 기준이라 기간 선택과 무관합니다."
              />
              <div className="sk-card p-4 sm:p-5">
                <RotationChart assets={data.rrg} focusId={focusId} onFocus={toggleFocus} />
              </div>
            </section>

            <section>
              <SectionTitle
                eyebrow="③ 실제 자금 통로"
                title="실제로 돈이 드나든 곳"
                caption="가격 변화가 아니라 잔고·발행량·순매수처럼 실제 돈의 이동이 기록되는 지표입니다."
              />
              <FlowChannels channels={view.channels} periodLabel={PERIOD_LABEL[period]} />
            </section>

            <Link
              href="/#money-flow"
              className="sk-card sk-card-hover flex items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="eyebrow">다음 단계</p>
                <p className="mt-1 font-semibold text-foreground">
                  주식이 받는 쪽이라면, 주식 안에서는 어디로?
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  산업 → 섹터 → 종목으로 이어지는 자금 흐름 보기
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>

            <GlobalFlowExplainer sizeSources={data.sizeSources} />
          </div>
        )}
      </main>
    </div>
  )
}
