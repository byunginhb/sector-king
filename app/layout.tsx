import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WebSiteJsonLd } from '@/components/json-ld'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sectorking.co.kr'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Sector King - 투자 패권 지도',
    template: '%s | Sector King',
  },
  description:
    '산업별 섹터 시장 지배력 순위 시각화 - 주식 투자, 섹터 자금 흐름, 시가총액 분석, 가격 변화율 추적. 반도체, AI, 클라우드 등 기술 섹터부터 헬스케어, 에너지까지.',
  keywords: [
    '주식',
    '투자',
    '섹터',
    '시장분석',
    '자금흐름',
    '시가총액',
    '등락율',
    '반도체',
    'AI',
    '인공지능',
    '클라우드',
    '기술주',
    '섹터 분석',
    '패권 지도',
    '투자 분석',
    '주식 시장',
    '시장 지배력',
    '섹터 자금 흐름',
    'Money Flow Index',
    '가격 변화율',
  ],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: BASE_URL,
    siteName: 'Sector King',
    title: 'Sector King - 투자 패권 지도',
    description:
      '산업별 섹터 시장 지배력 순위 시각화 - 주식 투자, 섹터 자금 흐름, 시가총액 분석, 가격 변화율 추적',
    // TODO: OG 이미지 생성 후 활성화
    // images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Sector King' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sector King - 투자 패권 지도',
    description:
      '산업별 섹터 시장 지배력 순위 시각화 - 주식 투자, 섹터 자금 흐름, 시가총액 분석',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <WebSiteJsonLd />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}>
        <Providers>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
