/**
 * Resend SDK 얇은 래퍼.
 *
 * 환경변수:
 *   RESEND_API_KEY     — 미설정 시 `sendEmail()` 은 status='skipped' 반환
 *   RESEND_FROM_EMAIL  — 발신 주소. 미설정 시 Resend sandbox 폴백
 *                        ('Sector King <onboarding@resend.dev>') — 본인 Resend
 *                        계정 이메일에만 발송 가능. 운영은 도메인 인증 후
 *                        'Sector King <noreply@sectorking.co.kr>' 같이 명시 권장.
 *
 * Resend SDK 패키지가 설치되지 않은 환경에서도 빌드가 깨지지 않도록 fetch 로 직접
 * 호출한다 (외부 의존성 0).
 */
import 'server-only'

const RESEND_API_BASE = 'https://api.resend.com'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
}

export type EmailSendResult =
  | { status: 'sent'; messageId: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

/**
 * 발신 주소 결정. RESEND_FROM_EMAIL 미설정 시 Resend sandbox 도메인 폴백.
 * sandbox 는 도메인 인증 없이 즉시 사용 가능하지만 본인 Resend 계정 이메일에만
 * 발송할 수 있다. 운영은 자체 도메인을 https://resend.com/domains 에서 verify
 * 한 뒤 RESEND_FROM_EMAIL 을 명시한다.
 */
export function getDefaultFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'Sector King <onboarding@resend.dev>'
}

export async function sendEmail(
  input: SendEmailInput
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      status: 'skipped',
      reason: 'RESEND_API_KEY 미설정 — 이메일 발송 건너뜀',
    }
  }

  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getDefaultFromEmail(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return {
        status: 'failed',
        error: `Resend 응답 오류 ${res.status}: ${errBody.slice(0, 200)}`,
      }
    }
    const json = (await res.json()) as { id?: string }
    return { status: 'sent', messageId: json.id ?? null }
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : '알 수 없는 오류',
    }
  }
}
