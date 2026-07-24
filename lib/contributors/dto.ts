/**
 * contributors Supabase row ↔ DTO 변환.
 * snake_case row → camelCase DTO. 공개/어드민 동일 컬럼(민감정보 없음 — 공개 인물 카드).
 */
import type { ContributorGender } from '@/drizzle/supabase-schema'

export interface ContributorDTO {
  id: string
  nickname: string
  bio: string | null
  email: string | null
  instagramUrl: string | null
  threadsUrl: string | null
  gender: ContributorGender
  avatarVariant: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface RawContributorRow {
  id: number | string
  nickname: string
  bio: string | null
  email: string | null
  instagram_url: string | null
  threads_url: string | null
  gender: ContributorGender
  avatar_variant: number
  sort_order: number
  created_at: string
  updated_at: string
}

export function rowToDto(row: RawContributorRow): ContributorDTO {
  return {
    id: String(row.id),
    nickname: row.nickname,
    bio: row.bio ?? null,
    email: row.email ?? null,
    instagramUrl: row.instagram_url ?? null,
    threadsUrl: row.threads_url ?? null,
    gender: row.gender,
    avatarVariant: Number(row.avatar_variant),
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const CONTRIBUTOR_COLUMNS =
  'id, nickname, bio, email, instagram_url, threads_url, gender, avatar_variant, sort_order, created_at, updated_at'
