import { Button } from '@/components/ui/button'
import { EmptyRegionState } from '@/components/ui/empty-region-state'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { DsSection, DsSubsection } from './ds-section'
import { CodeBlock } from './code-block'

export function PatternsSection() {
  return (
    <DsSection
      id="patterns"
      title="Patterns (표준 패턴)"
      description="페이지 단위에서 반복되는 레이아웃·UX 표준."
    >
      <DsSubsection
        title="반응형 헤더 패턴"
        description="모바일은 세로 2줄, sm(640px)+ 가로 1줄. 타이틀 div에 min-w-0."
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                패권 지도
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                산업별 시가총액 점유율
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button size="sm" variant="outline">
                1주
              </Button>
              <Button size="sm" variant="outline">
                1개월
              </Button>
              <Button size="sm" variant="default">
                3개월
              </Button>
            </div>
          </div>
        </div>
        <CodeBlock
          label="표준 클래스"
          code={`<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div className="min-w-0">
    <h2 className="text-lg sm:text-xl font-bold leading-tight">타이틀</h2>
    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">설명</p>
  </div>
  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
    {/* 액션 버튼 */}
  </div>
</div>`}
        />
      </DsSubsection>

      <DsSubsection
        title="기간 필터 버튼 표준"
        description="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm — 모바일 컴팩트, 데스크탑 충분한 터치 타겟."
      >
        <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-2">
          {(['1일', '1주', '1개월', '3개월', '1년'] as const).map((label, idx) => (
            <button
              key={label}
              type="button"
              aria-pressed={idx === 2}
              className={
                idx === 2
                  ? 'rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium'
                  : 'rounded-md border border-border bg-background hover:bg-muted px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium'
              }
            >
              {label}
            </button>
          ))}
        </div>
        <CodeBlock
          label="버튼 클래스"
          code={`px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm`}
        />
      </DsSubsection>

      <DsSubsection title="빈 상태" description="EmptyRegionState 사용. 사용자에게 다음 행동 제시.">
        <div className="rounded-xl border border-border bg-card">
          <EmptyRegionState region="global" />
        </div>
      </DsSubsection>

      <DsSubsection
        title="모바일/데스크탑 산업 카드 비교"
        description="동일 카드, 다른 컨테이너 너비에서의 레이아웃 적응."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Mobile</p>
            <div className="max-w-[360px] rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <IndustryIcon iconKey="tech" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold leading-tight truncate">테크</p>
                  <p className="text-xs text-muted-foreground">반도체, AI, 클라우드</p>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold mt-3">$12.4T</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">+2.34%</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Desktop</p>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <IndustryIcon iconKey="tech" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-tight truncate">테크</p>
                    <p className="text-xs text-muted-foreground">반도체, AI, 클라우드</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg sm:text-xl font-bold">$12.4T</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">+2.34%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DsSubsection>
    </DsSection>
  )
}
