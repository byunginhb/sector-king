import type { Metadata } from 'next'
import Link from 'next/link'
import { Home } from 'lucide-react'

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-6 max-w-lg">
        <p className="eyebrow eyebrow-accent mb-4">Sector King · Vol. 404</p>
        <p className="display text-8xl sm:text-9xl text-foreground">
          <span className="display-italic">404</span>
        </p>
        <hr className="sk-rule my-6" />
        <h1 className="font-display text-2xl font-semibold text-foreground mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-foreground/70 mb-8 max-w-md mx-auto">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Home size={16} />
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
