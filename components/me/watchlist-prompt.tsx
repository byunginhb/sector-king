'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

export function WatchlistPrompt() {
  const pathname = usePathname()

  return (
    <section
      className="sk-card mt-10 p-5"
      aria-labelledby="watchlist-prompt-heading"
    >
      <h2
        id="watchlist-prompt-heading"
        className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"
      >
        <Bookmark className="h-4 w-4 text-info" aria-hidden />
        읽은 지표로 관심 섹터를 찾아보세요
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        섹터와 종목을 비교한 뒤 관심 목록에 담아 다시 확인하세요. 관심 목록은
        로그인 후 이용할 수 있습니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
        <Link
          href="/sectors"
          className="text-info hover:underline"
          onClick={() =>
            trackEvent('select_content', {
              content_type: 'guide_sector_explore',
              page_path: pathname,
            })
          }
        >
          섹터 살펴보기
        </Link>
        <Link
          href="/me/watchlist"
          className="text-info hover:underline"
          onClick={() =>
            trackEvent('select_content', {
              content_type: 'guide_watchlist_prompt',
              page_path: pathname,
            })
          }
        >
          내 관심 목록 열기
        </Link>
      </div>
    </section>
  )
}
