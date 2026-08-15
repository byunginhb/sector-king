/**
 * draft 비교 유틸 — 클라이언트 전용 순수 함수.
 *
 * 레지스트리(`lib/permissions/features.ts`)를 import 하지 않는다. 기능 160개
 * 정의가 클라이언트 번들에 들어갈 이유가 없고, 콘솔이 필요로 하는 것은 서버가
 * 이미 병합해 내려준 행뿐이다.
 *
 * 비교가 한 곳에 모여 있어야 하는 이유: "변경됨" 판정(액션 바 카운트·저장
 * 대상)과 "기본값임" 판정(되돌리기 버튼 활성·reset 액션)이 서로 다른 규칙을
 * 쓰면, 저장 버튼은 3건이라 하는데 서버로는 2건만 나가는 식의 어긋남이 난다.
 */
import type { GateParams } from '@/lib/permissions/types'
import type { AdminFeatureRow, DraftPolicy } from './types'

/** 키 순서와 무관하게 비교한다 — `{a,b}` 와 `{b,a}` 는 같은 정책이다. */
function paramsEqual(a: GateParams | undefined, b: GateParams | undefined): boolean {
  const x = (a ?? {}) as Record<string, unknown>
  const y = (b ?? {}) as Record<string, unknown>
  const xk = Object.keys(x).sort()
  const yk = Object.keys(y).sort()
  if (xk.length !== yk.length) return false
  return xk.every((k, i) => k === yk[i] && x[k] === y[k])
}

/** 저장된 상태 → draft 초기값. */
export function toDraft(row: AdminFeatureRow): DraftPolicy {
  return {
    minTier: row.effective.minTier,
    gateMode: row.effective.gateMode,
    params: row.effective.params ?? {},
    enabled: row.effective.enabled,
    note: row.note,
  }
}

/** 코드 기본값 → draft. "기본값으로 되돌리기" 의 목적지. */
export function defaultDraft(row: AdminFeatureRow): DraftPolicy {
  return {
    minTier: row.defaultPolicy.minTier,
    gateMode: row.defaultPolicy.gateMode,
    params: row.defaultPolicy.params ?? {},
    enabled: true,
    // note 는 정책이 아니라 운영 메모라 기본값 복귀 대상이 아니다.
    // 어차피 오버라이드 행이 삭제되면서 함께 사라진다.
    note: row.note,
  }
}

/** draft 가 저장된 상태와 다른가 = 저장 대상인가. */
export function isDirty(row: AdminFeatureRow, draft: DraftPolicy): boolean {
  return (
    draft.minTier !== row.effective.minTier ||
    draft.gateMode !== row.effective.gateMode ||
    draft.enabled !== row.effective.enabled ||
    !paramsEqual(draft.params, row.effective.params)
  )
}

/**
 * draft 가 코드 기본값과 같은가.
 * 같으면 저장 시 오버라이드 행을 **삭제**한다(행 없음 = 기본값).
 */
export function isAtDefault(row: AdminFeatureRow, draft: DraftPolicy): boolean {
  return (
    draft.minTier === row.defaultPolicy.minTier &&
    draft.gateMode === row.defaultPolicy.gateMode &&
    draft.enabled === true &&
    paramsEqual(draft.params, row.defaultPolicy.params)
  )
}
