import type { Metadata } from 'next'
import { SidebarNav, type SidebarNavItem } from '@/components/design-system/sidebar-nav'
import { PrinciplesSection } from '@/components/design-system/principles-section'
import { FoundationsSection } from '@/components/design-system/foundations-section'
import { IconographySection } from '@/components/design-system/iconography-section'
import { ComponentsSection } from '@/components/design-system/components-section'
import { PatternsSection } from '@/components/design-system/patterns-section'
import { AntiPatternsSection } from '@/components/design-system/anti-patterns-section'

export const metadata: Metadata = {
  title: 'Design System',
  description:
    'Sector King 디자인 시스템 — Editorial Bloomberg Terminal 톤. 색상 토큰, 타이포그래피, 아이콘, 컴포넌트, 표준 패턴의 단일 진실 공급원.',
  robots: { index: false, follow: false },
}

const NAV_ITEMS: SidebarNavItem[] = [
  { id: 'principles', label: 'Principles', meta: '01' },
  { id: 'foundations', label: 'Foundations', meta: '02' },
  { id: 'iconography', label: 'Iconography', meta: '03' },
  { id: 'components', label: 'Components', meta: '04' },
  { id: 'patterns', label: 'Patterns', meta: '05' },
  { id: 'anti-patterns', label: 'Anti-patterns', meta: '06' },
]

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <header className="mb-12 sm:mb-16 border-b border-foreground pb-8">
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6">
            <p className="eyebrow eyebrow-accent">Sector King — Vol. 01</p>
            <p className="eyebrow tabular-nums">Living Styleguide · v1.0</p>
          </div>
          <h1 className="display text-5xl sm:text-7xl lg:text-8xl text-foreground">
            The map of
            <br />
            <span className="display-italic">capital, drawn in ink.</span>
          </h1>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
            <p className="text-sm leading-relaxed text-foreground/85 md:col-span-2 max-w-2xl">
              디자인 토큰·타이포그래피·아이콘·컴포넌트·표준 패턴의 단일 진실
              공급원입니다. <span className="font-mono text-foreground">globals.css</span>{' '}
              한 곳에서만 토큰을 바꾸면 모든 화면이 따라옵니다. 이 페이지는 코드와 동기화되어
              있으며, 새 컴포넌트를 만들기 전 반드시 여기 안티패턴을 먼저 읽어주세요.
            </p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="border-l border-border-subtle pl-3">
                <dt className="eyebrow">Mood</dt>
                <dd className="text-foreground mt-1">Editorial Bloomberg Terminal</dd>
              </div>
              <div className="border-l border-border-subtle pl-3">
                <dt className="eyebrow">Signal</dt>
                <dd className="text-foreground mt-1">Single amber. No gradients.</dd>
              </div>
              <div className="border-l border-border-subtle pl-3">
                <dt className="eyebrow">Type</dt>
                <dd className="text-foreground mt-1">Fraunces · Geist · JetBrains Mono</dd>
              </div>
              <div className="border-l border-border-subtle pl-3">
                <dt className="eyebrow">Density</dt>
                <dd className="text-foreground mt-1">Data first. Whitespace earns its keep.</dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-12">
          <aside className="hidden lg:block">
            <SidebarNav items={NAV_ITEMS} />
          </aside>

          <main className="min-w-0">
            <nav
              aria-label="섹션 빠른 이동"
              className="lg:hidden mb-8 -mx-1 flex flex-wrap gap-1 border-y border-border-subtle py-2"
            >
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-sm px-2 py-1 text-xs sm:text-sm font-medium text-foreground/80 hover:bg-surface-2 hover:text-foreground"
                >
                  <span className="font-mono text-muted-foreground mr-1.5">{item.meta}</span>
                  {item.label}
                </a>
              ))}
            </nav>

            <PrinciplesSection />
            <FoundationsSection />
            <IconographySection />
            <ComponentsSection />
            <PatternsSection />
            <AntiPatternsSection />
          </main>
        </div>
      </div>
    </div>
  )
}
