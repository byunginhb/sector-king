/**
 * 우측 기능 표 — 이 콘솔에서 **쓰기가 일어나는 유일한 화면.**
 *
 * 설정(왼쪽 컨트롤)과 결과(오른쪽 매트릭스 5열)가 같은 행에 있다. "무료를
 * 숨김으로 바꾸면 비로그인은 어떻게 되지?" 가 눈으로 즉시 확인되는 것이
 * 이 화면의 유일한 핵심 가치이고, 그래서 매트릭스를 별도 탭으로 빼지 않는다.
 *
 * 데스크탑은 표, 모바일(<lg)은 카드다. 표 행을 그대로 좁히면 컨트롤이
 * 가로 스크롤 뒤로 숨어 "보이지 않는 것을 바꾸는" 상태가 된다.
 */
'use client'

import { AlertTriangle, Undo2, RotateCcw, Lock } from 'lucide-react'
import { PARTIAL_DEFAULT_VISIBLE_ROWS } from '@/lib/permissions/gate'
import { TIER_LABEL, TIER_ORDER, type Tier } from '@/lib/permissions/tier'
import {
  GATE_MODE_LABEL,
  GATE_MODES,
  type GateMode,
  type GateParams,
} from '@/lib/permissions/types'
import { cn } from '@/lib/utils'
import { isAtDefault } from './draft'
import { BulkActionBar } from './filters'
import {
  MATRIX_TIERS,
  MatrixBadge,
  MatrixLegend,
  TIER_COLUMN_LABEL,
  deriveCells,
  matrixSummary,
} from './matrix'
import type { AdminFeatureRow, AdminPageMeta, DraftPolicy } from './types'

const SELECT_CLASS =
  'w-full rounded-md border border-border-subtle bg-background px-2 py-1 text-xs text-foreground sm:text-sm disabled:opacity-50'

/** 게이트를 걸 수 없는 기능인가 — SEO·법적 페이지처럼 잠그면 안 되는 것들. */
function isLockProhibited(row: AdminFeatureRow): boolean {
  return (
    row.supportedGateModes !== null &&
    row.supportedGateModes.length === 1 &&
    row.supportedGateModes[0] === 'open'
  )
}

/** 색인된 콘텐츠를 숨기려는가. 경고만 하고 저장은 막지 않는다. */
function seoRisk(row: AdminFeatureRow, draft: DraftPolicy): boolean {
  return row.seoIndexed && draft.gateMode === 'hidden'
}

export type FeatureTableProps = {
  page: AdminPageMeta | null
  rows: AdminFeatureRow[]
  drafts: Record<string, DraftPolicy>
  changed: Set<string>
  invalid: Set<string>
  selected: Set<string>
  onPatch: (featureId: string, patch: Partial<DraftPolicy>) => void
  /** 코드 기본값으로 — 저장 시 오버라이드 행 삭제. */
  onResetDefault: (featureIds: string[]) => void
  /** 미저장 변경 취소 — baseline 으로 되돌린다. */
  onDiscard: (featureIds: string[]) => void
  onToggleSelect: (featureId: string) => void
  onToggleAll: (featureIds: string[], next: boolean) => void
  onClearSelection: () => void
  onBulkMinTier: (tier: Tier) => void
  onBulkGateMode: (mode: GateMode) => void
}

export function FeatureTable(props: FeatureTableProps) {
  const { page, rows, selected } = props
  const visibleIds = rows.map((r) => r.featureId)
  const selectedVisible = visibleIds.filter((id) => selected.has(id))
  const allSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length

  return (
    <section className="sk-card overflow-hidden">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
        <h3 className="text-base font-bold text-foreground">
          {page?.label ?? '페이지를 선택하세요'}
        </h3>
        {page?.route && (
          <span className="font-mono text-xs text-muted-foreground">
            {page.route}
          </span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          기능 {rows.length.toLocaleString()}
        </span>
        {page?.adminOnly && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden />
            관리자 전용 라우트
          </span>
        )}
      </header>

      {selectedVisible.length > 0 ? (
        <BulkActionBar
          count={selectedVisible.length}
          onMinTier={props.onBulkMinTier}
          onGateMode={props.onBulkGateMode}
          onResetDefault={() => props.onResetDefault(selectedVisible)}
          onClear={props.onClearSelection}
        />
      ) : null}

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          조건에 맞는 기능이 없습니다.
        </p>
      ) : (
        <>
          {/* 데스크탑 — 표 */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <caption className="sr-only">
                {page?.label ?? '기능'} 페이지의 기능별 노출 정책. 오른쪽 5개 열은
                설정에서 파생된 읽기 전용 표시입니다.
              </caption>
              <thead className="bg-surface-2 text-muted-foreground">
                <tr className="text-left">
                  <th scope="col" className="w-9 px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      aria-label="이 페이지 전체 선택"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate =
                            selectedVisible.length > 0 && !allSelected
                        }
                      }}
                      onChange={(e) =>
                        props.onToggleAll(visibleIds, e.target.checked)
                      }
                    />
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    기능
                  </th>
                  <th scope="col" className="w-28 px-2 py-2 font-medium">
                    최소 등급
                  </th>
                  <th scope="col" className="w-28 px-2 py-2 font-medium">
                    상세제어
                  </th>
                  <th scope="col" className="w-32 px-2 py-2 font-medium">
                    노출 개수
                  </th>
                  {MATRIX_TIERS.map((t) => (
                    <th
                      key={t}
                      scope="col"
                      className="px-2 py-2 text-center font-medium"
                    >
                      {TIER_COLUMN_LABEL[t]}
                    </th>
                  ))}
                  <th scope="col" className="w-20 px-2 py-2 text-right font-medium">
                    되돌리기
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map((row) => (
                  <FeatureRow key={row.featureId} row={row} {...props} />
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 — 카드 */}
          <div className="divide-y divide-border-subtle lg:hidden">
            {rows.map((row) => (
              <FeatureCard key={row.featureId} row={row} {...props} />
            ))}
          </div>

          <MatrixLegend />
        </>
      )}
    </section>
  )
}

// ── 행(데스크탑) ──────────────────────────────────────────────────────

function FeatureRow({
  row,
  drafts,
  changed,
  invalid,
  selected,
  onPatch,
  onResetDefault,
  onDiscard,
  onToggleSelect,
}: FeatureTableProps & { row: AdminFeatureRow }) {
  const draft = drafts[row.featureId]
  if (!draft) return null

  const isChanged = changed.has(row.featureId)
  const isInvalid = invalid.has(row.featureId)
  const cells = deriveCells(row.featureId, draft)
  const locked = isLockProhibited(row)
  const atDefault = isAtDefault(row, draft)

  return (
    <tr
      className={cn(
        'border-l-2 hover:bg-surface-2',
        isInvalid
          ? 'border-danger'
          : isChanged
            ? 'border-primary'
            : 'border-transparent'
      )}
    >
      <td className="px-3 py-2 align-top">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-primary"
          aria-label={`${row.label} 선택`}
          checked={selected.has(row.featureId)}
          onChange={() => onToggleSelect(row.featureId)}
        />
      </td>

      <td className="px-3 py-2 align-top">
        <FeatureIdentity row={row} draft={draft} atDefault={atDefault} />
      </td>

      <td className="px-2 py-2 align-top">
        <TierSelect
          value={draft.minTier}
          disabled={locked}
          label={`${row.label} 최소 등급`}
          onChange={(minTier) => onPatch(row.featureId, { minTier })}
        />
      </td>

      <td className="px-2 py-2 align-top">
        <GateSelect
          row={row}
          value={draft.gateMode}
          disabled={locked}
          onChange={(gateMode) => onPatch(row.featureId, { gateMode })}
        />
      </td>

      {/* 폭을 조건과 무관하게 고정한다 — 값이 바뀔 때 표가 흔들리지 않게. */}
      <td className="w-32 px-2 py-2 align-top">
        <ParamFields
          row={row}
          draft={draft}
          onChange={(params) => onPatch(row.featureId, { params })}
        />
      </td>

      {MATRIX_TIERS.map((tier) => (
        <td key={tier} className="px-2 py-2 text-center align-top">
          <MatrixBadge mode={cells[tier]} muted={tier === 'admin'} />
        </td>
      ))}

      <td className="px-2 py-2 text-right align-top">
        <RowActions
          featureId={row.featureId}
          isChanged={isChanged}
          atDefault={atDefault}
          onDiscard={onDiscard}
          onResetDefault={onResetDefault}
        />
      </td>
    </tr>
  )
}

// ── 카드(모바일) ──────────────────────────────────────────────────────

function FeatureCard({
  row,
  drafts,
  changed,
  invalid,
  selected,
  onPatch,
  onResetDefault,
  onDiscard,
  onToggleSelect,
}: FeatureTableProps & { row: AdminFeatureRow }) {
  const draft = drafts[row.featureId]
  if (!draft) return null

  const isChanged = changed.has(row.featureId)
  const isInvalid = invalid.has(row.featureId)
  const cells = deriveCells(row.featureId, draft)
  const locked = isLockProhibited(row)
  const atDefault = isAtDefault(row, draft)

  return (
    <div
      className={cn(
        'border-l-2 p-4',
        isInvalid
          ? 'border-danger'
          : isChanged
            ? 'border-primary'
            : 'border-transparent'
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-primary"
          aria-label={`${row.label} 선택`}
          checked={selected.has(row.featureId)}
          onChange={() => onToggleSelect(row.featureId)}
        />
        <div className="min-w-0 flex-1">
          <FeatureIdentity row={row} draft={draft} atDefault={atDefault} />
        </div>
        <RowActions
          featureId={row.featureId}
          isChanged={isChanged}
          atDefault={atDefault}
          onDiscard={onDiscard}
          onResetDefault={onResetDefault}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            최소 등급
          </span>
          <TierSelect
            value={draft.minTier}
            disabled={locked}
            label={`${row.label} 최소 등급`}
            onChange={(minTier) => onPatch(row.featureId, { minTier })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            상세제어
          </span>
          <GateSelect
            row={row}
            value={draft.gateMode}
            disabled={locked}
            onChange={(gateMode) => onPatch(row.featureId, { gateMode })}
          />
        </label>
      </div>

      <div className="mt-2">
        <ParamFields
          row={row}
          draft={draft}
          onChange={(params) => onPatch(row.featureId, { params })}
        />
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {matrixSummary(cells)}
      </p>
    </div>
  )
}

// ── 조각 ──────────────────────────────────────────────────────────────

function FeatureIdentity({
  row,
  draft,
  atDefault,
}: {
  row: AdminFeatureRow
  draft: DraftPolicy
  atDefault: boolean
}) {
  const risky = seoRisk(row, draft)
  return (
    <>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold text-foreground">{row.label}</span>
        {risky && (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[11px] font-bold text-warning"
            title="색인된 콘텐츠입니다 — 숨김 대신 일부 노출을 검토하세요"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            색인
          </span>
        )}
        {!row.overridden && atDefault && (
          <span className="rounded-md border border-border-subtle bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
            기본값
          </span>
        )}
        {row.retired && (
          <span className="rounded-md border border-border-subtle bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
            폐기
          </span>
        )}
        {/* 게이트를 고른 행에만 붙인다 — 열어 둔 행은 배선이 없어도 결과가 같다. */}
        {!row.wired && draft.gateMode !== 'open' && (
          <span
            className="rounded-md border border-border-subtle bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground"
            title="이 기능에는 아직 제어 코드가 배선되지 않았습니다 — 저장은 되지만 사용자 화면은 바뀌지 않습니다"
          >
            미배선
          </span>
        )}
      </span>
      <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
        {row.featureId}
      </span>
      {row.masking === 'server' && (
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          서버 마스킹 필요 — 화면에서만 가리면 우회됩니다
        </span>
      )}
    </>
  )
}

function TierSelect({
  value,
  disabled,
  label,
  onChange,
}: {
  value: Tier
  disabled: boolean
  label: string
  onChange: (tier: Tier) => void
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Tier)}
      className={SELECT_CLASS}
    >
      {TIER_ORDER.map((t) => (
        <option key={t} value={t}>
          {TIER_LABEL[t]}
        </option>
      ))}
    </select>
  )
}

function GateSelect({
  row,
  value,
  disabled,
  onChange,
}: {
  row: AdminFeatureRow
  value: GateMode
  disabled: boolean
  onChange: (mode: GateMode) => void
}) {
  // 지원 목록이 지정된 기능은 셀렉트를 그 목록으로 제한한다. 현재 값이 목록
  // 밖이면(레지스트리가 좁아진 뒤 남은 옛 오버라이드) 값을 지우지 않고
  // 그대로 보여준다 — 화면이 실제 정책과 다른 말을 하면 안 된다.
  const options = row.supportedGateModes ?? GATE_MODES
  const list = options.includes(value) ? options : [value, ...options]

  return (
    <>
      <select
        aria-label={`${row.label} 상세제어`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as GateMode)}
        className={SELECT_CLASS}
      >
        {list.map((g) => (
          <option key={g} value={g}>
            {GATE_MODE_LABEL[g]}
          </option>
        ))}
      </select>
      {disabled && (
        <span className="mt-1 block text-[11px] text-muted-foreground">
          잠금 불가 — 색인·법적 고지 등 항상 공개여야 하는 기능입니다
        </span>
      )}
    </>
  )
}

/**
 * "일부" 를 골랐을 때만 뜨는 단일 입력 — **서버가 몇 개를 실값으로 보낼지**다
 * (CSS 값이 아니다). 비워 두면 기본 3건.
 */
function ParamFields({
  row,
  draft,
  onChange,
}: {
  row: AdminFeatureRow
  draft: DraftPolicy
  onChange: (params: GateParams) => void
}) {
  if (draft.gateMode !== 'partial') {
    return <span className="block text-xs text-muted-foreground">—</span>
  }

  const set = (raw: string) => {
    const next: GateParams = { ...draft.params }
    if (raw === '') delete next.visibleRows
    else next.visibleRows = Math.max(0, Math.floor(Number(raw) || 0))
    onChange(next)
  }

  return (
    <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={String(PARTIAL_DEFAULT_VISIBLE_ROWS)}
        aria-label={`${row.label} 실값 노출 개수`}
        value={draft.params.visibleRows ?? ''}
        onChange={(e) => set(e.target.value)}
        className="w-14 rounded-md border border-border-subtle bg-background px-1.5 py-1 text-xs text-foreground tabular-nums"
      />
      개까지 보임
    </label>
  )
}

/**
 * `RotateCcw` = 미저장 변경 취소, `Undo2` = 코드 기본값 복귀.
 * 두 동작에 같은 아이콘을 쓰면 "되돌렸는데 왜 기본값이 됐지" 가 반드시 나온다.
 */
function RowActions({
  featureId,
  isChanged,
  atDefault,
  onDiscard,
  onResetDefault,
}: {
  featureId: string
  isChanged: boolean
  atDefault: boolean
  onDiscard: (ids: string[]) => void
  onResetDefault: (ids: string[]) => void
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="이 행의 변경 취소"
        title="변경 취소"
        disabled={!isChanged}
        onClick={() => onDiscard([featureId])}
        className="rounded-md p-1 text-muted-foreground hover:bg-surface-3 disabled:opacity-30"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="기본값으로 되돌리기"
        title="코드 기본값으로"
        disabled={atDefault}
        onClick={() => onResetDefault([featureId])}
        className="rounded-md p-1 text-muted-foreground hover:bg-surface-3 disabled:opacity-30"
      >
        <Undo2 className="h-4 w-4" aria-hidden />
      </button>
    </span>
  )
}
