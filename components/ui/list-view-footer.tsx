'use client'

/**
 * 목록 하단 — 모드에 따라 페이지 번호 또는 "더 보기".
 *
 * 무한 스크롤이라도 **자동 로드만 두지 않는다.** 자동 로드는 키보드 사용자와
 * 저사양 기기에서 신뢰할 수 없고, 무엇보다 계속 로드되면 푸터에 영영 닿지
 * 못한다. 센티넬(자동) + 버튼(수동)을 함께 두고, 끝에 도달하면 로딩을 멈추고
 * 명확히 끝을 알린다.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { UseListView } from '@/hooks/use-list-view'
import { cn } from '@/lib/utils'

/** 현재 페이지 주변 + 양 끝. 목록이 길어도 버튼이 한 줄을 넘지 않게 한다. */
function pageWindow(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | 'gap')[] = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(total - 1, page + 1)
  if (from > 2) out.push('gap')
  for (let p = from; p <= to; p++) out.push(p)
  if (to < total - 1) out.push('gap')
  out.push(total)
  return out
}

export function ListViewFooter<T>({
  view,
  unit = '건',
  className,
}: {
  view: UseListView<T>
  /** 개수 단위 — "명", "건", "종목". */
  unit?: string
  className?: string
}) {
  const { mode, page, totalPages, setPage, hasMore, loadMore, sentinelRef, shownCount, totalCount } =
    view

  if (totalCount === 0) return null

  if (mode === 'infinite') {
    return (
      <div className={cn('flex flex-col items-center gap-2 py-4', className)}>
        {/* 자동 로드 트리거. 버튼보다 위에 둬야 스크롤이 닿는 순간 먼저 발화한다. */}
        {hasMore && <span ref={sentinelRef} aria-hidden className="h-px w-full" />}
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full border border-border-subtle px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            더 보기 ({shownCount.toLocaleString()}/{totalCount.toLocaleString()}
            {unit})
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            전체 {totalCount.toLocaleString()}
            {unit}을 모두 표시했습니다
          </p>
        )}
      </div>
    )
  }

  if (totalPages <= 1) {
    return (
      <p className={cn('py-3 text-center text-xs text-muted-foreground', className)}>
        전체 {totalCount.toLocaleString()}
        {unit}
      </p>
    )
  }

  return (
    <nav
      aria-label="목록 페이지"
      className={cn('flex flex-wrap items-center justify-center gap-1 py-4', className)}
    >
      <PageButton
        onClick={() => setPage(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </PageButton>

      {pageWindow(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap${i}`} className="px-1 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <PageButton
            key={p}
            onClick={() => setPage(p)}
            active={p === page}
            aria-label={`${p}페이지`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </PageButton>
        )
      )}

      <PageButton
        onClick={() => setPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </PageButton>

      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
        전체 {totalCount.toLocaleString()}
        {unit}
      </span>
    </nav>
  )
}

function PageButton({
  children,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors disabled:opacity-30',
        active
          ? 'bg-primary font-semibold text-primary-foreground'
          : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
