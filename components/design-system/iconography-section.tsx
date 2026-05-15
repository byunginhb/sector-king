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
      meta="03"
      title="Iconography"
      description="lucide-react 아이콘만 사용합니다. 이모지 사용 금지. iconKey 매핑은 components/ui/industry-icon.tsx 단일 파일에서 관리합니다."
    >
      <DsSubsection
        title="산업 아이콘 매트릭스"
        hint="components/ui/industry-icon.tsx"
        description="industries.id (또는 known iconKey)에서 lucide 컴포넌트로 매핑."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px border border-border-subtle bg-border-subtle">
          {INDUSTRY_KEYS.map((key) => (
            <div key={key} className="bg-surface-1 p-4 text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center border border-border-subtle bg-background">
                <IndustryIcon iconKey={key} className="h-6 w-6 text-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">{KEY_LABELS[key]}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{key}</p>
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
        title="아이콘 사이징 규약"
        hint="stroke 1.5 · square"
        description="아이콘 크기는 컨텐츠 라인 높이에 맞춥니다. 본문 옆 인라인은 h-3.5 ~ h-4, 카드 라벨은 h-4, KPI 카드 라벨 옆은 h-4 ~ h-5."
      >
        <div className="border border-border-subtle bg-surface-1 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { size: 'h-3.5 w-3.5', label: 'inline · xs' },
            { size: 'h-4 w-4', label: 'inline · sm' },
            { size: 'h-5 w-5', label: 'label · md' },
            { size: 'h-6 w-6', label: 'card · lg' },
          ].map((s) => (
            <div key={s.size} className="text-center">
              <div className="mx-auto mb-2 inline-flex items-center justify-center border border-border-subtle bg-background h-12 w-12">
                <IndustryIcon iconKey="tech" className={`${s.size} text-foreground`} />
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">{s.size}</p>
              <p className="text-xs text-foreground/80">{s.label}</p>
            </div>
          ))}
        </div>
      </DsSubsection>
    </DsSection>
  )
}
