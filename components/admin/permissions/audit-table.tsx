/**
 * 전체 감사 탭 — 전 페이지 기능을 한 표로. **읽기 전용.**
 *
 * 편집을 여기에 열지 않는 이유: 문맥 없이 160행을 훑다가 바꾸는 것이 정확히
 * 사고 나는 방식이다. 행을 클릭하면 편집 탭의 해당 페이지로 점프한다.
 *
 * 이 표가 보여주는 값은 **저장된 상태**다(draft 아님). 감사의 목적이 "지금
 * 실서비스가 어떻게 동작하는가" 이므로 아직 저장하지 않은 편집을 섞으면
 * 표가 거짓말을 한다. 미저장 변경이 있는 행에는 primary 점만 찍는다.
 *
 * 고아 행(코드에 없는데 DB 에만 있는 정책)은 **자동 삭제하지 않고** 여기서
 * 드러낸 뒤 사람이 지운다 — 리네임 중이거나 롤백 예정이면 프로모션 개방·킬
 * 스위치 같은 운영 결정이 소리 없이 사라진다.
 */
'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpDown, Trash2 } from 'lucide-react'
import { TIER_LABEL, type Tier } from '@/lib/permissions/tier'
import { GATE_MODE_LABEL, type GateMode } from '@/lib/permissions/types'
import { cn } from '@/lib/utils'
import { MatrixBadge } from './matrix'
import type { AdminFeatureRow, AdminPageMeta, OrphanRow } from './types'

type SortKey = 'featureId' | 'page' | 'minTier' | 'gateMode' | 'updatedAt'

const TIER_SORT: Record<Tier, number> = {
  anon: 0,
  free: 1,
  basic: 2,
  pro: 3,
  admin: 4,
}

export function AuditTable({
  rows,
  pages,
  changed,
  orphans,
  onJump,
  onDeleteOrphan,
  deletingOrphan,
}: {
  rows: AdminFeatureRow[]
  pages: AdminPageMeta[]
  changed: Set<string>
  orphans: OrphanRow[]
  /** 편집 탭의 해당 페이지로 이동. */
  onJump: (pageId: string, featureId: string) => void
  onDeleteOrphan: (featureId: string) => void
  deletingOrphan: string | null
}) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: 'featureId',
    desc: false,
  })

  const pageLabel = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of pages) map[p.id] = p.label
    return map
  }, [pages])

  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1
    const value = (r: AdminFeatureRow): string | number => {
      switch (sort.key) {
        case 'page':
          return pageLabel[r.pageId] ?? r.pageId
        case 'minTier':
          return TIER_SORT[r.effective.minTier] ?? -1
        case 'gateMode':
          return r.effective.gateMode
        case 'updatedAt':
          return r.updatedAt ?? ''
        default:
          return r.featureId
      }
    }
    return [...rows].sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      if (av === bv) return a.featureId < b.featureId ? -1 : 1
      return av < bv ? -dir : dir
    })
  }, [rows, sort, pageLabel])

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, desc: s.key === key ? !s.desc : false }))

  return (
    <div className="space-y-6">
      <section className="sk-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              전 페이지 기능 정책 전체 목록(읽기 전용). 행을 클릭하면 편집
              탭으로 이동합니다.
            </caption>
            <thead className="bg-surface-2 text-muted-foreground">
              <tr className="text-left">
                <SortableTh
                  label="기능"
                  active={sort.key === 'featureId'}
                  onClick={() => toggleSort('featureId')}
                />
                <SortableTh
                  label="페이지"
                  active={sort.key === 'page'}
                  onClick={() => toggleSort('page')}
                />
                <SortableTh
                  label="최소 등급"
                  active={sort.key === 'minTier'}
                  onClick={() => toggleSort('minTier')}
                />
                <SortableTh
                  label="게이트"
                  active={sort.key === 'gateMode'}
                  onClick={() => toggleSort('gateMode')}
                />
                <th scope="col" className="px-3 py-2 font-medium">
                  출처
                </th>
                <SortableTh
                  label="최종 변경"
                  active={sort.key === 'updatedAt'}
                  onClick={() => toggleSort('updatedAt')}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    조건에 맞는 기능이 없습니다.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => (
                  <tr
                    key={row.featureId}
                    tabIndex={0}
                    role="button"
                    onClick={() => onJump(row.pageId, row.featureId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onJump(row.pageId, row.featureId)
                      }
                    }}
                    className={cn(
                      'cursor-pointer border-l-2 hover:bg-surface-2',
                      changed.has(row.featureId)
                        ? 'border-primary'
                        : 'border-transparent'
                    )}
                  >
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">
                          {row.label}
                        </span>
                        {changed.has(row.featureId) && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                            title="저장되지 않은 변경 있음"
                            aria-label="저장되지 않은 변경 있음"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                        {row.featureId}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {pageLabel[row.pageId] ?? row.pageId}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {TIER_LABEL[row.effective.minTier]}
                    </td>
                    <td className="px-3 py-2">
                      <MatrixBadge mode={row.effective.gateMode} />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.overridden ? '오버라이드' : '코드 기본값'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                      {row.updatedAt ? row.updatedAt.slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {orphans.length > 0 && (
        <section className="sk-card overflow-hidden">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
            <h3 className="inline-flex items-center gap-1.5 text-base font-bold text-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
              코드에 없는 정책 {orphans.length}건
            </h3>
            <p className="text-xs text-muted-foreground">
              레지스트리에서 사라진 기능의 잔존 행입니다. 어떤 판정에도
              참여하지 않으므로 그대로 둬도 무해합니다. 리네임 중이거나 배포를
              롤백할 예정이라면 지우지 마세요 — 프로모션 개방·킬 스위치 같은
              운영 결정이 함께 사라집니다.
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                레지스트리에 없는 정책 행 목록과 수동 삭제
              </caption>
              <thead className="bg-surface-2 text-muted-foreground">
                <tr className="text-left">
                  <th scope="col" className="px-3 py-2 font-medium">
                    feature_id
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    최소 등급
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    게이트
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    최종 변경
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    정리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {orphans.map((o) => (
                  <tr key={o.featureId} className="hover:bg-surface-2">
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {o.featureId}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {TIER_LABEL[o.minTier] ?? o.minTier}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {GATE_MODE_LABEL[o.gateMode as GateMode] ?? o.gateMode}
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums">
                      <span
                        className={
                          o.stale ? 'text-warning' : 'text-muted-foreground'
                        }
                      >
                        {o.updatedAt.slice(0, 10)}
                        {o.stale && ' · 90일 경과, 정리 권장'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={deletingOrphan === o.featureId}
                        onClick={() => onDeleteOrphan(o.featureId)}
                        className="inline-flex items-center gap-1 rounded-md border border-danger/40 bg-danger/5 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function SortableTh({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <th scope="col" className="px-3 py-2 font-medium">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          active && 'text-foreground'
        )}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" aria-hidden />
      </button>
    </th>
  )
}
