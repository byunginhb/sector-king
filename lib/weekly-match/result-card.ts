import type { WeeklyMatchResultCard } from './types'

export const CARD_OUTCOME = { hit: '적중', miss: '실패', tie: '동률', void: '무효' } as const
export const cardReturn = (value: number | null) => value === null ? '미확정' : `${value > 0 ? '+' : ''}${value.toFixed(6)}%`

export function resultCardText(card: WeeklyMatchResultCard): string {
  return [
    'Sector King · 나의 섹터 매치', card.title,
    `${card.baseDate} ~ ${card.endDate}`,
    `내 선택: ${card.sideName} · ${CARD_OUTCOME[card.outcome]}`,
    `${card.leftName} ${cardReturn(card.leftReturn)} / ${card.rightName} ${cardReturn(card.rightReturn)}`,
    `결과 버전 ${card.version} · 확정 ${card.settledAt}`,
    '가격 변동률 비교 · 배당 미포함 · 투자 성과 인증이 아닙니다.',
    `https://sector-king.com/weekly-match · ${card.roundId}`,
  ].join('\n')
}

export async function downloadResultCard(card: WeeklyMatchResultCard): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080; canvas.height = 760
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지를 만들 수 없는 브라우저입니다.')
  ctx.fillStyle = '#101720'; ctx.fillRect(0, 0, 1080, 760)
  ctx.fillStyle = '#e5aa31'; ctx.fillRect(64, 62, 64, 6)
  const text = (value: string, y: number, size = 28, color = '#e5e7eb') => {
    ctx.fillStyle = color; ctx.font = `${size}px system-ui, sans-serif`; ctx.fillText(value, 64, y, 952)
  }
  text('Sector King · 나의 섹터 매치', 112, 26, '#e5aa31')
  text(card.title, 190, 46)
  text(`${card.baseDate} ~ ${card.endDate}`, 242, 28, '#a5afbd')
  text(`내 선택: ${card.sideName}`, 324, 32)
  text(CARD_OUTCOME[card.outcome], 402, 58, '#e5aa31')
  text(`${card.leftName} ${cardReturn(card.leftReturn)}`, 470)
  text(`${card.rightName} ${cardReturn(card.rightReturn)}`, 514)
  text(`결과 버전 ${card.version} · 확정 ${card.settledAt}`, 574, 20, '#a5afbd')
  text(`이미지 생성 ${new Date().toISOString()}`, 606, 20, '#a5afbd')
  text('가격 변동률 비교 · 배당 미포함 · 투자 성과 인증이 아닙니다.', 656, 20, '#a5afbd')
  text(`sector-king.com/weekly-match · ${card.roundId}`, 700, 20, '#a5afbd')
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('이미지 생성에 실패했습니다.')), 'image/png'))
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url; link.download = `sector-match-${card.roundId.replace(/[^a-zA-Z0-9_-]/g, '_')}-v${card.version}.png`
    document.body.appendChild(link); link.click()
  } finally {
    link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
