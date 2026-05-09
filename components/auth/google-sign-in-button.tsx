'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

/**
 * Google OAuth 로그인 버튼.
 *
 * `redirectTarget` 은 callback 후 이동할 same-origin 경로.
 * Supabase signInWithOAuth 의 redirectTo 는 항상 `/auth/callback?redirect=...`.
 */
export function GoogleSignInButton({
  redirectTarget = '/',
}: {
  redirectTarget?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL && typeof window === 'undefined'
          ? process.env.NEXT_PUBLIC_SITE_URL
          : window.location.origin
      const callbackUrl = new URL('/auth/callback', origin)
      callbackUrl.searchParams.set('redirect', redirectTarget)

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (oauthError) {
        setError(oauthError.message || '로그인 시도에 실패했습니다.')
        setLoading(false)
      }
      // 성공 시 브라우저가 Google 로 redirect — loading 상태 유지
    } catch (err) {
      console.error('[GoogleSignInButton] signIn error:', err)
      setError('예기치 못한 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="w-full h-11 rounded-lg border border-border bg-background hover:bg-accent transition-colors flex items-center justify-center gap-3 text-sm font-medium text-foreground disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Google 계정으로 로그인"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <GoogleLogo />
        )}
        <span>{loading ? '리디렉션 중...' : 'Google로 계속하기'}</span>
      </button>
      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-red-600 dark:text-red-400 text-center"
        >
          {error}
        </p>
      )}
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
