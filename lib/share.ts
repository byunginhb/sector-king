const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sectorking.co.kr'

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
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return true
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

export function getKakaoShareUrl(url: string, title: string): string {
  const params = new URLSearchParams({
    url,
    title,
  })
  return `https://sharer.kakao.com/talk/friends/picker/link?${params.toString()}`
}
