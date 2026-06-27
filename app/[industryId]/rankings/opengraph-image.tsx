import { getAllIndustries } from '@/lib/industry'
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image'

export const runtime = 'nodejs'
export const alt = '산업 점수 랭킹'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function OgImage({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  const industries = await getAllIndustries()
  const industry = industries.find((i) => i.id === industryId)
  const name = industry?.name ?? '산업'

  return renderOgImage({
    eyebrow: 'SECTOR KING PICK',
    title: `${name} 점수 랭킹`,
    subtitle: '단기·장기 점수로 보는 종목 랭킹',
    tags: ['단기·장기 점수', '투자의견', '목표주가'],
  })
}
