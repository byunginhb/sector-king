import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image'

export const runtime = 'nodejs'
export const alt = '시장 규모 — 섹터·카테고리별 시총·성장 전망'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function OgImage() {
  return renderOgImage({
    eyebrow: 'MARKET SIZE',
    title: '시장 규모',
    subtitle: '산업·섹터별 시가총액 지도와 성장 전망',
    tags: ['시총 지도', '매출 성장률', '목표주가 상승여력'],
  })
}
