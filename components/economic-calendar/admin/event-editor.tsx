/**
 * 관리자 경제 이벤트 편집기 (신규 + 편집 공통).
 *
 * 뉴스 `NewsEditor` 축소판 — 전부 폼 필드(JSON 없음). 발행 개념 없음(저장 단일 버튼).
 * 자동분(source!='manual') 편집 시 경고 배너 + is_hidden/is_locked 토글 노출.
 * 삭제는 manual=하드 / 자동=소프트(서버 정책). KST 고정(이중변환 금지).
 */
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2, Eye, ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { EconomicEventDTO } from '@/lib/economic-calendar/dto'
import type {
  EconomicEventCountry,
  EconomicEventCategory,
  EconomicEventImportance,
} from '@/drizzle/supabase-schema'

interface EventEditorProps {
  /** 편집 모드면 기존 이벤트, 신규면 null */
  initial: EconomicEventDTO | null
}

const COUNTRY_LABEL: Record<EconomicEventCountry, string> = {
  KR: '한국',
  US: '미국',
}
const CATEGORY_LABEL: Record<EconomicEventCategory, string> = {
  indicator: '지표',
  earnings: '실적',
  event: '이벤트',
}
const IMPORTANCE_LABEL: Record<EconomicEventImportance, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

const todayKst = () => {
  // 서버/클라 로컬 무관하게 KST 기준 오늘 날짜.
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export function EventEditor({ initial }: EventEditorProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const isEdit = initial !== null
  const isManual = !isEdit || initial?.source === 'manual'

  const [country, setCountry] = useState<EconomicEventCountry>(
    initial?.country ?? 'US'
  )
  const [category, setCategory] = useState<EconomicEventCategory>(
    initial?.category ?? 'indicator'
  )
  const [importance, setImportance] = useState<EconomicEventImportance>(
    initial?.importance ?? 'medium'
  )
  const [title, setTitle] = useState(initial?.title ?? '')
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? '')
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? todayKst())
  const [allDay, setAllDay] = useState(isEdit ? initial?.eventTime == null : false)
  const [eventTime, setEventTime] = useState(initial?.eventTime ?? '')
  const [actual, setActual] = useState(initial?.actual ?? '')
  const [forecast, setForecast] = useState(initial?.forecast ?? '')
  const [previous, setPrevious] = useState(initial?.previous ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [isHidden, setIsHidden] = useState(initial?.isHidden ?? false)
  const [isLocked, setIsLocked] = useState(initial?.isLocked ?? false)

  const buildPayload = () => {
    const trimmedTime = eventTime.trim()
    return {
      country,
      category,
      importance,
      title: title.trim(),
      titleEn: titleEn.trim() || null,
      eventDate,
      eventTime: allDay || !trimmedTime ? null : trimmedTime,
      actual: actual.trim() || null,
      forecast: forecast.trim() || null,
      previous: previous.trim() || null,
      unit: unit.trim() || null,
    }
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      try {
        if (!title.trim()) throw new Error('이벤트명을 입력하세요')
        const base = buildPayload()
        // 편집(자동분 포함)에서는 플래그도 함께 전송.
        const payload: Record<string, unknown> = isEdit
          ? { ...base, isHidden, isLocked }
          : base
        const url = isEdit
          ? `/api/admin/economic-calendar/${initial!.id}`
          : '/api/admin/economic-calendar'
        const method = isEdit ? 'PATCH' : 'POST'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? `요청 실패 (${res.status})`)
        }
        if (!isEdit && json.data?.id) {
          router.push(`/admin/economic-calendar/${json.data.id}/edit`)
        } else {
          router.refresh()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '저장 실패')
      }
    })
  }

  const remove = () => {
    if (!isEdit) return
    const msg = isManual
      ? '정말 삭제하시겠습니까? (수동 등록 이벤트는 완전히 삭제됩니다)'
      : '이 자동 수집 이벤트를 숨기시겠습니까? (소프트 삭제 — 목록에서 숨김 처리)'
    if (!confirm(msg)) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/economic-calendar/${initial!.id}`,
          { method: 'DELETE' }
        )
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? `요청 실패 (${res.status})`)
        }
        router.push('/admin/economic-calendar')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : '삭제 실패')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/economic-calendar"
          aria-label="목록으로"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          목록
        </Link>
        <span className="h-4 w-px bg-border" aria-hidden />
        <h2 className="text-xl font-bold text-foreground">
          {isEdit ? '경제 이벤트 편집' : '경제 이벤트 신규 등록'}
        </h2>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 자동분 편집 경고 배너 */}
      {isEdit && !isManual && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning flex items-start gap-2">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <p>
            자동 수집된 이벤트입니다(출처: {initial?.source}). 저장하면 수동
            고정되어 이후 자동 갱신이 이 행을 덮어쓰지 않습니다.
          </p>
        </div>
      )}

      {/* 메타 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="이벤트명 (한국어)" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-required
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="미국 소비자물가지수(CPI)"
          />
        </Field>
        <Field label="원문/영문명">
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="US CPI (YoY)"
          />
        </Field>
        <Field label="국가" required>
          <select
            value={country}
            onChange={(e) =>
              setCountry(e.target.value as EconomicEventCountry)
            }
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
          >
            {(Object.keys(COUNTRY_LABEL) as EconomicEventCountry[]).map((c) => (
              <option key={c} value={c}>
                {COUNTRY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="카테고리" required>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as EconomicEventCategory)
            }
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
          >
            {(Object.keys(CATEGORY_LABEL) as EconomicEventCategory[]).map(
              (c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              )
            )}
          </select>
        </Field>
        <Field label="중요도" required>
          <select
            value={importance}
            onChange={(e) =>
              setImportance(e.target.value as EconomicEventImportance)
            }
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground',
              importance === 'high'
                ? 'border-danger/40'
                : 'border-border-subtle'
            )}
          >
            {(Object.keys(IMPORTANCE_LABEL) as EconomicEventImportance[]).map(
              (i) => (
                <option key={i} value={i}>
                  {IMPORTANCE_LABEL[i]}
                </option>
              )
            )}
          </select>
        </Field>
        <Field label="발표 날짜 (KST, YYYY-MM-DD)" required>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            aria-required
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground tabular-nums"
          />
        </Field>
        <Field label="발표 시각 (KST, 종일이면 비움)">
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              disabled={allDay}
              className="flex-1 rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground tabular-nums disabled:opacity-50"
            />
            <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-border-subtle"
              />
              종일
            </label>
          </div>
        </Field>
      </div>

      {/* 지표 값 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="실제치 (actual)">
          <input
            type="text"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="발표 전이면 비움 (예: 3.2%)"
          />
        </Field>
        <Field label="예상치 (forecast)">
          <input
            type="text"
            value={forecast}
            onChange={(e) => setForecast(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="예: 3.1%"
          />
        </Field>
        <Field label="직전치 (previous)">
          <input
            type="text"
            value={previous}
            onChange={(e) => setPrevious(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="예: 3.3%"
          />
        </Field>
        <Field label="단위 (unit)">
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="예: %, K"
          />
        </Field>
      </div>

      {/* 자동분 플래그 토글 (편집 + 자동분 한정) */}
      {isEdit && !isManual && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-border-subtle bg-surface-1 p-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              className="h-4 w-4 rounded border-border-subtle"
            />
            숨김 (소프트 삭제 — 공개 캘린더에서 제외)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              className="h-4 w-4 rounded border-border-subtle"
            />
            수동 고정 (자동 재수집이 값을 덮어쓰지 않음)
          </label>
        </div>
      )}

      {/* 액션 바 */}
      <div className="flex flex-wrap items-center gap-2 sticky bottom-0 -mx-4 px-4 py-3 bg-background/90 backdrop-blur border-t border-border-subtle">
        <button
          type="button"
          onClick={() => setShowPreview((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm font-medium hover:bg-surface-2"
        >
          <Eye className="h-4 w-4" aria-hidden />
          {showPreview ? '미리보기 닫기' : '미리보기'}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden />
          저장
        </button>
        {isEdit && (
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/5 text-danger px-3 py-2 text-sm font-medium hover:bg-danger/10 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {isManual ? '삭제' : '숨김'}
          </button>
        )}
      </div>

      {/* 미리보기 (캘린더 셀 소형 카드) */}
      {showPreview && (
        <div className="mt-2 rounded-2xl border border-border-subtle bg-surface-1 p-4 sm:p-6">
          <h3 className="text-base font-bold text-foreground mb-3">미리보기</h3>
          <EventPreviewCard
            country={country}
            importance={importance}
            title={title || '(이벤트명 미입력)'}
            eventDate={eventDate}
            eventTime={allDay ? null : eventTime || null}
            actual={actual || null}
            forecast={forecast || null}
            previous={previous || null}
            unit={unit || null}
          />
        </div>
      )}
    </div>
  )
}

function EventPreviewCard({
  country,
  importance,
  title,
  eventDate,
  eventTime,
  actual,
  forecast,
  previous,
  unit,
}: {
  country: EconomicEventCountry
  importance: EconomicEventImportance
  title: string
  eventDate: string
  eventTime: string | null
  actual: string | null
  forecast: string | null
  previous: string | null
  unit: string | null
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 p-3 max-w-sm">
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <span className="font-bold rounded-md border border-border-subtle bg-surface-1 px-2 py-0.5 text-muted-foreground">
          {COUNTRY_LABEL[country]}
        </span>
        <span
          className={cn(
            'font-bold rounded-md border px-2 py-0.5',
            importance === 'high'
              ? 'border-danger/40 bg-danger/10 text-danger'
              : 'border-border-subtle bg-surface-1 text-muted-foreground'
          )}
        >
          {IMPORTANCE_LABEL[importance]}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {eventDate}
          {eventTime ? ` ${eventTime}` : ' 종일'}
        </span>
      </div>
      <p className="text-sm font-bold text-card-foreground mt-2">{title}</p>
      {(actual || forecast || previous) && (
        <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground tabular-nums">
          <span>실제 {actual ?? '-'}</span>
          <span>예상 {forecast ?? '-'}</span>
          <span>직전 {previous ?? '-'}</span>
          {unit && <span>({unit})</span>}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  full?: boolean
}) {
  return (
    <label className={cn('block', full ? 'sm:col-span-2' : '')}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
        {required && <span className="text-danger ml-1" aria-hidden>●</span>}
      </span>
      {children}
    </label>
  )
}
