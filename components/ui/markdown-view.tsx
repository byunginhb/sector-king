/**
 * MarkdownView — XSS-safe 마크다운 렌더 컴포넌트.
 *
 * - GFM (테이블, 체크박스, 자동 링크) 지원
 * - rehype-sanitize allowlist 로 `<script>`, `<iframe>`, `on*=`, `javascript:` URL 차단
 * - 외부 링크는 `target="_blank" rel="noopener noreferrer nofollow"` 강제
 * - 디자인 토큰(`bg-surface-2`, `border-subtle`, `text-foreground`, `text-muted-foreground`) 사용
 *
 * Tailwind v4 환경 + `@tailwindcss/typography` 미설치 → prose 클래스 의존 없이
 * 컴포넌트별 명시 스타일을 적용한다.
 */
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { cn } from '@/lib/utils'

interface MarkdownViewProps {
  content: string
  className?: string
}

// 사용자 입력에 안전한 schema — defaultSchema 기반에 링크 target/rel 만 추가 허용.
// `javascript:` 등 위험 URL 은 defaultSchema 의 protocol allowlist 가 차단한다.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), 'target', 'rel'],
  },
}

export function MarkdownView({ content, className }: MarkdownViewProps) {
  return (
    <div
      className={cn(
        'text-sm leading-relaxed text-foreground break-words',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          h1: ({ className, ...props }) => (
            <h1
              {...props}
              className={cn(
                'text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0',
                className
              )}
            />
          ),
          h2: ({ className, ...props }) => (
            <h2
              {...props}
              className={cn(
                'text-base font-semibold text-foreground mt-4 mb-2 first:mt-0',
                className
              )}
            />
          ),
          h3: ({ className, ...props }) => (
            <h3
              {...props}
              className={cn(
                'text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0',
                className
              )}
            />
          ),
          p: ({ className, ...props }) => (
            <p
              {...props}
              className={cn('my-2 first:mt-0 last:mb-0', className)}
            />
          ),
          a: ({ className, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={cn(
                'text-primary underline underline-offset-2 hover:opacity-80',
                className
              )}
            />
          ),
          ul: ({ className, ...props }) => (
            <ul
              {...props}
              className={cn('list-disc pl-5 my-2 space-y-1', className)}
            />
          ),
          ol: ({ className, ...props }) => (
            <ol
              {...props}
              className={cn('list-decimal pl-5 my-2 space-y-1', className)}
            />
          ),
          li: ({ className, ...props }) => (
            <li {...props} className={cn('marker:text-muted-foreground', className)} />
          ),
          blockquote: ({ className, ...props }) => (
            <blockquote
              {...props}
              className={cn(
                'border-l-4 border-border-subtle bg-surface-2/40 pl-3 py-1 my-2 text-muted-foreground italic',
                className
              )}
            />
          ),
          code: ({ className, children, ...rest }) => {
            const isBlock = /language-/.test(className ?? '')
            if (isBlock) {
              return (
                <code className={cn('font-mono text-[0.85em]', className)} {...rest}>
                  {children}
                </code>
              )
            }
            return (
              <code
                className={cn(
                  'rounded bg-surface-2 px-1.5 py-0.5 text-[0.85em] font-mono text-foreground',
                  className
                )}
                {...rest}
              >
                {children}
              </code>
            )
          },
          pre: ({ className, ...props }) => (
            <pre
              {...props}
              className={cn(
                'rounded-lg bg-surface-2 border border-border-subtle p-3 my-2 overflow-x-auto text-xs',
                className
              )}
            />
          ),
          hr: ({ className, ...props }) => (
            <hr
              {...props}
              className={cn('my-4 border-border-subtle', className)}
            />
          ),
          table: ({ className, ...props }) => (
            <div className="my-2 overflow-x-auto">
              <table
                {...props}
                className={cn(
                  'min-w-full border-collapse text-xs',
                  className
                )}
              />
            </div>
          ),
          thead: ({ className, ...props }) => (
            <thead
              {...props}
              className={cn('bg-surface-2 text-foreground', className)}
            />
          ),
          th: ({ className, ...props }) => (
            <th
              {...props}
              className={cn(
                'border border-border-subtle px-2 py-1 text-left font-semibold',
                className
              )}
            />
          ),
          td: ({ className, ...props }) => (
            <td
              {...props}
              className={cn(
                'border border-border-subtle px-2 py-1 align-top',
                className
              )}
            />
          ),
          strong: ({ className, ...props }) => (
            <strong
              {...props}
              className={cn('font-semibold text-foreground', className)}
            />
          ),
          em: ({ className, ...props }) => (
            <em {...props} className={cn('italic', className)} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
