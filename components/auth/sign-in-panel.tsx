'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MailCheck } from 'lucide-react'
import {
  OAUTH_PROVIDER_IDS,
  toSupabaseProvider,
  type EnabledAuthProviders,
  type OAuthProviderId,
} from '@/lib/auth/enabled-providers'
import {
  PROVIDER_BUTTON_CLASS,
  PROVIDER_LABEL,
  ProviderLogo,
} from '@/components/auth/provider-meta'

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
  const [pending, setPending] = useState<OAuthProviderId | 'email' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function callbackUrl() {
    const url = new URL('/auth/callback', window.location.origin)
    url.searchParams.set('redirect', redirectTarget)
    return url.toString()
  }

  async function handleOAuth(provider: OAuthProviderId) {
    setPending(provider)
    setError(null)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: toSupabaseProvider(provider),
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

  const hasOAuth = OAUTH_PROVIDER_IDS.some((p) => providers[p])

  return (
    <div>
      <div className="space-y-2.5">
        {OAUTH_PROVIDER_IDS.filter((p) => providers[p]).map((provider) => (
          <ProviderButton
            key={provider}
            label={`${PROVIDER_LABEL[provider]}로 계속하기`}
            ariaLabel={`${PROVIDER_LABEL[provider]} 계정으로 로그인`}
            loading={pending === provider}
            disabled={pending !== null}
            onClick={() => handleOAuth(provider)}
            className={PROVIDER_BUTTON_CLASS[provider]}
            icon={<ProviderLogo provider={provider} />}
          />
        ))}
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
              className={PROVIDER_BUTTON_CLASS.email}
              icon={<ProviderLogo provider="email" />}
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
