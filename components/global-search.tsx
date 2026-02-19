'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { useSearch } from '@/hooks/use-search'
import { useSearchContext } from './search-provider'
import { CompanyDetail } from './company-detail'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatMarketCap, formatPriceChange } from '@/lib/format'
import { cn } from '@/lib/utils'

export function GlobalSearch() {
  const { isOpen, close } = useSearchContext()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useSearch({ query })
  const results = data?.results ?? []

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [data])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-search-item]')
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        setSelectedTicker(results[selectedIndex].ticker)
        close()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    },
    [results, selectedIndex, close]
  )

  function handleResultClick(ticker: string) {
    setSelectedTicker(ticker)
    close()
  }

  return (
    <>
      {/* Search Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="종목 검색"
          onClick={close}
        >
          <div
            className="mx-auto mt-[15vh] w-full max-w-lg px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Box */}
            <div className="rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center border-b border-border px-4">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="종목 검색... (ticker, 이름)"
                  className="flex-1 bg-transparent px-3 py-4 text-base text-foreground placeholder:text-muted-foreground outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="flex items-center gap-2">
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                    ESC
                  </kbd>
                </div>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
                {isLoading && query.length >= 1 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    검색 중...
                  </div>
                )}

                {!isLoading && query.length >= 1 && results.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    &quot;{query}&quot;에 대한 결과가 없습니다
                  </div>
                )}

                {results.length > 0 && (
                  <div className="py-2">
                    {results.map((item, index) => (
                      <button
                        key={item.ticker}
                        data-search-item
                        onClick={() => handleResultClick(item.ticker)}
                        className={cn(
                          'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                          index === selectedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-foreground">
                              {item.ticker}
                            </span>
                            <span className="text-sm text-muted-foreground truncate">
                              {item.nameKo || item.name}
                            </span>
                          </div>
                          {item.nameKo && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {item.marketCap != null && (
                            <p className="text-xs text-muted-foreground">
                              {formatMarketCap(item.marketCap)}
                            </p>
                          )}
                          {item.priceChange != null && (
                            <p
                              className={cn(
                                'text-xs font-medium',
                                item.priceChange > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : item.priceChange < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-muted-foreground'
                              )}
                            >
                              {formatPriceChange(item.priceChange)}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {query.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    종목명 또는 티커를 입력하세요
                  </div>
                )}
              </div>

              {/* Keyboard hints */}
              {results.length > 0 && (
                <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[10px]">
                      ↑↓
                    </kbd>
                    이동
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[10px]">
                      Enter
                    </kbd>
                    선택
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[10px]">
                      Esc
                    </kbd>
                    닫기
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Company Detail Dialog */}
      <Dialog
        open={!!selectedTicker}
        onOpenChange={(open) => !open && setSelectedTicker(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicker && <CompanyDetail ticker={selectedTicker} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
