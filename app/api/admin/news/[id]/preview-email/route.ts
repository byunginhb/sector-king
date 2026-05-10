/**
 * GET /api/admin/news/[id]/preview-email
 *
 * 렌더된 이메일 HTML 을 반환 (Content-Type: text/html).
 * iframe 미리보기에 사용. admin 가드.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import { renderDailyNewsEmail } from '@/lib/email/render-daily-news'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('news_reports')
      .select(NEWS_FULL_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: error ? '리포트를 불러올 수 없습니다' : '리포트를 찾을 수 없습니다',
        },
        { status: error ? 500 : 404 }
      )
    }

    const report = rowToDto(data as Parameters<typeof rowToDto>[0])
    const rendered = await renderDailyNewsEmail({
      report,
      recipientName: guard.profile.name ?? undefined,
    })

    return new NextResponse(rendered.html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        // iframe 미리보기를 위한 자체 출처 허용
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  } catch (err) {
    console.error('[preview-email] unexpected', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
