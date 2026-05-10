'use client'

/**
 * 문의/제보 폼 — 비로그인도 사용 가능.
 *
 * 로그인 시 email 자동 채움 (disabled).
 * 비로그인 시 email input 노출.
 */
import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; error: string }

interface Props {
  defaultEmail?: string | null
  isAuthenticated: boolean
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'inquiry', label: '일반 문의' },
  { value: 'report', label: '제보' },
  { value: 'bug', label: '버그 신고' },
  { value: 'feature', label: '기능 제안' },
  { value: 'other', label: '기타' },
]

export function ContactForm({ defaultEmail, isAuthenticated }: Props) {
  const [category, setCategory] = useState('inquiry')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ kind: 'submitting' })
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subject,
          body,
          email: isAuthenticated ? undefined : email,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        setState({
          kind: 'error',
          error: json.error || '제출에 실패했습니다',
        })
        return
      }
      setState({ kind: 'success' })
      setSubject('')
      setBody('')
      if (!isAuthenticated) setEmail('')
    } catch (err) {
      setState({
        kind: 'error',
        error: err instanceof Error ? err.message : '네트워크 오류',
      })
    }
  }

  if (state.kind === 'success') {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-success mx-auto" aria-hidden />
        <h3 className="mt-3 text-lg font-bold text-foreground">접수되었습니다</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          영업일 기준 2~3일 내 답변 드리겠습니다.
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: 'idle' })}
          className="mt-4 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          다른 문의 작성
        </button>
      </div>
    )
  }

  const submitting = state.kind === 'submitting'

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border-subtle bg-surface-1 p-5 space-y-4">
      <div>
        <label htmlFor="contact-category" className="block text-xs text-muted-foreground mb-1">
          카테고리
        </label>
        <select
          id="contact-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          disabled={submitting}
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-xs text-muted-foreground mb-1">
          이메일
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isAuthenticated || submitting}
          placeholder="회신 받으실 이메일"
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground disabled:opacity-60"
        />
        {isAuthenticated && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            로그인 계정의 이메일이 자동으로 사용됩니다.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-subject" className="block text-xs text-muted-foreground mb-1">
          제목
        </label>
        <input
          id="contact-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={200}
          disabled={submitting}
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div>
        <label htmlFor="contact-body" className="block text-xs text-muted-foreground mb-1">
          내용 (최대 5,000자)
        </label>
        <textarea
          id="contact-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={5000}
          rows={8}
          disabled={submitting}
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground resize-y"
        />
        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {body.length} / 5,000
        </p>
      </div>

      {state.kind === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          제출
        </button>
      </div>
    </form>
  )
}
