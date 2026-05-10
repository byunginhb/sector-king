/**
 * 미리보기 페이지 클라이언트 — iframe + 테스트 발송 폼.
 */
'use client'

import { useState } from 'react'
import { Mail, Send, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/types'

interface SendTestResponse {
  sentTo: string
  status: 'sent' | 'skipped' | 'failed'
  emailId?: string | null
  error?: string
}

interface PreviewEmailClientProps {
  reportId: string
  adminEmail: string
  resendConfigured: boolean
}

export function PreviewEmailClient({
  reportId,
  adminEmail,
  resendConfigured,
}: PreviewEmailClientProps) {
  const [recipient, setRecipient] = useState(adminEmail)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<
    | null
    | { kind: 'sent'; sentTo: string; emailId: string | null }
    | { kind: 'skipped'; reason?: string }
    | { kind: 'failed'; error: string }
  >(null)

  async function handleSend() {
    if (!recipient.trim()) {
      setResult({ kind: 'failed', error: '수신자 이메일을 입력하세요' })
      return
    }
    setPending(true)
    setResult(null)
    try {
      const res = await fetch(
        `/api/admin/news/${reportId}/send-test-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: recipient.trim() }),
        }
      )
      const json = (await res.json()) as ApiResponse<SendTestResponse>
      if (!res.ok || !json.success || !json.data) {
        setResult({
          kind: 'failed',
          error: json.error ?? `요청 실패 (${res.status})`,
        })
        return
      }
      const data = json.data
      if (data.status === 'sent') {
        setResult({
          kind: 'sent',
          sentTo: data.sentTo,
          emailId: data.emailId ?? null,
        })
      } else if (data.status === 'skipped') {
        setResult({ kind: 'skipped', reason: data.error })
      } else {
        setResult({ kind: 'failed', error: data.error ?? '발송 실패' })
      }
    } catch (err) {
      setResult({
        kind: 'failed',
        error: err instanceof Error ? err.message : '네트워크 오류',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* 좌측 — iframe 미리보기 */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            미리보기 (HTML)
          </p>
          <a
            href={`/api/admin/news/${reportId}/preview-email`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            새 탭에서 열기
          </a>
        </div>
        <iframe
          src={`/api/admin/news/${reportId}/preview-email`}
          title="이메일 미리보기"
          sandbox="allow-same-origin"
          className="w-full h-[720px] bg-white"
        />
      </div>

      {/* 우측 — 발송 폼 */}
      <aside className="space-y-3">
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-500" aria-hidden />
            <p className="text-sm font-semibold text-foreground">
              테스트 발송
            </p>
          </div>

          {!resendConfigured && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
              <span>
                RESEND_API_KEY 가 설정되지 않았습니다. 환경변수 등록 후 발송이
                가능합니다.
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="recipient"
              className="text-xs text-muted-foreground"
            >
              수신자 이메일
            </label>
            <input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={pending}
              placeholder="you@example.com"
              className="w-full text-sm rounded-md bg-surface-2 border border-border-subtle px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-[11px] text-muted-foreground">
              제목 앞에 "[테스트]" 가 붙습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={pending || !resendConfigured}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              (pending || !resendConfigured) &&
                'opacity-50 cursor-not-allowed'
            )}
          >
            <Send className="h-4 w-4" aria-hidden />
            {pending ? '발송 중...' : '테스트 발송'}
          </button>

          {result && (
            <div
              className={cn(
                'rounded-md p-2.5 text-xs flex items-start gap-2',
                result.kind === 'sent' &&
                  'bg-success/10 border border-success/30 text-success',
                result.kind === 'skipped' &&
                  'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400',
                result.kind === 'failed' &&
                  'bg-danger/10 border border-danger/30 text-danger'
              )}
            >
              {result.kind === 'sent' ? (
                <CheckCircle2
                  className="h-3.5 w-3.5 mt-0.5 shrink-0"
                  aria-hidden
                />
              ) : (
                <AlertTriangle
                  className="h-3.5 w-3.5 mt-0.5 shrink-0"
                  aria-hidden
                />
              )}
              <span className="break-all">
                {result.kind === 'sent' && (
                  <>
                    발송 완료 — {result.sentTo}
                    {result.emailId && (
                      <>
                        <br />
                        <span className="text-[10px] opacity-80">
                          id: {result.emailId}
                        </span>
                      </>
                    )}
                  </>
                )}
                {result.kind === 'skipped' && (
                  <>스킵: {result.reason ?? 'RESEND_API_KEY 미설정'}</>
                )}
                {result.kind === 'failed' && <>오류: {result.error}</>}
              </span>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
