'use client'

import type { PriceChangeItem } from '@/types'
import { formatPriceChange } from '@/lib/format'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { getPriceChangeStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'

interface PriceChangeTableProps {
  data: PriceChangeItem[]
  onCompanyClick?: (ticker: string) => void
  isLoading?: boolean
}

export function PriceChangeTable({
  data,
  onCompanyClick,
  isLoading,
}: PriceChangeTableProps) {
  const fmt = useCurrencyFormat()
  if (isLoading) {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-md overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-surface-2" />
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-16 border-t border-border-subtle bg-surface-2/50"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-surface-2/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                회사
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                시작 가격
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                현재 가격
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                변화율
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                시가총액
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface-1 divide-y divide-border-subtle">
            {data.map((company, index) => (
              <tr
                key={company.ticker}
                onClick={() => onCompanyClick?.(company.ticker)}
                className="hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {company.nameKo || company.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.ticker}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-foreground">
                    {fmt.price(company.firstPrice)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {company.firstDate}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-foreground">
                    {fmt.price(company.latestPrice)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {company.latestDate}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span
                    className={cn(
                      'text-sm font-bold',
                      getPriceChangeStyle(company.percentChange ?? 0)
                    )}
                  >
                    {formatPriceChange(company.percentChange)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-foreground">
                  {fmt.marketCap(company.marketCap)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
