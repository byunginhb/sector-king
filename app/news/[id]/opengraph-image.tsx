import { getPublishedNewsById } from '@/lib/news/public'
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image'

export const runtime = 'nodejs'
export const alt = 'Sector King 마켓 리포트'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 64px 제목이 3줄을 넘기지 않는 길이. 넘으면 말줄임. */
const TITLE_MAX = 46

function clampTitle(title: string): string {
  const chars = Array.from(title.trim())
  return chars.length > TITLE_MAX ? `${chars.slice(0, TITLE_MAX - 1).join('')}…` : title.trim()
}

/** "2026-10-02" → "2026년 10월 2일". 형식이 다르면 null. */
function formatReportDate(reportDate: string | null): string | null {
  const match = reportDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return `${Number(match[1])}년 ${Number(match[2])}월 ${Number(match[3])}일`
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // 조회는 쿠키 없는 anon 이고 실패하면 null 이다(예외 없음) → 브랜드 이미지로 폴백.
  const report = UUID_RE.test(id) ? await getPublishedNewsById(id) : null

  if (!report) {
    return renderOgImage({
      eyebrow: 'MARKET REPORT',
      title: '마켓 리포트',
      subtitle: '그날의 시장 요약과 섹터 자금 흐름 해설',
    })
  }

  return renderOgImage({
    eyebrow: 'MARKET REPORT',
    title: clampTitle(report.title),
    subtitle: formatReportDate(report.reportDate) ?? undefined,
  })
}
