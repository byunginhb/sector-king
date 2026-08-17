import { createElement } from 'react'
import { cn } from '@/lib/utils'
import { getCompanyIndustryIcon } from '@/lib/company-industry-icons'

/**
 * 업종 아이콘 (issue#49) — 종목명 옆에서 "무슨 업종인지"를 한눈에 구분한다.
 *
 * 매핑이 없거나 `industry` 가 비면 **아무것도 렌더하지 않는다**. 폴백 아이콘을
 * 두면 전 종목이 같은 모양이 되어 구분 목적이 사라지고, 자리만 차지한다.
 *
 * 옆에 한 줄 설명이 이미 붙으므로 아이콘은 장식(`aria-hidden`)이다 —
 * 스크린리더가 아이콘 이름을 읽어 같은 말을 두 번 하지 않게 한다.
 *
 * `createElement` 인 이유: 지역 변수를 `<Icon />` 로 쓰면 eslint 가 "렌더 중
 * 컴포넌트 생성"으로 본다. 여기서 고르는 건 모듈 상수 표에 이미 있는 아이콘이라
 * 매 렌더 새로 만들어지지 않지만, 규칙이 그걸 구분하지 못한다.
 */
export function CompanyIndustryIcon({
  industry,
  className,
}: {
  industry: string | null | undefined
  className?: string
}) {
  const icon = getCompanyIndustryIcon(industry)
  if (!icon) return null

  return createElement(icon, {
    className: cn('shrink-0 text-muted-foreground/70', className),
    'aria-hidden': 'true',
  })
}
