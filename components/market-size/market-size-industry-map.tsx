'use client'

import { useLayoutEffect, useMemo, useState } from 'react'
import { squarify, textUnits } from '@/lib/treemap'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import type { MarketSizeNode } from '@/types'

/** 산업 = 바깥 그룹, 그 안에 소속 섹터 타일. */
export interface IndustryGroup {
  id: string
  name: string
  /** 소속 섹터 시총 합 (USD) */
  marketCap: number
  sectors: MarketSizeNode[]
}

interface Props {
  groups: IndustryGroup[]
  onSelectSector: (sector: { id: string; name: string }) => void
}

// 성장률 시퀀셜 팔레트 — 저(청록) → 고(보라). 검정·순빨강 배제.
const LOW = { r: 0x14, g: 0xb8, b: 0xa6 } // teal-500
const HIGH = { r: 0x8b, g: 0x5c, b: 0xf6 } // violet-500
const NEUTRAL = '#94a3b8' // slate-400 (성장률 데이터 없음)

function lerpColor(t: number): string {
  const c = Math.max(0, Math.min(1, t))
  const r = Math.round(LOW.r + (HIGH.r - LOW.r) * c)
  const g = Math.round(LOW.g + (HIGH.g - LOW.g) * c)
  const b = Math.round(LOW.b + (HIGH.b - LOW.b) * c)
  return `rgb(${r}, ${g}, ${b})`
}

const HEADER_H = 20 // 산업 이름 띠 높이(px)
const GROUP_GAP = 3 // 산업 그룹 간 여백(px)
const TILE_GAP = 1 // 섹터 타일 간 여백(px)

interface PlacedSector {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  color: string
  marketCap: number
  revenueGrowth: number | null
  tickerCount: number
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
  sectors: PlacedSector[]
}

function formatGrowth(g: number | null): string {
  if (g == null) return '—'
  return `${g >= 0 ? '+' : ''}${(g * 100).toFixed(1)}%`
}

export function MarketSizeIndustryMap({ groups, onSelectSector }: Props) {
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

    // 색 스케일은 화면에 보이는 전체 섹터 기준으로 한 번만 계산.
    const growths = groups
      .flatMap((g) => g.sectors.map((s) => s.revenueGrowth))
      .filter((g): g is number => g != null)
    const min = growths.length > 0 ? Math.min(...growths) : 0
    const max = growths.length > 0 ? Math.max(...growths) : 1
    const span = max - min || 1

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

      const sectorRects = squarify(
        group.sectors.map((s) => ({ id: s.id, value: s.marketCap })),
        gx,
        innerY,
        gw,
        innerH
      )
      const sectorById = new Map(group.sectors.map((s) => [s.id, s]))

      const sectors = sectorRects.flatMap<PlacedSector>((sr) => {
        const s = sectorById.get(sr.id)
        if (!s) return []
        return [
          {
            id: s.id,
            name: s.name,
            x: sr.x + TILE_GAP / 2,
            y: sr.y + TILE_GAP / 2,
            w: Math.max(0, sr.w - TILE_GAP),
            h: Math.max(0, sr.h - TILE_GAP),
            color:
              s.revenueGrowth == null
                ? NEUTRAL
                : lerpColor((s.revenueGrowth - min) / span),
            marketCap: s.marketCap,
            revenueGrowth: s.revenueGrowth,
            tickerCount: s.tickerCount,
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
          sectors,
        },
      ]
    })
  }, [groups, size])

  if (groups.length === 0) {
    return (
      <div className="h-[28rem] bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">데이터가 없습니다</span>
      </div>
    )
  }

  return (
    // 섹터가 100개 넘어 좁은 화면에선 타일이 뭉개진다 → 최소 폭을 두고 가로 스크롤.
    <div className="-mx-1 overflow-x-auto px-1">
      <div
        ref={setContainer}
        className="relative h-[28rem] w-full min-w-[46rem] overflow-hidden rounded-lg sm:h-[36rem]"
      >
        {placed.map((group) => (
          <div key={group.id}>
            {/* 산업 그룹 테두리 + 이름 띠 */}
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

            {/* 섹터 타일 */}
            {group.sectors.map((s) => {
              const units = textUnits(s.name)
              // 이름이 폭에 딱 맞는 폰트 크기 → 세로·상한으로 클램프.
              const fs = Math.min((s.w - 6) / units, (s.h - 4) * 0.55, 22)
              const showLabel = fs >= 8
              const amountFs = Math.max(9, Math.round(fs * 0.5))
              const showAmount =
                showLabel && s.h > fs + amountFs + 8 && s.w > 54
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSector({ id: s.id, name: s.name })}
                  title={`${group.name} · ${s.name}\n시총 ${fmt.marketCap(s.marketCap)}\n매출 성장률 ${formatGrowth(s.revenueGrowth)}\n종목 ${s.tickerCount}개`}
                  aria-label={`${s.name} 섹터 종목 보기`}
                  className="absolute overflow-hidden rounded-[2px] px-1 text-left leading-tight transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground"
                  style={{
                    left: s.x,
                    top: s.y,
                    width: s.w,
                    height: s.h,
                    backgroundColor: s.color,
                  }}
                >
                  {showLabel && (
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap font-bold text-white"
                      style={{ fontSize: fs, marginTop: 2 }}
                    >
                      {s.name}
                    </span>
                  )}
                  {showAmount && (
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap tabular-nums text-white/85"
                      style={{ fontSize: amountFs }}
                    >
                      {fmt.marketCap(s.marketCap)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
