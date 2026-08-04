/**
 * /admin/contributors — 인물(함께하는 사람들) 목록.
 * Server Component 에서 supabase 직접 조회. 인증은 `/admin` 레이아웃에서 상속.
 */
import Link from 'next/link'
import { Plus, Users, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  CONTRIBUTOR_COLUMNS,
  rowToDto,
  type ContributorDTO,
} from '@/lib/contributors/dto'
import { PixelAvatar } from '@/components/contributors/pixel-avatar'

export const dynamic = 'force-dynamic'

export default async function AdminContributorsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contributors')
    .select(CONTRIBUTOR_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  const items: ContributorDTO[] = (data ?? []).map((row) =>
    rowToDto(row as Parameters<typeof rowToDto>[0])
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            함께하는 사람들
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            소개 페이지(/about)에 노출되는 인물을 관리합니다.
          </p>
        </div>
        <Link
          href="/admin/contributors/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          신규 등록
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground sk-card p-6">
          아직 등록된 인물이 없습니다.{' '}
          <Link
            href="/admin/contributors/new"
            className="text-primary font-medium hover:underline"
          >
            신규 등록
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/admin/contributors/${it.id}/edit`}
                className="flex items-center gap-3 sk-card p-4 hover:bg-surface-2 transition-colors"
              >
                <PixelAvatar
                  gender={it.gender}
                  variant={it.avatarVariant}
                  size={48}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {it.nickname}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {it.bio ?? '한줄 소개 없음'}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                    순서 {it.sortOrder}
                  </p>
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
