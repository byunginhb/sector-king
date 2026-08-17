/**
 * 구독 상품 정의 — `/pricing` 이 그리는 카드의 원천.
 *
 * ────────────────────────────────────────────────────────────────────
 *  월 구독 2종
 * ────────────────────────────────────────────────────────────────────
 *
 * 상품은 **Basic·Pro 월 구독 둘**이다. 기간권(3·6·12개월) 축은 두지 않는다 —
 * 기간을 늘리면 할인율을 함께 정해야 하고, 그건 금액이 확정된 뒤의 결정이다.
 * 무료(`free`)는 상품이 아니라 로그인만 하면 열리는 기본 범위이며, 카드로는
 * 보여주되 가격 자리를 두지 않는다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  금액을 지어내지 않는다
 * ────────────────────────────────────────────────────────────────────
 *
 * `priceKrw` 는 **null 이 기본**이고 그때 화면은 "오픈 예정"을 렌더한다.
 * 임시 숫자를 적으면 그 숫자가 스크린샷으로 돌아다닌다. 운영자가 금액을
 * 정하면 이 파일의 숫자만 채우면 되고, 화면 코드는 손대지 않는다.
 *
 * 결제 연동(PG 계약·비즈니스 등록)은 별개다. 그전까지 CTA 는 결제가 아니라
 * 문의로 간다 — 누를 수 있는 결제 버튼이 있는데 결제가 안 되는 것이 가장 나쁘다.
 */

import type { StorableTier } from './tier'

/** 청구 주기 — 지금은 월 하나뿐이지만, 기간권이 생기면 여기서 갈린다. */
export type BillingPeriod = 'monthly'

export type PlanDef = {
  tier: StorableTier
  /** 상품명. 등급 라벨(`TIER_LABEL`)과 달리 판매 문구다. */
  name: string
  /** 한 줄 요약 — 이 등급을 사는 이유. */
  summary: string
  billingPeriod: BillingPeriod
  /**
   * 월 결제 금액(원). **null = 미정** → 화면은 "오픈 예정"을 표시한다.
   * 운영자가 정하면 이 값만 채운다.
   */
  priceKrw: number | null
  /** 판매 상태. `coming_soon` 이면 결제 CTA 대신 문의로 보낸다. */
  status: 'coming_soon' | 'available'
}

export const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: '월 구독',
}

/**
 * 판매 상품. 무료는 여기 없다 — 상품이 아니라 기본 범위다.
 * 순서가 곧 화면 순서다.
 */
export const PLANS: readonly PlanDef[] = [
  {
    tier: 'basic',
    name: 'Basic',
    summary: '섹터·자금 흐름을 기간과 종목 단위까지 넓혀서 봅니다.',
    billingPeriod: 'monthly',
    priceKrw: null,
    status: 'coming_soon',
  },
  {
    tier: 'pro',
    name: 'Pro',
    summary: '순위와 예측 정확도까지 전부 열립니다.',
    billingPeriod: 'monthly',
    priceKrw: null,
    status: 'coming_soon',
  },
]

/** 가격 표기. 미정이면 null 을 돌려주고, 호출부가 "오픈 예정"을 그린다. */
export function formatPlanPrice(plan: PlanDef): string | null {
  if (plan.priceKrw == null) return null
  return `${plan.priceKrw.toLocaleString('ko-KR')}원 / 월`
}

/** 하나라도 판매 중인 상품이 있는가 — 페이지 상단 문구가 갈린다. */
export const HAS_AVAILABLE_PLAN = PLANS.some((p) => p.status === 'available')
