/**
 * 메인 화면 NewsHomeCard 슬롯 — 발행본이 있을 때만 렌더.
 */
'use client'

import { useLatestNews } from '@/hooks/use-latest-news'
import { NewsHomeCard } from './news-home-card'

export function NewsHomeCardSlot() {
  const { data, isLoading } = useLatestNews()
  if (isLoading) return null
  const item = data?.items?.[0]
  if (!item) return null
  return <NewsHomeCard report={item} />
}
