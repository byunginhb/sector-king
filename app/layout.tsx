import type { Metadata } from 'next'
import { Geist, Fraunces, JetBrains_Mono } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from '@/components/providers'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WebSiteJsonLd } from '@/components/json-ld'
import { Footer } from '@/components/footer'
import 'driver.js/dist/driver.css'
import './globals.css'
import './onboarding.css'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Editorial Bloomberg Terminal — three voices:
//   - Geist Sans for body and UI
//   - Fraunces (variable, opsz + SOFT) for serif display headlines
//   - JetBrains Mono for prices, tickers, and numeric data
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Sector King - 투자 패권 지도',
    template: '%s | Sector King',
  },
  description:
    '한국·미국 주식 시장의 산업별 섹터 지배력을 한 눈에 — 시가총액, 자금 흐름, 등락율, 일별 마켓 리포트. 반도체·AI·클라우드·헬스케어·에너지·금융까지 모든 섹터 분석을 무료로 제공합니다. 코스피, 코스닥, S&P 500, 나스닥 종목 추적.',
  keywords: [
    // 기본 검색어
    '주식', '투자', '주식 투자', '주식 시장', '주식 분석', '주식 추천', '실시간 주가',
    // 섹터·산업
    '섹터', '섹터 분석', '산업별 분석', '시장 지배력', '시가총액', '자금흐름', '섹터 자금 흐름', '등락율', '가격 변화율',
    // 시장
    '코스피', '코스닥', '나스닥', 'S&P 500', '미국 주식', '한국 주식', '글로벌 주식',
    // 테마
    '반도체', 'AI', '인공지능', 'AI 주식', '클라우드', '기술주', '바이오', '헬스케어', '에너지', '금융', '방산', '모빌리티',
    // 한국 종목
    '삼성전자', 'SK하이닉스', 'NAVER', '카카오', '현대차', 'POSCO', '한화', 'LG에너지솔루션',
    // 미국 종목
    'NVIDIA', 'NVDA', 'AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'META',
    // 분석/툴
    '시장분석', '투자 분석', '패권 지도', 'Money Flow Index', '자금 유입', '자금 유출', '핫 섹터', '핫 종목',
    // 일별 리포트
    '일별 마켓 리포트', '데일리 리포트', '오늘의 시장', '경제 요약', '주식 뉴스',
    // 브랜드
    'Sector King', '섹터킹',
  ],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: BASE_URL,
    siteName: 'Sector King',
    title: 'Sector King — 한국·미국 주식 섹터 패권 지도',
    description:
      '산업별 섹터 시장 지배력을 한 눈에. 자금 흐름·시가총액·등락율·일별 리포트 무료 제공.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sector King — 한국·미국 주식 섹터 패권 지도',
    description:
      '산업별 섹터 시장 지배력을 한 눈에. 자금 흐름·시가총액·등락율·일별 리포트 무료 제공.',
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
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml', sizes: '180x180' },
    ],
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    other: {
      'naver-site-verification': '71e2d01a3f93512e250aa02f676771a4f601d748',
    },
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
      <body
        className={`${geistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} antialiased bg-background font-sans`}
      >
        <Providers>
          <TooltipProvider delayDuration={0}>
            {children}
            <Footer />
          </TooltipProvider>
        </Providers>
        <SpeedInsights />
      </body>
      {GA_MEASUREMENT_ID ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
    </html>
  )
}
