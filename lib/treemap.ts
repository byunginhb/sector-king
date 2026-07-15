/**
 * Squarified treemap 레이아웃 (Bruls, Huizing, van Wijk 2000).
 *
 * 순수 함수 — DOM·차트 라이브러리 무관. 값에 비례하는 면적의 사각형을
 * 종횡비가 1에 가깝도록 배치한다. 좌표 단위는 호출자가 정한다(px 권장).
 */

export interface TreemapInput {
  id: string
  /** 면적 가중치. 0 이하는 제외된다. */
  value: number
}

export interface TreemapRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

interface Node {
  id: string
  area: number
}

/** 행(row)의 최악 종횡비. 낮을수록 정사각형에 가깝다. */
function worstRatio(row: Node[], length: number): number {
  if (row.length === 0 || length <= 0) return Infinity
  let sum = 0
  let max = -Infinity
  let min = Infinity
  for (const n of row) {
    sum += n.area
    if (n.area > max) max = n.area
    if (n.area < min) min = n.area
  }
  if (sum <= 0 || min <= 0) return Infinity
  const s2 = sum * sum
  const l2 = length * length
  return Math.max((l2 * max) / s2, s2 / (l2 * min))
}

/**
 * items 를 (x, y, w, h) 사각형 안에 면적 비례로 배치한다.
 * 반환 순서는 값 내림차순. value ≤ 0 이거나 사각형이 비면 빈 배열.
 */
export function squarify(
  items: readonly TreemapInput[],
  x: number,
  y: number,
  w: number,
  h: number
): TreemapRect[] {
  const positive = items.filter((i) => i.value > 0)
  const total = positive.reduce((s, i) => s + i.value, 0)
  if (positive.length === 0 || total <= 0 || w <= 0 || h <= 0) return []

  // value → 면적 스케일 (Σarea = w*h)
  const scale = (w * h) / total
  const nodes: Node[] = [...positive]
    .sort((a, b) => b.value - a.value)
    .map((i) => ({ id: i.id, area: i.value * scale }))

  const out: TreemapRect[] = []
  let rect = { x, y, w, h }

  /** 확정된 행을 남은 사각형의 짧은 변에 붙이고, 남은 사각형을 줄인다. */
  function layoutRow(row: Node[]): void {
    const sum = row.reduce((s, n) => s + n.area, 0)
    if (sum <= 0 || rect.w <= 0 || rect.h <= 0) return

    if (rect.h < rect.w) {
      // 짧은 변 = 높이 → 왼쪽에 세로 열
      const colW = sum / rect.h
      let cy = rect.y
      for (const n of row) {
        const nh = (n.area / sum) * rect.h
        out.push({ id: n.id, x: rect.x, y: cy, w: colW, h: nh })
        cy += nh
      }
      rect = { x: rect.x + colW, y: rect.y, w: rect.w - colW, h: rect.h }
    } else {
      // 짧은 변 = 너비 → 위쪽에 가로 띠
      const rowH = sum / rect.w
      let cx = rect.x
      for (const n of row) {
        const nw = (n.area / sum) * rect.w
        out.push({ id: n.id, x: cx, y: rect.y, w: nw, h: rowH })
        cx += nw
      }
      rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH }
    }
  }

  let row: Node[] = []
  for (const n of nodes) {
    const side = Math.min(rect.w, rect.h)
    const next = [...row, n]
    // 종횡비가 나빠지지 않으면 현재 행에 계속 채운다.
    if (row.length === 0 || worstRatio(next, side) <= worstRatio(row, side)) {
      row = next
    } else {
      layoutRow(row)
      row = [n]
    }
  }
  if (row.length > 0) layoutRow(row)

  return out
}

/** 글자 폭 단위(em). 한글·CJK·가나는 ≈1.0, 그 외(라틴·숫자·기호)는 ≈0.56. */
function charUnit(cp: number): number {
  const wide =
    (cp >= 0xac00 && cp <= 0xd7a3) || // 한글 음절
    (cp >= 0x3040 && cp <= 0x30ff) || // 가나
    (cp >= 0x3000 && cp <= 0x303f) || // CJK 기호
    (cp >= 0x4e00 && cp <= 0x9fff) // CJK 한자
  return wide ? 1.0 : 0.56
}

/** 문자열의 총 폭 단위 합 (1em 기준). 폰트 크기 산정용. */
export function textUnits(text: string): number {
  let u = 0
  for (const ch of text) u += charUnit(ch.codePointAt(0) ?? 0)
  return Math.max(u, 0.56)
}
