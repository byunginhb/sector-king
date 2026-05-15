'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/section-header'
import { RegionToggle } from '@/components/region-toggle'
import { EmptyRegionState } from '@/components/ui/empty-region-state'
import type { RegionFilter } from '@/types'
import { DsSection, DsSubsection } from './ds-section'
import { CodeBlock } from './code-block'

export function ComponentsSection() {
  const [region, setRegion] = useState<RegionFilter>('all')

  return (
    <DsSection
      id="components"
      meta="04"
      title="Components"
      description="components/ui/ 와 components/* 의 표준 컴포넌트 카탈로그. 시그니처 변경은 별도 PR로."
    >
      {/* Buttons */}
      <DsSubsection title="Button" hint="shadcn variants">
        <div className="border border-border-subtle bg-surface-1 p-5 flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <CodeBlock
          label="사용 예"
          code={`import { Button } from '@/components/ui/button'

<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>`}
        />
      </DsSubsection>

      {/* sk-card */}
      <DsSubsection
        title="sk-card · Editorial card"
        hint=".sk-card / .sk-card-hover"
        description="모든 카드는 sk-card를 베이스로. 그림자 없음. hover시 amber hairline만 켜집니다."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Market Cap', value: '$4.21T', sub: 'd/d +1.82%', cls: 'text-foreground' },
            {
              label: 'Hot Sector',
              value: 'Semis',
              sub: '14d +$76.4B',
              cls: 'text-foreground',
              hot: true,
            },
            { label: 'Loser', value: 'Banking', sub: '−$12.1B', cls: 'text-danger' },
          ].map((c) => (
            <div key={c.label} className="sk-card sk-card-hover">
              <div className="flex items-center gap-2">
                {c.hot ? (
                  <Flame className="h-3.5 w-3.5 text-primary" aria-hidden />
                ) : (
                  <span className="inline-block h-1 w-1 rounded-full bg-foreground/40" aria-hidden />
                )}
                <p className="eyebrow">{c.label}</p>
              </div>
              <p className={`num-mono text-2xl mt-3 ${c.cls}`}>{c.value}</p>
              <p className="num-mono text-[11px] text-muted-foreground mt-1">{c.sub}</p>
            </div>
          ))}
        </div>
        <CodeBlock
          label="기본 카드"
          code={`<div className="sk-card sk-card-hover">
  <p className="eyebrow">Market Cap</p>
  <p className="num-mono text-2xl mt-3 text-foreground">$4.21T</p>
  <p className="num-mono text-[11px] text-muted-foreground mt-1">d/d +1.82%</p>
</div>`}
        />
      </DsSubsection>

      {/* KPI strip */}
      <DsSubsection title="KPI Tile · Heroic number" hint="sans label + mono value">
        <div className="sk-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-success" aria-hidden />
            <p className="eyebrow">전일 대비 (시총 가중)</p>
          </div>
          <p className="num-mono text-3xl sm:text-4xl text-success">+1.82%</p>
          <p className="num-mono text-xs text-muted-foreground mt-2">prev 4,134.21B → 4,213.84B</p>
        </div>
      </DsSubsection>

      {/* Skeleton */}
      <DsSubsection title="Skeleton" hint="loading placeholder">
        <div className="sk-card space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </DsSubsection>

      {/* Section Header */}
      <DsSubsection title="Section Header" hint="page · grid title">
        <div className="border border-border-subtle bg-surface-1 p-5">
          <SectionHeader
            title="자금 흐름"
            eyebrow="14-Day Flow"
            description="최근 14일 산업별 순매수/순매도 합계"
            actions={
              <>
                <Button size="sm" variant="ghost">
                  1주
                </Button>
                <Button size="sm" variant="default">
                  14일
                </Button>
              </>
            }
          />
          <p className="text-sm text-foreground/70">자식 영역 — 차트/그리드 등</p>
        </div>
        <CodeBlock
          label="사용 예"
          code={`<SectionHeader
  eyebrow="14-Day Flow"
  title="자금 흐름"
  description="최근 14일 산업별 순매수/순매도 합계"
  actions={<Button size="sm" variant="default">14일</Button>}
/>`}
        />
      </DsSubsection>

      {/* Region toggle */}
      <DsSubsection title="Region Toggle" hint="국내 / 해외 / 전체">
        <div className="border border-border-subtle bg-surface-1 p-5 flex flex-wrap items-center gap-4">
          <RegionToggle
            value={region}
            onChange={setRegion}
            counts={{ all: 120, kr: 45, global: 75 }}
          />
          <span className="text-xs text-muted-foreground">
            현재 선택: <span className="font-mono text-foreground">{region}</span>
          </span>
        </div>
      </DsSubsection>

      {/* Empty state */}
      <DsSubsection title="Empty Region State" hint="region 필터 비었을 때">
        <div className="border border-border-subtle bg-surface-1">
          <EmptyRegionState region="kr" />
        </div>
      </DsSubsection>

      {/* Ticker chip */}
      <DsSubsection
        title="Ticker chip"
        hint="ticker · name · pct"
        description="TickerTape·테이블·리스트 어디서나 일관된 종목 표기."
      >
        <div className="border border-border-subtle bg-surface-1 p-5 flex flex-wrap items-center gap-6">
          {[
            { t: 'NVDA', n: '엔비디아', pct: 2.41 },
            { t: '005930', n: '삼성전자', pct: -1.08 },
            { t: 'TSLA', n: '테슬라', pct: 0.0 },
          ].map((c) => (
            <span key={c.t} className="inline-flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {c.t}
              </span>
              <span className="text-xs text-muted-foreground">{c.n}</span>
              <span
                className={
                  c.pct > 0
                    ? 'num-mono text-xs text-success'
                    : c.pct < 0
                      ? 'num-mono text-xs text-danger'
                      : 'num-mono text-xs text-muted-foreground'
                }
              >
                {c.pct > 0 ? (
                  <TrendingUp className="inline h-3 w-3 mr-0.5" />
                ) : c.pct < 0 ? (
                  <TrendingDown className="inline h-3 w-3 mr-0.5" />
                ) : null}
                {c.pct > 0 ? '+' : ''}
                {c.pct.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </DsSubsection>
    </DsSection>
  )
}
