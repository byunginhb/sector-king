/**
 * 이메일 발송 통계 카드 (오늘 / 최근 7일).
 */
import { Mail, CheckCircle2, XCircle, MinusCircle, Percent } from 'lucide-react'
import type { EmailLogStats } from '@/app/api/admin/email-log/route'

export function EmailLogStatsCards({ stats }: { stats: EmailLogStats }) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
      <StatGroup title="오늘" stats={extractToday(stats)} />
      <StatGroup title="최근 7일" stats={extractLast7(stats)} />
    </div>
  )
}

interface StatGroupData {
  total: number
  sent: number
  failed: number
  skipped: number
  rate: number | null
}

function StatGroup({ title, stats }: { title: string; stats: StatGroupData }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Cell
          icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
          label="총 발송"
          value={stats.total}
        />
        <Cell
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />}
          label="성공"
          value={stats.sent}
        />
        <Cell
          icon={<XCircle className="h-3.5 w-3.5 text-danger" aria-hidden />}
          label="실패"
          value={stats.failed}
        />
        <Cell
          icon={<MinusCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
          label="skipped"
          value={stats.skipped}
        />
        <Cell
          icon={<Percent className="h-3.5 w-3.5 text-info" aria-hidden />}
          label="성공률"
          value={stats.rate === null ? '—' : `${stats.rate}%`}
        />
      </div>
    </div>
  )
}

function Cell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

function extractToday(s: EmailLogStats): StatGroupData {
  return {
    total: s.todayTotal,
    sent: s.todaySent,
    failed: s.todayFailed,
    skipped: s.todaySkipped,
    rate: s.todaySuccessRate,
  }
}

function extractLast7(s: EmailLogStats): StatGroupData {
  return {
    total: s.last7Total,
    sent: s.last7Sent,
    failed: s.last7Failed,
    skipped: s.last7Skipped,
    rate: s.last7SuccessRate,
  }
}
