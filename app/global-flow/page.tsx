import type { Metadata } from 'next'
import { GlobalFlowPage } from '@/components/global-flow/global-flow-page'
import { BreadcrumbJsonLd, DatasetJsonLd } from '@/components/json-ld'
import { getGlobalFlow } from '@/lib/global-flow/server'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const title = '글로벌 자금 지도 — 주식·채권·금·달러·비트코인 자금 흐름'
const description =
  '돈은 지금 어디로 흐르는가. 미국 순유동성, 자산군별 시가 가치 변화, 상대 강도 회전 궤적, 스테이블코인·MMF·ETF 순설정·고객예탁금·외국인 순매수까지 주식 밖 자금 흐름을 한 화면에.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title: `${title} | Sector King`, description, url: `${BASE_URL}/global-flow` },
  twitter: { card: 'summary_large_image', title: `${title} | Sector King`, description },
  alternates: { canonical: `${BASE_URL}/global-flow` },
}

export default async function GlobalFlowRoute() {
  // SSR: useSearchParams 를 쓰지 않는 클라이언트 트리라 초기 HTML 에 본문이 그대로 들어간다.
  const data = await getGlobalFlow()

  return (
    <>
      <DatasetJsonLd
        name="글로벌 자산군 자금 흐름"
        description={description}
        url={`${BASE_URL}/global-flow`}
        creditText="Yahoo Finance, FRED, DefiLlama, 네이버 증권"
        sourceUrl="https://fred.stlouisfed.org"
        variableMeasured={[
          '미국 순유동성',
          '자산군 기간 수익률',
          '자산군 시가 가치 변화',
          '상대 강도·모멘텀',
          '스테이블코인 발행량',
          'MMF 잔고',
          'ETF 순설정',
          '고객예탁금',
          '외국인 순매수',
        ]}
      />
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: '글로벌 자금 지도', url: `${BASE_URL}/global-flow` },
        ]}
      />
      <GlobalFlowPage initialData={data} />
    </>
  )
}
