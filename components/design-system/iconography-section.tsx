import { IndustryIcon } from '@/components/ui/industry-icon'
import { DsSection, DsSubsection } from './ds-section'
import { CodeBlock } from './code-block'

const INDUSTRY_KEYS = [
  'tech',
  'healthcare',
  'energy',
  'consumer',
  'finance',
  'defense_aero',
  'real_estate',
  'mobility',
  'industrials',
  'unknown',
] as const

const KEY_LABELS: Record<string, string> = {
  tech: '테크',
  healthcare: '헬스케어',
  energy: '에너지',
  consumer: '소비재',
  finance: '금융',
  defense_aero: '방산·항공',
  real_estate: '부동산',
  mobility: '모빌리티',
  industrials: '산업재',
  unknown: 'fallback',
}

export function IconographySection() {
  return (
    <DsSection
      id="iconography"
      title="Iconography (아이콘)"
      description="lucide-react 아이콘만 사용합니다. 이모지 사용 금지. iconKey 매핑은 components/ui/industry-icon.tsx에 정의됩니다."
    >
      <DsSubsection
        title="산업 아이콘 매트릭스"
        description="industries.id (또는 알려진 iconKey)에서 lucide 컴포넌트로 매핑."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {INDUSTRY_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-xl border border-border bg-card p-4 text-center"
            >
              <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <IndustryIcon iconKey={key} className="h-6 w-6 text-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">{KEY_LABELS[key]}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{key}</p>
            </div>
          ))}
        </div>
        <CodeBlock
          label="사용 예"
          code={`import { IndustryIcon } from '@/components/ui/industry-icon'

<IndustryIcon iconKey="tech" className="h-6 w-6 text-foreground" />`}
        />
      </DsSubsection>

      <DsSubsection
        title="카테고리 아이콘"
        description="CategoryIcon 컴포넌트는 별도 에이전트 작업 후 추가 예정."
      >
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            {/* placeholder: CategoryIcon 미구현 */}
            CategoryIcon 컴포넌트가 추가되면 이곳에 그리드를 노출합니다. 현재는 산업 아이콘만 사용
            가능합니다.
          </p>
        </div>
      </DsSubsection>
    </DsSection>
  )
}
