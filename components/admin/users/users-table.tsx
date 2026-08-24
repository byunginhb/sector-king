/**
 * 사용자 표 + 구독 등급 변경 — `/admin/users` 의 쓰기 화면.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 행 단위 즉시 저장인가 (권한 콘솔과 반대)
 * ────────────────────────────────────────────────────────────────────
 *
 * `/admin/permissions` 는 일괄 저장이다. 기능 권한은 행끼리 상호 의존하기
 * 때문이다("표를 Pro 로 올리면 그 표로 가는 링크도"). 사용자 등급은 정반대로
 * 완전히 독립적이라, 모아서 저장하면 얻는 게 없고 "누구를 바꿨더라"만 늘어난다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  만료일은 브라우저가 절대시각으로 바꿔 보낸다
 * ────────────────────────────────────────────────────────────────────
 *
 * `datetime-local` 값은 타임존이 없는 `2026-09-01T00:00` 이다. 그대로 보내면
 * 서버가 KST/UTC 중 무엇으로 읽을지 정해야 하고, 그 해석이 만료 판정
 * (`expires_at <= now()`)과 어긋나면 하루치 권한이 새거나 사라진다. 그래서
 * `new Date(local).toISOString()` 으로 **관리자 브라우저 로컬 기준 절대시각**을
 * 만들어 보낸다(`subscriptionGrantSchema` 가 offset 있는 ISO 만 받는다).
 */
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Check, Loader2, Mail, Search, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  STORABLE_TIERS,
  TIER_LABEL,
  type StorableTier,
  type Tier,
} from '@/lib/permissions/tier'
import { cn } from '@/lib/utils'

export type AdminUserRow = {
  id: string
  /** 이메일 없는 제공자(네이버 등)로 가입한 계정은 null 이다. */
  email: string | null
  name: string | null
  role: 'user' | 'admin'
  createdAt: string
  subscriptionTier: StorableTier
  subscriptionExpiresAt: string | null
  /** 만료를 반영한 실효 등급. 서버(`resolveTier`)가 확정해 내려준다. */
  effectiveTier: Tier
  subscriptionSource: string | null
  subscribedToMail: boolean
  hourKst: number | null
  lastSentAt: string | null
}

/** 등급 배지 색 — 사다리가 올라갈수록 강해진다. 관리자는 별도 축이라 primary. */
const TIER_BADGE: Record<Tier, string> = {
  anon: 'border-border-subtle bg-surface-2 text-muted-foreground',
  free: 'border-border-subtle bg-surface-2 text-muted-foreground',
  basic: 'border-info/30 bg-info/10 text-info',
  pro: 'border-success/40 bg-success/10 text-success',
  admin: 'border-primary/40 bg-primary/10 text-primary',
}

/** 만료일 빠른 선택. 수동 부여는 대부분 기간제라 직접 입력보다 이쪽을 먼저 쓴다. */
const QUICK_MONTHS = [1, 3, 6, 12] as const

const SELECT_CLASS =
  'rounded-md border border-border-subtle bg-background px-2 py-1.5 text-sm text-foreground'

/** `datetime-local` 입력값 형식 (로컬 타임존 기준). */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function addMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return toLocalInputValue(d)
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[]
  /** 로그인한 관리자 id — 본인 행의 권한 버튼을 숨기는 데 쓴다. */
  currentUserId: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all')
  const [editing, setEditing] = useState<AdminUserRow | null>(null)
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (tierFilter !== 'all' && u.effectiveTier !== tierFilter) return false
      if (!q) return true
      return (
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.name ?? '').toLowerCase().includes(q)
      )
    })
  }, [users, query, tierFilter])

  return (
    <>
      <div className="sk-card flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-56 flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            검색
          </span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이메일 · 이름"
              className="w-full rounded-md border border-border-subtle bg-background py-1.5 pl-8 pr-3 text-sm text-foreground"
            />
          </span>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            등급
          </span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as Tier | 'all')}
            className={SELECT_CLASS}
          >
            <option value="all">전체</option>
            {(['admin', 'pro', 'basic', 'free'] as Tier[]).map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <p className="pb-1 text-xs text-muted-foreground tabular-nums" role="status">
          {filtered.length.toLocaleString()}명
        </p>
      </div>

      <div className="sk-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">역할</th>
                <th className="px-4 py-3 font-medium">등급</th>
                <th className="px-4 py-3 font-medium">만료</th>
                <th className="px-4 py-3 text-center font-medium">메일</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    조건에 맞는 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === currentUserId}
                    onEdit={() => setEditing(u)}
                    onEditRole={() => setRoleTarget(u)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {roleTarget && (
        <RoleDialog
          user={roleTarget}
          onClose={() => setRoleTarget(null)}
          onSaved={() => {
            setRoleTarget(null)
            router.refresh()
          }}
        />
      )}

      {editing && (
        <GrantDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            // 목록은 서버 컴포넌트가 소유한다 — 클라이언트에 사본을 두지 않고
            // 서버를 다시 그리게 해서 "화면만 바뀌고 DB 는 그대로"를 없앤다.
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function UserRow({
  user,
  onEdit,
  onEditRole,
  isSelf,
}: {
  user: AdminUserRow
  onEdit: () => void
  onEditRole: () => void
  /** 로그인한 관리자 본인인가 — 본인 권한은 바꿀 수 없다. */
  isSelf: boolean
}) {
  // 저장된 등급은 유료인데 실효는 free = 만료됨. 둘을 함께 보여줘야
  // "Pro 라고 적혀 있는데 왜 안 열리죠" 문의가 생기지 않는다.
  const expired =
    user.subscriptionTier !== 'free' && user.effectiveTier === 'free'

  return (
    <tr className="hover:bg-surface-2">
      <td className="px-4 py-3 font-medium text-foreground">
        {user.email ?? '이메일 미제공'}
      </td>
      <td className="px-4 py-3 text-foreground">{user.name ?? '-'}</td>
      <td className="px-4 py-3">
        {user.role === 'admin' ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            <Shield className="h-3 w-3" aria-hidden />
            관리자
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">일반</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold',
              TIER_BADGE[user.effectiveTier]
            )}
          >
            {user.role === 'admin' && <Shield className="h-3 w-3" aria-hidden />}
            {TIER_LABEL[user.effectiveTier]}
          </span>
          {expired && (
            <span className="text-[11px] font-bold text-warning">
              {TIER_LABEL[user.subscriptionTier]} 만료됨
            </span>
          )}
          {user.role === 'admin' && user.subscriptionTier !== 'free' && (
            <span
              className="text-[11px] text-muted-foreground"
              title="관리자는 role 이 등급의 원천이라 구독 등급과 무관하게 전체 접근 권한을 가집니다"
            >
              구독 {TIER_LABEL[user.subscriptionTier]}
            </span>
          )}
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {user.subscriptionExpiresAt
          ? format(new Date(user.subscriptionExpiresAt), 'yyyy-MM-dd HH:mm')
          : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        {user.subscribedToMail ? (
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success"
            title={user.hourKst !== null ? `매일 ${user.hourKst}시 KST` : '구독 중'}
            aria-label="메일 구독 중"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : (
          <span className="text-xs text-muted-foreground" aria-label="미구독">
            —
          </span>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {format(new Date(user.createdAt), 'yyyy-MM-dd')}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="inline-flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-border-subtle bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-3"
          >
            등급 변경
          </button>
          {/* 본인 행에는 버튼을 두지 않는다 — 서버도 막지만, 누를 수 있게 두면
              "왜 안 되지"를 눌러본 뒤에야 알게 된다. */}
          {!isSelf && (
            <button
              type="button"
              onClick={onEditRole}
              className="rounded-md border border-border-subtle bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-3"
            >
              {user.role === 'admin' ? '관리자 해제' : '관리자 지정'}
            </button>
          )}
        </span>
      </td>
    </tr>
  )
}

function GrantDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow
  onClose: () => void
  onSaved: () => void
}) {
  const [tier, setTier] = useState<StorableTier>(user.subscriptionTier)
  const [expiresLocal, setExpiresLocal] = useState(
    user.subscriptionExpiresAt
      ? toLocalInputValue(new Date(user.subscriptionExpiresAt))
      : ''
  )
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tier,
          // free 는 서버가 만료일을 지운다. 여기서도 보내지 않아 의도를 맞춘다.
          expiresAt:
            tier === 'free' || expiresLocal === ''
              ? null
              : new Date(expiresLocal).toISOString(),
          note: note.trim() || null,
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? '변경에 실패했습니다')
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : '변경에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>구독 등급 변경</DialogTitle>
          <DialogDescription>
            {user.email ?? user.name ?? user.id}
            {user.role === 'admin' && ' · 관리자 계정'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              등급
            </span>
            <div className="inline-flex rounded-md border border-border-subtle bg-background p-0.5">
              {STORABLE_TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tier === t}
                  onClick={() => setTier(t)}
                  className={cn(
                    'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                    tier === t
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-2'
                  )}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {tier !== 'free' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                만료일
              </label>
              <input
                type="datetime-local"
                value={expiresLocal}
                onChange={(e) => setExpiresLocal(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-background px-2 py-1.5 text-sm text-foreground"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_MONTHS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExpiresLocal(addMonths(m))}
                    className="rounded-md border border-border-subtle bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-surface-3"
                  >
                    {m}개월
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setExpiresLocal('')}
                  className="rounded-md border border-border-subtle bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-surface-3"
                >
                  무기한
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                비워 두면 만료 없이 유지됩니다. 지난 시각을 넣으면 즉시 미구독으로
                내려갑니다.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              사유 (선택)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="이벤트 당첨 · 환불 보상 · 베타 테스터 등"
              className="w-full rounded-md border border-border-subtle bg-background px-2 py-1.5 text-sm text-foreground"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              변경 이력에 함께 기록됩니다.
            </p>
          </div>

          {user.role === 'admin' && (
            <p className="rounded-md border border-border-subtle bg-surface-2 p-2.5 text-[11px] text-muted-foreground">
              이 계정은 관리자라 구독 등급과 무관하게 모든 기능에 접근합니다.
              등급을 바꿔도 실제 접근 권한은 달라지지 않습니다.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-border-subtle bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-2 disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            저장
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 관리자 권한 변경 확인 — **되돌리기 어려운 동작이라 결과를 먼저 말한다.**
 *
 * 등급 변경 모달과 달리 여기엔 고를 값이 없다(user ↔ admin 뿐). 그래서 폼이
 * 아니라 확인 절차이고, 화면의 대부분은 "이 사람이 무엇을 할 수 있게 되는가"다.
 */
function RoleDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow
  onClose: () => void
  onSaved: () => void
}) {
  const promote = user.role !== 'admin'
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          role: promote ? 'admin' : 'user',
          note: note.trim() || null,
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.success) throw new Error(body.error ?? '변경에 실패했습니다')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : '변경에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{promote ? '관리자로 지정' : '관리자 권한 해제'}</DialogTitle>
          <DialogDescription>{user.email ?? user.name ?? user.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className={cn(
              'rounded-md border p-3 text-sm',
              promote
                ? 'border-warning/40 bg-warning/10 text-warning'
                : 'border-border-subtle bg-surface-2 text-muted-foreground'
            )}
          >
            {promote ? (
              <>
                <p className="font-semibold text-foreground">
                  이 사용자는 관리자 권한을 갖게 됩니다.
                </p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[13px]">
                  <li>전체 가입자 정보 열람 및 구독 등급 변경</li>
                  <li>다른 사용자에게 관리자 권한 부여·해제</li>
                  <li>뉴스·경제 캘린더 발행, 기능 권한 정책 변경</li>
                </ul>
                <p className="mt-1.5 text-[13px]">
                  구독 등급과 무관하게 모든 기능에 접근합니다.
                </p>
              </>
            ) : (
              <p>
                관리자 화면에 더 이상 접근할 수 없게 됩니다. 구독 등급은 그대로
                유지됩니다.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              사유 (선택)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="운영 담당자 추가 · 퇴사 등"
              className="w-full rounded-md border border-border-subtle bg-background px-2 py-1.5 text-sm text-foreground"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              변경 이력에 함께 기록됩니다.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-border-subtle bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-2 disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60',
              promote
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-danger text-white hover:bg-danger/90'
            )}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {promote ? '관리자로 지정' : '권한 해제'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 상단 통계 카드 — 표와 같은 데이터에서 파생되므로 같은 파일에 둔다. */
export function UserStats({ users }: { users: AdminUserRow[] }) {
  const paid = users.filter(
    (u) => u.effectiveTier === 'basic' || u.effectiveTier === 'pro'
  ).length
  const mail = users.filter((u) => u.subscribedToMail).length
  const admins = users.filter((u) => u.role === 'admin').length

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="전체 가입자" value={users.length} />
      <StatCard label="유료 구독" value={paid} tone="success" />
      <StatCard label="메일 구독" value={mail} />
      <StatCard label="관리자" value={admins} />
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success'
}) {
  return (
    <div className="sk-card p-5">
      <div className="mb-2 flex items-center gap-2">
        {label === '메일 구독' ? (
          <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : null}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p
        className={cn(
          'text-2xl font-bold tabular-nums',
          tone === 'success' ? 'text-success' : 'text-foreground'
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  )
}
