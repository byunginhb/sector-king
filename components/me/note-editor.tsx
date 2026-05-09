/**
 * 메모 작성·편집 — 마크다운 textarea + 미리보기 토글.
 *
 * - autosave 없음 (명시적 저장 버튼). 사용자가 의도치 않게 덮어쓰는 것을 방지.
 * - 글자수 카운터.
 * - 미리보기는 매우 단순한 줄바꿈/링크 변환만 (서버 렌더링 도입은 B2 이후).
 */
'use client'

import { useState } from 'react'
import { Eye, EyeOff, Save, Trash2 } from 'lucide-react'
import { useNotes } from '@/hooks/me/use-notes'
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
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border-subtle text-muted-foreground hover:bg-surface-2"
            aria-pressed={preview}
          >
            {preview ? (
              <>
                <EyeOff className="h-3 w-3" aria-hidden />
                편집
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" aria-hidden />
                미리보기
              </>
            )}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-[160px] text-sm text-foreground whitespace-pre-wrap break-words bg-surface-2/30 rounded p-3 border border-border-subtle">
          {body || (
            <span className="text-muted-foreground">미리볼 내용이 없습니다.</span>
          )}
        </div>
      ) : (
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
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-semibold"
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
