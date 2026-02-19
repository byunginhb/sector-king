import { ExternalLink } from 'lucide-react'

const GOOGLE_FORM_URL = 'https://forms.gle/vtZzRNsEe8cirqkB9'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Sector King</p>
            <p className="text-sm text-muted-foreground">산업별 투자 패권 지도</p>
          </div>
          <a
            href={GOOGLE_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            문의하기
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2025 Sector King. All rights reserved.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            본 사이트의 정보는 투자 권유가 아니며, 투자 결정의 책임은 이용자에게 있습니다.
          </p>
        </div>
      </div>
    </footer>
  )
}
