/**
 * /terms — 서비스 이용약관.
 *
 * 정적 페이지. 투자정보 대시보드 성격에 맞춘 면책·이용조건 고지.
 */
import { FileText } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

export const metadata = {
  title: '이용약관 — Sector King',
  description: 'Sector King 서비스 이용약관.',
}

const UPDATED_AT = '2025년 7월 6일'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle="이용약관" />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <FileText className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Terms of Service
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">이용약관</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            최종 업데이트: {UPDATED_AT}
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-base font-semibold mb-2">제1조 (목적)</h2>
            <p className="text-muted-foreground">
              본 약관은 Sector King(이하 &quot;서비스&quot;)이 제공하는 산업별
              주식 데이터 대시보드 및 관련 정보 서비스의 이용 조건과 절차, 이용자와
              서비스의 권리·의무 및 책임 사항을 규정하는 것을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">제2조 (서비스의 성격)</h2>
            <p className="text-muted-foreground">
              서비스가 제공하는 모든 데이터, 점수, 순위, 분석은 정보 제공을
              목적으로 하며 특정 종목의 매수·매도 등 투자 권유나 자문에 해당하지
              않습니다. 서비스는 자본시장과 금융투자업에 관한 법률상 투자자문업자가
              아닙니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">제3조 (데이터 출처와 정확성)</h2>
            <p className="text-muted-foreground">
              서비스의 시세·재무 데이터는 Yahoo Finance 등 제3자 소스에서
              수집되며 지연·오류·누락이 있을 수 있습니다. 서비스는 데이터의
              정확성·완전성·적시성을 보증하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">제4조 (면책)</h2>
            <p className="text-muted-foreground">
              이용자가 서비스의 정보를 근거로 내린 투자 결정 및 그 결과에 대한
              책임은 전적으로 이용자 본인에게 있습니다. 서비스는 정보의 이용으로
              발생한 어떠한 직·간접적 손해에 대해서도 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">제5조 (계정과 이용)</h2>
            <p className="text-muted-foreground">
              일부 기능은 Google 계정을 통한 로그인이 필요합니다. 이용자는 계정
              정보를 정확하게 유지할 책임이 있으며, 서비스를 법령이나 본 약관에
              위배되는 목적으로 이용해서는 안 됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">제6조 (약관의 변경)</h2>
            <p className="text-muted-foreground">
              서비스는 필요 시 본 약관을 변경할 수 있으며, 변경 시 본 페이지에
              게시합니다. 변경 후에도 서비스를 계속 이용하는 경우 변경된 약관에
              동의한 것으로 간주됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">제7조 (문의)</h2>
            <p className="text-muted-foreground">
              본 약관에 관한 문의는{' '}
              <a href="/contact" className="text-info hover:underline">
                문의 / 제보
              </a>{' '}
              페이지를 통해 접수합니다.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
