'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Link2, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  PROVIDER_LABEL,
  PROVIDER_BUTTON_CLASS,
  ProviderLogo,
} from '@/components/auth/provider-meta'
import type { AuthProviderId, OAuthProviderId } from '@/lib/auth/enabled-providers'
import type { LinkedAccountsView } from '@/lib/auth/linked-accounts'

/**
 * 설정 > 로그인 수단 — 연결된 제공자 목록 + 추가 연결/해제.
 *
 * 목록 자체는 서버(`getUser().identities`)에서 이미 받아오므로 로딩 상태가
 * 없다. 이 컴포넌트는 버튼 두 개의 동작만 맡는다.
 */
export function LinkedAccountsSection({ view }: { view: LinkedAccountsView }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLink(provider: OAuthProviderId) {
    setPending(provider)
    setError(null)
    try {
      const supabase = createClient()
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('redirect', '/me/settings')

      const { error: linkError } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo: callbackUrl.toString() },
      })
      if (linkError) {
        setError(messageForLinkError(linkError.message))
        setPending(null)
      }
      // 성공 시 브라우저가 제공자로 redirect — pending 유지
    } catch (err) {
      console.error('[LinkedAccountsSection] link error:', err)
      setError('예기치 못한 오류가 발생했습니다.')
      setPending(null)
    }
  }

  async function handleUnlink(identityId: string) {
    setPending(identityId)
    setError(null)
    try {
      const supabase = createClient()
      // unlinkIdentity 는 identity 객체 전체를 받는다. 서버에서 내려준 건
      // id 뿐이라 현재 목록을 다시 받아 대조한다 — 그 사이 다른 탭에서 해제된
      // 항목을 지우려다 엉뚱한 걸 지우는 일도 여기서 걸린다.
      const { data, error: listError } = await supabase.auth.getUserIdentities()
      if (listError) throw listError

      const target = data?.identities?.find((i) => i.identity_id === identityId)
      if (!target) {
        setError('이미 해제된 로그인 수단입니다.')
        router.refresh()
        return
      }

      const { error: unlinkError } = await supabase.auth.unlinkIdentity(target)
      if (unlinkError) {
        setError(unlinkError.message || '연결 해제에 실패했습니다.')
        return
      }
      router.refresh()
    } catch (err) {
      console.error('[LinkedAccountsSection] unlink error:', err)
      setError('예기치 못한 오류가 발생했습니다.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="sk-card p-4">
      <ul className="divide-y divide-border">
        {view.linked.map((account) => (
          <li
            key={account.identityId || account.provider}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                <ProviderLogo
                  provider={account.provider as AuthProviderId}
                  className="h-4 w-4 text-muted-foreground"
                />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {PROVIDER_LABEL[account.provider as AuthProviderId] ??
                    account.provider}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {account.email ?? '이메일 미제공'}
                </p>
              </div>
            </div>
            {account.canUnlink && (
              <button
                type="button"
                onClick={() => handleUnlink(account.identityId)}
                disabled={pending !== null}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`${PROVIDER_LABEL[account.provider as AuthProviderId] ?? account.provider} 연결 해제`}
              >
                {pending === account.identityId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Unlink className="h-3.5 w-3.5" aria-hidden />
                )}
                <span>해제</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {view.linkable.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            다른 로그인 수단을 추가하면 어느 쪽으로 들어와도 같은 계정입니다.
            워치리스트와 설정이 그대로 유지됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {view.linkable.map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleLink(provider)}
                disabled={pending !== null}
                className={`inline-flex items-center gap-2 h-9 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${PROVIDER_BUTTON_CLASS[provider]}`}
              >
                {pending === provider ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden />
                )}
                <span>{PROVIDER_LABEL[provider]} 연결</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** Supabase 의 영문 오류 중 사용자가 뭘 해야 할지 갈리는 두 가지만 번역한다. */
function messageForLinkError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('manual linking') || lower.includes('disabled')) {
    return '계정 연결 기능이 꺼져 있습니다. 운영자 설정이 필요합니다.'
  }
  if (lower.includes('already') || lower.includes('exists')) {
    return '이미 다른 Sector King 계정에 연결된 로그인 수단입니다.'
  }
  return raw || '연결에 실패했습니다.'
}
