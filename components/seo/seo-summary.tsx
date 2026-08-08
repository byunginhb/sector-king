import Link from 'next/link'
import { DATA_SOURCE, UPDATE_CADENCE } from '@/lib/site-facts'

/**
 * 초기 HTML 용 요약 블록 (Server Component).
 *
 * 각 페이지의 `<Suspense fallback={...}>` 자리에 넣는다. 해당 페이지의 클라이언트 트리가
 * `useSearchParams()` 때문에 정적 프리렌더에서 CSR 로 빠지므로, **여기 렌더링된 HTML 이
 * JS 를 실행하지 않는 크롤러·답변 엔진이 실제로 읽는 내용**이 된다. 하이드레이션이 끝나면
 * 인터랙티브 화면이 이 자리를 대체하므로 사용자에게 중복 노출되지 않는다.
 *
 * 크롤러 전용 텍스트가 아니라 로딩 중 사용자도 읽는 내용이어야 한다(cloaking 금지).
 * 화면에 없는 수치·주장·날짜를 여기에만 적지 말 것.
 */

export interface SeoSummaryTable {
  caption: string
  head: string[]
  rows: {
    /** 첫 칸을 링크로 만들 경로. 없으면 텍스트. */
    href?: string
    cells: React.ReactNode[]
  }[]
}

export interface SeoSummaryProps {
  h1: string
  /** 검색 의도에 대한 2~4문장 직접 답변. */
  answer: string
  /** 이 수치를 어떻게 읽어야 하는가. */
  interpretation?: string
  /** 이 수치가 의미하지 *않는* 것 — 오해를 막는 문장. */
  caveat?: string
  /** 데이터 기준일 (YYYY-MM-DD). */
  dataDate?: string | null
  /** 기간 비교를 쓰는 페이지의 비교 시작일. */
  baseDate?: string | null
  table?: SeoSummaryTable
  /** 상위·하위·관련 페이지로 가는 실제 anchor. */
  links?: { href: string; label: string }[]
}

export function SeoSummary({
  h1,
  answer,
  interpretation,
  caveat,
  dataDate,
  baseDate,
  table,
  links,
}: SeoSummaryProps) {
  return (
    <main className="container mx-auto px-4 py-8 sm:py-10">
      <header className="max-w-3xl">
        <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          {h1}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
        {dataDate ? (
          <p className="mt-3 text-xs text-muted-foreground">
            데이터 기준일 {dataDate}
            {baseDate ? ` (기간 비교 시작일 ${baseDate})` : ''} · 갱신 {UPDATE_CADENCE} · 출처{' '}
            {DATA_SOURCE}
          </p>
        ) : null}
      </header>

      {table ? (
        <div className="sk-card mt-8 overflow-x-auto p-5">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="mb-3 text-left text-xs text-muted-foreground">
              {table.caption}
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                {table.head.map((label) => (
                  <th key={label} scope="col" className="py-2 pr-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-0">
                  {row.cells.map((cell, j) => (
                    <td key={j} className="py-2 pr-4 text-foreground">
                      {j === 0 && row.href ? (
                        <Link href={row.href} className="text-info hover:underline">
                          {cell}
                        </Link>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {interpretation || caveat ? (
        <div className="mt-8 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          {interpretation ? <p>{interpretation}</p> : null}
          {caveat ? (
            <p>
              <strong className="text-foreground">이 수치가 의미하지 않는 것 — </strong>
              {caveat}
            </p>
          ) : null}
        </div>
      ) : null}

      <nav className="mt-8" aria-label="관련 페이지">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {(links ?? []).map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-info hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/methodology" className="text-info hover:underline">
              산출 방법론
            </Link>
          </li>
          <li>
            <Link href="/guide" className="text-info hover:underline">
              지표 정의 · 이용 안내
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}
