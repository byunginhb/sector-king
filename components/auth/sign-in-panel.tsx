'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, MailCheck } from 'lucide-react'
import type { EnabledAuthProviders } from '@/lib/auth/enabled-providers'

/**
 * 로그인 제공자 선택 패널.
 *
 * `redirectTarget` 은 인증 후 돌아갈 same-origin 경로. OAuth·매직링크 모두
 * 최종 착지는 `/auth/callback?redirect=...` 로 통일한다 — 콜백 라우트 하나가
 * 세션 교환·admin role fallback·안전한 복귀를 전담하므로 제공자가 늘어도
 * 그 경로는 건드리지 않는다.
 *
 * 어떤 제공자를 그릴지는 `providers`(= Supabase 대시보드 실제 활성 상태)가
 * 결정한다. `lib/auth/enabled-providers` 주석 참조.
 */
export function SignInPanel({
  redirectTarget = '/',
  providers,
}: {
  redirectTarget?: string
  providers: EnabledAuthProviders
}) {
  const [pending, setPending] = useState<'google' | 'kakao' | 'email' | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function callbackUrl() {
    const url = new URL('/auth/callback', window.location.origin)
    url.searchParams.set('redirect', redirectTarget)
    return url.toString()
  }

  async function handleOAuth(provider: 'google' | 'kakao') {
    setPending(provider)
    setError(null)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl(),
          // refresh token 재발급 강제는 구글 전용 파라미터다. 카카오에 넘기면
          // 인가 서버가 알 수 없는 파라미터로 거절할 수 있다.
          ...(provider === 'google'
            ? { queryParams: { access_type: 'offline', prompt: 'consent' } }
            : {}),
        },
      })

      if (oauthError) {
        setError(oauthError.message || '로그인 시도에 실패했습니다.')
        setPending(null)
      }
      // 성공 시 브라우저가 제공자로 redirect — pending 유지
    } catch (err) {
      console.error('[SignInPanel] oauth error:', err)
      setError('예기치 못한 오류가 발생했습니다.')
      setPending(null)
    }
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email')
    if (typeof email !== 'string' || !email) return

    setPending('email')
    setError(null)
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl() },
      })

      if (otpError) {
        setError(otpError.message || '메일 발송에 실패했습니다.')
      } else {
        setSentTo(email)
      }
    } catch (err) {
      console.error('[SignInPanel] magic link error:', err)
      setError('예기치 못한 오류가 발생했습니다.')
    } finally {
      setPending(null)
    }
  }

  if (sentTo) {
    return (
      <div
        role="status"
        className="rounded-lg border border-border bg-muted/40 px-4 py-5 text-center"
      >
        <MailCheck
          className="h-6 w-6 mx-auto mb-2 text-primary"
          aria-hidden
        />
        <p className="text-sm font-medium text-foreground">
          로그인 링크를 보냈습니다
        </p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {sentTo} 으로 보낸 메일의 링크를 눌러 주세요.
          <br />
          링크는 이 브라우저에서 열어야 합니다.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-3 text-xs text-info hover:underline"
        >
          다른 방법으로 로그인
        </button>
      </div>
    )
  }

  const hasOAuth = providers.google || providers.kakao

  return (
    <div>
      <div className="space-y-2.5">
        {providers.google && (
          <ProviderButton
            label="Google로 계속하기"
            ariaLabel="Google 계정으로 로그인"
            loading={pending === 'google'}
            disabled={pending !== null}
            onClick={() => handleOAuth('google')}
            className="border border-border bg-background hover:bg-accent text-foreground"
            icon={<GoogleLogo />}
          />
        )}
        {providers.kakao && (
          <ProviderButton
            label="카카오로 계속하기"
            ariaLabel="카카오 계정으로 로그인"
            loading={pending === 'kakao'}
            disabled={pending !== null}
            onClick={() => handleOAuth('kakao')}
            // 카카오 브랜드 가이드가 지정한 고정 색(#FEE500 / 검정 85%)이라
            // 테마 토큰을 쓰지 않는다. 다크 모드에서도 동일해야 한다.
            className="bg-[#FEE500] hover:brightness-95 text-[rgba(0,0,0,0.85)]"
            icon={<KakaoLogo />}
          />
        )}
      </div>

      {providers.email && (
        <>
          {hasOAuth && (
            <div className="flex items-center gap-3 my-4">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">또는</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          <form onSubmit={handleMagicLink} className="space-y-2.5">
            <label htmlFor="signin-email" className="sr-only">
              이메일 주소
            </label>
            <input
              id="signin-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              disabled={pending !== null}
              className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            />
            <ProviderButton
              type="submit"
              label="이메일로 로그인 링크 받기"
              ariaLabel="이메일로 로그인 링크 받기"
              loading={pending === 'email'}
              disabled={pending !== null}
              className="border border-border bg-background hover:bg-accent text-foreground"
              icon={<Mail className="h-[18px] w-[18px]" aria-hidden />}
            />
          </form>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-danger text-center">
          {error}
        </p>
      )}
    </div>
  )
}

function ProviderButton({
  label,
  ariaLabel,
  loading,
  disabled,
  onClick,
  className,
  icon,
  type = 'button',
}: {
  label: string
  ariaLabel: string
  loading: boolean
  disabled: boolean
  onClick?: () => void
  className: string
  icon: React.ReactNode
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`w-full h-11 rounded-lg transition-colors flex items-center justify-center gap-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        icon
      )}
      <span>{loading ? '처리 중...' : label}</span>
    </button>
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

function KakaoLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="rgba(0,0,0,0.85)"
        d="M9 1.5C4.58 1.5 1 4.31 1 7.78c0 2.23 1.48 4.19 3.71 5.3-.16.57-.6 2.17-.68 2.5-.11.42.15.42.32.3.13-.09 2.09-1.42 2.94-2 .55.08 1.12.12 1.71.12 4.42 0 8-2.81 8-6.28S13.42 1.5 9 1.5z"
      />
    </svg>
  )
}
