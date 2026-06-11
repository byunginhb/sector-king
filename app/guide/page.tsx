import type { Metadata } from 'next'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { GuideToc } from '@/components/guide/guide-toc'
import { ServiceIntro } from '@/components/guide/service-intro'
import { NumberGlossary } from '@/components/guide/number-glossary'
import { ScreenGuide } from '@/components/guide/screen-guide'
import { HonestLimits } from '@/components/guide/honest-limits'
import { toFaqEntries } from '@/components/guide/number-glossary-data'

export const metadata: Metadata = {
  title: '이용 안내',
  description:
    '처음 오신 분을 위한 Sector King 이용 안내입니다. 산업·섹터·종목 3계층 구조, 화면의 숫자가 무슨 뜻인지, 어떻게 읽는지, 그리고 데이터의 한계를 쉽게 설명합니다.',
  alternates: { canonical: '/guide' },
}

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
          <HonestLimits />
        </div>
      </main>
    </div>
  )
}
