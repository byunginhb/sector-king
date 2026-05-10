'use client'

/**
 * email_log 필터 바 — status 다중 선택, kind 단일, 날짜 범위.
 *
 * URL searchParams 와 동기화 — Server Component 가 다시 데이터 fetch 할 수 있도록.
 */
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: { value: string; label: string; tone: string }[] = [
  { value: 'sent', label: '성공', tone: 'border-success/40 bg-success/10 text-success' },
  { value: 'failed', label: '실패', tone: 'border-danger/40 bg-danger/10 text-danger' },
  {
    value: 'skipped',
    label: 'skipped',
    tone: 'border-border-subtle bg-surface-2 text-muted-foreground',
  },
  {
    value: 'bounced',
    label: 'bounced',
    tone: 'border-warning/40 bg-warning/10 text-warning',
  },
]

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체 종류' },
  { value: 'daily_news', label: '일별 마켓 리포트' },
  { value: 'test_daily_news', label: '테스트 발송' },
]

export function EmailLogFilterBar() {
  const router = useRouter()
  const sp = useSearchParams()

  const initialStatus = useMemo(
    () => (sp.get('status') ?? '').split(',').filter(Boolean),
    [sp]
  )
  const [statusSet, setStatusSet] = useState<Set<string>>(
    () => new Set(initialStatus)
  )
  const [kind, setKind] = useState<string>(sp.get('kind') ?? '')
  const [from, setFrom] = useState<string>(sp.get('from') ?? '')
  const [to, setTo] = useState<string>(sp.get('to') ?? '')

  function applyFilters() {
    const params = new URLSearchParams()
    if (statusSet.size > 0) {
      params.set('status', Array.from(statusSet).join(','))
    }
    if (kind) params.set('kind', kind)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`/admin/email-log?${params.toString()}`)
  }

  function clearAll() {
    setStatusSet(new Set())
    setKind('')
    setFrom('')
    setTo('')
    router.push('/admin/email-log')
  }

  function toggleStatus(v: string) {
    setStatusSet((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
        <Filter className="h-4 w-4 text-primary" aria-hidden />
        필터
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">상태 (다중 선택 가능)</p>
          <div role="group" className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const active = statusSet.has(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleStatus(opt.value)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? opt.tone
                      : 'border-border-subtle bg-surface-2 text-muted-foreground hover:bg-surface-3'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="email-log-kind"
              className="block text-xs text-muted-foreground mb-1"
            >
              종류
            </label>
            <select
              id="email-log-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground"
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="email-log-from"
              className="block text-xs text-muted-foreground mb-1"
            >
              시작일
            </label>
            <input
              id="email-log-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div>
            <label
              htmlFor="email-log-to"
              className="block text-xs text-muted-foreground mb-1"
            >
              종료일
            </label>
            <input
              id="email-log-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            적용
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-2 text-foreground px-3 py-2 text-sm font-medium hover:bg-surface-3"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            초기화
          </button>
        </div>
      </div>
    </div>
  )
}
