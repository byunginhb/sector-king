/**
 * 메모 작성·편집 — 마크다운 textarea + 미리보기 토글.
 *
 * - autosave 없음 (명시적 저장 버튼). 사용자가 의도치 않게 덮어쓰는 것을 방지.
 * - 글자수 카운터.
 * - 미리보기는 `MarkdownView` 로 GFM 마크다운 풍부 렌더 + XSS sanitize.
 */
'use client'

import { useState } from 'react'
import { Eye, EyeOff, Save, Trash2 } from 'lucide-react'
import { useNotes } from '@/hooks/me/use-notes'
import { MarkdownView } from '@/components/ui/markdown-view'
import { cn } from '@/lib/utils'
import type { PerkItemType } from '@/drizzle/supabase-schema'

interface NoteEditorProps {
  itemType: PerkItemType
  itemKey: string
  initialBody?: string
  noteId?: string
  className?: string
  onSaved?: () => void
}

const MAX_LEN = 10000

export function NoteEditor({
  itemType,
  itemKey,
  initialBody = '',
  noteId,
  className,
  onSaved,
}: NoteEditorProps) {
  const { upsert, remove } = useNotes({ enabled: false })
  const [body, setBody] = useState(initialBody)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (body.trim().length === 0) {
      setError('메모 내용이 비어 있습니다')
      return
    }
    if (body.length > MAX_LEN) {
      setError(`메모는 최대 ${MAX_LEN.toLocaleString()}자까지 작성 가능합니다`)
      return
    }
    setError(null)
    setIsSaving(true)
    try {
      await upsert({ itemType, itemKey, body })
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!noteId) return
    if (!confirm('이 메모를 삭제할까요?')) return
    try {
      await remove(noteId)
      setBody('')
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border-subtle bg-surface-1 p-4',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground">메모</h4>
        <div
          role="group"
          aria-label="편집 모드 전환"
          className="inline-flex items-center rounded-lg border border-border-subtle bg-surface-2/40 p-0.5"
        >
          <button
            type="button"
            onClick={() => setPreview(false)}
            aria-pressed={!preview}
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors',
              !preview
                ? 'bg-surface-1 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <EyeOff className="h-3 w-3" aria-hidden />
            편집
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            aria-pressed={preview}
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors',
              preview
                ? 'bg-surface-1 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="h-3 w-3" aria-hidden />
            미리보기
          </button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-[160px] bg-surface-2/30 rounded p-3 border border-border-subtle">
          {body.trim().length > 0 ? (
            <MarkdownView content={body} />
          ) : (
            <span className="text-sm text-muted-foreground">
              미리볼 내용이 없습니다.
            </span>
          )}
        </div>
      ) : (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={MAX_LEN}
            placeholder="이 종목에 대한 생각, 매수 근거, 모니터링 포인트를 적어두세요."
            className={cn(
              'w-full text-sm font-mono leading-relaxed bg-surface-2/30',
              'border border-border-subtle rounded p-3',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'
            )}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground font-mono leading-relaxed">
            <span className="font-semibold">**굵게**</span>
            {'  '}
            <span className="italic">*기울임*</span>
            {'  '}[링크](url){'  '}- 목록{'  '}{'> '}인용{'  '}`코드`
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          {body.length.toLocaleString()} / {MAX_LEN.toLocaleString()}자
        </p>
        <div className="flex items-center gap-2">
          {noteId && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border-subtle text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-danger bg-danger/10 rounded px-2 py-1"
        >
          {error}
        </p>
      )}
    </div>
  )
}
