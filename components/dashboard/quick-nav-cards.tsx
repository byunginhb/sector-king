import Link from 'next/link'
import { Newspaper, Trophy, Globe, BookOpen, ChevronRight, type LucideIcon } from 'lucide-react'

interface QuickNavItem {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

// 헤더 NAV_ITEMS 와 동일 목적지 — 모바일에서 햄버거에 숨는 메뉴를 카드로 노출한다.
const ITEMS: readonly QuickNavItem[] = [
  {
    href: '/news',
    label: '뉴스',
    description: '매일 아침 핵심 마켓 뉴스 요약',
    icon: Newspaper,
  },
  {
    href: '/rankings',
    label: '섹터킹 픽',
    description: '단기·장기 점수로 보는 종목 랭킹',
    icon: Trophy,
  },
  {
    href: '/indices',
    label: '세계 지수',
    description: '주요 국가 대표 지수 한눈에',
    icon: Globe,
  },
  {
    href: '/guide',
    label: '이용 안내',
    description: '처음이세요? 보는 법 안내',
    icon: BookOpen,
  },
]

/**
 * 모바일 전용(< md) 바로가기 카드. 데스크탑은 헤더에 메뉴가 보이므로 숨긴다.
 */
export function QuickNavCards() {
  return (
    <section className="md:hidden" aria-label="바로가기">
      <p className="eyebrow eyebrow-accent mb-3">바로가기</p>
      <ul className="grid grid-cols-2 gap-3">
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="sk-card sk-card-hover flex h-full flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
