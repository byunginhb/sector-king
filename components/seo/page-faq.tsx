import { FaqJsonLd } from '@/components/json-ld'

export function PageFaq({
  items,
}: {
  items: { question: string; answer: string }[]
}) {
  return (
    <section
      className="container mx-auto px-4 pb-10 pt-4"
      aria-labelledby="page-faq-heading"
    >
      <FaqJsonLd items={items} />
      <div className="sk-card p-5 sm:p-6">
        <h2
          id="page-faq-heading"
          className="font-display text-lg font-semibold text-foreground"
        >
          자주 묻는 질문
        </h2>
        <div className="mt-5 max-w-3xl space-y-5">
          {items.map(({ question, answer }) => (
            <div key={question}>
              <h3 className="text-sm font-semibold text-foreground">
                {question}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
