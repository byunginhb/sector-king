'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { useMemo } from 'react'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { CHART_TOOLTIP_CONTENT_STYLE } from '@/lib/chart-colors'

export interface TreemapItem {
  id: string
  name: string
  marketCap: number
  revenueGrowth: number | null
}

interface Props {
  items: TreemapItem[]
  onSelect?: (id: string) => void
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

interface CellProps {
  // 기하 값은 recharts 가 런타임에 주입 (content clone).
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  fillColor?: string
  mcapLabel?: string
  onSelect?: (id: string) => void
  id?: string
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

/** 문자열의 총 폭 단위 합. */
function textUnits(text: string): number {
  let u = 0
  for (const ch of text) u += charUnit(ch.codePointAt(0) ?? 0)
  return Math.max(u, 0.56)
}

/** 주어진 폰트 크기에서 폭을 넘기는 부분을 … 로 클립 (최소 크기에서만 사용). */
function clipToWidth(text: string, availWidth: number, fontSize: number): string {
  const maxUnits = availWidth / fontSize
  let acc = 0
  let out = ''
  for (const ch of text) {
    acc += charUnit(ch.codePointAt(0) ?? 0)
    if (acc > maxUnits) return out.length ? out + '…' : ch
    out += ch
  }
  return out
}

const PAD = 8

function Cell(props: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, fillColor, mcapLabel, onSelect, id } = props
  const showName = width > 30 && height > 16
  const availW = width - PAD * 2
  const label = name ?? ''
  const units = textUnits(label)
  // 전체 글자가 딱 들어가는 최대 폰트(= … 나오기 직전). 세로 넘침만 방지(height*0.8).
  const fitByWidth = availW / units
  const titleSize = showName ? Math.max(11, Math.min(fitByWidth, height * 0.8)) : 0
  // 폭에 맞춰 크기를 정하므로 보통 클립 불필요. 최소 크기(11)로 클램프된 좁은 칸만 클립.
  const titleText = showName
    ? fitByWidth >= 11
      ? label
      : clipToWidth(label, availW, 11)
    : ''
  // 금액 = 타이틀의 절반 크기 (최소 11px).
  const amountSize = Math.max(11, Math.round(titleSize * 0.5))
  const showAmount =
    !!mcapLabel && width > 56 && height > titleSize + amountSize + 14
  return (
    <g
      onClick={() => id && onSelect?.(id)}
      style={{ cursor: id && onSelect ? 'pointer' : undefined }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor ?? NEUTRAL}
        stroke="var(--background, #fff)"
        strokeWidth={2}
        rx={3}
      />
      {titleText && (
        <text
          x={x + PAD}
          y={y + PAD + titleSize * 0.82}
          fontSize={titleSize}
          fill="#fff"
          fontWeight={700}
          className="pointer-events-none"
        >
          {titleText}
        </text>
      )}
      {showAmount && (
        <text
          x={x + PAD}
          y={y + PAD + titleSize + amountSize * 0.9 + 4}
          fontSize={amountSize}
          fill="#fff"
          fillOpacity={0.85}
          className="pointer-events-none tabular-nums"
        >
          {clipToWidth(mcapLabel!, availW, amountSize)}
        </text>
      )}
    </g>
  )
}

export function MarketSizeTreemap({ items, onSelect }: Props) {
  const fmt = useCurrencyFormat()

  const { data, growthOf } = useMemo(() => {
    const growths = items
      .map((i) => i.revenueGrowth)
      .filter((g): g is number => g != null)
    const min = growths.length ? Math.min(...growths) : 0
    const max = growths.length ? Math.max(...growths) : 1
    const span = max - min || 1
    const growthOf = new Map<string, number | null>()
    const data = items
      .filter((i) => i.marketCap > 0)
      .map((i) => {
        growthOf.set(i.id, i.revenueGrowth)
        return {
          id: i.id,
          name: i.name,
          size: i.marketCap,
          mcapLabel: fmt.marketCap(i.marketCap),
          fillColor:
            i.revenueGrowth == null
              ? NEUTRAL
              : lerpColor((i.revenueGrowth - min) / span),
        }
      })
    return { data, growthOf }
  }, [items, fmt])

  if (data.length === 0) {
    return (
      <div className="h-80 bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">데이터가 없습니다</span>
      </div>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          nameKey="name"
          isAnimationActive={false}
          content={<Cell onSelect={onSelect} />}
        >
          <Tooltip
            contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as { id: string; name: string; size: number }
              const g = growthOf.get(p.id)
              return (
                <div style={CHART_TOOLTIP_CONTENT_STYLE} className="space-y-0.5 text-foreground px-3 py-2">
                  <div className="font-semibold">{p.name}</div>
                  <div>시총 {fmt.marketCap(p.size)}</div>
                  <div>
                    성장률 {g != null ? `${g >= 0 ? '+' : ''}${(g * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
              )
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}
