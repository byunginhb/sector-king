/**
 * 미리보기 진입 버튼 — 관리자가 특정 등급의 시점으로 실제 사이트를 본다.
 *
 * 여기서는 `?preview_tier=` 를 붙여 **새 탭으로** 열기만 한다. 배너·쿠키 세팅·
 * 캐시 격리는 게이팅 구현(사용자 화면) 쪽 책임이다.
 *
 * 새 탭인 이유: 같은 탭에서 이동하면 콘솔의 미저장 draft 가 통째로 사라진다.
 * 미리보기는 "지금 설정이 어떻게 보이는지" 를 확인하려고 누르는 버튼인데,
 * 그 확인의 대가가 편집분 소실이면 아무도 두 번은 안 누른다.
 *
 * 동적 세그먼트가 있는 경로(`/stock/[ticker]`)는 실제 URL 이 아니라서
 * 그대로 열 수 없다 → 홈으로 보내고 그 사실을 문구로 알린다.
 */
'use client'

import { useState } from 'react'
import { Eye, ExternalLink } from 'lucide-react'
import {
  PREVIEW_QUERY_PARAM,
  PREVIEW_TIERS,
} from '@/lib/permissions/constants'
import { TIER_LABEL, type Tier } from '@/lib/permissions/tier'
import type { AdminPageMeta } from './types'

/** 동적 세그먼트가 없는 실제 경로만 미리보기 대상이 된다. */
function isConcreteRoute(route: string): boolean {
  return route.startsWith('/') && !route.includes('[')
}

export function PreviewLauncher({ page }: { page: AdminPageMeta | null }) {
  const [tier, setTier] = useState<Tier>('anon')

  const route = page?.route ?? ''
  const concrete = isConcreteRoute(route)
  const target = concrete ? route : '/'

  const open = () => {
    const url = `${target}?${PREVIEW_QUERY_PARAM}=${encodeURIComponent(tier)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Eye className="h-4 w-4" aria-hidden />
        미리보기 등급
        <select
          aria-label="미리보기 등급"
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          className="rounded-md border border-border-subtle bg-background px-2 py-1 text-xs text-foreground"
        >
          {PREVIEW_TIERS.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={open}
        title={
          concrete
            ? `${target} 를 ${TIER_LABEL[tier]} 시점으로 새 탭에서 엽니다`
            : '이 페이지는 동적 경로라 홈을 새 탭에서 엽니다'
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        새 탭에서 보기
      </button>

      {!concrete && (
        <span className="text-[11px] text-muted-foreground">
          동적 경로({route || '미지정'})는 홈으로 엽니다
        </span>
      )}
    </div>
  )
}
