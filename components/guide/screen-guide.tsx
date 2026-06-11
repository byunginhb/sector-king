import Link from 'next/link'
import {
  LayoutDashboard,
  Activity,
  Percent,
  Map as MapIcon,
  Briefcase,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { GuideSection } from './guide-section'

const DEFAULT_INDUSTRY = 'tech'

interface ScreenEntry {
  icon: LucideIcon
  title: string
  whatItShows: string
  highlight: string
  href: string
  linkLabel: string
}

const SCREENS: ScreenEntry[] = [
  {
    icon: LayoutDashboard,
    title: '대시보드',
    whatItShows: '산업 전체를 한눈에 보고 섹터별 패권 지도로 깊이 들어갑니다.',
    highlight: '산업 카드, 시총 추세 스파크라인, 핵심 지표 요약.',
    href: '/',
    linkLabel: '대시보드 보기',
  },
  {
    icon: Activity,
    title: '자금 흐름',
    whatItShows: '어느 섹터의 시가총액이 늘고 줄었는지를 보여줍니다.',
    highlight:
      '유입/유출 카드와 MFI 막대 — 화살표는 시총 변화 방향일 뿐, 실제 순매수가 아닙니다.',
    href: `/${DEFAULT_INDUSTRY}/money-flow`,
    linkLabel: '자금 흐름 보기',
  },
  {
    icon: Percent,
    title: '등락',
    whatItShows: '선택한 기간에 누가 많이 오르고 내렸는지 비교합니다.',
    highlight: '등락률 표·차트, 상위 종목 정렬.',
    href: `/${DEFAULT_INDUSTRY}/price-changes`,
    linkLabel: '등락 화면 보기',
  },
  {
    icon: MapIcon,
    title: '패권 지도 / 트렌드',
    whatItShows: '섹터별 점유율과 순위를 시각적으로 비교합니다.',
    highlight: '점유율 비중, 패권 점수, 시가총액 추이.',
    href: `/${DEFAULT_INDUSTRY}/statistics`,
    linkLabel: '트렌드 보기',
  },
  {
    icon: Briefcase,
    title: '종목 상세',
    whatItShows: '한 회사를 점수 추이·peer 비교·밸류에이션·시그널까지 깊이 봅니다.',
    highlight: '패권 점수 추이, 동종 종목 비교, 룰 기반 시그널.',
    href: '/',
    linkLabel: '대시보드에서 종목 선택',
  },
]

/** 섹션 C — 화면별 읽는 법. */
export function ScreenGuide() {
  return (
    <GuideSection
      id="screens"
      title="C. 화면별 읽는 법"
      description="각 화면이 무엇을 보여주는 곳인지와 대표 요소를 정리했습니다."
    >
      <div className="space-y-3">
        {SCREENS.map((screen) => {
          const Icon = screen.icon
          return (
            <div
              key={screen.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className="h-5 w-5 shrink-0 text-info" aria-hidden />
                    <h3 className="text-base font-semibold text-foreground">
                      {screen.title}
                    </h3>
                  </div>
                  <p className="text-sm text-foreground">{screen.whatItShows}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {screen.highlight}
                  </p>
                </div>
                <Link
                  href={screen.href}
                  className="inline-flex shrink-0 items-center gap-1 self-start text-sm text-info hover:underline"
                >
                  {screen.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </GuideSection>
  )
}
