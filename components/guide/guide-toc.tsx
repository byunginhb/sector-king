interface TocItem {
  href: string
  label: string
}

const TOC_ITEMS: TocItem[] = [
  { href: '#what', label: 'A. 이게 뭔가요' },
  { href: '#numbers', label: 'B. 숫자 사전' },
  { href: '#screens', label: 'C. 화면별 읽는 법' },
  { href: '#valuation', label: 'D. 밸류에이션 지표' },
  { href: '#limits', label: 'E. 주의사항' },
]

/** /guide 앵커 목차. methodology 의 nav 패턴 재사용. */
export function GuideToc() {
  return (
    <nav
      aria-label="목차"
      className="mb-8 rounded-xl border border-border bg-card p-4"
    >
      <p className="mb-2 text-sm font-semibold text-foreground">목차</p>
      <ol className="grid grid-cols-2 gap-1 text-sm text-muted-foreground sm:grid-cols-4">
        {TOC_ITEMS.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
