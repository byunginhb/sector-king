import type { MetadataRoute } from 'next'
import { getAllIndustries } from '@/lib/industry'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sectorking.co.kr'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const industries = await getAllIndustries()
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
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
  ])

  return [...staticPages, ...industryPages]
}
