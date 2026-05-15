import { AlertTriangle, Ban } from 'lucide-react'
import { DsSection } from './ds-section'

interface AntiPattern {
  title: string
  description: string
  why: string
  smell?: string
}

const ANTI_PATTERNS: AntiPattern[] = [
  {
    title: '보라색 그라데이션 금지',
    smell: 'bg-gradient-to-br from-purple-500 to-pink-500',
    description:
      'LLM이 생성한 SaaS 데모에서 가장 흔한 흔적입니다. 우리 팔레트에는 보라(violet)·핑크가 없습니다. 강조는 단일 amber, 의미는 success/danger 토큰만.',
    why: '그라데이션은 데이터 시각화에서 색의 의미를 흐립니다. amber 한 점이 면 전체로 번지면 그것은 더 이상 신호가 아닙니다.',
  },
  {
    title: 'Glassmorphism / Frosted blur 금지',
    smell: 'bg-white/10 backdrop-blur-2xl',
    description:
      '반투명 글래스 카드, 떠다니는 패널, 거대한 blur 배경 — Apple/Stripe 데모를 흉내내는 패턴입니다. 우리는 평면 위 hairline으로만 위계를 만듭니다.',
    why: '데이터가 배경에 잠기면 가독성과 신뢰가 함께 잠깁니다. 차트 위에 글래스 패널을 올리면 숫자가 흐려집니다.',
  },
  {
    title: '의미 없는 hover translate-y / scale 금지',
    smell: 'hover:-translate-y-2 hover:scale-105',
    description:
      '카드를 hover할 때 위로 떠오르는 패턴은 데모용 SaaS 랜딩의 클리셰입니다. 우리 카드는 hover 시 amber hairline만 켜집니다 (.sk-card-hover).',
    why: '주식 대시보드는 빠른 스캔이 핵심입니다. 마우스가 지나갈 때마다 요소가 튀어오르면 시선이 따라가지 못합니다.',
  },
  {
    title: '이모지 사용 금지',
    smell: "label: '📊 대시보드'",
    description:
      'UI 컴포넌트·페이지·레이아웃·라벨·빈 상태에 이모지 리터럴 금지. 모든 픽토그램은 lucide-react로 통일합니다. (DB에 저장된 사용자 데이터는 예외)',
    why: '이모지는 폰트마다 크기·색·정렬이 다르고 시리어스한 금융 톤을 즉시 무너뜨립니다. lucide는 stroke/사이즈/색을 토큰으로 통제할 수 있습니다.',
  },
  {
    title: 'Inter / 시스템 폰트 회귀 금지',
    smell: "font-family: 'Inter', system-ui",
    description:
      '본문은 Geist Sans, 헤드라인은 Fraunces, 데이터는 JetBrains Mono. Inter는 가독성은 좋지만 어떤 정체성도 만들지 않는 SaaS 기본값입니다.',
    why: '시각 정체성은 폰트에서 시작합니다. 세 폰트의 대비가 페이지를 신문처럼 읽히게 합니다.',
  },
  {
    title: '하드코딩된 색상 값 금지',
    smell: 'style={{ color: "#7c3aed" }}',
    description:
      '#FFFFFF, rgb(...), text-purple-500 같은 raw·테마 외 색을 직접 쓰지 않습니다. 토큰(bg-card, text-foreground, text-success 등)만 사용합니다.',
    why: '토큰 미사용 시 다크 모드에서 깨지고, 디자인 전체 톤을 한 번에 바꿀 수 없게 됩니다.',
  },
  {
    title: 'uppercase tracking-wide 본문 금지',
    smell: 'className="text-xs uppercase tracking-wide text-gray-500"',
    description:
      'small-caps 톤이 필요하면 .eyebrow 클래스를 사용하세요 (mono + 0.14em + 500 weight). uppercase + sans를 본문 라벨에 남발하면 SaaS 톤이 됩니다.',
    why: 'eyebrow는 신문 기사의 카테고리 라벨에서 차용한 패턴입니다. sans-serif uppercase는 그냥 시끄럽기만 합니다.',
  },
  {
    title: 'URL slug 라우팅 금지',
    smell: '/market/[korean-slug]',
    description:
      'URL 경로 파라미터는 UUID 또는 숫자 ID만. 한국어/특수문자가 포함된 slug·title을 라우트 파라미터로 사용하지 않습니다.',
    why: '한국어/특수문자가 URL 인코딩(%xx) 되면 Next params 파싱, 캐시, 링크 생성에서 예측 불가한 버그를 유발합니다.',
  },
  {
    title: '객체 직접 변경 (Mutation) 금지',
    smell: 'arr.sort(...); user.name = "X"',
    description:
      '항상 새 객체를 만듭니다. .sort()는 in-place이므로 [...arr].sort()로 사용. 객체 필드는 spread로 갱신합니다.',
    why: 'React는 참조 비교로 리렌더링을 결정합니다. mutation은 디버깅이 어려운 stale UI를 만듭니다.',
  },
]

export function AntiPatternsSection() {
  return (
    <DsSection
      id="anti-patterns"
      meta="06"
      title="Anti-patterns"
      description="아래 패턴이 보이면 코드 리뷰에서 거부됩니다. 절대 흉내내지 마세요. 각 항목은 LLM이 자주 생성하는 ‘AI 슬롭’ 시그니처에 해당합니다."
    >
      <ul className="grid grid-cols-1 gap-px bg-border-subtle border border-border-subtle overflow-hidden">
        {ANTI_PATTERNS.map((p) => (
          <li key={p.title} className="bg-surface-1 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border border-danger/40 bg-danger-bg text-danger"
              >
                <Ban className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h4 className="font-display text-lg font-semibold leading-tight text-foreground">
                    {p.title}
                  </h4>
                  {p.smell ? (
                    <code className="font-mono text-[11px] text-danger bg-danger-bg/60 px-1.5 py-0.5 rounded-sm">
                      {p.smell}
                    </code>
                  ) : null}
                </div>
                <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{p.description}</p>
                <p className="text-xs text-foreground/65 mt-2 leading-relaxed">
                  <span className="eyebrow mr-2">Why</span>
                  {p.why}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 border border-foreground bg-surface-1 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-semibold">긴급 점검 시:</span> 코드 리뷰 중 위 패턴이 발견되면
            해당 영역을 그대로 두지 말고{' '}
            <span className="font-mono text-foreground">/design-system</span> 페이지의 표준
            컴포넌트로 교체한 PR을 별도로 만드세요. 임시 우회 금지.
          </p>
        </div>
      </div>
    </DsSection>
  )
}
