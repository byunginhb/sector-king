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
      <div className="text-center px-6">
        <div className="mb-6">
          <span className="text-7xl font-bold bg-gradient-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">
            404
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          <Home size={16} />
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
