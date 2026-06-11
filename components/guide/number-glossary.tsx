import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { GuideSection } from './guide-section'
import { NUMBER_GLOSSARY } from './number-glossary-data'

/** 섹션 B — 숫자 사전 카드 그리드(항상 펼쳐 노출). */
export function NumberGlossary() {
  return (
    <GuideSection
      id="numbers"
      title="B. 숫자 사전"
      description="화면에 나오는 핵심 숫자들이 무슨 뜻인지, 어떻게 읽는지 정리했습니다."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {NUMBER_GLOSSARY.map((entry) => {
          const Icon = entry.icon
          return (
            <div
              key={entry.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-5 w-5 shrink-0 text-info" aria-hidden />
                <h3 className="text-base font-semibold text-foreground">
                  {entry.term}
                </h3>
                {entry.english && (
                  <span className="text-xs text-muted-foreground">
                    {entry.english}
                  </span>
                )}
              </div>

              <p className="text-sm text-foreground">{entry.definition}</p>

              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-muted-foreground">
                    이렇게 읽으세요
                  </dt>
                  <dd className="text-muted-foreground">{entry.howToRead}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-muted-foreground">
                    비유
                  </dt>
                  <dd className="text-muted-foreground">{entry.analogy}</dd>
                </div>
              </dl>

              {entry.caution && (
                <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
                  {entry.caution}
                </p>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-sm">
                {entry.links.map((link) => (
                  <Link
                    key={`${entry.id}-${link.href}-${link.label}`}
                    href={link.href}
                    className="inline-flex items-center gap-1 text-info hover:underline"
                  >
                    {link.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ))}
                {entry.methodologyHref && (
                  <Link
                    href={entry.methodologyHref}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden />
                    자세한 산식
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </GuideSection>
  )
}
