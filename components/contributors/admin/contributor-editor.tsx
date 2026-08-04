/**
 * 관리자 인물(contributor) 편집기 — 신규 + 편집 공통.
 *
 * 전부 폼 필드(발행 개념 없음, 저장 단일 버튼). 아바타는 gender + variant 선택 →
 * PixelAvatar 미리보기. 삭제는 하드 삭제(수동 데이터).
 */
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ContributorDTO } from '@/lib/contributors/dto'
import type { ContributorGender } from '@/drizzle/supabase-schema'
import { PixelAvatar, AVATAR_PRESETS } from '@/components/contributors/pixel-avatar'

interface ContributorEditorProps {
  initial: ContributorDTO | null
  /** 신규 등록 시 표시 순서 기본값(기존 최대 + 1). 편집 시 무시. */
  nextSortOrder?: number
}

const GENDER_LABEL: Record<ContributorGender, string> = {
  male: '남성',
  female: '여성',
}

// 아이디만 입력받고 앞의 기본 주소는 자동으로 붙인다.
const INSTAGRAM_BASE = 'https://www.instagram.com/'
const THREADS_BASE = 'https://www.threads.com/@'

/** 입력값에서 @·슬래시를 제거해 순수 아이디만 남긴다. */
const cleanHandle = (raw: string) =>
  raw.trim().replace(/^@+/, '').replace(/^\/+|\/+$/g, '')

/** 저장된 전체 URL 에서 아이디만 뽑아 편집 폼에 표시. base 로 시작 안 하면 원문 유지. */
const handleFromUrl = (url: string | null | undefined, base: string) =>
  url ? (url.startsWith(base) ? url.slice(base.length) : url) : ''

export function ContributorEditor({ initial, nextSortOrder }: ContributorEditorProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = initial !== null

  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [instagramHandle, setInstagramHandle] = useState(
    handleFromUrl(initial?.instagramUrl, INSTAGRAM_BASE)
  )
  const [threadsHandle, setThreadsHandle] = useState(
    handleFromUrl(initial?.threadsUrl, THREADS_BASE)
  )
  const [blogUrl, setBlogUrl] = useState(initial?.blogUrl ?? '')
  const [gender, setGender] = useState<ContributorGender>(initial?.gender ?? 'male')
  const [avatarVariant, setAvatarVariant] = useState(initial?.avatarVariant ?? 0)
  const [sortOrder, setSortOrder] = useState(
    String(initial?.sortOrder ?? nextSortOrder ?? 0)
  )

  const submit = () => {
    setError(null)
    startTransition(async () => {
      try {
        if (!nickname.trim()) throw new Error('닉네임을 입력하세요')
        const ig = cleanHandle(instagramHandle)
        const th = cleanHandle(threadsHandle)
        const payload = {
          nickname: nickname.trim(),
          bio: bio.trim() || null,
          email: email.trim() || null,
          instagramUrl: ig ? INSTAGRAM_BASE + ig : null,
          threadsUrl: th ? THREADS_BASE + th : null,
          blogUrl: blogUrl.trim() || null,
          gender,
          avatarVariant,
          sortOrder: Number(sortOrder) || 0,
        }
        const url = isEdit
          ? `/api/admin/contributors/${initial!.id}`
          : '/api/admin/contributors'
        const method = isEdit ? 'PATCH' : 'POST'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? `요청 실패 (${res.status})`)
        }
        router.push('/admin/contributors')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : '저장 실패')
      }
    })
  }

  const remove = () => {
    if (!isEdit) return
    if (!confirm('정말 삭제하시겠습니까? (완전히 삭제됩니다)')) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/contributors/${initial!.id}`, {
          method: 'DELETE',
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? `요청 실패 (${res.status})`)
        }
        router.push('/admin/contributors')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : '삭제 실패')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/contributors"
          aria-label="목록으로"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          목록
        </Link>
        <span className="h-4 w-px bg-border" aria-hidden />
        <h2 className="text-xl font-bold text-foreground">
          {isEdit ? '인물 편집' : '인물 신규 등록'}
        </h2>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 아바타 선택 */}
      <div className="sk-card p-4 space-y-4">
        <div className="flex items-center gap-4">
          <PixelAvatar gender={gender} variant={avatarVariant} size={72} />
          <div className="text-sm text-muted-foreground">
            도트 아바타는 성별 실루엣과 색상으로 구성됩니다.
            <br />
            아래에서 성별과 색상을 선택하세요.
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            성별
          </span>
          <div className="flex gap-2">
            {(Object.keys(GENDER_LABEL) as ContributorGender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm font-medium',
                  gender === g
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-subtle bg-background text-muted-foreground hover:bg-surface-2'
                )}
              >
                {GENDER_LABEL[g]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            아바타 스타일 (색상·머리·안경·모자)
          </span>
          <div className="flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAvatarVariant(i)}
                aria-label={`아바타 ${i + 1}`}
                aria-pressed={avatarVariant === i}
                className={cn(
                  'rounded-lg border-2 p-0.5',
                  avatarVariant === i ? 'border-primary' : 'border-transparent'
                )}
              >
                <PixelAvatar gender={gender} variant={i} size={40} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 정보 필드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="닉네임" required>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            aria-required
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="BEN"
          />
        </Field>
        <Field label="표시 순서 (작을수록 먼저)">
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground tabular-nums"
            placeholder="0"
          />
        </Field>
        <Field label="한줄 소개" full>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="투자에서 도파민을 찾는 금융초보 개발자"
          />
        </Field>
        <Field label="이메일">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="byunginhb@gmail.com"
          />
        </Field>
        <Field label="인스타그램 아이디">
          <HandleInput
            base={INSTAGRAM_BASE}
            value={instagramHandle}
            onChange={setInstagramHandle}
            placeholder="ssector.king"
          />
        </Field>
        <Field label="쓰레드 아이디">
          <HandleInput
            base={THREADS_BASE}
            value={threadsHandle}
            onChange={setThreadsHandle}
            placeholder="ssector.king"
          />
        </Field>
        <Field label="블로그 URL" full>
          <input
            type="url"
            value={blogUrl}
            onChange={(e) => setBlogUrl(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
            placeholder="https://blog.example.com"
          />
        </Field>
      </div>

      {/* 액션 바 */}
      <div className="flex flex-wrap items-center gap-2 sticky bottom-0 -mx-4 px-4 py-3 bg-background/90 backdrop-blur border-t border-border-subtle">
        <div className="flex-1" />
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden />
          저장
        </button>
        {isEdit && (
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/5 text-danger px-3 py-2 text-sm font-medium hover:bg-danger/10 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            삭제
          </button>
        )}
      </div>
    </div>
  )
}

/** 앞의 기본 주소를 고정 표기하고 아이디만 입력받는 인풋. */
function HandleInput({
  base,
  value,
  onChange,
  placeholder,
}: {
  base: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const display = base.replace(/^https?:\/\//, '')
  return (
    <div className="flex items-stretch rounded-md border border-border-subtle bg-background overflow-hidden focus-within:ring-1 focus-within:ring-primary">
      <span className="flex items-center whitespace-nowrap border-r border-border-subtle bg-surface-2 px-2.5 text-xs text-muted-foreground select-none">
        {display}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-background px-3 py-2 text-sm text-foreground outline-none"
        placeholder={placeholder}
      />
    </div>
  )
}

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  full?: boolean
}) {
  return (
    <label className={cn('block', full ? 'sm:col-span-2' : '')}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
        {required && (
          <span className="text-danger ml-1" aria-hidden>
            ●
          </span>
        )}
      </span>
      {children}
    </label>
  )
}
