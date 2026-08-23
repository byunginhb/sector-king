import { Mail } from 'lucide-react'
import type { AuthProviderId } from '@/lib/auth/enabled-providers'

/**
 * 제공자별 표시 정보 — 로그인 화면과 설정의 "로그인 수단"이 함께 쓴다.
 *
 * 레이아웃은 공유하지 않는다. 로그인은 전폭 버튼, 설정은 목록 행이라 크기·배치가
 * 다르고, 억지로 한 컴포넌트로 묶으면 분기만 늘어난다. 공유하는 건 이름·심볼·
 * 브랜드 색 세 가지뿐이다.
 */
export const PROVIDER_LABEL: Record<AuthProviderId, string> = {
  google: 'Google',
  kakao: '카카오',
  email: '이메일',
}

/**
 * 브랜드가 색을 지정한 제공자만 여기 값을 쓴다(카카오 #FEE500 + 검정 85%).
 * 나머지는 테마 토큰을 그대로 따른다 — 라이트·다크 양쪽에서 자동으로 맞는다.
 */
export const PROVIDER_BUTTON_CLASS: Record<AuthProviderId, string> = {
  google: 'border border-border bg-background hover:bg-accent text-foreground',
  kakao: 'bg-[#FEE500] hover:brightness-95 text-[rgba(0,0,0,0.85)]',
  email: 'border border-border bg-background hover:bg-accent text-foreground',
}

export function ProviderLogo({
  provider,
  className,
}: {
  provider: AuthProviderId
  className?: string
}) {
  if (provider === 'google') return <GoogleLogo />
  if (provider === 'kakao') return <KakaoLogo />
  return <Mail className={className ?? 'h-[18px] w-[18px]'} aria-hidden />
}

function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

function KakaoLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="rgba(0,0,0,0.85)"
        d="M9 1.5C4.58 1.5 1 4.31 1 7.78c0 2.23 1.48 4.19 3.71 5.3-.16.57-.6 2.17-.68 2.5-.11.42.15.42.32.3.13-.09 2.09-1.42 2.94-2 .55.08 1.12.12 1.71.12 4.42 0 8-2.81 8-6.28S13.42 1.5 9 1.5z"
      />
    </svg>
  )
}
