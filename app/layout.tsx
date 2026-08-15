import type { Metadata } from 'next'
import { Geist, Fraunces, JetBrains_Mono, Nanum_Myeongjo } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from '@/components/providers'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WebSiteJsonLd } from '@/components/json-ld'
import { Footer } from '@/components/footer'
import { GateProvider } from '@/components/gate/gate-provider'
import { PreviewBanner } from '@/components/gate/preview-banner'
import { getPolicyMap } from '@/lib/permissions/policy-store'
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

// 한글 디스플레이 헤드라인 — Fraunces(라틴 전용)가 못 그리는 한글 글리프 담당.
// next/font는 이 폰트의 subset을 'latin'만 노출하지만, 한글 글리프는
// Google이 unicode-range @font-face로 함께 서빙한다. 대용량이라 preload 비활성.
const nanumMyeongjo = Nanum_Myeongjo({
  variable: '--font-nanum-myeongjo',
  subsets: ['latin'],
  display: 'swap',
  weight: ['800'],
  preload: false,
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
    '주식', '투자', '주식 투자', '주식 시장', '주식 분석', '주식 추천', '주가 추적',
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
    images: [
      {
        url: '/screen.png',
        width: 1274,
        height: 808,
        alt: 'Sector King — 시장의 돈이 어디로 흐르는가',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sector King — 한국·미국 주식 섹터 패권 지도',
    description:
      '산업별 섹터 시장 지배력을 한 눈에. 자금 흐름·시가총액·등락율·일별 리포트 무료 제공.',
    images: ['/screen.png'],
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
  // ⚠️ 여기에 alternates.canonical 을 두지 말 것 — Next 는 루트 metadata 를 자식 페이지로
  //    상속시키므로, 자기 canonical 을 선언하지 않은 모든 페이지가 홈을 canonical 로 가리키게
  //    되어 색인에서 통째로 사라진다. canonical 은 각 페이지가 직접 선언한다(app/page.tsx 포함).
  // 검색엔진 소유 확인 토큰. 인증이 끝난 뒤에도 지우면 소유권이 풀리므로 그대로 둔다.
  // Google 은 DNS TXT(도메인 속성)로 인증돼 있어 여기 없다 — 삭제된 게 아니다.
  verification: {
    other: {
      'naver-site-verification': '71e2d01a3f93512e250aa02f676771a4f601d748',
      // Bing Webmaster Tools. GSC 임포트는 도메인 속성을 못 읽어서 직접 인증했다.
      'msvalidate.01': '46EFAE4566241B6A88D94F7DFCC2041D',
    },
  },
}

/*
 * 렌더 모드 — 이 레이아웃은 쿠키를 읽지 않는다 (읽으면 전 사이트가 동적이 된다)
 *
 * 초안에서는 여기서 `getViewerTier()` / `getGateDecisionMap()` 을 불렀는데,
 * 둘 다 쿠키(세션·미리보기)를 읽는다. 루트 레이아웃에서 동적 API 를 호출하면
 * 그 아래 **모든 라우트가 동적 렌더로 떨어진다.** 추측이 아니라 실측이다 —
 * 해당 버전으로 `pnpm build` 를 돌린 결과:
 *
 *   쿠키 미사용:  ○ Static 24 + ● SSG 6  (/sectors/[sectorId] 109개,
 *                 /rankings·/[industryId]/rankings 는 revalidate 1h)
 *   쿠키 사용:    페이지 프리렌더 0 — 전부 ƒ Dynamic
 *                 (남은 ○ 6개는 opengraph-image·robots·sitemap 으로 트리 밖)
 *
 * 그래서 여기서는 **사용자와 무관한 정책 맵만** 내린다(`getPolicyMap()` 은
 * 쿠키 없는 anon 클라이언트 + unstable_cache 라 정적 렌더에서 안전하다).
 * 등급 판정은 `GateProvider` 가 클라이언트에서 마무리한다.
 *
 * 이 방향이 안전한 이유 — **잠금 해제 방향으로만 움직인다.**
 * 서버 HTML 은 언제나 `anon` 기준(=가장 잠긴 상태)으로 렌더되고, 클라이언트가
 * 세션을 확인한 뒤 등급이 높으면 **풀어준다**. 위험한 방향(유료 콘텐츠를 먼저
 * 보여줬다가 뒤늦게 감추는 것)은 구조적으로 발생할 수 없다. 기획서 §B-3 이
 * 경고한 CLS·유출 경로가 정확히 그 반대 방향이었다.
 *
 * 값의 실제 보호는 어차피 서버 마스킹이 한다(`FeatureDef.masking === 'server'`).
 * 잠긴 값은 이 트리까지 오지 않으므로, 클라이언트가 등급을 늦게 알아도 유출될
 * 값 자체가 없다. 이는 `components/auth/auth-button-client.tsx` 가 이미 쓰고 있는
 * 패턴과 같다 — 정적 HTML 은 비로그인 기준, 개인화는 세션 확인 후.
 *
 * 부수 효과: `/rankings` 의 `revalidate = 3600` ISR HTML 과 CDN 캐시는 항상
 * anon 렌더 결과라 기획서 §B-6 원칙 5("anon 렌더 결과만 공용 캐시")를 자동으로
 * 만족한다. 미리보기 쿠키 요청은 middleware 가 `private, no-store` 로 격리한다.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 사용자와 무관한 정책 맵(featureId → 정책). 쿠키를 읽지 않으므로 정적 렌더 유지.
  // DB 조회 실패 시의 폴백 정책은 `lib/permissions/policy-store.ts` 가 소유한다 —
  // 여기서 try/catch 로 빈 맵을 만들면 장애가 곧 전면 개방이 되므로 감싸지 않는다.
  const policies = await getPolicyMap()

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          // 첫 페인트 전 동기 실행: localStorage 의 표시 통화를 <html data-currency> 로 선반영(flash 방지).
          // 키('sector-king-currency')·기본값('KRW')은 lib/currency.ts SoT 와 문자열로 일치시켜야 함
          // (번들러가 상수를 자동 치환하지 못하므로 하드코딩 — 변경 시 SoT 와 동시 수정).
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=localStorage.getItem('sector-king-currency');document.documentElement.setAttribute('data-currency',(c==='USD'||c==='KRW')?c:'KRW');}catch(e){document.documentElement.setAttribute('data-currency','KRW');}})();`,
          }}
        />
        <WebSiteJsonLd />
      </head>
      <body
        className={`${geistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${nanumMyeongjo.variable} antialiased font-sans`}
      >
        <GateProvider policies={policies}>
          <Providers>
            <TooltipProvider delayDuration={0}>
              {children}
              <Footer />
            </TooltipProvider>
          </Providers>
        </GateProvider>
        {/* 문서 끝에 둔다 — 하단 고정 배너가 탭 순서의 마지막이어야 한다.
            쿠키가 없으면 아무것도 렌더하지 않으므로 일반 사용자에겐 비용 0. */}
        <PreviewBanner />
        <SpeedInsights />
      </body>
      {GA_MEASUREMENT_ID ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
    </html>
  )
}
