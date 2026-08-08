import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/**
 * `/guide/{slug}` 설명 문서의 공통 뼈대 (Server Component).
 *
 * 이 글들은 검색 의도에 직접 답하는 문서라 초기 HTML 에 본문이 전부 있어야 한다.
 * 클라이언트 상태를 쓰지 않으므로 정적 프리렌더된다.
 *
 * 공통 요소는 감사 리포트의 페이지 구성 체크리스트를 따른다 — 고유 H1, 2~4문장 직접 답변,
 * 최종 수정일, 근거·출처, 관련 문서 링크. 화면에 없는 저자·날짜를 마크업에만 넣지 않는다.
 */

export interface GuideSection {
  id: string
  heading: string
  body: React.ReactNode
}

export interface GuideArticleProps {
  /** 이 문서의 사이트 내 경로 (예: '/guide/sector-rotation', '/data-sources'). */
  href: string
  /** 빵부스러기 상위. 생략하면 이용 안내. */
  parent?: { href: string; label: string }
  /** 브라우저 탭·검색 결과 제목 (브랜드는 layout template 이 붙인다). */
  title: string
  /** 페이지 H1. title 과 달라도 된다. */
  h1: string
  /** 검색 의도에 대한 2~4문장 직접 답변. */
  lead: string
  /** 본문 실제 개정일 (YYYY-MM-DD). JSON-LD 와 같은 값을 쓴다. */
  updatedAt: string
  sections: GuideSection[]
  related?: { href: string; label: string }[]
}

const DEFAULT_PARENT = { href: '/guide', label: '이용 안내' }

export function GuideArticle({
  href,
  parent = DEFAULT_PARENT,
  title,
  h1,
  lead,
  updatedAt,
  sections,
  related,
}: GuideArticleProps) {
  const url = `${BASE_URL}${href}`

  return (
    <div className="min-h-screen">
      <ArticleJsonLd url={url} headline={title} description={lead} updatedAt={updatedAt} />
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: parent.label, url: `${BASE_URL}${parent.href}` },
          { name: h1, url },
        ]}
      />

      <GlobalTopBar subtitle={parent.label} />

      <main className="container mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <nav className="mb-4 text-sm" aria-label="상위 페이지">
          <Link
            href={parent.href}
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {parent.label}
          </Link>
        </nav>

        <header>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            {h1}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{lead}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            최종 수정 {updatedAt} · 작성 Sector King 운영팀
          </p>
        </header>

        {/* 문서가 길어 목차를 둔다 — 앵커라 JS 없이도 동작한다. */}
        {sections.length > 2 ? (
          <nav className="sk-card mt-8 p-5" aria-label="목차">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              목차
            </p>
            <ol className="mt-3 space-y-1.5 text-sm">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <Link href={`#${section.id}`} className="text-info hover:underline">
                    {i + 1}. {section.heading}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="mt-8 space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20">
              <h2 className="font-display text-lg font-semibold text-foreground sm:text-xl">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-10 border-t border-border pt-6" aria-label="관련 문서">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            함께 보기
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {(related ?? []).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-info hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/methodology" className="text-info hover:underline">
                산출 방법론
              </Link>
            </li>
            <li>
              <Link href="/data-sources" className="text-info hover:underline">
                데이터 출처
              </Link>
            </li>
          </ul>
        </nav>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          이 문서는 지표를 어떻게 읽는지 설명하는 자료이며 투자 권유가 아닙니다. 투자 판단과
          그 결과는 이용자 본인에게 있습니다.
        </p>
      </main>
    </div>
  )
}
