'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORIES,
  type GlossaryCategory,
} from './glossary-data'

interface GlossaryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_KEYS = Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[]

export function GlossaryPanel({ open, onOpenChange }: GlossaryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredTerms = useMemo(() => {
    let terms = GLOSSARY_TERMS

    if (activeCategory !== 'all') {
      terms = terms.filter((t) => t.category === activeCategory)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      terms = terms.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
    }

    return terms
  }, [activeCategory, search])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>용어 사전</DialogTitle>
          <DialogDescription>
            Sector King에서 사용되는 핵심 용어와 지표를 설명합니다.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 pb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="용어 검색..."
            aria-label="용어 검색"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category Tabs */}
        <div className="px-6 pb-3 flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            전체
          </button>
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                activeCategory === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {GLOSSARY_CATEGORIES[key]}
            </button>
          ))}
        </div>

        {/* Terms List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredTerms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              검색 결과가 없습니다
            </p>
          ) : (
            <div className="space-y-1">
              {filteredTerms.map((term) => (
                <div
                  key={term.id}
                  className="rounded-lg border border-border overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(term.id)}
                    aria-expanded={expandedId === term.id}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {term.term}
                    </span>
                    <svg
                      className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-2',
                        expandedId === term.id && 'rotate-180'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedId === term.id && (
                    <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed border-t border-border pt-2">
                      {term.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
