/**
 * /admin/economic-calendar — 관리자용 경제 캘린더 목록 + 필터.
 *
 * Server Component 에서 supabase 직접 조회(뉴스 목록 패턴). 필터는 searchParams(GET).
 * 인증은 `/admin` 레이아웃에서 상속(추가 게이트 불필요).
 */
import Link from 'next/link'
import {
  Plus,
  CalendarClock,
  Pencil,
  Bot,
  EyeOff,
  Lock,
} from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import {
  EVENT_LIST_COLUMNS,
  rowToListItem,
  type EconomicEventListItem,
} from '@/lib/economic-calendar/dto'
import { adminEventListQuerySchema } from '@/lib/economic-calendar/schema'
import { cn } from '@/lib/utils'
import type { EconomicEventImportance } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

const IMPORTANCE_META: Record<
  EconomicEventImportance,
  { label: string; cls: string }
> = {
  high: {
    label: '높음',
    cls: 'border-danger/40 bg-danger/10 text-danger',
  },
  medium: {
    label: '보통',
    cls: 'border-border-subtle bg-surface-2 text-muted-foreground',
  },
  low: {
    label: '낮음',
    cls: 'border-border-subtle bg-surface-2 text-muted-foreground',
  },
}

const COUNTRY_LABEL: Record<string, string> = { KR: '한국', US: '미국' }

const COUNTRY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'KR', label: '한국' },
  { value: 'US', label: '미국' },
]
const CATEGORY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'indicator', label: '지표' },
  { value: 'earnings', label: '실적' },
  { value: 'event', label: '이벤트' },
]
const IMPORTANCE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'high', label: '높음' },
  { value: 'medium', label: '보통' },
  { value: 'low', label: '낮음' },
]
const SOURCE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'manual', label: '수동(manual)' },
  { value: 'fred', label: '자동(fred)' },
]

export default async function AdminEconomicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const first = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v

  const parsed = adminEventListQuerySchema.safeParse({
    from: first(sp.from) || undefined,
    to: first(sp.to) || undefined,
    country: first(sp.country) ?? 'all',
    category: first(sp.category) ?? 'all',
    source: first(sp.source) ?? 'all',
    importance: first(sp.importance) ?? 'all',
    includeHidden: true,
    limit: 100,
  })
  const filters = parsed.success
    ? parsed.data
    : adminEventListQuerySchema.parse({})

  const supabase = await createClient()
  let query = supabase
    .from('economic_events')
    .select(EVENT_LIST_COLUMNS)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true, nullsFirst: false })
    .limit(filters.limit)

  if (filters.from) query = query.gte('event_date', filters.from)
  if (filters.to) query = query.lte('event_date', filters.to)
  if (filters.country !== 'all') query = query.eq('country', filters.country)
  if (filters.category !== 'all') query = query.eq('category', filters.category)
  if (filters.source !== 'all') query = query.eq('source', filters.source)
  if (filters.importance !== 'all')
    query = query.eq('importance', filters.importance)

  const { data, error } = await query
  const items: EconomicEventListItem[] = error
    ? []
    : (data ?? []).map((row) =>
        rowToListItem(row as Parameters<typeof rowToListItem>[0])
      )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" aria-hidden />
            경제 캘린더 관리
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            경제 지표·이벤트 수동 등록 및 자동 수집분 관리
          </p>
        </div>
        <Link
          href="/admin/economic-calendar/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden />
          신규 등록
        </Link>
      </div>

      {/* 필터 바 (GET) */}
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border-subtle bg-surface-1 p-4"
      >
        <FilterField label="시작일">
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ''}
            className="rounded-md border border-border-subtle bg-background px-2 py-1 text-xs sm:text-sm text-foreground tabular-nums"
          />
        </FilterField>
        <FilterField label="종료일">
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ''}
            className="rounded-md border border-border-subtle bg-background px-2 py-1 text-xs sm:text-sm text-foreground tabular-nums"
          />
        </FilterField>
        <FilterSelect
          label="국가"
          name="country"
          value={filters.country}
          options={COUNTRY_OPTIONS}
        />
        <FilterSelect
          label="카테고리"
          name="category"
          value={filters.category}
          options={CATEGORY_OPTIONS}
        />
        <FilterSelect
          label="출처"
          name="source"
          value={filters.source}
          options={SOURCE_OPTIONS}
        />
        <FilterSelect
          label="중요도"
          name="importance"
          value={filters.importance}
          options={IMPORTANCE_OPTIONS}
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs sm:text-sm font-semibold hover:bg-primary/90"
          >
            필터 적용
          </button>
          <Link
            href="/admin/economic-calendar"
            className="rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:bg-surface-2"
          >
            초기화
          </Link>
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          목록을 불러올 수 없습니다: {error.message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            조건에 맞는 이벤트가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const imp = IMPORTANCE_META[it.importance]
            const isManual = it.source === 'manual'
            return (
              <li key={it.id}>
                <Link
                  href={`/admin/economic-calendar/${it.id}/edit`}
                  className="block rounded-2xl border border-border-subtle bg-surface-1 p-4 hover:border-primary/30 hover:bg-surface-2 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {it.eventDate}
                          {it.eventTime ? ` ${it.eventTime}` : ' 종일'}
                        </span>
                        <Badge className="border-border-subtle bg-surface-2 text-muted-foreground">
                          {COUNTRY_LABEL[it.country] ?? it.country}
                        </Badge>
                        <Badge className={imp.cls}>{imp.label}</Badge>
                        {isManual ? (
                          <Badge className="border-primary/30 bg-primary/10 text-primary">
                            <Pencil className="h-3 w-3" aria-hidden />
                            수동
                          </Badge>
                        ) : (
                          <Badge className="border-border-subtle bg-surface-2 text-muted-foreground">
                            <Bot className="h-3 w-3" aria-hidden />
                            {it.source}
                          </Badge>
                        )}
                        {it.isLocked && (
                          <Badge className="border-warning/30 bg-warning/10 text-warning">
                            <Lock className="h-3 w-3" aria-hidden />
                            수동 고정
                          </Badge>
                        )}
                        {it.isHidden && (
                          <Badge className="border-border-subtle bg-surface-2 text-muted-foreground">
                            <EyeOff className="h-3 w-3" aria-hidden />
                            숨김
                          </Badge>
                        )}
                      </div>
                      <h3
                        className={cn(
                          'text-base font-bold mt-1.5 leading-tight group-hover:text-primary transition-colors',
                          it.isHidden
                            ? 'text-muted-foreground line-through'
                            : 'text-card-foreground'
                        )}
                      >
                        {it.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      수정: {format(new Date(it.updatedAt), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string
  name: string
  value: string
  options: { value: string; label: string }[]
}) {
  return (
    <FilterField label={label}>
      <select
        name={name}
        defaultValue={value}
        className="rounded-md border border-border-subtle bg-background px-2 py-1 text-xs sm:text-sm text-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FilterField>
  )
}

function Badge({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-bold rounded-md border px-2 py-0.5',
        className
      )}
    >
      {children}
    </span>
  )
}
