/**
 * GA4 이벤트 전송 — 얇은 래퍼 하나.
 *
 * `sendGAEvent` 를 그대로 부르면 GA 가 없는 환경(로컬, 측정 ID 미설정, 광고 차단)에서
 * `console.warn` 을 남긴다. 호출부마다 가드를 두지 않도록 여기서 한 번만 막는다.
 * 분석은 부가 기능이라 어떤 실패도 호출한 흐름(로그인·구독·공유)을 막으면 안 된다.
 *
 * 이벤트 이름은 GA4 권장 이벤트를 우선 쓴다(login, share, generate_lead,
 * add_to_wishlist) — 권장 이름이어야 GA 기본 보고서·전환 설정에 그대로 잡힌다.
 */
import { sendGAEvent } from '@next/third-parties/google'

export type AnalyticsParams = Record<string, unknown>

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined') return
  if (!GA_MEASUREMENT_ID) return
  // 초기화 스크립트(afterInteractive)가 아직 안 돌았거나 차단된 경우.
  if (!Array.isArray((window as { dataLayer?: unknown }).dataLayer)) return
  try {
    sendGAEvent('event', name, params)
  } catch {
    // 분석 실패는 사용자 흐름에 영향을 주지 않는다.
  }
}
