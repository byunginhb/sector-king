import type { Metadata } from 'next'
import Link from 'next/link'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { GuideToc } from '@/components/guide/guide-toc'
import { ServiceIntro } from '@/components/guide/service-intro'
import { NumberGlossary } from '@/components/guide/number-glossary'
import { ScreenGuide } from '@/components/guide/screen-guide'
import { ValuationMetricGuide } from '@/components/guide/valuation-metric-guide'
import { HonestLimits } from '@/components/guide/honest-limits'
import { toFaqEntries } from '@/components/guide/number-glossary-data'

export const metadata: Metadata = {
  title: '이용 안내',
  description:
    '처음 오신 분을 위한 Sector King 이용 안내입니다. 산업·섹터·종목 3계층 구조, 화면의 숫자가 무슨 뜻인지, 어떻게 읽는지, 그리고 데이터의 한계를 쉽게 설명합니다.',
  alternates: { canonical: '/guide' },
}

/** 이 페이지 하단에서 안내하는 주제별 심화 문서. 새 가이드를 추가하면 여기에도 등록한다. */
const DEEP_DIVES = [
  {
    href: '/guide/market-cap-change-vs-net-buying',
    label: '시가총액 변화와 순매수는 무엇이 다른가',
    summary:
      '"자금 흐름"이 실제 유입 자금이 아닌 이유, 그리고 섹터킹 MFI가 표준 MFI와 다른 세 가지.',
  },
  {
    href: '/guide/how-to-read-money-flow',
    label: '시장의 돈이 어디로 흐르는지 읽는 방법',
    summary: '기간 고르기부터 종목 단위 확인까지 4단계와, 흔한 오독 네 가지.',
  },
  {
    href: '/guide/sector-rotation',
    label: '섹터 로테이션을 확인하는 방법',
    summary: '반대로 움직이는 섹터 짝 찾기. 시장 전체 등락과 구분하는 법.',
  },
  {
    href: '/data-sources',
    label: '데이터 출처와 수집 방식',
    summary: '어떤 숫자가 어디서 오고, 무엇이 섹터킹이 직접 계산한 값인지.',
  },
] as const

/** 숫자 사전 Q/A 를 FAQPage schema.org JSON-LD 로 변환. */
function buildFaqJsonLd() {
  const entries = toFaqEntries()
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  }
}

/**
 * /guide — 완전 초보자용 서비스 설명 페이지 (Server Component).
 * /methodology(상세 산식)와 역할 분담: 가이드(얕음) → 메서돌로지(깊음) 단방향 연결.
 */
export default function GuidePage() {
  const faqJsonLd = buildFaqJsonLd()

  return (
    <div className="min-h-screen">
      <GlobalTopBar subtitle="이용 안내 · 처음 오셨다면 여기부터" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="container mx-auto max-w-3xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            이용 안내
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            이 서비스로 무엇을 볼 수 있고, 화면의 숫자가 무슨 뜻이며, 어떻게 읽는지
            쉽게 안내합니다.
          </p>
        </header>

        <GuideToc />

        <div className="space-y-10">
          <ServiceIntro />
          <NumberGlossary />
          <ScreenGuide />
          <ValuationMetricGuide />
          <HonestLimits />
        </div>

        {/* 주제별 심화 문서 — 이 페이지(얕음) → 개별 가이드(깊음) → /methodology(산식) 순. */}
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-lg font-semibold text-foreground sm:text-xl">
            주제별 자세한 설명
          </h2>
          <ul className="mt-4 space-y-3">
            {DEEP_DIVES.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm font-medium text-info hover:underline">
                  {item.label}
                </Link>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
