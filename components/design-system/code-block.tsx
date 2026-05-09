import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  className?: string
  label?: string
}

export function CodeBlock({ code, className, label }: CodeBlockProps) {
  return (
    <div className={cn('mt-3', className)}>
      {label ? (
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
          {label}
        </p>
      ) : null}
      <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs font-mono leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  )
}
