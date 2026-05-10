'use client'

/**
 * 관리자 문의 상세 — 답변 메모 + 상태 변경 + (옵션) 답변 메일 발송.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { ContactStatus } from '@/drizzle/supabase-schema'

interface Props {
  id: string
  initialStatus: ContactStatus
  initialNote: string
  recipientEmail: string
}

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'open', label: '대기' },
  { value: 'replied', label: '답변' },
  { value: 'closed', label: '종료' },
]

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; error: string }

export function ContactDetailForm({
  id,
  initialStatus,
  initialNote,
  recipientEmail,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<ContactStatus>(initialStatus)
  const [adminNote, setAdminNote] = useState(initialNote)
  const [sendReplyEmail, setSendReplyEmail] = useState(false)
  const [state, setState] = useState<SaveState>({ kind: 'idle' })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ kind: 'saving' })
    try {
      const res = await fetch(`/api/admin/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNote,
          sendReplyEmail,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        setState({
          kind: 'error',
          error: json.error || '저장 실패',
        })
        return
      }
      const emailRes = json.data?.emailResult as
        | { status: string; error?: string }
        | null
        | undefined
      let message = '저장되었습니다'
      if (sendReplyEmail) {
        if (emailRes?.status === 'sent') message = '저장 + 답변 메일 발송 완료'
        else if (emailRes?.status === 'failed')
          message = `저장 완료, 메일 발송 실패: ${emailRes.error ?? ''}`
        else if (emailRes?.status === 'skipped')
          message = `저장 완료, 메일 발송 skipped (${emailRes.error ?? ''})`
      }
      setState({ kind: 'success', message })
      setSendReplyEmail(false)
      router.refresh()
    } catch (err) {
      setState({
        kind: 'error',
        error: err instanceof Error ? err.message : '네트워크 오류',
      })
    }
  }

  const saving = state.kind === 'saving'

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border-subtle bg-surface-1 p-5 space-y-4"
    >
      <div>
        <label className="block text-xs text-muted-foreground mb-1" htmlFor="contact-status">
          상태
        </label>
        <select
          id="contact-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ContactStatus)}
          disabled={saving}
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="contact-admin-note"
          className="block text-xs text-muted-foreground mb-1"
        >
          답변 메모 (사용자에게 보낼 답변 본문)
        </label>
        <textarea
          id="contact-admin-note"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          maxLength={5000}
          rows={8}
          disabled={saving}
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground resize-y"
        />
        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {adminNote.length} / 5,000
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={sendReplyEmail}
          onChange={(e) => setSendReplyEmail(e.target.checked)}
          disabled={saving}
        />
        저장 시 답변 메일 발송 ({recipientEmail})
      </label>

      {state.kind === 'success' && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>{state.message}</span>
        </div>
      )}
      {state.kind === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>{state.error}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : sendReplyEmail ? (
            <Send className="h-4 w-4" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          {sendReplyEmail ? '저장 + 메일 발송' : '저장'}
        </button>
      </div>
    </form>
  )
}
