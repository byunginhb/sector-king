import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * 발행된 마켓 리포트의 **쿠키 없는** 공개 조회 — RSS 피드·OG 이미지가 쓴다.
 *
 * `lib/supabase/server` 의 클라이언트는 `cookies()` 를 읽어 라우트를 동적으로 만들고,
 * 크롤러·피드 리더 요청에는 어차피 세션이 없다. `app/sitemap.ts` 와 같은 방식으로
 * anon 키만 쓰며, RLS 가 published 만 노출한다(쿼리에서도 한 번 더 건다).
 *
 * 여기 함수들은 예외를 던지지 않는다 — 환경변수가 없거나 Supabase 가 죽어도
 * 피드는 빈 채로, 이미지는 브랜드 폴백으로 나가야 한다.
 */

export interface PublicNewsItem {
  id: string
  title: string
  publishedAt: string | null
  reportDate: string | null
  oneLineConclusion: string | null
  coverKeywords: string[]
}

const COLUMNS = 'id, title, published_at, report_date, one_line_conclusion, cover_keywords'

interface Row {
  id: string
  title: string | null
  published_at: string | null
  report_date: string | null
  one_line_conclusion: string | null
  cover_keywords: string[] | null
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function toItem(row: Row): PublicNewsItem {
  return {
    id: row.id,
    title: row.title ?? '마켓 리포트',
    publishedAt: row.published_at,
    reportDate: row.report_date,
    oneLineConclusion: row.one_line_conclusion,
    coverKeywords: row.cover_keywords ?? [],
  }
}

/** 최신 발행 리포트 `limit` 건. 실패하면 빈 배열. */
export async function getPublishedNewsList(limit: number): Promise<PublicNewsItem[]> {
  try {
    const supabase = anonClient()
    if (!supabase) return []
    const { data, error } = await supabase
      .from('news_reports')
      .select(COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error || !data) {
      if (error) console.error('news: 공개 리포트 목록 조회 실패', error)
      return []
    }
    return (data as Row[]).map(toItem)
  } catch (error) {
    console.error('news: 공개 리포트 목록 조회 실패', error)
    return []
  }
}

/** 발행된 리포트 1건. 없거나 실패하면 null. */
export async function getPublishedNewsById(id: string): Promise<PublicNewsItem | null> {
  try {
    const supabase = anonClient()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('news_reports')
      .select(COLUMNS)
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle()

    if (error || !data) return null
    return toItem(data as Row)
  } catch (error) {
    console.error('news: 공개 리포트 조회 실패', error)
    return null
  }
}
