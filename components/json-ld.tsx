const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/**
 * 사이트 전반에 노출되는 WebSite + Organization 구조화 데이터.
 * Google 검색 결과의 sitelinks searchbox / Knowledge Panel 후보에 활용.
 */
export function WebSiteJsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}#website`,
        name: 'Sector King',
        alternateName: ['섹터킹', 'Sector King 섹터킹'],
        url: BASE_URL,
        inLanguage: 'ko-KR',
        description:
          '한국·미국 주식 시장의 산업별 섹터 지배력 시각화 — 시가총액, 자금 흐름, 등락율, 일별 마켓 리포트 무료 제공',
        publisher: { '@id': `${BASE_URL}#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}#organization`,
        name: 'Sector King',
        alternateName: '섹터킹',
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/logo.svg`,
        },
        description:
          '산업별 섹터 시장 지배력 순위와 일별 마켓 리포트를 제공하는 주식 투자 분석 서비스',
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}

/**
 * 마켓 리포트 상세 (`/news/[id]`) 의 NewsArticle JSON-LD.
 * Google News / Discover 노출 후보를 위한 핵심 schema.
 */
interface NewsArticleJsonLdProps {
  id: string
  title: string
  description: string
  publishedAt: string | null
  reportDate: string
  modifiedAt?: string | null
  authorName?: string
  keywords?: string[]
}

export function NewsArticleJsonLd({
  id,
  title,
  description,
  publishedAt,
  reportDate,
  modifiedAt,
  authorName = 'Sector King Editorial',
  keywords = [],
}: NewsArticleJsonLdProps) {
  const url = `${BASE_URL}/news/${id}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: title.slice(0, 110), // Google 권장 최대 110자
    description: description.slice(0, 250),
    inLanguage: 'ko-KR',
    datePublished: publishedAt ?? `${reportDate}T00:00:00+09:00`,
    dateModified: modifiedAt ?? publishedAt ?? `${reportDate}T00:00:00+09:00`,
    author: { '@type': 'Organization', name: authorName, url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Sector King',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.svg` },
    },
    image: [`${BASE_URL}/news/${id}/opengraph-image`, `${BASE_URL}/opengraph-image`],
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    articleSection: '경제',
    isAccessibleForFree: true,
    url,
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

/**
 * 종목 상세 (`/stock/[ticker]`) 의 Corporation JSON-LD.
 * schema.org `Corporation` + `tickerSymbol` 로 종목 엔티티를 색인 후보로 노출한다.
 * 가격성 데이터(시가총액)는 반드시 toUsd 변환된 값을 받아 사용한다(통화 규칙).
 */
interface StockJsonLdProps {
  ticker: string
  name: string
  nameKo?: string | null
  /** USD 정규화된 시가총액 (없으면 생략) */
  marketCapUsd?: number | null
}

export function StockJsonLd({ ticker, name, nameKo, marketCapUsd }: StockJsonLdProps) {
  const url = `${BASE_URL}/stock/${ticker}`
  const alternateName = nameKo && nameKo !== name ? nameKo : undefined

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Corporation',
    '@id': url,
    name,
    alternateName,
    tickerSymbol: ticker,
    url,
  }

  if (marketCapUsd != null && Number.isFinite(marketCapUsd)) {
    jsonLd.marketCap = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: Math.round(marketCapUsd),
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

/**
 * 산업/뉴스 페이지의 BreadcrumbList JSON-LD.
 * Google 검색 결과의 빵부스러기 노출.
 */
interface BreadcrumbJsonLdProps {
  items: { name: string; url: string }[]
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

/**
 * FAQPage JSON-LD — AI 검색(AI Overviews/AI Mode)·Google FAQ 리치결과에서
 * 질문-답변을 직접 인용하도록 한다. 답변 텍스트는 페이지 본문과 일치해야 한다.
 */
interface FaqJsonLdProps {
  items: { question: string; answer: string }[]
}

export function FaqJsonLd({ items }: FaqJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

/**
 * Dataset JSON-LD — 세계 지수 같은 데이터셋 페이지를 AI/검색이
 * "출처 있는 데이터"로 인식하게 한다. 출처(creditText)·측정 변수를 명시.
 */
interface DatasetJsonLdProps {
  name: string
  description: string
  url: string
  /** 데이터 출처명 (예: Yahoo Finance) */
  creditText?: string
  /** 출처 URL */
  sourceUrl?: string
  /** 측정 변수 목록 (예: 현재 지수, 1일 등락률 …) */
  variableMeasured?: string[]
}

export function DatasetJsonLd({
  name,
  description,
  url,
  creditText,
  sourceUrl,
  variableMeasured,
}: DatasetJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    inLanguage: 'ko-KR',
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: 'Sector King', url: BASE_URL },
    publisher: { '@type': 'Organization', name: 'Sector King', url: BASE_URL },
  }
  if (creditText) jsonLd.creditText = creditText
  if (sourceUrl) jsonLd.isBasedOn = sourceUrl
  if (variableMeasured && variableMeasured.length > 0) {
    jsonLd.variableMeasured = variableMeasured
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
