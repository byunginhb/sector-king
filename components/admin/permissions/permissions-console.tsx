/**
 * `/admin/permissions` 콘솔 — 탭 · draft · 일괄 저장의 총괄.
 *
 * ────────────────────────────────────────────────────────────────────
 *  이 화면이 지키는 규칙
 * ────────────────────────────────────────────────────────────────────
 *
 * 1. **일괄 저장.** 변경분을 모아 한 번에 보낸다. 권한은 행끼리 상호 의존하고
 *    ("표를 Pro 로 올린다" 와 "그 표로 가는 링크도 올린다" 는 한 결정),
 *    행 단위 즉시 저장은 그 사이에 잠긴 곳으로 가는 열린 링크를 실서비스에
 *    노출시킨다.
 *
 * 2. **낙관적 업데이트를 따로 두지 않는다.** draft 가 곧 즉시 반영이라 화면은
 *    이미 최신이고, **실패 시 롤백 = draft 를 건드리지 않는 것**이다. 30분
 *    편집한 내용을 저장 실패 때문에 날리지 않는다.
 *
 * 3. **뷰 상태(탭·선택 페이지·검색·필터)를 URL 에 동기화하지 않는다.**
 *    `/admin/economic-calendar` 의 GET form 패턴을 쓰면 서버 컴포넌트가 다시
 *    렌더되면서 draft 가 통째로 사라진다. 이 화면은 `noindex` 이고 공유 대상이
 *    아니므로 URL 동기화를 포기해도 잃는 게 없다.
 *
 * 4. **primary(amber)는 미저장 변경 마커와 저장 버튼에만.** 매트릭스 셀·상태
 *    배지에는 쓰지 않는다 — amber 가 여러 뜻을 가지면 "지금 뭐가 급한지" 를
 *    잃는다.
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  Undo2,
  ArrowLeft,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ADMIN_FEATURES_KEY,
  AdminFeaturesError,
  useAdminFeatures,
  useDeleteFeatureOverride,
  useSaveAdminFeatures,
} from '@/hooks/use-admin-features'
import type { Tier } from '@/lib/permissions/tier'
import type { GateMode } from '@/lib/permissions/types'
import { cn } from '@/lib/utils'
import { AuditTable } from './audit-table'
import { defaultDraft, isAtDefault, isDirty, toDraft } from './draft'
import { FeatureTable } from './feature-table'
import { FilterBar } from './filters'
import { PageList, type PageStat } from './page-list'
import { PreviewLauncher } from './preview-launcher'
import {
  EMPTY_FILTERS,
  type AdminFeatureRow,
  type AdminFeaturesPayload,
  type ConsoleFilters,
  type DraftPolicy,
  type SaveFeatureItem,
} from './types'

type Tab = 'edit' | 'audit'
type ConfirmKind = 'discardAll' | 'pageDefault' | null

export function PermissionsConsole({ initial }: { initial: AdminFeaturesPayload }) {
  const queryClient = useQueryClient()
  const { data } = useAdminFeatures(initial)
  const save = useSaveAdminFeatures()
  const deleteOrphan = useDeleteFeatureOverride()

  const [tab, setTab] = useState<Tab>('edit')
  const [filters, setFilters] = useState<ConsoleFilters>(EMPTY_FILTERS)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    data.pages[0]?.id ?? null
  )
  /** 모바일(<lg)은 2단 레이아웃이 성립하지 않아 드릴다운으로 접는다. */
  const [mobileView, setMobileView] = useState<'pages' | 'features'>('pages')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  const [saved, setSaved] = useState(false)

  /**
   * draft 는 **사용자가 건드린 행만** 담는다. 나머지는 서버 값에서 파생시킨다.
   * 전체 복사본을 들고 있으면 저장·409 후 baseline 이 바뀔 때 손대지 않은
   * 행까지 옛 값으로 되살아난다.
   */
  const [touched, setTouched] = useState<Record<string, DraftPolicy>>({})

  const byId = useMemo(() => {
    const map = new Map<string, AdminFeatureRow>()
    for (const f of data.features) map.set(f.featureId, f)
    return map
  }, [data.features])

  const drafts = useMemo(() => {
    const out: Record<string, DraftPolicy> = {}
    for (const f of data.features) {
      out[f.featureId] = touched[f.featureId] ?? toDraft(f)
    }
    return out
  }, [data.features, touched])

  const changed = useMemo(() => {
    const set = new Set<string>()
    for (const f of data.features) {
      const d = touched[f.featureId]
      if (d && isDirty(f, d)) set.add(f.featureId)
    }
    return set
  }, [data.features, touched])

  const invalidIds = useMemo(
    () =>
      new Set(
        save.error instanceof AdminFeaturesError ? save.error.invalid : []
      ),
    [save.error]
  )

  /**
   * 제어를 걸어 뒀지만 **배선이 없어 사용자 화면이 그대로인** 기능 수.
   *
   * draft 기준으로 센다 — 지금 편집 중인 선택까지 포함해야 저장하기 전에
   * "이 설정은 아직 화면에 반영되지 않습니다" 를 알릴 수 있다.
   * `open` 은 배선 유무와 결과가 같으므로 세지 않는다.
   */
  const unwiredGatedCount = useMemo(
    () =>
      data.features.filter(
        (f) => !f.wired && (drafts[f.featureId]?.gateMode ?? 'open') !== 'open'
      ).length,
    [data.features, drafts]
  )

  // ── draft 조작 ──────────────────────────────────────────────────────

  const patch = useCallback(
    (featureId: string, next: Partial<DraftPolicy>) => {
      setTouched((prev) => {
        const base = prev[featureId] ?? toDraftById(byId, featureId)
        if (!base) return prev
        return { ...prev, [featureId]: { ...base, ...next } }
      })
    },
    [byId]
  )

  const applyToIds = useCallback(
    (ids: string[], make: (row: AdminFeatureRow, cur: DraftPolicy) => DraftPolicy) => {
      setTouched((prev) => {
        const next = { ...prev }
        for (const id of ids) {
          const row = byId.get(id)
          if (!row) continue
          next[id] = make(row, prev[id] ?? toDraft(row))
        }
        return next
      })
    },
    [byId]
  )

  /** 미저장 변경 취소 — baseline 으로. `RotateCcw`. */
  const discard = useCallback((ids: string[]) => {
    setTouched((prev) => {
      const next = { ...prev }
      for (const id of ids) delete next[id]
      return next
    })
  }, [])

  /** 코드 기본값으로 — 저장 시 오버라이드 행 삭제. `Undo2`. */
  const resetDefault = useCallback(
    (ids: string[]) => applyToIds(ids, (row) => defaultDraft(row)),
    [applyToIds]
  )

  // ── 필터링 ──────────────────────────────────────────────────────────

  const pageById = useMemo(() => {
    const map = new Map(data.pages.map((p) => [p.id, p]))
    return map
  }, [data.pages])

  const matches = useCallback(
    (row: AdminFeatureRow): boolean => {
      const draft = drafts[row.featureId]
      if (!draft) return false

      if (filters.minTier !== 'all' && draft.minTier !== filters.minTier) return false
      if (filters.gateMode !== 'all' && draft.gateMode !== filters.gateMode) {
        return false
      }
      switch (filters.status) {
        case 'changed':
          if (!changed.has(row.featureId)) return false
          break
        case 'nondefault':
          if (isAtDefault(row, draft)) return false
          break
        default:
          break
      }

      const q = filters.q.trim().toLowerCase()
      if (!q) return true
      const page = pageById.get(row.pageId)
      return [
        row.label,
        row.featureId,
        row.pageId,
        row.description ?? '',
        page?.label ?? '',
        page?.route ?? '',
      ].some((s) => s.toLowerCase().includes(q))
    },
    [drafts, filters, changed, pageById]
  )

  const filtered = useMemo(
    () => data.features.filter(matches),
    [data.features, matches]
  )

  const pageStats = useMemo(() => {
    const stats: Record<string, PageStat> = {}
    for (const p of data.pages) {
      stats[p.id] = { changed: 0, matched: 0 }
    }
    for (const f of data.features) {
      const s = (stats[f.pageId] ??= { changed: 0, matched: 0 })
      if (changed.has(f.featureId)) s.changed += 1
    }
    for (const f of filtered) {
      const s = stats[f.pageId]
      if (s) s.matched += 1
    }
    return stats
  }, [data.pages, data.features, filtered, changed])

  const filtering =
    filters.q !== '' ||
    filters.minTier !== 'all' ||
    filters.gateMode !== 'all' ||
    filters.status !== 'all'

  const pageRows = useMemo(
    () => filtered.filter((f) => f.pageId === selectedPageId),
    [filtered, selectedPageId]
  )

  /**
   * 필터·페이지가 바뀌면 선택을 해제한다.
   * 보이지 않는 행을 바꾸는 것이 대량 편집 사고의 전형이다.
   */
  useEffect(() => {
    setSelection(new Set())
  }, [filters, selectedPageId])

  // ── 이탈 경고 ───────────────────────────────────────────────────────

  useEffect(() => {
    if (changed.size === 0) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [changed.size])

  // ── 저장 ────────────────────────────────────────────────────────────

  const submit = () => {
    if (changed.size === 0) return
    setSaved(false)

    const items: SaveFeatureItem[] = []
    const resetIds: string[] = []
    for (const id of changed) {
      const row = byId.get(id)
      const draft = drafts[id]
      if (!row || !draft) continue
      if (isAtDefault(row, draft)) {
        // 기본값과 같아졌다 = 오버라이드가 존재할 이유가 없다 → 행 삭제.
        resetIds.push(id)
      } else {
        items.push({
          featureId: id,
          minTier: draft.minTier,
          gateMode: draft.gateMode,
          params: draft.params,
          note: draft.note,
        })
      }
    }

    save.mutate(
      { baseVersion: data.baseVersion, items, resetIds },
      {
        onSuccess: () => {
          // 성공 응답이 새 baseline 이다 → draft 를 비워 기준선을 다시 잡는다.
          setTouched({})
          setSelection(new Set())
          setSaved(true)
        },
      }
    )
  }

  const conflict =
    save.error instanceof AdminFeaturesError && save.error.isConflict
      ? save.error
      : null

  /** 409 — 최신 상태를 baseline 으로 갈아끼우되 편집분은 유지한다. */
  const adoptServerState = (keepDraft: boolean) => {
    if (!conflict?.payload) return
    queryClient.setQueryData(ADMIN_FEATURES_KEY, conflict.payload)
    if (!keepDraft) setTouched({})
    save.reset()
  }

  // ── 렌더 ────────────────────────────────────────────────────────────

  const selectedPage = selectedPageId ? (pageById.get(selectedPageId) ?? null) : null

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
            권한 관리
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            구독 등급별로 페이지·기능의 노출 범위를 설정합니다. 저장한 정책은
            즉시 반영되며, 캐시 무효화가 실패해도 최대 5분 내 전 인스턴스에
            적용됩니다.
          </p>
        </div>
        <PreviewLauncher page={selectedPage} />
      </header>

      {/*
        정책 저장과 화면 반영은 별개다. 게이트를 읽어 화면을 바꾸는 코드
        (`FeatureGate` + 서버 마스킹)는 기능마다 따로 넣어야 하므로, 배선 전에
        스위치만 돌리면 "잠근 줄 알았는데 열려 있는" 상태가 된다. 콘솔이
        이 사실을 먼저 말하지 않으면 그 사고는 반드시 난다.
      */}
      {unwiredGatedCount > 0 && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
일부·숨김으로 지정한 {unwiredGatedCount.toLocaleString()}건이 아직
            <b className="font-bold"> 미배선</b>입니다 — 정책은 저장되지만 해당
            화면·API 에 제어 코드가 들어가기 전까지 사용자에게 보이는 내용은
            바뀌지 않습니다. 표에서 <b className="font-bold">미배선</b> 배지로
            표시된 행입니다.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-border-subtle bg-background p-0.5">
          <TabButton active={tab === 'edit'} onClick={() => setTab('edit')}>
            편집
          </TabButton>
          <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>
            전체 감사
          </TabButton>
        </div>

        {data.orphans.length > 0 && (
          <button
            type="button"
            onClick={() => setTab('audit')}
            className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-3"
          >
            코드에 없는 정책 {data.orphans.length}건
          </button>
        )}
      </div>

      {conflict && (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
        >
          <p>{conflict.message}</p>
          <p className="mt-1 text-xs text-danger/80">
            지금 편집분은 그대로 남아 있습니다. 최신 상태를 불러온 뒤 다시
            저장하면 됩니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => adoptServerState(true)}
              className="rounded-md border border-danger/40 bg-background px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10"
            >
              최신 상태 불러오기 (편집분 유지)
            </button>
            <button
              type="button"
              onClick={() => adoptServerState(false)}
              className="rounded-md border border-border-subtle bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-2"
            >
              편집분 버리고 새로 시작
            </button>
          </div>
        </div>
      )}

      {save.error && !conflict && (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
        >
          {save.error.message}
        </div>
      )}

      {deleteOrphan.error && (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
        >
          {deleteOrphan.error.message}
        </div>
      )}

      {saved && changed.size === 0 && (
        <div
          role="status"
          className="rounded-md border border-success/40 bg-success/5 p-3 text-sm text-success"
        >
          저장했습니다.
        </div>
      )}

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
        resultCount={filtered.length}
      />

      {tab === 'edit' ? (
        <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-4">
          {/* 좌: 페이지. 모바일에서는 드릴다운 1단계. */}
          <div className={cn(mobileView === 'features' && 'hidden lg:block')}>
            <PageList
              pages={data.pages}
              stats={pageStats}
              selectedId={selectedPageId}
              filtering={filtering}
              onSelect={(id) => {
                setSelectedPageId(id)
                setMobileView('features')
              }}
            />
          </div>

          {/* 우: 기능 표. 모바일에서는 드릴다운 2단계. */}
          <div
            className={cn(
              'space-y-3',
              mobileView === 'pages' && 'hidden lg:block'
            )}
          >
            <div className="flex items-center justify-between gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileView('pages')}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                페이지 목록
              </button>
            </div>

            {pageRows.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setConfirm('pageDefault')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-2"
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden />이 페이지 전체
                  기본값
                </button>
              </div>
            )}

            <FeatureTable
              page={selectedPage}
              rows={pageRows}
              drafts={drafts}
              changed={changed}
              invalid={invalidIds}
              selected={selection}
              onPatch={patch}
              onResetDefault={resetDefault}
              onDiscard={discard}
              onToggleSelect={(id) =>
                setSelection((prev) => {
                  const next = new Set(prev)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }
              onToggleAll={(ids, on) =>
                setSelection((prev) => {
                  const next = new Set(prev)
                  for (const id of ids) {
                    if (on) next.add(id)
                    else next.delete(id)
                  }
                  return next
                })
              }
              onClearSelection={() => setSelection(new Set())}
              onBulkMinTier={(minTier: Tier) =>
                applyToIds([...selection], (_row, cur) => ({ ...cur, minTier }))
              }
              onBulkGateMode={(gateMode: GateMode) =>
                applyToIds([...selection], (_row, cur) => ({ ...cur, gateMode }))
              }
            />
          </div>
        </div>
      ) : (
        <AuditTable
          rows={filtered}
          pages={data.pages}
          changed={changed}
          orphans={data.orphans}
          deletingOrphan={deleteOrphan.isPending ? deleteOrphan.variables : null}
          onDeleteOrphan={(featureId) => deleteOrphan.mutate(featureId)}
          onJump={(pageId) => {
            setSelectedPageId(pageId)
            setMobileView('features')
            setTab('edit')
          }}
        />
      )}

      {/* 액션 바 — contributor-editor 의 sticky 레시피 그대로. */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-border-subtle bg-background/90 px-4 py-3 backdrop-blur">
        <span
          aria-live="polite"
          className={cn(
            'text-sm tabular-nums',
            changed.size > 0
              ? 'font-semibold text-primary'
              : 'text-muted-foreground'
          )}
        >
          {changed.size > 0
            ? `저장되지 않은 변경 ${changed.size}건`
            : '변경 사항 없음'}
        </span>

        <div className="flex-1" />

        <button
          type="button"
          disabled={changed.size === 0 || save.isPending}
          onClick={() => setConfirm('discardAll')}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-2 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          전체 되돌리기
        </button>
        <button
          type="button"
          disabled={changed.size === 0 || save.isPending}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          변경 저장{changed.size > 0 ? ` (${changed.size})` : ''}
        </button>
      </div>

      <ConfirmDialog
        kind={confirm}
        pageLabel={selectedPage?.label ?? ''}
        targetCount={
          confirm === 'pageDefault' ? pageRows.length : changed.size
        }
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'discardAll') discard([...changed])
          if (confirm === 'pageDefault') {
            resetDefault(pageRows.map((r) => r.featureId))
          }
          setConfirm(null)
        }}
      />
    </div>
  )
}

// ── 조각 ──────────────────────────────────────────────────────────────

function toDraftById(
  byId: Map<string, AdminFeatureRow>,
  featureId: string
): DraftPolicy | null {
  const row = byId.get(featureId)
  return row ? toDraft(row) : null
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-surface-2 text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

/** 되돌리기 확인 — 포커스 트랩·Esc·초기 포커스는 Dialog 가 이미 처리한다. */
function ConfirmDialog({
  kind,
  pageLabel,
  targetCount,
  onClose,
  onConfirm,
}: {
  kind: ConfirmKind
  pageLabel: string
  targetCount: number
  onClose: () => void
  onConfirm: () => void
}) {
  const isDefaultReset = kind === 'pageDefault'
  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isDefaultReset ? '코드 기본값으로 되돌리기' : '전체 변경 취소'}
          </DialogTitle>
          <DialogDescription>
            {isDefaultReset
              ? `${pageLabel} 페이지에서 지금 보이는 ${targetCount}개 기능이 코드 기본값으로 돌아갑니다. 저장하면 해당 오버라이드 행이 삭제됩니다.`
              : `저장되지 않은 변경 ${targetCount}건이 사라집니다. 저장된 정책은 그대로입니다.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-subtle bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-2"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            {isDefaultReset ? (
              <Undo2 className="h-4 w-4" aria-hidden />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden />
            )}
            되돌리기
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
