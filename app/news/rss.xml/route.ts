/**
 * /news/rss.xml — 발행된 마켓 리포트 RSS 2.0 피드.
 *
 * 마켓 리포트는 이 사이트에서 가장 자주 새 URL 이 생기는 콘텐츠다. 네이버 서치어드바이저와
 * 피드 리더는 sitemap 이 아니라 RSS 로 새 글을 가져간다.
 */
import { getPublishedNewsList } from '@/lib/news/public'
import { buildRssFeed, RSS_CONTENT_TYPE, RSS_ITEM_LIMIT } from '@/lib/news/rss'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

// 리포트는 하루 몇 건 발행된다 — 30분이면 새 글이 충분히 빨리 실리고 Supabase 호출도 드물다.
export const revalidate = 1800

export async function GET() {
  // 조회 실패 시 빈 배열이 온다 → 빈 피드를 200 으로 낸다(5xx 면 리더가 구독을 끊는다).
  const reports = await getPublishedNewsList(RSS_ITEM_LIMIT)

  const xml = buildRssFeed(
    {
      baseUrl: BASE_URL,
      title: 'Sector King 마켓 리포트',
      description:
        '섹터킹이 발행하는 일별·월별 마켓 리포트. 그날의 시장 요약과 섹터 자금 흐름 해설.',
      feedPath: '/news/rss.xml',
    },
    reports.map((report) => ({
      id: report.id,
      title: report.title,
      publishedAt: report.publishedAt,
      reportDate: report.reportDate,
      summary: report.oneLineConclusion,
      keywords: report.coverKeywords,
    }))
  )

  return new Response(xml, { headers: { 'Content-Type': RSS_CONTENT_TYPE } })
}
