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
