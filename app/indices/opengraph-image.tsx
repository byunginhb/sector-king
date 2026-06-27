import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image'

export const runtime = 'nodejs'
export const alt = '세계 주요 지수 — 주요 국가 대표 지수'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function OgImage() {
  return renderOgImage({
    eyebrow: 'WORLD INDICES',
    title: '세계 주요 지수',
    subtitle: '미국·한국·일본·인도 등 주요 국가 대표 지수',
    tags: ['현재 지수', '기간별 등락', '52주 위치'],
  })
}
