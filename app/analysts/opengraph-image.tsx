import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image'

export const runtime = 'nodejs'
export const alt = '애널리스트 성적표 — 목표주가 예측력 검증'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function OgImage() {
  return renderOgImage({
    eyebrow: 'ANALYST SCORECARD',
    title: '애널리스트 성적표',
    subtitle: '목표주가를 올리고 내린 방향대로 주가가 움직였는가',
    tags: ['방향 적중률', '목표주가 추이', '증권사 리포트'],
  })
}
