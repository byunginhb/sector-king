import { DsSection, DsSubsection } from './ds-section'

interface TokenSwatch {
  name: string
  varName: string
  description?: string
  accent?: boolean
}

const SURFACE_TOKENS: TokenSwatch[] = [
  { name: 'background', varName: '--background', description: '페이지 캔버스 (newsprint / charcoal)' },
  { name: 'surface-1', varName: '--surface-1', description: '카드 베이스' },
  { name: 'surface-2', varName: '--surface-2', description: 'hover / nested' },
  { name: 'surface-3', varName: '--surface-3', description: 'elevated / pressed' },
  { name: 'foreground', varName: '--foreground', description: '본문 잉크' },
  { name: 'muted-foreground', varName: '--muted-foreground', description: '보조 텍스트' },
  { name: 'border', varName: '--border', description: '기본 hairline' },
  { name: 'border-subtle', varName: '--border-subtle', description: '약한 hairline' },
]

const ACCENT_TOKENS: TokenSwatch[] = [
  { name: 'primary', varName: '--primary', description: '단일 amber 시그널', accent: true },
  { name: 'primary-foreground', varName: '--primary-foreground' },
  { name: 'accent', varName: '--accent', description: 'amber tint 배경' },
  { name: 'accent-foreground', varName: '--accent-foreground' },
  { name: 'ring', varName: '--ring', description: 'focus ring' },
]

const STATE_TOKENS: TokenSwatch[] = [
  { name: 'success', varName: '--success', description: '상승 (slate-teal)' },
  { name: 'success-bg', varName: '--success-bg' },
  { name: 'danger', varName: '--danger', description: '하락 (slate-rose)' },
  { name: 'danger-bg', varName: '--danger-bg' },
  { name: 'warning', varName: '--warning' },
  { name: 'info', varName: '--info' },
]

const CHART_TOKENS: TokenSwatch[] = [
  { name: 'chart-1', varName: '--chart-1', description: 'amber (signal)' },
  { name: 'chart-2', varName: '--chart-2', description: 'slate teal' },
  { name: 'chart-3', varName: '--chart-3', description: 'slate blue' },
  { name: 'chart-4', varName: '--chart-4', description: 'aubergine' },
  { name: 'chart-5', varName: '--chart-5', description: 'slate rose' },
  { name: 'chart-6', varName: '--chart-6', description: 'burnt orange' },
  { name: 'chart-7', varName: '--chart-7', description: 'slate cyan' },
  { name: 'chart-8', varName: '--chart-8', description: 'moss' },
]

const SPACINGS = [1, 2, 3, 4, 5, 6, 8, 10, 12]
const RADII = [
  { name: 'rounded-sm', cls: 'rounded-sm', size: 'calc(radius - 2px)' },
  { name: 'rounded-md', cls: 'rounded-md', size: 'radius (default)' },
  { name: 'rounded-lg', cls: 'rounded-lg', size: 'calc(radius + 2px)' },
  { name: 'rounded-xl', cls: 'rounded-xl', size: 'calc(radius + 4px)' },
]

function ColorSwatch({ token }: { token: TokenSwatch }) {
  return (
    <div className="bg-surface-1 border border-border-subtle p-3">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 border border-border"
          style={{ background: `hsl(var(${token.varName}))` }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{token.name}</p>
          <p className="font-mono text-[10px] text-muted-foreground truncate">{token.varName}</p>
        </div>
      </div>
      {token.description ? (
        <p className="mt-2 text-[11px] text-foreground/65 leading-snug">{token.description}</p>
      ) : null}
    </div>
  )
}

function ThemePreview({
  mode,
  label,
  children,
}: {
  mode: 'light' | 'dark'
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className={
        mode === 'dark'
          ? 'dark border border-foreground/20 bg-background'
          : 'border border-foreground/20 bg-background'
      }
    >
      <div className="flex items-baseline justify-between border-b border-border-subtle px-4 py-2">
        <p className="eyebrow">{label}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {mode === 'dark' ? 'html.dark' : 'html:root'}
        </p>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{children}</div>
    </div>
  )
}

export function FoundationsSection() {
  return (
    <DsSection
      id="foundations"
      meta="02"
      title="Foundations"
      description="색상 토큰, 타이포그래피, 간격, 반경, hairline. 모든 화면은 이 토큰만 사용합니다. globals.css 단일 파일에서 톤을 통째로 갈아끼울 수 있습니다."
    >
      {/* ─────────────────── Color Tokens ─────────────────── */}
      <DsSubsection
        title="Surface & Ink"
        hint="--background / --surface-* / --foreground"
        description="라이트(신문지 톤)와 다크(터미널 차콜) 모두 동시 미리보기. 다크가 기본 발표 톤입니다."
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ThemePreview mode="light" label="Light · Newsprint">
            {SURFACE_TOKENS.map((t) => (
              <ColorSwatch key={`l-${t.name}`} token={t} />
            ))}
          </ThemePreview>
          <ThemePreview mode="dark" label="Dark · Terminal">
            {SURFACE_TOKENS.map((t) => (
              <ColorSwatch key={`d-${t.name}`} token={t} />
            ))}
          </ThemePreview>
        </div>
      </DsSubsection>

      <DsSubsection title="Amber — the only signal" hint="Single accent">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ThemePreview mode="light" label="Light">
            {ACCENT_TOKENS.map((t) => (
              <ColorSwatch key={`la-${t.name}`} token={t} />
            ))}
          </ThemePreview>
          <ThemePreview mode="dark" label="Dark">
            {ACCENT_TOKENS.map((t) => (
              <ColorSwatch key={`da-${t.name}`} token={t} />
            ))}
          </ThemePreview>
        </div>
      </DsSubsection>

      <DsSubsection
        title="State — Up / Down / Warning"
        hint="slate-tinted, not neon"
        description="상승은 slate-teal, 하락은 slate-rose. 형광 emerald·red 사용 금지."
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ThemePreview mode="light" label="Light">
            {STATE_TOKENS.map((t) => (
              <ColorSwatch key={`ls-${t.name}`} token={t} />
            ))}
          </ThemePreview>
          <ThemePreview mode="dark" label="Dark">
            {STATE_TOKENS.map((t) => (
              <ColorSwatch key={`ds-${t.name}`} token={t} />
            ))}
          </ThemePreview>
        </div>
      </DsSubsection>

      <DsSubsection
        title="Chart palette"
        hint="recharts 일관"
        description="모든 차트는 --chart-1 ~ --chart-8 만 사용. amber는 항상 신호 시리즈에만."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {CHART_TOKENS.map((t) => (
            <ColorSwatch key={t.name} token={t} />
          ))}
        </div>
      </DsSubsection>

      {/* ─────────────────── Typography ─────────────────── */}
      <DsSubsection
        title="Three Voices — Display · Sans · Mono"
        hint="Fraunces · Geist · JetBrains Mono"
        description="한 폰트로 모든 위계를 해결하지 않습니다. 헤드라인은 시리프(Fraunces), 본문은 산세리프(Geist), 데이터·티커는 모노(JetBrains Mono)."
      >
        <div className="border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          {/* Display row */}
          <TypeRow eyebrow="Display · Fraunces" hint="opsz 144 · SOFT 30">
            <p className="display text-4xl sm:text-5xl text-foreground">
              KOSPI · NDX · the Map of Capital
            </p>
            <p className="display display-italic text-2xl sm:text-3xl text-foreground/80 mt-1">
              and the sectors that move them
            </p>
          </TypeRow>

          {/* Sans body row */}
          <TypeRow eyebrow="Body · Geist Sans" hint="rlig · calt · ss01">
            <p className="text-base text-foreground leading-relaxed max-w-2xl">
              Sector King은 산업과 섹터의 자금 흐름을 시각화합니다. 본문은 Geist Sans가 운반하며,
              가독성을 위해 letter-spacing -0.01em, line-height 1.6을 표준으로 합니다.
            </p>
            <p className="text-sm text-foreground/75 mt-2 max-w-2xl">
              Smaller body — 보조 설명, 카드 내부 설명에 사용.
            </p>
            <p className="text-xs text-muted-foreground mt-2">caption — 메타 정보·각주</p>
          </TypeRow>

          {/* Mono data row */}
          <TypeRow eyebrow="Data · JetBrains Mono" hint="tabular · slashed-zero">
            <div className="grid grid-cols-3 gap-x-6 gap-y-1 max-w-md font-mono text-foreground tabular-nums">
              <p className="num-mono text-2xl">$4.21T</p>
              <p className="num-mono text-2xl text-success">+1.82%</p>
              <p className="num-mono text-2xl text-danger">-0.63%</p>
              <p className="num-mono text-xs text-muted-foreground">prev 4.13T</p>
              <p className="num-mono text-xs text-muted-foreground">d/d</p>
              <p className="num-mono text-xs text-muted-foreground">14d</p>
            </div>
          </TypeRow>

          {/* Eyebrow row */}
          <TypeRow eyebrow="Eyebrow label" hint=".eyebrow">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Section · 04 · Components</p>
              <p className="eyebrow eyebrow-accent">Hot Sector · Today</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              사용처: 카드 상단 라벨, 섹션 chip, KPI 라벨. uppercase + 0.14em + mono.
            </p>
          </TypeRow>
        </div>
      </DsSubsection>

      {/* ─────────────────── Geometry ─────────────────── */}
      <DsSubsection title="Spacing" hint="Tailwind scale · 1u = 0.25rem">
        <div className="border border-border-subtle bg-surface-1 p-4 space-y-1.5">
          {SPACINGS.map((n) => (
            <div key={n} className="flex items-center gap-3 text-xs">
              <span className="w-10 font-mono text-muted-foreground">p-{n}</span>
              <span
                className="inline-block h-2 bg-primary/80"
                style={{ width: `${n * 0.25}rem` }}
                aria-hidden="true"
              />
              <span className="font-mono text-muted-foreground tabular-nums">
                {n * 0.25}rem · {n * 4}px
              </span>
            </div>
          ))}
        </div>
      </DsSubsection>

      <DsSubsection
        title="Radius"
        hint="--radius = 0.375rem"
        description="라디우스는 작게. 둥근 모서리가 친근해 보일수록 SaaS 톤에 가까워집니다."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RADII.map((r) => (
            <div key={r.name} className="border border-border-subtle bg-surface-1 p-4 text-center">
              <div
                className={`mx-auto mb-3 h-14 w-14 border border-foreground/30 bg-muted ${r.cls}`}
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-foreground">{r.name}</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{r.size}</p>
            </div>
          ))}
        </div>
      </DsSubsection>

      <DsSubsection
        title="Hairline & Rules"
        hint="1px border on hsl(var(--border))"
        description="그림자 대신 hairline으로 위계를 만듭니다. .sk-rule은 일반 디바이더, .sk-rule-double은 신문 칼럼 사이의 더블 룰입니다."
      >
        <div className="border border-border-subtle bg-surface-1 p-6 space-y-6">
          <div>
            <p className="eyebrow mb-2">Single rule · .sk-rule</p>
            <hr className="sk-rule" />
          </div>
          <div>
            <p className="eyebrow mb-2">Double rule · .sk-rule-double</p>
            <hr className="sk-rule-double" />
          </div>
          <div>
            <p className="eyebrow mb-2">Statline · .sk-statline</p>
            <dl>
              <div className="sk-statline">
                <dt className="label">Market Cap</dt>
                <dd className="value">$4,213.84B</dd>
              </div>
              <div className="sk-statline">
                <dt className="label">d/d</dt>
                <dd className="value text-success">+1.82%</dd>
              </div>
              <div className="sk-statline">
                <dt className="label">Hot Sector</dt>
                <dd className="value">Semiconductors</dd>
              </div>
            </dl>
          </div>
        </div>
      </DsSubsection>
    </DsSection>
  )
}

function TypeRow({
  eyebrow,
  hint,
  children,
}: {
  eyebrow: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3 md:gap-6 p-5">
      <div className="flex flex-col gap-1">
        <p className="eyebrow eyebrow-accent">{eyebrow}</p>
        {hint ? <p className="font-mono text-[10px] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
