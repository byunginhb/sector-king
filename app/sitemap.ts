import type { MetadataRoute } from 'next'
import { getAllIndustries } from '@/lib/industry'
import { getAllStockTickers } from '@/lib/stock-server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [industries, tickers] = await Promise.all([
    getAllIndustries(),
    getAllStockTickers(),
  ])
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/guide`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/rankings`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/market-size`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/indices`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const industryPages: MetadataRoute.Sitemap = industries.flatMap((industry) => [
    {
      url: `${BASE_URL}/${industry.id}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/${industry.id}/money-flow`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/${industry.id}/price-changes`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/${industry.id}/statistics`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/${industry.id}/rankings`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ])

  // 종목 상세 페이지 — DB 에 존재하는(= active) 티커만 동적 등록.
  // 시장 한정으로 제거된 티커는 DB 에서 빠지므로 자동으로 sitemap 에서도 제외된다.
  const stockPages: MetadataRoute.Sitemap = tickers.map((ticker) => ({
    url: `${BASE_URL}/stock/${encodeURIComponent(ticker)}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...industryPages, ...stockPages]
}
