import type { Metadata } from 'next'
import { SidebarNav, type SidebarNavItem } from '@/components/design-system/sidebar-nav'
import { FoundationsSection } from '@/components/design-system/foundations-section'
import { IconographySection } from '@/components/design-system/iconography-section'
import { ComponentsSection } from '@/components/design-system/components-section'
import { PatternsSection } from '@/components/design-system/patterns-section'
import { AntiPatternsSection } from '@/components/design-system/anti-patterns-section'

export const metadata: Metadata = {
  title: 'Design System',
  description:
    'Sector King 디자인 시스템 — 색상 토큰, 타이포그래피, 아이콘, 컴포넌트, 표준 패턴의 단일 진실 공급원.',
  robots: { index: false, follow: false },
}

const NAV_ITEMS: SidebarNavItem[] = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'iconography', label: 'Iconography' },
  { id: 'components', label: 'Components' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'anti-patterns', label: 'Anti-patterns' },
]

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <header className="mb-8 sm:mb-10">
          <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
            Living Styleguide
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-foreground mt-2">
            Sector King 디자인 시스템
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
            색상 토큰·타이포그래피·아이콘·컴포넌트·표준 패턴의 단일 진실 공급원. 코드와 동기화된
            카탈로그입니다.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
          <aside className="hidden lg:block">
            <SidebarNav items={NAV_ITEMS} />
          </aside>

          <main className="min-w-0">
            <nav
              aria-label="섹션 빠른 이동"
              className="lg:hidden mb-6 -mx-1 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
            >
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-md px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>

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
