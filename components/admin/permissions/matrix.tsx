/**
 * 등급 매트릭스 5칸 — **읽기 전용 파생 표시.**
 *
 * 셀은 독립 변수가 아니다. 등급이 단조 사다리(anon < free < basic < pro < admin)
 * 이므로 `(minTier, gateMode, enabled)` 가 정해지면 5칸이 전부 결정된다. 셀을
 * 직접 편집 가능하게 만들면 "Pro 는 숨김, 무료는 보임" 같은 **표현 불가능한
 * 상태**를 입력할 수 있고, UI 가 그걸 조용히 되돌리는 순간 신뢰를 잃는다.
 *
 * 파생은 `decideGate()` 하나만 쓴다. 여기서 규칙을 다시 적으면 어드민이
 * 보여주는 미래와 실제 게이트가 갈라진다 — 그 어긋남은 사용자 화면에서만
 * 드러나므로 발견이 가장 늦다.
 *
 * 표기는 **아이콘 없이 글자만**이다. 160행 × 5열 = 800셀에 아이콘을 넣으면
 * 시각 소음이고, 아이콘은 표 하단 범례 한 줄에만 등장한다. 셀에 primary(amber)를
 * 쓰지 않는 이유도 같다 — 이 화면에서 amber 는 미저장 변경과 저장 버튼 전용이다.
 */
'use client'

import { Eye, Droplets, AlignLeft, EyeOff } from 'lucide-react'
import { decideGate } from '@/lib/permissions/gate'
import { TIER_LABEL, TIER_ORDER, type Tier } from '@/lib/permissions/tier'
import { GATE_MODE_LABEL, type GateMode } from '@/lib/permissions/types'
import { cn } from '@/lib/utils'
import type { DraftPolicy } from './types'

/** 매트릭스 열 머리 — 표 폭을 위해 사다리 라벨보다 짧게 쓴다. */
export const TIER_COLUMN_LABEL: Record<Tier, string> = {
  anon: '비로그인',
  free: '무료',
  basic: '일반',
  pro: 'Pro',
  admin: '관리자',
}

const CELL_CLASS: Record<GateMode, string> = {
  // 기본 상태는 조용해야 한다 — 열려 있는 것이 정상이다.
  open: 'border-border-subtle bg-surface-2 text-muted-foreground',
  blur: 'border-warning/30 bg-warning/10 text-warning',
  partial: 'border-warning/30 bg-warning/10 text-warning',
  teaser: 'border-info/30 bg-info/10 text-info',
  hidden: 'border-danger/40 bg-danger/10 text-danger',
}

/** 한 기능의 5등급 파생 결과. */
export function deriveCells(
  featureId: string,
  draft: DraftPolicy
): Record<Tier, GateMode> {
  const policy = {
    featureId,
    minTier: draft.minTier,
    gateMode: draft.gateMode,
    params: draft.params,
    enabled: draft.enabled,
    // 파생에 관여하지 않는 필드지만 계약상 필수라 채운다.
    overridden: false,
  }
  const out = {} as Record<Tier, GateMode>
  for (const tier of TIER_ORDER) {
    out[tier] = decideGate(policy, tier).gateMode
  }
  return out
}

/** 셀 배지. 색만으로 전달하지 않기 위해 항상 텍스트 라벨을 포함한다. */
export function MatrixBadge({
  mode,
  muted,
}: {
  mode: GateMode
  /** `admin` 열 전용 — 정보량이 0이라 한 단계 죽인다. */
  muted?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold',
        CELL_CLASS[mode],
        muted && 'text-muted-foreground/60'
      )}
    >
      {GATE_MODE_LABEL[mode]}
    </span>
  )
}

/**
 * 한 줄 요약 — 모바일 카드에서 5열 표 대신 쓴다.
 * "비로그인 숨김 · 무료 흐림 · 일반 보임 …"
 */
export function matrixSummary(cells: Record<Tier, GateMode>): string {
  return TIER_ORDER.map(
    (t) => `${TIER_COLUMN_LABEL[t]} ${GATE_MODE_LABEL[cells[t]]}`
  ).join(' · ')
}

/** 표 하단 범례 — 아이콘이 등장하는 유일한 자리. */
export function MatrixLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-subtle px-4 py-2 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3 w-3" aria-hidden />
        보임 — 게이트 없음
      </span>
      <span className="inline-flex items-center gap-1">
        <Droplets className="h-3 w-3" aria-hidden />
        흐림·일부 — 형상만 남기고 값을 가림
      </span>
      <span className="inline-flex items-center gap-1">
        <AlignLeft className="h-3 w-3" aria-hidden />
        요약 — 건수·범위 같은 메타만
      </span>
      <span className="inline-flex items-center gap-1">
        <EyeOff className="h-3 w-3" aria-hidden />
        숨김 — 렌더하지 않음
      </span>
      <span>
        관리자 열은 항상 보임입니다(킬 스위치가 걸린 기능은 예외).
      </span>
    </p>
  )
}

/** 사다리 순서 그대로. 표 열 머리와 파생 루프가 같은 배열을 쓴다. */
export const MATRIX_TIERS = TIER_ORDER

export { TIER_LABEL }
