import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { PREVIEW_COOKIE } from '@/lib/permissions/constants'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  /*
   * 미리보기 쿠키가 붙은 요청은 절대 공용 캐시에 들어가면 안 된다.
   *
   * 이 저장소에는 실제로 `export const revalidate = 3600` 인 ISR 페이지가 있다
   * (`app/rankings/page.tsx`). 관리자가 Pro 시점으로 미리보기를 켠 채 그 페이지를
   * 열면, 유료 콘텐츠가 들어간 HTML 이 CDN 에 남아 이후 익명 방문자에게 그대로
   * 서빙된다. 게이팅 전체를 무의미하게 만드는 단 하나의 경로다.
   *
   * Vercel 은 `Cache-Control` 과 CDN 계층 헤더를 따로 본다. 셋 다 박아야
   * 브라우저·공유 캐시·엣지가 모두 저장을 포기한다.
   *
   * 세션 갱신(updateSession)이 만든 응답에 헤더만 얹는다 — 리다이렉트 응답이어도
   * 헤더 추가는 안전하고, Supabase 쿠키 갱신 로직은 건드리지 않는다.
   */
  if (request.cookies.has(PREVIEW_COOKIE)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    response.headers.set('CDN-Cache-Control', 'private, no-store')
    response.headers.set('Vercel-CDN-Cache-Control', 'private, no-store')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 다음 경로는 미들웨어를 통과시키지 않음:
     * - _next/static, _next/image (정적 자산)
     * - favicon, 이미지 확장자 (정적 파일)
     * - api/cron 같이 외부 cron 이 호출하는 라우트는 추후 별도 분기 시 추가
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
