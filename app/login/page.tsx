import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SectorKingLogo } from '@/components/logo'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { getCurrentUser } from '@/lib/auth/get-user'
import { safeRedirectPath } from '@/lib/safe-redirect'

export const metadata: Metadata = {
  title: '로그인',
  description: 'Sector King 로그인',
}

type SearchParams = Promise<{ redirect?: string; error?: string }>


export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  // `redirect()` 는 Location 헤더에 값을 그대로 싣고, 브라우저는 탭·CR·LF 를
  // 지운 뒤 해석한다 — 문자열 검사만으로는 `/<TAB>/evil.com` 이 프로토콜 상대
  // URL 로 되살아나 외부로 나간다(`lib/safe-redirect` 주석의 실측 참조).
  const redirectTarget = safeRedirectPath(params.redirect)

  // 이미 로그인된 사용자는 redirect 대상으로 즉시 이동
  const user = await getCurrentUser()
  if (user) {
    redirect(redirectTarget)
  }

  const errorCode = params.error
  const errorMessage = errorMessageFor(errorCode)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="메인으로 돌아가기"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span>메인으로</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="sk-card p-8 shadow-sm">
            <div className="flex flex-col items-center mb-6">
              <SectorKingLogo size={56} className="mb-4" />
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Sector King
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                마켓 인사이트, 한 곳에서
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
              >
                {errorMessage}
              </div>
            )}

            <Suspense
              fallback={
                <button
                  type="button"
                  className="w-full h-11 rounded-lg border border-border bg-background flex items-center justify-center text-sm text-muted-foreground"
                  disabled
                >
                  불러오는 중...
                </button>
              }
            >
              <GoogleSignInButton redirectTarget={redirectTarget} />
            </Suspense>

            <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
              로그인 시{' '}
              <Link href="/terms" className="text-info hover:underline">
                이용약관
              </Link>
              과{' '}
              <Link href="/privacy" className="text-info hover:underline">
                개인정보 처리방침
              </Link>
              에
              <br />
              동의한 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function errorMessageFor(code: string | undefined): string | null {
  switch (code) {
    case 'missing_code':
      return '인증 코드가 누락되었습니다. 다시 시도해 주세요.'
    case 'oauth_failed':
      return '구글 인증에 실패했습니다. 다시 시도해 주세요.'
    case 'forbidden':
      return '관리자 권한이 필요한 페이지입니다.'
    default:
      return null
  }
}
