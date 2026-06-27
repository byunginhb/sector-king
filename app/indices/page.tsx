import type { Metadata } from 'next'
import { IndicesPage } from '@/components/indices/indices-page'
import { FaqJsonLd, BreadcrumbJsonLd, DatasetJsonLd } from '@/components/json-ld'
import { INDICES_FAQ } from '@/lib/seo-faq'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const title = '세계 주요 지수'
const description =
  '미국 S&P 500·나스닥, 한국 코스피, 일본 닛케이, 인도 니프티 등 주요 국가 대표 지수의 현재 수준·1일 등락·52주 위치를 한눈에'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | Sector King`,
    description,
    url: `${BASE_URL}/indices`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Sector King`,
    description,
  },
  alternates: { canonical: `${BASE_URL}/indices` },
}

export default function IndicesRoute() {
  return (
    <>
      <DatasetJsonLd
        name="세계 주요 국가 대표 주가지수"
        description={description}
        url={`${BASE_URL}/indices`}
        creditText="Yahoo Finance"
        sourceUrl="https://finance.yahoo.com"
        variableMeasured={[
          '현재 지수',
          '1일 등락률',
          '1주 등락률',
          '1달 등락률',
          '1년 등락률',
          '52주 위치',
        ]}
      />
      <FaqJsonLd items={INDICES_FAQ} />
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: '세계 지수', url: `${BASE_URL}/indices` },
        ]}
      />
      <IndicesPage />
    </>
  )
}
