'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSearchContext } from './search-provider'

export function SearchTrigger() {
  const { open } = useSearchContext()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={open}
      className="relative"
      aria-label="검색"
    >
      <Search className="h-5 w-5" />
      <span className="sr-only">검색 (Cmd+K)</span>
    </Button>
  )
}
