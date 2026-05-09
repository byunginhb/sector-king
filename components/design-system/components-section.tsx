'use client'

import { useState } from 'react'
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
      title="Components (컴포넌트)"
      description="기존 components/ui/와 components/* 의 기본 컴포넌트 카탈로그. 시그니처는 변경하지 않고 노출만."
    >
      <DsSubsection title="Button" description="shadcn Button. variant: default/secondary/outline/ghost/destructive">
        <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-2">
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
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>`}
        />
      </DsSubsection>

      <DsSubsection title="Card" description="기본 카드 컨테이너 (rounded-xl border bg-card p-4).">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-base font-bold leading-tight text-foreground">카드 제목</h4>
            <p className="text-xs text-muted-foreground mt-1">보조 설명 텍스트</p>
            <p className="text-lg sm:text-xl font-bold mt-3">$1,234.56</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h4 className="text-base font-bold leading-tight text-foreground">강조 카드</h4>
            <p className="text-xs text-muted-foreground mt-1">shadow-sm 추가</p>
            <p className="text-lg sm:text-xl font-bold mt-3 text-emerald-600 dark:text-emerald-400">
              +2.34%
            </p>
          </div>
        </div>
        <CodeBlock
          label="기본 카드"
          code={`<div className="rounded-xl border border-border bg-card p-4">
  <h4 className="text-base font-bold leading-tight">카드 제목</h4>
  <p className="text-xs text-muted-foreground mt-1">보조 설명</p>
</div>`}
        />
      </DsSubsection>

      <DsSubsection title="Skeleton" description="로딩 placeholder.">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
        <CodeBlock
          label="사용 예"
          code={`import { Skeleton } from '@/components/ui/skeleton'

<Skeleton className="h-5 w-1/3" />
<Skeleton className="h-24 w-full" />`}
        />
      </DsSubsection>

      <DsSubsection
        title="Section Header"
        description="페이지/그리드 위 표준 섹션 헤더. title/description/actions."
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <SectionHeader
            title="자금 흐름"
            description="최근 30일 산업별 순매수/순매도 합계"
            actions={
              <>
                <Button size="sm" variant="outline">
                  1주
                </Button>
                <Button size="sm" variant="default">
                  1개월
                </Button>
              </>
            }
          />
          <p className="text-sm text-muted-foreground">자식 영역 — 차트/그리드 등</p>
        </div>
        <CodeBlock
          label="사용 예"
          code={`import { SectionHeader } from '@/components/ui/section-header'

<SectionHeader
  title="자금 흐름"
  description="최근 30일 산업별 순매수/순매도 합계"
  actions={<Button size="sm" variant="outline">1주</Button>}
/>`}
        />
      </DsSubsection>

      <DsSubsection title="Region Toggle" description="국내/해외/전체 필터. radio group.">
        <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4">
          <RegionToggle
            value={region}
            onChange={setRegion}
            counts={{ all: 120, kr: 45, global: 75 }}
          />
          <span className="text-xs text-muted-foreground">
            현재 선택: <span className="font-mono">{region}</span>
          </span>
        </div>
        <CodeBlock
          label="사용 예"
          code={`import { RegionToggle } from '@/components/region-toggle'

const [region, setRegion] = useState<RegionFilter>('all')

<RegionToggle value={region} onChange={setRegion} />`}
        />
      </DsSubsection>

      <DsSubsection
        title="Empty Region State"
        description="region 필터 결과가 비었을 때의 안내."
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <EmptyRegionState region="kr" />
        </div>
        <CodeBlock
          label="사용 예"
          code={`import { EmptyRegionState } from '@/components/ui/empty-region-state'

<EmptyRegionState region="kr" />`}
        />
      </DsSubsection>
    </DsSection>
  )
}
