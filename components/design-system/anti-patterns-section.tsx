import { AlertTriangle } from 'lucide-react'
import { DsSection } from './ds-section'

const ANTI_PATTERNS = [
  {
    title: '이모지 사용 금지',
    description:
      'UI 컴포넌트, 페이지, 레이아웃 파일에 이모지 리터럴을 사용하지 않는다. 네비게이션·버튼·배지·카드·빈 상태 등 모든 UI 요소는 lucide-react 아이콘으로 표현한다. (DB에 저장된 사용자 데이터는 예외)',
    why: '이모지는 서비스 퀄리티를 낮추고 AI가 만든 느낌을 준다. lucide-react 아이콘은 디자인 일관성을 유지하고 색상·크기 제어가 용이하다.',
  },
  {
    title: 'URL slug 기반 라우팅 금지',
    description:
      'URL 경로 파라미터에는 반드시 UUID 또는 숫자 ID만 사용한다. 한국어·특수문자가 포함된 slug나 title을 라우트 파라미터로 사용하지 않는다.',
    why: '한국어·특수문자가 포함된 문자열은 URL 인코딩(%xx) 시 프레임워크의 params 파싱, 캐시, 링크 생성에서 예측 불가한 버그를 유발한다. slug는 DB에 저장하되 라우팅 파라미터로는 사용하지 않는다.',
  },
  {
    title: '하드코딩된 색상 값 금지',
    description:
      '#FFFFFF, rgb(...) 같은 raw 색상값을 컴포넌트에 직접 쓰지 않는다. 항상 shadcn 토큰(bg-card, text-foreground 등) 또는 의미가 명확한 Tailwind 색상(text-emerald-600 등)을 사용한다.',
    why: '토큰 미사용 시 다크 모드에서 깨지고 디자인 변경 시 일괄 수정이 불가능하다.',
  },
  {
    title: '상태 변경 (Mutation) 금지',
    description:
      '객체/배열을 직접 변경하지 않고 항상 새 객체를 만든다. .sort()는 in-place 변경이므로 [...arr].sort()로 사용한다.',
    why: 'React는 참조 비교로 리렌더링을 결정한다. mutation은 디버깅이 어려운 stale UI를 만든다.',
  },
]

export function AntiPatternsSection() {
  return (
    <DsSection
      id="anti-patterns"
      title="Anti-patterns (피해야 할 패턴)"
      description="아래 패턴은 절대 사용하지 않는다. 예시 코드를 노출하지 않고 텍스트로만 명시한다."
    >
      <div className="space-y-3">
        {ANTI_PATTERNS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h4 className="text-base font-bold leading-tight text-foreground">{p.title}</h4>
                <p className="text-sm text-foreground/80 mt-1">{p.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-semibold">Why: </span>
                  {p.why}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DsSection>
  )
}
