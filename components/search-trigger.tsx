'use client'

/**
 * 검색 진입점.
 *
 * Cmd+K 단축키는 `SearchProvider` 가 항상 듣고 있지만, **모바일에는 그 키가
 * 없다.** 버튼을 상단바에서 뺐던 기간 동안 모바일 사용자에게는 검색이 아예
 * 존재하지 않는 기능이었다. 그래서 두 형태를 함께 둔다:
 *
 *   `SearchTrigger`        아이콘 버튼 — 데스크탑 상단바·모바일 헤더
 *   `SearchTriggerWide`    라벨 있는 넓은 버튼 — 모바일 메뉴 시트 안
 */

import { Search } from 'lucide-react'
import { useSearchContext } from './search-provider'
import { cn } from '@/lib/utils'

export function SearchTrigger({ className }: { className?: string }) {
  const { open } = useSearchContext()

  return (
    <button
      type="button"
      onClick={open}
      aria-label="검색 (Cmd+K)"
      title="검색 (Cmd+K)"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground',
        className
      )}
    >
      <Search className="h-5 w-5" aria-hidden />
    </button>
  )
}

export function SearchTriggerWide({ onNavigate }: { onNavigate?: () => void }) {
  const { open } = useSearchContext()

  return (
    <button
      type="button"
      onClick={() => {
        // 시트를 먼저 닫는다 — 열린 시트 위에 검색 오버레이가 겹치면
        // Esc 한 번에 무엇이 닫히는지 사용자가 예측할 수 없다.
        onNavigate?.()
        open()
      }}
      className="inline-flex w-full items-center gap-2 rounded-sm border border-border-subtle bg-background px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      종목·기능 검색
    </button>
  )
}
