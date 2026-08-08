import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getAllIndustries } from '@/lib/industry'
import { getAllStockTickers } from '@/lib/stock-server'
import { getSiteFacts } from '@/lib/site-facts'
import { getIndexableSectors } from '@/lib/sector-server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/**
 * 정적 콘텐츠 페이지의 실제 본문 수정일.
 *
 * lastmod 에 배포 시각을 일괄로 넣으면 "전 페이지가 매일 바뀐다"는 거짓 신호가 되어
 * 크롤러가 lastmod 를 통째로 무시하게 된다(Google sitemap 가이드). 데이터 페이지는
 * 최신 스냅샷 일자를, 문서 페이지는 아래 표의 실제 개정일을 쓴다.
 * 문서를 고칠 때 이 날짜도 같이 올린다.
 */
const CONTENT_UPDATED_AT: Record<string, string> = {
  '/guide': '2026-06-11',
  '/about': '2026-08-05',
  '/methodology': '2026-08-07',
  '/contact': '2026-07-06',
  '/terms': '2025-07-06',
  '/privacy': '2025-07-06',
  // 아래 값은 각 페이지 파일의 UPDATED_AT 상수와 같아야 한다(본문 표시일 = lastmod).
  '/data-sources': '2026-08-08',
  '/guide/market-cap-change-vs-net-buying': '2026-08-08',
  '/guide/how-to-read-money-flow': '2026-08-08',
  '/guide/sector-rotation': '2026-08-08',
}

/** 발행된 마켓 리포트 URL — 목록에서 상세로 가는 링크는 있지만 sitemap 에 빠져 있었다. */
async function getPublishedNews(): Promise<{ id: string; updatedAt: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  try {
    // 쿠키 세션이 필요 없는 공개 read — RLS 로 published 만 노출된다.
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await supabase
      .from('news_reports')
      .select('id, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1000)

    if (error || !data) return []
    return data.map((r) => ({
      id: r.id as string,
      updatedAt: (r.updated_at ?? r.published_at ?? '') as string,
    }))
  } catch (error) {
    // sitemap 은 빌드를 막으면 안 된다 — 뉴스만 빠지고 나머지는 정상 생성.
    console.error('sitemap: 뉴스 목록 조회 실패', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [industries, tickers, facts, news, indexableSectors] = await Promise.all([
    getAllIndustries(),
    getAllStockTickers(),
    getSiteFacts(),
    getPublishedNews(),
    getIndexableSectors(),
  ])

  // 데이터 페이지의 lastmod = 최신 스냅샷 일자(= 실제로 숫자가 바뀐 시점).
  const dataUpdatedAt = facts.latestDataDate
    ? new Date(`${facts.latestDataDate}T00:00:00Z`)
    : new Date()

  const doc = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(`${CONTENT_UPDATED_AT[path] ?? '2026-01-01'}T00:00:00Z`),
    changeFrequency: 'monthly',
    priority,
  })

  const data = (
    path: string,
    priority: number,
    changeFrequency: 'daily' | 'weekly' = 'daily'
  ): MetadataRoute.Sitemap[number] => ({
    url: `${BASE_URL}${path}`,
    lastModified: dataUpdatedAt,
    changeFrequency,
    priority,
  })

  const staticPages: MetadataRoute.Sitemap = [
    data('', 1.0),
    data('/rankings', 0.9),
    data('/market-size', 0.8),
    data('/analysts', 0.8),
    data('/indices', 0.8),
    data('/news', 0.8),
    data('/sectors', 0.9),
    // 신뢰·설명 페이지 — E-E-A-T 신호라 반드시 색인 대상에 넣는다.
    doc('/guide', 0.7),
    doc('/about', 0.7),
    doc('/methodology', 0.7),
    doc('/data-sources', 0.7),
    // 비브랜드 검색 의도별 설명 문서. lastmod 는 각 페이지의 UPDATED_AT 과 맞춘다.
    doc('/guide/market-cap-change-vs-net-buying', 0.7),
    doc('/guide/how-to-read-money-flow', 0.7),
    doc('/guide/sector-rotation', 0.7),
    doc('/contact', 0.4),
    doc('/terms', 0.3),
    doc('/privacy', 0.3),
  ]

  const industryPages: MetadataRoute.Sitemap = industries.flatMap((industry) => [
    data(`/${industry.id}`, 0.9),
    data(`/${industry.id}/money-flow`, 0.8),
    data(`/${industry.id}/price-changes`, 0.8),
    data(`/${industry.id}/statistics`, 0.8),
    data(`/${industry.id}/rankings`, 0.8),
  ])

  // 섹터 상세 — 라우트의 generateStaticParams 와 같은 원천(getIndexableSectors)을 쓴다.
  // 다른 목록을 쓰면 "sitemap 엔 있는데 404" 가 생긴다.
  const sectorPages: MetadataRoute.Sitemap = indexableSectors.map((sector) =>
    data(`/sectors/${sector.id}`, 0.7)
  )

  // 종목 상세 페이지 — DB 에 존재하는(= active) 티커만 동적 등록.
  // 시장 한정으로 제거된 티커는 DB 에서 빠지므로 자동으로 sitemap 에서도 제외된다.
  const stockPages: MetadataRoute.Sitemap = tickers.map((ticker) =>
    data(`/stock/${encodeURIComponent(ticker)}`, 0.6)
  )

  const newsPages: MetadataRoute.Sitemap = news.map((item) => ({
    url: `${BASE_URL}/news/${item.id}`,
    lastModified: item.updatedAt ? new Date(item.updatedAt) : dataUpdatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...industryPages, ...sectorPages, ...stockPages, ...newsPages]
}
