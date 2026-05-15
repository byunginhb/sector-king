import { Button } from '@/components/ui/button'
import { EmptyRegionState } from '@/components/ui/empty-region-state'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { DsSection, DsSubsection } from './ds-section'
import { CodeBlock } from './code-block'

export function PatternsSection() {
  return (
    <DsSection
      id="patterns"
      meta="05"
      title="Patterns"
      description="페이지 단위에서 반복되는 레이아웃·UX 표준. 새 페이지를 만들 때는 이 패턴을 먼저 차용하세요."
    >
      <DsSubsection
        title="Page masthead — Editorial header"
        hint="display · eyebrow · meta"
        description="모든 1차 페이지 헤더는 신문 1면 masthead 구조: eyebrow + display 헤드라인 + meta row."
      >
        <div className="border border-foreground bg-surface-1 p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
            <p className="eyebrow eyebrow-accent">Money Flow · 14-Day</p>
            <p className="eyebrow num-mono">2026-05-15 · KST 07:00</p>
          </div>
          <h2 className="display text-3xl sm:text-5xl text-foreground">
            Where the money moves,
            <br />
            <span className="display-italic">the map redraws.</span>
          </h2>
          <hr className="sk-rule mt-5" />
          <p className="text-sm text-foreground/75 mt-3 max-w-2xl">
            산업별 14일 누적 순매수/순매도 합계. 양수는 유입, 음수는 유출. 단위는 USD 환산.
          </p>
        </div>
      </DsSubsection>

      <DsSubsection
        title="반응형 헤더 패턴 (sub-page)"
        hint="flex-col sm:flex-row"
        description="모바일은 세로 2줄, sm(640px)+ 가로 1줄. 타이틀 div에 min-w-0."
      >
        <div className="border border-border-subtle bg-surface-1 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow eyebrow-accent">Hegemony Map · Tech</p>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground leading-tight mt-1">
                패권 지도
              </h3>
              <p className="text-xs sm:text-sm text-foreground/70 mt-1">
                산업별 시가총액 점유율
              </p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Button size="sm" variant="ghost">
                1주
              </Button>
              <Button size="sm" variant="ghost">
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
    <p className="eyebrow eyebrow-accent">Hegemony · Tech</p>
    <h3 className="font-display text-xl sm:text-2xl font-semibold leading-tight mt-1">패권 지도</h3>
    <p className="text-xs sm:text-sm text-foreground/70 mt-1">설명</p>
  </div>
  <div className="flex items-center gap-1 flex-wrap">
    {/* 액션 버튼 */}
  </div>
</div>`}
        />
      </DsSubsection>

      <DsSubsection
        title="기간 필터 버튼"
        hint="ghost · default · pressed"
        description="라디오 그룹처럼 동작하지만 시각은 매우 절제. 활성 상태만 primary."
      >
        <div className="border border-border-subtle bg-surface-1 p-5 flex flex-wrap gap-1">
          {(['1일', '1주', '1개월', '3개월', '1년'] as const).map((label, idx) => (
            <button
              key={label}
              type="button"
              aria-pressed={idx === 2}
              className={
                idx === 2
                  ? 'rounded-sm bg-primary text-primary-foreground px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium tabular-nums'
                  : 'rounded-sm text-foreground/70 hover:bg-surface-2 hover:text-foreground px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium tabular-nums'
              }
            >
              {label}
            </button>
          ))}
        </div>
      </DsSubsection>

      <DsSubsection
        title="Statline — Bloomberg row"
        hint=".sk-statline"
        description="label · value 페어가 칼럼처럼 정렬되는 데이터 블록. KPI 카드·드로어 내부에 사용."
      >
        <div className="border border-border-subtle bg-surface-1 p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-10">
          <dl>
            <div className="sk-statline">
              <dt className="label">Open</dt>
              <dd className="value">$4,201.32</dd>
            </div>
            <div className="sk-statline">
              <dt className="label">High</dt>
              <dd className="value">$4,231.10</dd>
            </div>
            <div className="sk-statline">
              <dt className="label">Low</dt>
              <dd className="value">$4,189.04</dd>
            </div>
            <div className="sk-statline">
              <dt className="label">Close</dt>
              <dd className="value text-success">$4,213.84</dd>
            </div>
          </dl>
          <dl>
            <div className="sk-statline">
              <dt className="label">d/d</dt>
              <dd className="value text-success">+1.82%</dd>
            </div>
            <div className="sk-statline">
              <dt className="label">14d</dt>
              <dd className="value text-success">+4.41%</dd>
            </div>
            <div className="sk-statline">
              <dt className="label">YTD</dt>
              <dd className="value text-danger">−3.18%</dd>
            </div>
            <div className="sk-statline">
              <dt className="label">RSI</dt>
              <dd className="value">62.4</dd>
            </div>
          </dl>
        </div>
      </DsSubsection>

      <DsSubsection title="빈 상태" hint="EmptyRegionState">
        <div className="border border-border-subtle bg-surface-1">
          <EmptyRegionState region="global" />
        </div>
      </DsSubsection>

      <DsSubsection
        title="Industry card — Mobile vs Desktop"
        hint="동일 카드, 다른 그리드"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="eyebrow mb-2">Mobile</p>
            <div className="max-w-[360px] sk-card">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center border border-border-subtle bg-background">
                  <IndustryIcon iconKey="tech" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">테크</p>
                  <p className="font-display text-base font-semibold leading-tight truncate mt-0.5">
                    Semiconductors · AI · Cloud
                  </p>
                </div>
              </div>
              <p className="num-mono text-xl mt-3 text-foreground">$12.40T</p>
              <p className="num-mono text-xs text-success mt-0.5">+2.34%</p>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">Desktop</p>
            <div className="sk-card">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-12 w-12 items-center justify-center border border-border-subtle bg-background">
                    <IndustryIcon iconKey="tech" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="eyebrow">테크</p>
                    <p className="font-display text-lg font-semibold leading-tight truncate mt-0.5">
                      Semiconductors · AI · Cloud
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="num-mono text-xl text-foreground">$12.40T</p>
                  <p className="num-mono text-xs text-success mt-0.5">+2.34%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DsSubsection>
    </DsSection>
  )
}
