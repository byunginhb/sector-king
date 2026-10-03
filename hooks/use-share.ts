'use client'

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  getShareUrl,
  getShareContent,
  copyToClipboard,
  canUseNativeShare,
  nativeShare,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getLinkedInShareUrl,
} from '@/lib/share'
import { trackEvent } from '@/lib/analytics'

const SNS_POPUP_WIDTH = 600
const SNS_POPUP_HEIGHT = 400
const COPY_FEEDBACK_MS = 2000

export type ShareMethod = 'native' | 'copy' | 'x' | 'facebook' | 'linkedin'

interface UseShareOptions {
  title: string
  description: string
  /** GA `share` 이벤트 분류. 생략하면 경로에서 추론한다(`getShareContent`). */
  contentType?: string
  itemId?: string
}

function openSnsPopup(url: string) {
  const left = (window.screen.width - SNS_POPUP_WIDTH) / 2
  const top = (window.screen.height - SNS_POPUP_HEIGHT) / 2
  window.open(
    url,
    '_blank',
    `noopener,noreferrer,width=${SNS_POPUP_WIDTH},height=${SNS_POPUP_HEIGHT},left=${left},top=${top}`
  )
}

/** 지원 여부는 세션 중 바뀌지 않는다 — 구독할 대상이 없다. */
const subscribeNever = () => () => {}

export function useShare({ title, description, contentType, itemId }: UseShareOptions) {
  const pathname = usePathname() ?? '/'
  const [isCopied, setIsCopied] = useState(false)
  // 서버·하이드레이션에서는 false(드롭다운), 마운트 후 실제 지원 여부로 바뀐다.
  const isNativeShareSupported = useSyncExternalStore(
    subscribeNever,
    canUseNativeShare,
    () => false
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shareUrl = getShareUrl(pathname)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const track = useCallback(
    (method: ShareMethod) => {
      const inferred = getShareContent(pathname)
      trackEvent('share', {
        method,
        content_type: contentType ?? inferred.contentType,
        item_id: itemId ?? inferred.itemId,
      })
    },
    [pathname, contentType, itemId]
  )

  /** 복사 성공 여부를 돌려준다 — 실패했는데 "복사됨"을 띄우지 않도록. */
  const handleCopyUrl = useCallback(async (): Promise<boolean> => {
    const success = await copyToClipboard(shareUrl)
    if (!success) return false
    setIsCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIsCopied(false), COPY_FEEDBACK_MS)
    track('copy')
    return true
  }, [shareUrl, track])

  const handleNativeShare = useCallback(async () => {
    // 공유 시트를 닫으면(취소) false — 실제로 공유한 경우만 센다.
    const shared = await nativeShare({ title, text: description, url: shareUrl })
    if (shared) track('native')
  }, [title, description, shareUrl, track])

  const handleTwitterShare = useCallback(() => {
    openSnsPopup(getTwitterShareUrl(shareUrl, `${title} - ${description}`))
    track('x')
  }, [shareUrl, title, description, track])

  const handleFacebookShare = useCallback(() => {
    openSnsPopup(getFacebookShareUrl(shareUrl))
    track('facebook')
  }, [shareUrl, track])

  const handleLinkedInShare = useCallback(() => {
    openSnsPopup(getLinkedInShareUrl(shareUrl))
    track('linkedin')
  }, [shareUrl, track])

  return {
    shareUrl,
    isCopied,
    isNativeShareSupported,
    handleCopyUrl,
    handleNativeShare,
    handleTwitterShare,
    handleFacebookShare,
    handleLinkedInShare,
  }
}
