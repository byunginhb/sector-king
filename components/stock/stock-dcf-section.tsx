'use client'

import Link from 'next/link'
import { Calculator } from 'lucide-react'
import { formatPercent } from '@/lib/format'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import type { CompanyDetailResponse } from '@/types'

type Dcf = NonNullable<CompanyDetailResponse['dcf']>

/** DCF 제외 사유별 초보자 친화 설명. */
function reasonCopy(reason: string | null): string {
  switch (reason) {
    case 'negativeFcf':
      return '최근 잉여현금흐름이 마이너스라 DCF로 적정가를 추산하기 어려운 종목이에요.'
    case 'finance':
      return '은행·보험 등 현금흐름 정의가 다른 업종이라 DCF 평가에서 제외했어요.'
    default:
      return 'DCF 계산에 필요한 자료(현금흐름·시가총액 등)가 부족해 적정가를 추산하지 못했어요.'
  }
}

interface StockDcfSectionProps {
  dcf: Dcf | null | undefined
  /** 현재가(USD 환산) — 적정가와 나란히 표시. */
  currentPriceUsd: number | null
}

/**
 * DCF 가치 평가 — 내재가치 기반 절대평가(0~100 점수 + 상승예측 %).
 * 랭킹과 동일한 lib/dcf 엔진 결과를 모달·페이지에서 함께 노출한다.
 */
export function StockDcfSection({ dcf, currentPriceUsd }: StockDcfSectionProps) {
  const fmt = useCurrencyFormat()
  if (!dcf) return null

  const score = dcf.score
  const upTone =
    dcf.upsidePct == null
      ? 'text-muted-foreground'
      : dcf.upsidePct >= 0
        ? 'text-success'
        : 'text-danger'
  const barPct = score == null ? 0 : Math.min(Math.max(score, 0), 100)

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Calculator className="w-4 h-4" aria-hidden />
        DCF 가치 평가
      </h3>

      <div className="rounded-xl border border-border p-4 space-y-4">
        {dcf.available && score != null ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{Math.round(score)}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <div className="text-right">
                <span className={cn('num-mono text-lg font-bold tabular-nums', upTone)}>
                  {dcf.upsidePct != null ? formatPercent(dcf.upsidePct) : 'N/A'}
                </span>
                <p className="text-[11px] text-muted-foreground">상승예측</p>
              </div>
            </div>

            <div
              className="bg-muted h-1.5 rounded-sm overflow-hidden"
              role="progressbar"
              aria-label="DCF 점수"
              aria-valuenow={Math.round(score)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bg-primary h-full rounded-sm transition-[width] duration-300"
                style={{ width: `${barPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">적정가(주당)</p>
                <p className="num-mono font-medium text-foreground">
                  {dcf.intrinsicUsd != null ? fmt.price(dcf.intrinsicUsd) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">현재가</p>
                <p className="num-mono font-medium text-foreground">
                  {currentPriceUsd != null ? fmt.price(currentPriceUsd) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">적용 할인율</p>
                <p className="num-mono font-medium text-foreground">
                  {dcf.discountRate != null ? `${(dcf.discountRate * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              회사가 앞으로 벌 현금을 보수적으로 가정해 적정가를 추산한 값이에요. 빠르게 크거나
              비싸게 거래되는 인기주는 낮게 나오는 경향이 있어, 장기 점수는 높은데 DCF가 낮다면
              &lsquo;좋은 기업이지만 성장 기대가 주가에 이미 반영된 상태&rsquo;로 읽으면 됩니다.
              가정에 민감한 참고용 값이며 미래 수익을 보장하지 않아요.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{reasonCopy(dcf.reason)}</p>
        )}

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <Link href="/methodology#dcf" className="text-[11px] text-info hover:underline">
            DCF 방법론 보기 →
          </Link>
          <span className="text-[11px] text-muted-foreground">참고용 · 투자 권유 아님</span>
        </div>
      </div>
    </div>
  )
}
