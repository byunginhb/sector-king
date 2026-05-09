import { DsSection, DsSubsection } from './ds-section'

interface TokenSwatch {
  name: string
  varName: string
  description?: string
}

const SHADCN_TOKENS: TokenSwatch[] = [
  { name: 'background', varName: '--background', description: '페이지 기본 배경' },
  { name: 'foreground', varName: '--foreground', description: '본문 텍스트' },
  { name: 'card', varName: '--card', description: '카드/패널 배경' },
  { name: 'card-foreground', varName: '--card-foreground' },
  { name: 'muted', varName: '--muted', description: '보조 영역 배경' },
  { name: 'muted-foreground', varName: '--muted-foreground' },
  { name: 'primary', varName: '--primary', description: '강조/액션 색상' },
  { name: 'primary-foreground', varName: '--primary-foreground' },
  { name: 'accent', varName: '--accent' },
  { name: 'accent-foreground', varName: '--accent-foreground' },
  { name: 'border', varName: '--border', description: '테두리 기본색' },
  { name: 'destructive', varName: '--destructive' },
]

const STATE_COLORS = [
  {
    name: '상승 (Up)',
    cls: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500',
    code: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    name: '하락 (Down)',
    cls: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500',
    code: 'text-rose-600 dark:text-rose-400',
  },
  {
    name: '경고 (Warning)',
    cls: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500',
    code: 'text-amber-600 dark:text-amber-400',
  },
]

const SPACINGS = [1, 2, 3, 4, 5, 6, 8, 10, 12]
const RADII = [
  { name: 'rounded-md', cls: 'rounded-md', size: '6px' },
  { name: 'rounded-lg', cls: 'rounded-lg', size: '8px' },
  { name: 'rounded-xl', cls: 'rounded-xl', size: '12px' },
]
const SHADOWS = [
  { name: 'shadow-sm', cls: 'shadow-sm', desc: '카드 미세 강조' },
  { name: 'shadow', cls: 'shadow', desc: '기본 카드' },
  { name: 'shadow-md', cls: 'shadow-md', desc: '중간 강조' },
  { name: 'shadow-lg', cls: 'shadow-lg', desc: '팝오버/모달' },
]

function ColorSwatch({ token }: { token: TokenSwatch }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div
        className="h-12 w-full rounded-md border border-border"
        style={{ background: `hsl(var(${token.varName}))` }}
        aria-hidden="true"
      />
      <p className="mt-2 text-sm font-semibold text-foreground">{token.name}</p>
      <p className="font-mono text-[11px] text-muted-foreground">{token.varName}</p>
      {token.description ? (
        <p className="mt-1 text-xs text-muted-foreground">{token.description}</p>
      ) : null}
    </div>
  )
}

function ThemePreview({ mode, children }: { mode: 'light' | 'dark'; children: React.ReactNode }) {
  return (
    <div
      className={
        mode === 'dark'
          ? 'dark rounded-xl border border-border bg-background p-4'
          : 'rounded-xl border border-border bg-background p-4'
      }
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
    </div>
  )
}

export function FoundationsSection() {
  return (
    <DsSection
      id="foundations"
      title="Foundations (기반)"
      description="색상 토큰, 타이포그래피, 간격, 반경, 그림자 등 디자인의 기본 단위를 정의합니다."
    >
      <DsSubsection
        title="색상 팔레트 (shadcn 토큰)"
        description="라이트/다크 모드 동시 미리보기. 토큰 변경은 globals.css에서만."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ThemePreview mode="light">
            {SHADCN_TOKENS.map((t) => (
              <ColorSwatch key={`light-${t.name}`} token={t} />
            ))}
          </ThemePreview>
          <ThemePreview mode="dark">
            {SHADCN_TOKENS.map((t) => (
              <ColorSwatch key={`dark-${t.name}`} token={t} />
            ))}
          </ThemePreview>
        </div>
      </DsSubsection>

      <DsSubsection title="상태 색상 (Up / Down / Warning)" description="등락률 등 의미를 가진 색.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STATE_COLORS.map((c) => (
            <div key={c.name} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className={`inline-block h-8 w-8 rounded-md ${c.bg}`} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className={`text-xs ${c.cls}`}>+12.34%</p>
                </div>
              </div>
              <p className="mt-3 font-mono text-[11px] text-muted-foreground break-all">{c.code}</p>
            </div>
          ))}
        </div>
      </DsSubsection>

      <DsSubsection title="타이포그래피">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-foreground">
              H1 — 페이지 타이틀
            </h1>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">
              text-3xl sm:text-4xl font-bold leading-tight
            </p>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">H2 — 섹션 타이틀</h2>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">
              text-xl sm:text-2xl font-bold
            </p>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground">H3 — 카드 그룹 타이틀</h3>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">
              text-lg sm:text-xl font-bold
            </p>
          </div>
          <div>
            <h4 className="text-base font-bold leading-tight text-foreground">H4 — 카드 제목</h4>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">
              text-base font-bold leading-tight
            </p>
          </div>
          <div>
            <p className="text-sm text-foreground">
              본문 텍스트 (body) — Sector King은 산업과 섹터의 자금 흐름을 시각화합니다.
            </p>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">text-sm</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">caption — 보조 설명, 메타 정보</p>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">
              text-xs text-muted-foreground
            </p>
          </div>
          <div>
            <p className="font-mono text-sm text-foreground">mono — $1,234.56 +2.34%</p>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">font-mono text-sm</p>
          </div>
        </div>
      </DsSubsection>

      <DsSubsection title="간격 (Spacing)" description="Tailwind spacing scale (1unit = 0.25rem).">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          {SPACINGS.map((n) => (
            <div key={n} className="flex items-center gap-3 text-xs">
              <span className="w-10 font-mono text-muted-foreground">p-{n}</span>
              <span
                className="inline-block h-3 rounded-sm bg-primary/70"
                style={{ width: `${n * 0.25}rem` }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">{n * 0.25}rem</span>
            </div>
          ))}
        </div>
      </DsSubsection>

      <DsSubsection title="반경 (Radius)">
        <div className="grid grid-cols-3 gap-3">
          {RADII.map((r) => (
            <div key={r.name} className="rounded-xl border border-border bg-card p-4 text-center">
              <div
                className={`mx-auto mb-2 h-14 w-14 border border-border bg-muted ${r.cls}`}
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.size}</p>
            </div>
          ))}
        </div>
      </DsSubsection>

      <DsSubsection title="그림자 (Shadow)" description="카드와 팝오버에 사용.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SHADOWS.map((s) => (
            <div key={s.name} className="text-center">
              <div
                className={`mx-auto mb-2 h-16 w-full rounded-lg border border-border bg-card ${s.cls}`}
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </DsSubsection>
    </DsSection>
  )
}
