import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
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
