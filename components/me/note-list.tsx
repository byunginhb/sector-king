/**
 * 본인 메모 목록.
 */
'use client'

import { NotebookPen, Trash2 } from 'lucide-react'
import { useNotes } from '@/hooks/me/use-notes'
import { Skeleton } from '@/components/ui/skeleton'
import type { NoteDTO, PerkItemType } from '@/drizzle/supabase-schema'

export function NoteList({
  itemType,
}: {
  itemType?: PerkItemType
}) {
  const { items, isLoading, remove } = useNotes({ itemType })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-1/50 p-8 text-center">
        <NotebookPen
          className="h-7 w-7 mx-auto text-muted-foreground mb-2"
          aria-hidden
        />
        <p className="text-sm font-medium text-foreground mb-1">
          아직 작성한 메모가 없습니다
        </p>
        <p className="text-xs text-muted-foreground">
          종목 상세 페이지에서 메모를 작성해보세요.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((note) => (
        <NoteItem key={note.id} note={note} onDelete={() => remove(note.id)} />
      ))}
    </ul>
  )
}

function NoteItem({
  note,
  onDelete,
}: {
  note: NoteDTO
  onDelete: () => void
}) {
  return (
    <li className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface-2 px-2 py-0.5 rounded">
            {labelFor(note.itemType)}
          </span>
          <span className="text-sm font-medium text-foreground">
            {note.itemKey}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('이 메모를 삭제할까요?')) onDelete()
          }}
          aria-label="메모 삭제"
          className="text-muted-foreground hover:text-danger p-1"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
        {note.body}
      </p>
      <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
        {new Date(note.updatedAt).toLocaleString('ko-KR')}
      </p>
    </li>
  )
}

function labelFor(t: PerkItemType) {
  switch (t) {
    case 'ticker':
      return '회사'
    case 'sector':
      return '섹터'
    case 'industry':
      return '산업'
    case 'news':
      return '리포트'
  }
}
