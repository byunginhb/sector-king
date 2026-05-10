/**
 * email_log 테이블 — server-rendered (server component).
 *
 * 실패 행은 error 필드를 native title attribute (tooltip) 으로 노출.
 */
import { format } from 'date-fns'
import { CheckCircle2, XCircle, MinusCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmailLogRowDTO } from '@/app/api/admin/email-log/route'

interface Props {
  rows: EmailLogRowDTO[]
  total: number
  limit: number
  offset: number
  /** URL 쿼리 (현재 필터) — 페이지네이션 링크 생성에 사용 */
  searchParams: Record<string, string | undefined>
}

export function EmailLogTable({ rows, total, limit, offset, searchParams }: Props) {
  const start = offset + 1
  const end = Math.min(offset + rows.length, total)

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {total === 0 ? '결과 없음' : `${start}–${end} / 총 ${total}건`}
        </p>
        <Pagination total={total} limit={limit} offset={offset} searchParams={searchParams} />
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          조건에 맞는 발송 로그가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">발송 시각</th>
                <th className="px-3 py-2 text-left">상태</th>
                <th className="px-3 py-2 text-left">종류</th>
                <th className="px-3 py-2 text-left">수신자</th>
                <th className="px-3 py-2 text-left">제목</th>
                <th className="px-3 py-2 text-left">원인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                    {format(new Date(r.sentAt), 'yyyy-MM-dd HH:mm')}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {r.kind}
                  </td>
                  <td className="px-3 py-2 max-w-[220px] truncate text-foreground">
                    {r.userEmail ?? r.userId.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 max-w-[320px] truncate text-foreground">
                    {r.subject}
                  </td>
                  <td className="px-3 py-2">
                    {r.error ? (
                      <span
                        title={r.error}
                        className="inline-flex items-center gap-1 text-xs text-danger"
                      >
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                        보기
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: EmailLogRowDTO['status'] }) {
  const map = {
    sent: {
      label: '성공',
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
      cls: 'border-success/30 bg-success/10 text-success',
    },
    failed: {
      label: '실패',
      icon: <XCircle className="h-3.5 w-3.5" aria-hidden />,
      cls: 'border-danger/30 bg-danger/10 text-danger',
    },
    skipped: {
      label: 'skipped',
      icon: <MinusCircle className="h-3.5 w-3.5" aria-hidden />,
      cls: 'border-border-subtle bg-surface-2 text-muted-foreground',
    },
    bounced: {
      label: 'bounced',
      icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden />,
      cls: 'border-warning/30 bg-warning/10 text-warning',
    },
  }
  const meta = map[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        meta.cls
      )}
    >
      {meta.icon}
      {meta.label}
    </span>
  )
}

function Pagination({
  total,
  limit,
  offset,
  searchParams,
}: {
  total: number
  limit: number
  offset: number
  searchParams: Record<string, string | undefined>
}) {
  const prev = Math.max(offset - limit, 0)
  const next = offset + limit
  const canPrev = offset > 0
  const canNext = next < total

  function buildHref(o: number): string {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === 'offset') continue
      if (v) params.set(k, v)
    }
    if (o > 0) params.set('offset', String(o))
    const qs = params.toString()
    return qs ? `/admin/email-log?${qs}` : '/admin/email-log'
  }

  return (
    <div className="flex items-center gap-2">
      {canPrev ? (
        <a
          href={buildHref(prev)}
          className="rounded-md border border-border-subtle bg-surface-2 px-3 py-1 text-xs text-foreground hover:bg-surface-3"
        >
          이전
        </a>
      ) : (
        <span className="rounded-md border border-border-subtle bg-surface-2 px-3 py-1 text-xs text-muted-foreground/60">
          이전
        </span>
      )}
      {canNext ? (
        <a
          href={buildHref(next)}
          className="rounded-md border border-border-subtle bg-surface-2 px-3 py-1 text-xs text-foreground hover:bg-surface-3"
        >
          다음
        </a>
      ) : (
        <span className="rounded-md border border-border-subtle bg-surface-2 px-3 py-1 text-xs text-muted-foreground/60">
          다음
        </span>
      )}
    </div>
  )
}
