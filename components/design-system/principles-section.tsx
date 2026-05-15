import { DsSection, DsSubsection } from './ds-section'

const PRINCIPLES = [
  {
    n: '01',
    title: '데이터에 봉사하고, 자신을 자랑하지 않는다',
    body: '대시보드는 화면이 아니라 신문이다. 차트·표·티커가 주인공이고, 컨테이너는 보조 그리드일 뿐. 우리는 카드를 띄우려고 그림자를 쓰지 않는다. 1px hairline과 여백, 그리고 시리프 헤드라인이 위계를 만든다.',
  },
  {
    n: '02',
    title: 'Amber는 단 하나의 시그널이다',
    body: '브랜드 색(앰버 #C68A28 / dark #E5B14C)은 가장 중요한 신호 한 군데에만 쓴다. 두 번째 호출이 필요하면 그건 잘못 설계된 화면이다. 위/아래는 slate-teal·slate-rose가 맡고, 나머지는 잉크 색조만으로 위계를 만든다.',
  },
  {
    n: '03',
    title: '세 개의 목소리: 시리프, 산세리프, 모노',
    body: 'Fraunces (시리프 디스플레이)는 헤드라인과 페이지의 정체성을 맡는다. Geist (산세리프)는 본문과 UI를 운반한다. JetBrains Mono는 가격·티커·숫자 데이터의 칼럼 정렬을 책임진다. 한 폰트로 모든 걸 해결하려는 시도는 SaaS 슬롭이다.',
  },
  {
    n: '04',
    title: '그라데이션 없음, 글로우 없음, 떠다니는 요소 없음',
    body: '보라색 그라데이션, 글래스모피즘, hover translate-y-1, "와우" 애니메이션 — 모두 AI 생성물의 흔적이다. 우리는 정직한 평면 위에서 hairline과 타이포만으로 깊이를 만든다. 애니메이션은 의미(데이터 변화)를 전달할 때만.',
  },
  {
    n: '05',
    title: '숫자는 tabular, 라벨은 small-caps',
    body: '모든 숫자는 tabular-nums + slashed-zero. 칼럼이 떨리지 않게. 보조 라벨은 mono uppercase + 0.14em letter-spacing (`.eyebrow` 클래스). 일반 본문에 uppercase tracking-wide를 남발하지 않는다.',
  },
  {
    n: '06',
    title: '레퍼런스는 신문이지 SaaS가 아니다',
    body: '영감 출처: Bloomberg Businessweek, FT 인쇄판, Stripe Press, Linear changelog, Pitchfork review pages. 영감 금지 출처: 일반 노션 템플릿, ChatGPT 데모, 보라색 SaaS 랜딩, Apple Health-스러운 dolphin gradient.',
  },
]

export function PrinciplesSection() {
  return (
    <DsSection
      id="principles"
      meta="01"
      title="Principles"
      description="이 디자인 시스템의 6가지 원칙. 새 컴포넌트나 페이지를 만들기 전에 모두 읽어주세요. 원칙과 충돌하는 결정은 코드 리뷰에서 거부됩니다."
    >
      <DsSubsection title="Six Rules of the House" hint="Read before you draw">
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border-subtle border border-border-subtle rounded-md overflow-hidden">
          {PRINCIPLES.map((p) => (
            <li
              key={p.n}
              className="bg-surface-1 p-6 grid grid-cols-[40px_1fr] gap-4 items-start"
            >
              <span className="eyebrow eyebrow-accent tabular-nums">{p.n}</span>
              <div>
                <h4 className="font-display text-lg font-semibold leading-snug text-foreground">
                  {p.title}
                </h4>
                <p className="text-sm text-foreground/75 mt-2 leading-relaxed">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </DsSubsection>

      <DsSubsection
        title="The voice, on display"
        description="이 페이지의 헤드라인이 곧 톤 선언입니다. 다른 데서 이걸 흉내내지 마세요 — 이 헤드라인은 디자인 시스템 홈에서만 등장하는 단발 트로피입니다."
        hint="Solo headline"
      >
        <figure className="border border-border-subtle bg-surface-1 p-8 sm:p-12">
          <p className="eyebrow eyebrow-accent mb-6">Sample · Vol. 02</p>
          <p className="display text-3xl sm:text-5xl text-foreground">
            On the night NVIDIA cleared four trillion,
            <br />
            <span className="display-italic">we counted ink, not cash.</span>
          </p>
          <hr className="sk-rule mt-8" />
          <p className="text-xs eyebrow mt-4">Fraunces · opsz 144 · SOFT 30 · italic 50</p>
        </figure>
      </DsSubsection>
    </DsSection>
  )
}
