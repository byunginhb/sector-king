/**
 * POST /api/cron/daily-news-email
 *
 * 일별 마켓 리포트 메일 발송 cron 엔드포인트.
 *
 * 호출자: GitHub Actions (`.github/workflows/daily-news-email.yml`)
 *   - 매시 0분(UTC) 호출 → 사용자별 `hour_kst` 매칭 발송
 *
 * 인증: `Authorization: Bearer <CRON_SECRET>` (또는 `X-API-Key`)
 *   - timing-safe compare (`requireApiKey` 재사용)
 *   - CRON_SECRET 미설정 시 503
 *
 * 동작:
 *   1. 요청 시점 KST hour 추출 (또는 body `{hour_kst}` 디버그 override)
 *   2. 발행된 최신 `news_reports` 1건 조회 (status='published')
 *      - 없으면 `{success:true, sent:0, reason:'no_published_report'}` 반환
 *   3. `email_subscriptions` 에서 daily_report=true AND hour_kst=현재시간
 *      AND (last_sent_at IS NULL OR last_sent_at::date < today_kst) 조회
 *   4. profiles 와 join 해 email 가져온 뒤, 직렬 발송 (Resend rate limit 보호)
 *   5. 결과를 email_log 적재 + 성공 시 last_sent_at 갱신 (멱등성 가드)
 *
 * 응답: { success, sent, skipped, failed, processedReportId, processedAt, hourKst }
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiKey } from '@/lib/auth/require-api-key'
import { createAdminClient } from '@/lib/supabase/admin'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import { renderDailyNewsEmail } from '@/lib/email/render-daily-news'
import { isResendConfigured, sendEmail } from '@/lib/email/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const inputSchema = z
  .object({
    hour_kst: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null || v === '') return undefined
        const n = typeof v === 'string' ? Number(v) : v
        if (!Number.isFinite(n)) return undefined
        return Math.trunc(n)
      })
      .refine((n) => n === undefined || (n >= 0 && n <= 23), {
        message: 'hour_kst 는 0~23 범위 정수여야 합니다',
      }),
  })
  .strict()

const KST_OFFSET_MINUTES = 9 * 60

interface KstNow {
  hour: number
  /** YYYY-MM-DD (KST 기준 오늘) */
  today: string
}

function getKstNow(): KstNow {
  const now = new Date()
  const kst = new Date(now.getTime() + KST_OFFSET_MINUTES * 60 * 1000)
  const hour = kst.getUTCHours()
  const yyyy = kst.getUTCFullYear()
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(kst.getUTCDate()).padStart(2, '0')
  return { hour, today: `${yyyy}-${mm}-${dd}` }
}

interface SubscriptionTarget {
  user_id: string
  hour_kst: number
  last_sent_at: string | null
  unsubscribe_token: string | null
  email: string
  name: string | null
}

interface PerUserResult {
  userId: string
  email: string
  status: 'sent' | 'skipped' | 'failed'
  error?: string
}

const BATCH_DELAY_MS = 120

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: Request) {
  const guard = requireApiKey(req, 'CRON_SECRET')
  if (!guard.ok) return guard.response

  if (!isResendConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'RESEND_API_KEY 미설정 — 이메일 발송 인프라가 비활성화되어 있습니다',
      },
      { status: 503 }
    )
  }

  // body 는 옵션 (없어도 동작)
  let parsedHour: number | undefined
  try {
    const raw = await req.json().catch(() => ({}))
    const parsed = inputSchema.safeParse(raw ?? {})
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? '입력 검증 실패',
        },
        { status: 400 }
      )
    }
    parsedHour = parsed.data.hour_kst
  } catch {
    parsedHour = undefined
  }

  const kstNow = getKstNow()
  const targetHour = parsedHour ?? kstNow.hour

  const admin = createAdminClient()

  // 1. 발행된 최신 리포트 1건 조회
  const { data: reportRow, error: reportErr } = await admin
    .from('news_reports')
    .select(NEWS_FULL_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (reportErr) {
    console.error('[cron.daily-news-email] report lookup', reportErr)
    return NextResponse.json(
      { success: false, error: '발행된 리포트 조회 실패' },
      { status: 500 }
    )
  }

  if (!reportRow) {
    return NextResponse.json({
      success: true,
      sent: 0,
      skipped: 0,
      failed: 0,
      reason: 'no_published_report',
      hourKst: targetHour,
      processedAt: new Date().toISOString(),
    })
  }

  const report = rowToDto(reportRow as Parameters<typeof rowToDto>[0])

  // 2. 대상 구독자 조회 (멱등성: last_sent_at 가 KST 오늘 이전인 경우만)
  // PostgREST 는 컬럼 join 을 위해 select 에 관계 표현식 사용.
  const { data: subRows, error: subErr } = await admin
    .from('email_subscriptions')
    .select(
      'user_id, hour_kst, last_sent_at, unsubscribe_token, profiles!inner(email, name)'
    )
    .eq('daily_report', true)
    .eq('hour_kst', targetHour)

  if (subErr) {
    console.error('[cron.daily-news-email] subscriptions lookup', subErr)
    return NextResponse.json(
      { success: false, error: '구독자 조회 실패' },
      { status: 500 }
    )
  }

  // last_sent_at::date < today_kst 가드 (서버측에서 필터)
  const todayKst = kstNow.today
  const targets: SubscriptionTarget[] = []
  for (const r of (subRows ?? []) as Array<{
    user_id: string
    hour_kst: number
    last_sent_at: string | null
    unsubscribe_token: string | null
    profiles:
      | { email: string; name: string | null }
      | { email: string; name: string | null }[]
      | null
  }>) {
    if (r.last_sent_at) {
      // last_sent_at 을 KST date 로 환산 후 비교
      const lastUtc = new Date(r.last_sent_at)
      const lastKst = new Date(lastUtc.getTime() + KST_OFFSET_MINUTES * 60 * 1000)
      const yyyy = lastKst.getUTCFullYear()
      const mm = String(lastKst.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(lastKst.getUTCDate()).padStart(2, '0')
      const lastDateKst = `${yyyy}-${mm}-${dd}`
      if (lastDateKst >= todayKst) continue // 이미 오늘 발송됨 → skip
    }
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    if (!profile?.email) continue
    targets.push({
      user_id: r.user_id,
      hour_kst: r.hour_kst,
      last_sent_at: r.last_sent_at,
      unsubscribe_token: r.unsubscribe_token,
      email: profile.email,
      name: profile.name,
    })
  }

  // 3. 직렬 발송 (Resend free plan rate limit 보호)
  const results: PerUserResult[] = []
  for (const t of targets) {
    try {
      const rendered = await renderDailyNewsEmail({
        report,
        recipientName: t.name ?? undefined,
        unsubscribeToken: t.unsubscribe_token ?? undefined,
      })

      // RFC 8058 List-Unsubscribe + One-Click — Gmail/Outlook 1-click 버튼
      const siteUrl = (
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.NEXT_PUBLIC_VERCEL_URL ??
        ''
      ).replace(/^(?!https?:\/\/)/, 'https://')
      const headers: Record<string, string> = {}
      if (t.unsubscribe_token && siteUrl) {
        const unsubUrl = `${siteUrl}/api/email/unsubscribe?token=${t.unsubscribe_token}`
        headers['List-Unsubscribe'] = `<${unsubUrl}>, <mailto:unsubscribe@sector-king.com>`
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
      }

      const sendResult = await sendEmail({
        to: t.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      })

      const logStatus = sendResult.status
      const errMsg =
        sendResult.status === 'failed'
          ? sendResult.error
          : sendResult.status === 'skipped'
            ? sendResult.reason
            : null

      // email_log INSERT
      const { error: logErr } = await admin.from('email_log').insert({
        user_id: t.user_id,
        kind: 'daily_news',
        subject: rendered.subject,
        status: logStatus,
        error: errMsg,
      })
      if (logErr) {
        console.error('[cron.daily-news-email] email_log insert', logErr)
      }

      // 성공 시에만 last_sent_at 갱신 → 실패하면 다음 시도 가능 (멱등 + 재시도)
      if (sendResult.status === 'sent') {
        const { error: updErr } = await admin
          .from('email_subscriptions')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('user_id', t.user_id)
        if (updErr) {
          console.error('[cron.daily-news-email] last_sent_at update', updErr)
        }
        results.push({ userId: t.user_id, email: t.email, status: 'sent' })
      } else if (sendResult.status === 'skipped') {
        results.push({
          userId: t.user_id,
          email: t.email,
          status: 'skipped',
          error: sendResult.reason,
        })
      } else {
        results.push({
          userId: t.user_id,
          email: t.email,
          status: 'failed',
          error: sendResult.error,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      console.error('[cron.daily-news-email] unexpected', err)
      results.push({
        userId: t.user_id,
        email: t.email,
        status: 'failed',
        error: message,
      })
    }

    // rate limit 보호
    if (BATCH_DELAY_MS > 0) await delay(BATCH_DELAY_MS)
  }

  const sent = results.filter((r) => r.status === 'sent').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const failed = results.filter((r) => r.status === 'failed').length

  return NextResponse.json({
    success: true,
    sent,
    skipped,
    failed,
    processedReportId: report.id,
    processedReportDate: report.reportDate,
    processedAt: new Date().toISOString(),
    hourKst: targetHour,
    candidates: targets.length,
  })
}
