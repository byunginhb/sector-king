import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { getCurrentProfile } from '@/lib/auth/get-user'
import { UserMenu } from './user-menu'

/**
 * 헤더 우측에 표시되는 로그인/사용자 메뉴 진입점.
 *
 * Server Component — `getCurrentProfile()` 로 세션을 직접 조회하고
 * 결과를 Client Component (`UserMenu`) 에 전달한다. (Hydration 일치)
 *
 * 비로그인: "로그인" 텍스트 버튼
 * 로그인: 아바타 + 드롭다운
 */
export async function AuthButton() {
  const profile = await getCurrentProfile()

  if (!profile) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground border border-border-subtle transition-colors"
        aria-label="로그인 페이지로 이동"
      >
        <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        <span>로그인</span>
      </Link>
    )
  }

  return <UserMenu profile={profile} />
}
