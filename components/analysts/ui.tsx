'use client'

import { TrendingUp, TrendingDown, Minus, Plus, Info } from 'lucide-react'
import { HintPopover } from '@/components/ui/hint-popover'
import { Skeleton } from '@/components/ui/skeleton'
import type { Direction, PredictionStatus } from '@/types'
import { CHART_SERIES } from '@/lib/chart-colors'
import { cn } from '@/lib/utils'

/**
 * 예측력 점수 개념 설명 툴팁(문구 SoT — 점수가 노출되는 모든 화면에서 재사용).
 * 계산식(Wilson 하한)은 일부러 감추고 "많이 예측 + 잘 맞힘" 컨셉만 전달한다.
 */
export function ScoreHint({ className }: { className?: string }) {
  return (
    <HintPopover
      label="예측력 점수 설명"
      className={className ?? 'inline-flex align-middle text-muted-foreground/70 hover:text-foreground transition-colors'}
      content={
        <span className="block space-y-1.5">
          <span className="block font-semibold text-foreground">예측력 점수란?</span>
          <span className="block">
            <span className="font-medium text-foreground">얼마나 잘 맞혔나(적중률)</span>와{' '}
            <span className="font-medium text-foreground">얼마나 많이 예측했나(리포트 수)</span>를 함께 본 0~100 점수입니다.
          </span>
          <span className="block">
            리포트 1~2건으로 낸 100%보다, 수십 건을 쌓으면서 꾸준히 맞힌 애널리스트를 더 높게 평가합니다. 물론 적중이 빗나감보다
            많아야 점수가 올라갑니다.
          </span>
        </span>
      }
    >
      <Info className="h-3.5 w-3.5" aria-hidden />
    </HintPopover>
  )
}

/** 다중 시리즈 색 팔레트(칩·차트선 공용 SoT). 애널리스트 개별 선에만 쓴다. */
export const PALETTE = CHART_SERIES

/**
 * 시스템 선(애널리스트 개인이 아닌 기준선) 색 — CHART_SERIES 밖의 --chart-10~12 를 예약해
 * 애널리스트 팔레트(amber/teal/blue/aubergine/rose/…)와 구조적으로 겹치지 않게 한다.
 * 이전엔 실제 주가와 컨센서스가 둘 다 --foreground 라 라이트=검정 두 줄, 다크=흰 두 줄로 구분이 불가능했다.
 */
/** 실제 주가 — 기준선. 가장 굵고 점 없는 실선. */
export const PRICE_COLOR = 'hsl(var(--chart-11))'
/** 컨센서스(중앙값) / 주인공 애널리스트 — 기준선보다 한 단계 얇은 실선. */
export const CONSENSUS_COLOR = 'hsl(var(--chart-10))'

export function pct(rate: number | null): string {
  return rate == null ? '—' : `${Math.round(rate * 100)}%`
}

/**
 * 목표가 도달률 설명 — 라벨만으로는 절대 읽히지 않는 지표라 설명이 필수다.
 *
 * 산식: `(현재가 − 발표일 주가) / (목표가 − 발표일 주가)`.
 * 100% 초과·음수가 정상적으로 나오는 값이라, 340% 같은 숫자가 설명 없이
 * 떠 있으면 오독된다(회의에서 "기준이 뭐예요?" 가 나온 지점).
 */
export function AchievementHint({ className }: { className?: string }) {
  return (
    <HintPopover
      label="목표가 도달률 설명"
      className={className ?? 'inline-flex align-middle text-muted-foreground/70 hover:text-foreground transition-colors'}
      content={
        <span className="block space-y-1.5">
          <span className="block font-semibold text-foreground">목표가 도달률이란?</span>
          <span className="block">
            리포트 <span className="font-medium text-foreground">발표일 주가에서 목표주가까지의 거리</span> 중, 현재가가 어디까지
            왔는지입니다. 가장 최근 리포트 1건 기준입니다.
          </span>
          <span className="block">
            <span className="font-medium text-success">100%를 넘으면</span> 이미 목표가를 넘어섰고,{' '}
            <span className="font-medium text-danger">음수면</span> 목표와 반대 방향으로 움직였다는 뜻입니다.
          </span>
        </span>
      }
    >
      <Info className="h-3.5 w-3.5" aria-hidden />
    </HintPopover>
  )
}

/**
 * 도달률 색 — 적중률(`hitRateTone`)과 규칙이 다르다.
 * 도달률은 "높을수록 좋다"가 아니라 **구간의 뜻이 다르다**: 100% 초과=목표 돌파,
 * 0~100%=진행 중, 음수=반대 방향. 그래서 임계값이 아니라 부호·1.0 을 기준으로 나눈다.
 */
export function achievementTone(rate: number | null): string {
  if (rate == null) return 'text-muted-foreground'
  if (rate < 0) return 'text-danger'
  if (rate >= 1) return 'text-success'
  return 'text-foreground'
}

export function hitRateTone(rate: number | null): string {
  if (rate == null) return 'text-muted-foreground'
  if (rate >= 0.7) return 'text-success'
  if (rate >= 0.5) return 'text-primary'
  return 'text-danger'
}

export function hitRateBar(rate: number | null): string {
  if (rate == null) return 'bg-muted'
  if (rate >= 0.7) return 'bg-success'
  if (rate >= 0.5) return 'bg-primary'
  return 'bg-danger'
}

/** 예측력 점수(0~100) 표기·톤·막대. Wilson 하한 기반이라 초기엔 점수대가 낮게 형성됨. */
export function fmtScore(score: number): string {
  return `${score}점`
}

export function scoreTone(score: number): string {
  if (score >= 60) return 'text-success'
  if (score >= 45) return 'text-primary'
  return 'text-danger'
}

export function scoreBar(score: number): string {
  if (score >= 60) return 'bg-success'
  if (score >= 45) return 'bg-primary'
  return 'bg-danger'
}

export const DIRECTION_META: Record<Direction, { label: string; icon: typeof TrendingUp; tone: string }> = {
  up: { label: '상향', icon: TrendingUp, tone: 'text-success' },
  down: { label: '하향', icon: TrendingDown, tone: 'text-danger' },
  hold: { label: '유지', icon: Minus, tone: 'text-muted-foreground' },
  new: { label: '신규', icon: Plus, tone: 'text-info' },
}

/** 적중=●, 빗나감=●(색+텍스트 병기로 색맹 대응). null=지표 없음(유지·신규). */
export const STATUS_META: Record<PredictionStatus, { label: string; tone: string } | null> = {
  hit: { label: '적중', tone: 'bg-success-bg text-success' },
  miss: { label: '빗나감', tone: 'bg-danger-bg text-danger' },
  unscorable: { label: '평가 불가', tone: 'bg-muted text-muted-foreground' },
  hold: null,
  new: null,
}

// ── 로딩 스켈레톤 ──────────────────────────────────────────────────
// 실제 행/차트와 같은 그리드·높이를 써서 데이터가 도착해도 레이아웃이 튀지 않는다.
// 펄스에 행마다 지연을 줘서 전부 같이 깜빡이지 않고 위에서 아래로 훑고 지나간다
// (전 행 동기 깜빡임은 "멈춰 있다"로, 파동은 "채워지는 중"으로 읽힌다).

const STOCK_GRID = 'grid-cols-[1fr_auto_1rem] sm:grid-cols-[1fr_6rem_6rem_6rem_5rem_1rem]'
const ANALYST_GRID = 'grid-cols-[1.75rem_1fr_auto_1rem] sm:grid-cols-[2.5rem_1fr_9rem_6rem_4rem_4rem_1rem]'

/** 목록 로딩 — 실제 행과 동일 그리드. */
export function RowsSkeleton({ variant, rows = 8 }: { variant: 'stocks' | 'analysts'; rows?: number }) {
  const analysts = variant === 'analysts'
  return (
    <div role="status" aria-label="목록을 불러오는 중">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          // 자식 Skeleton 의 animate-pulse 가 이 지연을 상속(animation-delay: inherit)
          style={{ animationDelay: `${i * 90}ms` }}
          className={cn('grid items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 [&_*]:[animation-delay:inherit]', analysts ? ANALYST_GRID : STOCK_GRID)}
          aria-hidden
        >
          {analysts && <Skeleton className="h-4 w-4 justify-self-center" />}
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-32 max-w-full" />
            <Skeleton className="h-3 w-20 max-w-full" />
          </div>
          <Skeleton className={cn('hidden h-4 sm:block', analysts ? 'w-full' : 'w-12 justify-self-center')} />
          <Skeleton className="hidden h-4 w-14 justify-self-end sm:block" />
          <Skeleton className="hidden h-4 w-12 justify-self-end sm:block" />
          <Skeleton className="h-4 w-10 justify-self-end" />
          <Skeleton className="h-3.5 w-3.5 justify-self-end rounded-full" />
        </div>
      ))}
    </div>
  )
}

// 고정 실루엣 — Math.random() 은 렌더마다 값이 바뀌어 스켈레톤이 요동친다.
const BAR_HEIGHTS = [38, 52, 44, 61, 55, 72, 64, 80, 71, 88, 76, 92, 84, 69, 77]

/** 차트 자리 — recharts 청크 로딩·데이터 대기 공용. 빈 회색 박스보다 "차트가 온다"가 읽힌다. */
export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      role="status"
      aria-label="차트를 불러오는 중"
      className="flex w-full items-end gap-1.5 rounded-md border border-dashed border-border/60 p-3"
    >
      {BAR_HEIGHTS.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} aria-hidden />
      ))}
    </div>
  )
}

const CHIP_WIDTHS = [86, 96, 78, 88, 74]

/** 아코디언 본문 로딩 — 설명줄 + 차트 + 칩 + 요약행까지 실제 구성과 같은 순서. */
export function DetailSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="상세를 불러오는 중">
      <div className="space-y-1.5" aria-hidden>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <ChartSkeleton height={height} />
      <div className="flex flex-wrap gap-1.5" aria-hidden>
        {CHIP_WIDTHS.map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: w, animationDelay: `${i * 70}ms` }} />
        ))}
      </div>
      <div className="space-y-2 border-t pt-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-9 w-full" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </div>
  )
}
