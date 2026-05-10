/**
 * DailyNewsEmail 을 HTML/text 로 렌더하는 server-only 헬퍼.
 *
 * - render() 는 React Email 가 인라인 CSS HTML 을 생성한다.
 * - text 폴백은 plaintext 추출 (Accessibility / 일부 메일 클라이언트용).
 */
import 'server-only'
import { render } from '@react-email/render'
import { DailyNewsEmail } from './templates/daily-news'
import type { NewsReportDTO } from '@/drizzle/supabase-schema'

export interface RenderDailyNewsInput {
  report: NewsReportDTO
  recipientName?: string
  siteUrl?: string
  /** 1-click unsubscribe 토큰 — 푸터 링크 + 헤더용 URL 생성에 사용 */
  unsubscribeToken?: string
  /** 명시적 unsubscribe URL (token 우선) — 후방호환 */
  unsubscribeUrl?: string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

function defaultSubject(report: NewsReportDTO): string {
  return `[Sector King] 오늘 경제 요약! ${report.title}`
}

export async function renderDailyNewsEmail(
  input: RenderDailyNewsInput
): Promise<RenderedEmail> {
  const siteUrl =
    input.siteUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    ''
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl)

  // unsubscribeToken 우선 — 1-click unsubscribe URL 생성
  const tokenUrl = input.unsubscribeToken
    ? `${normalizedSiteUrl || ''}/api/email/unsubscribe?token=${input.unsubscribeToken}`
    : undefined
  const finalUnsubscribeUrl = tokenUrl ?? input.unsubscribeUrl

  const element = DailyNewsEmail({
    report: input.report,
    siteUrl: normalizedSiteUrl,
    recipientName: input.recipientName,
    unsubscribeUrl: finalUnsubscribeUrl,
  })

  const html = await render(element, { pretty: false })
  const text = await render(element, { plainText: true })

  return {
    subject: defaultSubject(input.report),
    html,
    text,
  }
}

function normalizeSiteUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}
