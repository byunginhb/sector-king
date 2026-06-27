import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image'

export const runtime = 'nodejs'
export const alt = '섹터킹 픽 — 단기·장기 점수 종목 랭킹'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function OgImage() {
  return renderOgImage({
    eyebrow: 'SECTOR KING PICK',
    title: '섹터킹 픽',
    subtitle: '단기·장기 점수로 보는 종목 랭킹',
    tags: ['단기·장기 점수', '투자의견', '목표주가'],
  })
}
