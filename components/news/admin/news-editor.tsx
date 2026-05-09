/**
 * 관리자 마켓 리포트 편집기 (신규 + 편집 공통).
 *
 * 섹션별 폼은 단순화하여 JSON 텍스트영역으로 받는다 (전문가/초보자 통째). 향후
 * 섹션별 form 으로 확장 가능. zod 검증은 서버 측에서 수행.
 */
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Save, Send, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ExpertReportView } from '@/components/news/expert-report-view'
import { NoviceReportView } from '@/components/news/novice-report-view'
import { ViewToggle, type ReportView } from '@/components/news/view-toggle'
import { cn } from '@/lib/utils'
import type {
  NewsReportDTO,
  ExpertView,
  NoviceView,
  ReportStatus,
} from '@/drizzle/supabase-schema'

interface NewsEditorProps {
  /** 편집 모드면 기존 리포트, 신규면 null */
  initial: NewsReportDTO | null
}

const EMPTY_EXPERT: ExpertView = {
  thirtySecBrief: '',
  headlines: [],
  themeFlows: [],
  actions: [],
  scenarios: {
    bear: { kind: 'bear', body: '', trigger: '' },
    base: { kind: 'base', body: '', trigger: '' },
    bull: { kind: 'bull', body: '', trigger: '' },
  },
  oneLiner: '',
  fundFlow: { outflows: [], inflows: [], driver: '' },
  koreanStocks: [],
}

const EMPTY_NOVICE: NoviceView = {
  oneLineSummary: '',
  events: [],
  stockTables: [],
  koreanStocks: [],
  closing: '',
}

export function NewsEditor({ initial }: NewsEditorProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [previewView, setPreviewView] = useState<ReportView>('expert')
  const [showPreview, setShowPreview] = useState(false)

  const [title, setTitle] = useState(initial?.title ?? '')
  const [reportDate, setReportDate] = useState(
    initial?.reportDate ?? new Date().toISOString().slice(0, 10)
  )
  const [status, setStatus] = useState<ReportStatus>(initial?.status ?? 'draft')
  const [oneLineConclusion, setOneLineConclusion] = useState(
    initial?.oneLineConclusion ?? ''
  )
  const [coverKeywordsRaw, setCoverKeywordsRaw] = useState(
    (initial?.coverKeywords ?? []).join(', ')
  )
  const [expertJson, setExpertJson] = useState(
    JSON.stringify(initial?.expertView ?? EMPTY_EXPERT, null, 2)
  )
  const [noviceJson, setNoviceJson] = useState(
    JSON.stringify(initial?.noviceView ?? EMPTY_NOVICE, null, 2)
  )

  const isEdit = initial !== null

  const buildPayload = () => {
    let expertView: ExpertView
    let noviceView: NoviceView
    try {
      expertView = JSON.parse(expertJson)
    } catch {
      throw new Error('전문가용 JSON 형식이 올바르지 않습니다')
    }
    try {
      noviceView = JSON.parse(noviceJson)
    } catch {
      throw new Error('초보자용 JSON 형식이 올바르지 않습니다')
    }
    const coverKeywords = coverKeywordsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return {
      title,
      reportDate,
      status,
      oneLineConclusion: oneLineConclusion.trim() || null,
      coverKeywords,
      expertView,
      noviceView,
    }
  }

  const submit = (overrideStatus?: ReportStatus) => {
    setError(null)
    startTransition(async () => {
      try {
        const payload = buildPayload()
        if (overrideStatus) payload.status = overrideStatus
        const url = isEdit
          ? `/api/admin/news/${initial!.id}`
          : '/api/admin/news'
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
        if (overrideStatus) setStatus(overrideStatus)
        if (!isEdit && json.data?.id) {
          router.push(`/admin/news/${json.data.id}/edit`)
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
    if (!confirm('정말 삭제하시겠습니까?')) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/news/${initial!.id}`, {
          method: 'DELETE',
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? `요청 실패 (${res.status})`)
        }
        router.push('/admin/news')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : '삭제 실패')
      }
    })
  }

  // 미리보기용 파싱 (실패 시 빈 객체)
  let previewExpert: ExpertView = EMPTY_EXPERT
  let previewNovice: NoviceView = EMPTY_NOVICE
  try {
    previewExpert = JSON.parse(expertJson)
  } catch {
    /* ignore */
  }
  try {
    previewNovice = JSON.parse(noviceJson)
  } catch {
    /* ignore */
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/news"
          aria-label="목록으로"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          목록
        </Link>
        <span className="h-4 w-px bg-border" aria-hidden />
        <h2 className="text-xl font-bold text-foreground">
          {isEdit ? '리포트 편집' : '리포트 신규 작성'}
        </h2>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 메타 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="제목">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="오늘의 마켓 리포트"
          />
        </Field>
        <Field label="리포트 기준일 (YYYY-MM-DD)">
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground tabular-nums"
          />
        </Field>
        <Field label="상태">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="draft">초안</option>
            <option value="published">발행</option>
            <option value="archived">보관</option>
          </select>
        </Field>
        <Field label="키워드 (콤마 구분)">
          <input
            type="text"
            value={coverKeywordsRaw}
            onChange={(e) => setCoverKeywordsRaw(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="ai, energy, korea"
          />
        </Field>
        <Field label="한 줄 결론" full>
          <textarea
            value={oneLineConclusion}
            onChange={(e) => setOneLineConclusion(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground resize-y"
            placeholder="AI 투자는 계속되지만 돈은 실물로 이동 중..."
          />
        </Field>
      </div>

      {/* 본문 JSON */}
      <Field label="전문가용 JSON" full>
        <textarea
          value={expertJson}
          onChange={(e) => setExpertJson(e.target.value)}
          rows={20}
          className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 font-mono text-xs text-foreground resize-y"
          spellCheck={false}
        />
      </Field>
      <Field label="초보자용 JSON" full>
        <textarea
          value={noviceJson}
          onChange={(e) => setNoviceJson(e.target.value)}
          rows={16}
          className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 font-mono text-xs text-foreground resize-y"
          spellCheck={false}
        />
      </Field>

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
          onClick={() => submit('draft')}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden />
          임시저장
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit('published')}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden />
          발행
        </button>
        {isEdit && (
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/5 text-danger px-3 py-2 text-sm font-medium hover:bg-danger/10 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            삭제
          </button>
        )}
      </div>

      {/* 미리보기 */}
      {showPreview && (
        <div className={cn('mt-6 rounded-2xl border border-border-subtle bg-surface-1 p-4 sm:p-6')}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-foreground">미리보기</h3>
            <ViewToggle value={previewView} onChange={setPreviewView} />
          </div>
          {previewView === 'expert' ? (
            <ExpertReportView report={previewExpert} />
          ) : (
            <NoviceReportView report={previewNovice} />
          )}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <label className={cn('block', full ? 'sm:col-span-2' : '')}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}
