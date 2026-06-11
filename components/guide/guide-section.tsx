interface GuideSectionProps {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}

/** /guide 공통 섹션 래퍼. h2 에 id + scroll-mt 로 앵커 점프 지원. */
export function GuideSection({ id, title, description, children }: GuideSectionProps) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2
        id={id}
        className="scroll-mt-20 text-xl font-bold text-foreground"
      >
        <span id={`${id}-heading`}>{title}</span>
      </h2>
      {description && (
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{description}</p>
      )}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  )
}
