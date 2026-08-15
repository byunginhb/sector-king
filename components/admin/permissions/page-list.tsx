/**
 * 좌측 페이지 리스트 = 진행 상황 대시보드.
 *
 * 권한 설정의 실수는 언제나 *페이지 단위*로 드러난다 — 한 카드는 잠기고 그
 * 아래 링크는 열려 있는 식이다. 그래서 편집의 1차 축이 페이지이고, 이 리스트가
 * 미저장 변경(primary 점)을 한눈에 지고 있어야 한다.
 *
 * **"미설정"을 경고로 표시하지 않는다.** DB 오버라이드 행이 없는 것은 결손이
 * 아니라 정상이다(코드 기본값이 곧 정책 — `build-payload.ts` §병합 규칙).
 * 게다가 콘솔은 값이 기본값과 같아지면 행을 삭제하므로, 그 경고를 0으로
 * 만드는 유일한 길은 전 기능을 기본값과 다르게 바꾸는 것 = 사이트 전체를
 * 잠그는 것이었다. 도달해서도 안 되는 목표를 경고로 띄우면 운영자는 경고를
 * 읽지 않는 법부터 배운다.
 *
 * 검색어에 안 걸린 페이지는 **흐리게 두되 사라지지 않는다.** 사라지면
 * "이 페이지가 없어졌나" 라는 착시가 생기고, 그 착시는 권한 화면에서
 * "이 페이지엔 잠글 게 없구나" 라는 잘못된 안심으로 이어진다.
 */
'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminPageMeta } from './types'

export type PageStat = {
  /** 이 페이지의 미저장 변경 수. */
  changed: number
  /** 현재 필터·검색을 통과한 기능 수. */
  matched: number
}

export function PageList({
  pages,
  stats,
  selectedId,
  onSelect,
  filtering,
}: {
  pages: AdminPageMeta[]
  stats: Record<string, PageStat>
  selectedId: string | null
  onSelect: (pageId: string) => void
  /** 검색·필터가 걸려 있는가. 걸려 있을 때만 매칭 0 페이지를 흐리게 한다. */
  filtering: boolean
}) {
  return (
    <nav aria-label="페이지 목록" className="sk-card overflow-hidden">
      <ul className="divide-y divide-border-subtle">
        {pages.map((page) => {
          const stat = stats[page.id] ?? { changed: 0, matched: 0 }
          const selected = page.id === selectedId
          const dimmed = filtering && stat.matched === 0

          return (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onSelect(page.id)}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-2 border-l-2 px-4 py-3 text-left transition-colors',
                  selected
                    ? 'border-primary bg-surface-2'
                    : 'border-transparent hover:bg-surface-2',
                  dimmed && 'opacity-50'
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {page.label}
                    {page.synthetic && (
                      <span className="ml-1 text-[11px] font-normal text-warning">
                        미등록 페이지
                      </span>
                    )}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    {page.route || page.id}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className="text-xs text-muted-foreground tabular-nums"
                    title={`기능 ${page.featureCount}개`}
                  >
                    {page.featureCount}
                  </span>
                  {stat.changed > 0 && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary tabular-nums"
                      title={`저장되지 않은 변경 ${stat.changed}건`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        aria-hidden
                      />
                      {stat.changed}
                    </span>
                  )}
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground lg:hidden"
                    aria-hidden
                  />
                </span>
              </button>
            </li>
          )
        })}

        {pages.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            등록된 페이지가 없습니다. 레지스트리(`lib/permissions/features.ts`)를
            확인하세요.
          </li>
        )}
      </ul>
    </nav>
  )
}
