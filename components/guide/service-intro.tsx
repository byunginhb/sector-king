import { Building2, Layers, Briefcase, ChevronRight, Clock, Globe } from 'lucide-react'
import { GuideSection } from './guide-section'

const TIERS = [
  { icon: Building2, label: '산업', example: '테크' },
  { icon: Layers, label: '섹터', example: '반도체' },
  { icon: Briefcase, label: '종목', example: '엔비디아' },
] as const

/** 섹션 A — 서비스 소개(3계층 · 미국/한국 · 1일 2회 갱신). */
export function ServiceIntro() {
  return (
    <GuideSection
      id="what"
      title="A. 이 서비스가 뭔가요"
      description="산업 → 섹터 → 종목의 3계층으로 시장의 힘이 어디에 모이는지 보여줍니다."
    >
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-sm text-muted-foreground">
          백화점(산업) 안에 매장(섹터)이 있고, 매장 안에 상품(종목)이 있는 구조라고
          생각하면 쉽습니다.
        </p>

        {/* 3계층 다이어그램: 데스크탑 가로, 모바일 세로 */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {TIERS.map((tier, index) => {
            const Icon = tier.icon
            return (
              <div key={tier.label} className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
                  <Icon className="h-5 w-5 shrink-0 text-info" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tier.label}</p>
                    <p className="text-xs text-muted-foreground">예: {tier.example}</p>
                  </div>
                </div>
                {index < TIERS.length - 1 && (
                  <ChevronRight
                    className="h-5 w-5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0"
                    aria-hidden
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg bg-surface-1 px-4 py-3">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">시장 범위</span> — 미국·한국
              상장 종목만 다룹니다. 한국 종목의 가격·시총도 모두 달러($)로 환산해
              보여줍니다.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-surface-1 px-4 py-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">갱신 주기</span> — 하루 2회
              (KST 오후 4:30 / 다음날 오전 7:00) 수집합니다. 실시간이 아닙니다(자세한
              내용은 아래 주의사항).
            </p>
          </div>
        </div>
      </div>
    </GuideSection>
  )
}
