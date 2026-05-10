/**
 * /email/unsubscribed — 메일 수신 해지 안내 페이지.
 *
 * - 인증 불필요 (메일에서 누구나 도달 가능)
 * - 결과(성공/실패) 무관 동일 메시지 — 정보 노출 차단
 */
import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export const metadata = {
  title: '메일 수신 해지 — Sector King',
  description: '일별 마켓 리포트 구독이 해지되었습니다.',
  robots: { index: false, follow: false },
}

export default function UnsubscribedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border-subtle bg-surface-1 p-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          메일 수신이 해지되었습니다
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          앞으로 일별 마켓 리포트 메일을 받지 않습니다.
          <br />
          (이미 해지된 상태였을 수도 있습니다.)
          <br />
          다시 받으려면 설정 페이지에서 켜주세요.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/me/settings"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            수신 설정 열기
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-surface-2 text-foreground px-4 py-2 text-sm font-medium hover:bg-surface-3"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
