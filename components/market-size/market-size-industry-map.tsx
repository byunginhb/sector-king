'use client'

import { useLayoutEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { squarify, textUnits } from '@/lib/treemap'
import { useCurrencyFormat } from '@/hooks/use-currency-format'

/** 지도의 최소 단위. 산업 뷰에선 섹터, 드릴다운 뷰에선 종목. */
export interface MapTile {
  id: string
  name: string
  /** 면적 기준 (USD) */
  marketCap: number
  /** 색 기준값. null 이면 중립 회색 */
  colorValue: number | null
  /** 툴팁 마지막 줄에 덧붙일 설명 */
  detail?: string
  /** 있으면 링크로, 없으면 버튼(onSelectTile)으로 렌더 */
  href?: string
}

/** 바깥 묶음. 산업 뷰에선 산업, 드릴다운 뷰에선 섹터 하나. */
export interface MapGroup {
  id: string
  name: string
  marketCap: number
  tiles: MapTile[]
}

/**
 * growth = 매출 성장률: 순서만 있는 값이라 시퀀셜(청록 → 보라).
 * change = 등락률: 0 을 기준으로 부호가 의미를 가지므로 발산(적 ← 회 → 녹).
 */
export type ColorScale = 'growth' | 'change'

interface Props {
  groups: MapGroup[]
  colorScale: ColorScale
  /** href 없는 타일 클릭 시 호출 */
  onSelectTile?: (tile: MapTile) => void
  /** 툴팁의 색 기준값 라벨 (예: '매출 성장률') */
  colorLabel: string
}

// 시퀀셜 팔레트 — 저(청록) → 고(보라). 검정·순빨강 배제.
const LOW = { r: 0x14, g: 0xb8, b: 0xa6 } // teal-500
const HIGH = { r: 0x8b, g: 0x5c, b: 0xf6 } // violet-500
// 발산 팔레트 — 하락(rose-500) ← 중립(slate-400) → 상승(emerald-500).
const DOWN = { r: 0xf4, g: 0x3f, b: 0x5e }
const MID = { r: 0x94, g: 0xa3, b: 0xb8 }
const UP = { r: 0x10, g: 0xb9, b: 0x81 }
const NEUTRAL = '#94a3b8' // slate-400 (데이터 없음)

type Rgb = { r: number; g: number; b: number }

function mix(a: Rgb, b: Rgb, t: number): string {
  const c = Math.max(0, Math.min(1, t))
  return `rgb(${Math.round(a.r + (b.r - a.r) * c)}, ${Math.round(
    a.g + (b.g - a.g) * c
  )}, ${Math.round(a.b + (b.b - a.b) * c)})`
}

/** 분포의 p 분위수 (0~1). 극단값 하나가 스케일을 잡아먹지 않게 캡 산정에 쓴다. */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

const HEADER_H = 20 // 그룹 이름 띠 높이(px)
const GROUP_GAP = 3 // 그룹 간 여백(px)
const TILE_GAP = 1 // 타일 간 여백(px)

interface PlacedTile extends MapTile {
  x: number
  y: number
  w: number
  h: number
  color: string
}

interface PlacedGroup {
  id: string
  name: string
  marketCap: number
  x: number
  y: number
  w: number
  h: number
  showHeader: boolean
  tiles: PlacedTile[]
}

function formatPercent(v: number | null): string {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

export function MarketSizeIndustryMap({
  groups,
  colorScale,
  onSelectTile,
  colorLabel,
}: Props) {
  const fmt = useCurrencyFormat()
  // 콜백 ref — 컨테이너가 조건부로 마운트되므로 ref.current 를 effect 에서 읽으면
  // 첫 렌더에 null 인 채로 관측을 놓친다(빈 데이터로 마운트 → 데이터 도착 시 영구 공백).
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // 레이아웃은 실제 픽셀 크기가 있어야 계산 가능 → 컨테이너를 관측.
  useLayoutEffect(() => {
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: width, h: height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [container])

  const placed = useMemo<PlacedGroup[]>(() => {
    if (size.w <= 0 || size.h <= 0) return []

    // 색 스케일은 화면에 보이는 전체 타일 기준으로 한 번만 계산.
    const values = groups
      .flatMap((g) => g.tiles.map((t) => t.colorValue))
      .filter((v): v is number => v != null)

    let colorOf: (v: number) => string
    if (colorScale === 'change') {
      // 0 대칭 캡. 이상치 하나로 나머지가 전부 회색이 되지 않게 p85 로 자른다.
      const absSorted = values.map(Math.abs).sort((a, b) => a - b)
      const cap = Math.max(quantile(absSorted, 0.85), 1)
      colorOf = (v) => {
        const t = Math.min(Math.abs(v) / cap, 1)
        return v >= 0 ? mix(MID, UP, t) : mix(MID, DOWN, t)
      }
    } else {
      const min = values.length > 0 ? Math.min(...values) : 0
      const max = values.length > 0 ? Math.max(...values) : 1
      const span = max - min || 1
      colorOf = (v) => mix(LOW, HIGH, (v - min) / span)
    }

    const groupRects = squarify(
      groups.map((g) => ({ id: g.id, value: g.marketCap })),
      0,
      0,
      size.w,
      size.h
    )
    const byId = new Map(groups.map((g) => [g.id, g]))

    return groupRects.flatMap((rect) => {
      const group = byId.get(rect.id)
      if (!group) return []

      // 그룹 간 여백만큼 안쪽으로 축소.
      const gx = rect.x + GROUP_GAP / 2
      const gy = rect.y + GROUP_GAP / 2
      const gw = Math.max(0, rect.w - GROUP_GAP)
      const gh = Math.max(0, rect.h - GROUP_GAP)

      // 헤더를 넣을 세로 여유가 없으면 생략하고 타일에 전부 할당.
      const showHeader = gh >= HEADER_H + 12
      const innerY = showHeader ? gy + HEADER_H : gy
      const innerH = showHeader ? gh - HEADER_H : gh

      const tileRects = squarify(
        group.tiles.map((t) => ({ id: t.id, value: t.marketCap })),
        gx,
        innerY,
        gw,
        innerH
      )
      const tileById = new Map(group.tiles.map((t) => [t.id, t]))

      const tiles = tileRects.flatMap<PlacedTile>((tr) => {
        const t = tileById.get(tr.id)
        if (!t) return []
        return [
          {
            ...t,
            x: tr.x + TILE_GAP / 2,
            y: tr.y + TILE_GAP / 2,
            w: Math.max(0, tr.w - TILE_GAP),
            h: Math.max(0, tr.h - TILE_GAP),
            color: t.colorValue == null ? NEUTRAL : colorOf(t.colorValue),
          },
        ]
      })

      return [
        {
          id: group.id,
          name: group.name,
          marketCap: group.marketCap,
          x: gx,
          y: gy,
          w: gw,
          h: gh,
          showHeader,
          tiles,
        },
      ]
    })
  }, [groups, size, colorScale])

  if (groups.length === 0) {
    return (
      <div className="h-[28rem] bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">데이터가 없습니다</span>
      </div>
    )
  }

  return (
    // 타일이 많아 좁은 화면에선 뭉개진다 → 최소 폭을 두고 가로 스크롤.
    <div className="-mx-1 overflow-x-auto px-1">
      <div
        ref={setContainer}
        className="relative h-[28rem] w-full min-w-[46rem] overflow-hidden rounded-lg sm:h-[36rem]"
      >
        {placed.map((group) => (
          <div key={group.id}>
            {/* 그룹 테두리 + 이름 띠 */}
            <div
              className="absolute rounded-sm border border-border-subtle bg-surface-2"
              style={{
                left: group.x,
                top: group.y,
                width: group.w,
                height: group.h,
              }}
              aria-hidden
            />
            {group.showHeader && (
              <div
                className="absolute flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap px-1.5"
                style={{
                  left: group.x,
                  top: group.y,
                  width: group.w,
                  height: HEADER_H,
                  lineHeight: `${HEADER_H}px`,
                }}
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                  {group.name}
                </span>
                {group.w > 110 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {fmt.marketCap(group.marketCap)}
                  </span>
                )}
              </div>
            )}

            {group.tiles.map((t) => {
              const units = textUnits(t.name)
              // 이름이 폭에 딱 맞는 폰트 크기 → 세로·상한으로 클램프.
              const fs = Math.min((t.w - 6) / units, (t.h - 4) * 0.55, 22)
              const showLabel = fs >= 8
              const subFs = Math.max(9, Math.round(fs * 0.5))
              const showSub = showLabel && t.h > fs + subFs + 8 && t.w > 54
              const title = [
                `${group.name} · ${t.name}`,
                `시총 ${fmt.marketCap(t.marketCap)}`,
                `${colorLabel} ${formatPercent(t.colorValue)}`,
                t.detail,
              ]
                .filter(Boolean)
                .join('\n')

              const inner = (
                <>
                  {showLabel && (
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap font-bold text-white"
                      style={{ fontSize: fs, marginTop: 2 }}
                    >
                      {t.name}
                    </span>
                  )}
                  {showSub && (
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap tabular-nums text-white/85"
                      style={{ fontSize: subFs }}
                    >
                      {colorScale === 'change'
                        ? formatPercent(t.colorValue)
                        : fmt.marketCap(t.marketCap)}
                    </span>
                  )}
                </>
              )
              const className =
                'absolute overflow-hidden rounded-[2px] px-1 text-left leading-tight transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground'
              const style = {
                left: t.x,
                top: t.y,
                width: t.w,
                height: t.h,
                backgroundColor: t.color,
              }

              // 링크가 있으면 앵커로 — 새 탭/복사 같은 기본 동작을 그대로 살린다.
              return t.href ? (
                <Link
                  key={t.id}
                  href={t.href}
                  title={title}
                  className={className}
                  style={style}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTile?.(t)}
                  title={title}
                  aria-label={`${t.name} 하위 항목 보기`}
                  className={className}
                  style={style}
                >
                  {inner}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
