/**
 * /privacy — 개인정보 처리방침.
 *
 * 정적 페이지. Google OAuth 로그인으로 수집되는 최소 정보 고지.
 */
import { ShieldCheck } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

export const metadata = {
  title: '개인정보 처리방침 — Sector King',
  description: 'Sector King 개인정보 처리방침.',
}

const UPDATED_AT = '2025년 7월 6일'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle="개인정보 처리방침" />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Privacy Policy
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">개인정보 처리방침</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            최종 업데이트: {UPDATED_AT}
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-base font-semibold mb-2">1. 수집하는 개인정보 항목</h2>
            <p className="text-muted-foreground">
              Sector King(이하 &quot;서비스&quot;)은 Google 계정을 통한 로그인 시
              다음 정보를 수집합니다.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
              <li>이메일 주소</li>
              <li>프로필 이름 및 프로필 이미지(Google 제공 시)</li>
              <li>서비스 이용 기록(문의·제보 내용 등 이용자가 직접 입력한 정보)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>회원 식별 및 로그인 상태 유지</li>
              <li>로그인 사용자 대상 기능 제공</li>
              <li>문의·제보에 대한 응대</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">3. 개인정보의 보관 및 파기</h2>
            <p className="text-muted-foreground">
              개인정보는 회원 탈퇴 또는 수집·이용 목적 달성 시까지 보관하며, 이후
              지체 없이 파기합니다. 관계 법령에 따라 보존이 필요한 경우 해당 기간
              동안 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">4. 개인정보의 제3자 제공 및 처리 위탁</h2>
            <p className="text-muted-foreground">
              서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
              다만 서비스 운영을 위해 다음의 사업자를 통해 데이터를 처리합니다.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Google(로그인 인증)</li>
              <li>Supabase(인증·데이터 저장 인프라)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">5. 쿠키의 사용</h2>
            <p className="text-muted-foreground">
              서비스는 로그인 세션 유지 및 이용자 환경 설정(통화·테마 등) 저장을
              위해 쿠키와 로컬 스토리지를 사용합니다. 이용자는 브라우저 설정을 통해
              쿠키 저장을 거부할 수 있으나, 이 경우 일부 기능 이용이 제한될 수
              있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">6. 이용자의 권리</h2>
            <p className="text-muted-foreground">
              이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를
              요청할 수 있습니다. 요청은{' '}
              <a href="/contact" className="text-info hover:underline">
                문의 / 제보
              </a>{' '}
              페이지를 통해 접수합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">7. 개인정보 처리방침의 변경</h2>
            <p className="text-muted-foreground">
              본 방침이 변경되는 경우 변경 내용을 본 페이지에 게시합니다.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
