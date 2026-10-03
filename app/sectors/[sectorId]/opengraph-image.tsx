import { getSectorDetail } from '@/lib/sector-server'
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image'

export const runtime = 'nodejs'
export const alt = '섹터 대표 종목'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** 이미지에 이름을 싣는 대표 종목 수(시가총액 순). */
const TOP_COMPANIES = 3

/**
 * 가격·시가총액 숫자는 일부러 싣지 않는다. 공유 미리보기는 메신저·SNS 가 오래 캐시하므로
 * 시세가 찍히면 낡은 숫자가 계속 돌아다닌다. 종목 수와 대표 종목 이름은 티커를 넣고 뺄 때만 바뀐다.
 * (대표 종목 순서는 `getSectorDetail` 이 toUsd 변환 후 시가총액으로 정렬한 것을 그대로 쓴다.)
 */
export default async function OgImage({
  params,
}: {
  params: Promise<{ sectorId: string }>
}) {
  const { sectorId } = await params
  // DB 조회가 실패해도 이미지는 나가야 한다 — 일반 섹터 이미지로 폴백.
  const sector = await getSectorDetail(sectorId).catch(() => null)

  if (!sector) {
    return renderOgImage({
      eyebrow: 'SECTOR',
      title: '섹터별 대표 종목',
      subtitle: '한국·미국 상장 종목의 섹터별 시가총액과 등락',
    })
  }

  const scope = sector.primaryIndustry ? `${sector.primaryIndustry.name} · ` : ''

  return renderOgImage({
    eyebrow: 'SECTOR',
    title: `${sector.name} 섹터`,
    subtitle: `${scope}추적 종목 ${sector.companies.length}곳`,
    tags: sector.companies.slice(0, TOP_COMPANIES).map((c) => c.nameKo || c.name),
  })
}
