/**
 * 이메일 주소 표시 + 복사 버튼 (클라이언트).
 * mailto 링크(선택·클릭 가능) 옆에 클립보드 복사 버튼. 복사 성공 시 잠깐 체크 표시.
 */
'use client'

import { useState } from 'react'
import { Mail, Copy, Check } from 'lucide-react'

export function EmailCopy({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 미지원/거부 — mailto 링크와 select-all 텍스트로 폴백
    }
  }

  return (
    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center gap-1.5 hover:text-foreground break-all"
      >
        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="select-all">{email}</span>
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? '복사됨' : '이메일 복사'}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-surface-2 hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </div>
  )
}
