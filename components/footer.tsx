import Link from 'next/link'
import { SectorKingLogo } from './logo'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <SectorKingLogo size={24} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sector King</p>
              <p className="text-sm text-muted-foreground">산업별 투자 패권 지도</p>
            </div>
          </div>
          <nav className="flex items-center gap-4 flex-wrap">
            <Link
              href="/methodology"
              className="text-sm text-info hover:underline"
            >
              방법론
            </Link>
            <Link
              href="/methodology#scoring"
              className="text-sm text-info hover:underline"
            >
              점수 산출 공식
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm text-info hover:underline"
            >
              문의 / 제보
            </Link>
          </nav>
        </div>

        <div className="mt-6 border-t border-border pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            데이터 출처: Yahoo Finance · 업데이트: 매일 00:00 KST · 추적: 120+ 기업 / 9개 산업
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; 2025 Sector King. 본 사이트의 정보는 투자 권유가 아니며, 투자 결정의 책임은 이용자에게 있습니다.
          </p>
        </div>
      </div>
    </footer>
  )
}
