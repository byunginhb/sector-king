'use client'

import { Users, Star } from 'lucide-react'
import { formatScore } from '@/lib/format'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import type { CompanyInsightsResponse } from '@/types'

interface SectorPositionProps {
  insights: CompanyInsightsResponse
}

const MAX_ROWS = 8

/**
 * S4 섹터 내 포지션 — peer 미니 테이블 + 시총점유율 가로 bar.
 * 시총은 API 에서 USD 정규화된 값(marketCapUsd). self 행 하이라이트.
 */
export function SectorPosition({ insights }: SectorPositionProps) {
  const { peers, sectorContext } = insights
  const fmt = useCurrencyFormat()

  if (!sectorContext || peers.length === 0) {
    return null
  }

  if (peers.length <= 1) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <Header sectorName={sectorContext.sectorName} peerCount={sectorContext.peerCount} />
        <p className="rounded-md border border-dashed border-border-subtle p-3 text-sm text-muted-foreground">
          비교 가능한 동종 종목이 없습니다.
        </p>
      </section>
    )
  }

  const total = sectorContext.marketCapTotalUsd
  const rows = peers.slice(0, MAX_ROWS)

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <Header sectorName={sectorContext.sectorName} peerCount={sectorContext.peerCount} />

      {sectorContext.marketSharePct != null && (
        <p className="mb-3 text-xs text-muted-foreground">
          본 종목 시총 점유율{' '}
          <span className="font-medium text-foreground">
            {sectorContext.marketSharePct.toFixed(1)}%
          </span>{' '}
          (섹터 {sectorContext.peerCount}개 종목 기준)
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-xs text-muted-foreground">
              <th className="px-2 py-2 text-left font-medium">#</th>
              <th className="px-2 py-2 text-left font-medium">종목</th>
              <th className="px-2 py-2 text-right font-medium">시총 점유율</th>
              <th className="px-2 py-2 text-right font-medium">점수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((peer) => {
              const share =
                peer.marketCapUsd != null && total > 0
                  ? (peer.marketCapUsd / total) * 100
                  : null
              return (
                <tr
                  key={peer.ticker}
                  className={cn(
                    'border-b border-border-subtle last:border-0',
                    peer.isSelf && 'bg-primary/5'
                  )}
                >
                  <td className="px-2 py-2 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {peer.rank === 1 && (
                        <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />
                      )}
                      {peer.rank}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        'truncate',
                        peer.isSelf ? 'font-semibold text-foreground' : 'text-foreground'
                      )}
                    >
                      {peer.nameKo || peer.name || peer.ticker}
                    </span>
                    {peer.isSelf && (
                      <span className="ml-1 text-[10px] text-primary">(본 종목)</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {share != null && (
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              peer.isSelf ? 'bg-primary' : 'bg-muted-foreground/40'
                            )}
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                      )}
                      <span className="num-mono text-xs text-muted-foreground">
                        {share != null ? `${share.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right num-mono text-xs text-foreground">
                    {peer.score != null ? formatScore(peer.score, 100) : 'N/A'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        섹터 합산 시총 {fmt.marketCap(total)} (
        {fmt.currency === 'KRW' ? '원화 환산 기준' : 'USD 환산 기준'})
      </p>
    </section>
  )
}

function Header({ sectorName, peerCount }: { sectorName: string; peerCount: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <Users className="h-4 w-4" aria-hidden />
      섹터 내 포지션
      <span className="text-xs font-normal text-muted-foreground">
        {sectorName} · {peerCount}개 종목
      </span>
    </h2>
  )
}
