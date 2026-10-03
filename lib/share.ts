const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export function getShareUrl(pathname: string): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${BASE_URL}${normalized}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

export async function nativeShare(data: {
  title: string
  text: string
  url: string
}): Promise<boolean> {
  try {
    await navigator.share(data)
    return true
  } catch {
    return false
  }
}

export function getTwitterShareUrl(url: string, text: string): string {
  const params = new URLSearchParams({ url, text })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export function getFacebookShareUrl(url: string): string {
  const params = new URLSearchParams({ u: url })
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
}

export function getLinkedInShareUrl(url: string): string {
  const params = new URLSearchParams({ url })
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`
}

export interface ShareContent {
  /** GA4 `share` 이벤트의 content_type */
  contentType: string
  /** GA4 `share` 이벤트의 item_id */
  itemId: string
}

/** 첫 세그먼트 → 콘텐츠 종류. 두 번째 세그먼트(ID)가 있을 때만 적용된다. */
const DETAIL_CONTENT_TYPE: Record<string, string> = {
  stock: 'stock',
  sectors: 'sector',
  news: 'news_report',
}

/**
 * 경로에서 "무엇을 공유했는지"를 뽑는다.
 *
 * 공유 버튼은 상단바를 통해 모든 페이지에 있으므로 호출부가 일일이 넘기지 않아도
 * GA 에서 종목·섹터·리포트 단위로 집계되게 한다. 상세가 아닌 화면은 경로 자체가 ID 다.
 */
export function getShareContent(pathname: string): ShareContent {
  const segments = pathname.split('?')[0].split('/').filter(Boolean)
  const [first, second] = segments
  const detailType = first ? DETAIL_CONTENT_TYPE[first] : undefined
  if (detailType && second) {
    return { contentType: detailType, itemId: decodeSegment(second) }
  }
  return { contentType: 'page', itemId: `/${segments.join('/')}` }
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}
