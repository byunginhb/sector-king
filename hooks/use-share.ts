'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  getShareUrl,
  copyToClipboard,
  canUseNativeShare,
  nativeShare,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getLinkedInShareUrl,
  getKakaoShareUrl,
} from '@/lib/share'

const SNS_POPUP_WIDTH = 600
const SNS_POPUP_HEIGHT = 400
const COPY_FEEDBACK_MS = 2000

interface UseShareOptions {
  title: string
  description: string
}

function openSnsPopup(url: string) {
  const left = (window.screen.width - SNS_POPUP_WIDTH) / 2
  const top = (window.screen.height - SNS_POPUP_HEIGHT) / 2
  window.open(
    url,
    '_blank',
    `width=${SNS_POPUP_WIDTH},height=${SNS_POPUP_HEIGHT},left=${left},top=${top}`
  )
}

export function useShare({ title, description }: UseShareOptions) {
  const pathname = usePathname()
  const [isCopied, setIsCopied] = useState(false)
  const [isNativeShareSupported, setIsNativeShareSupported] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shareUrl = getShareUrl(pathname)

  useEffect(() => {
    setIsNativeShareSupported(canUseNativeShare())
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopyUrl = useCallback(async () => {
    const success = await copyToClipboard(shareUrl)
    if (success) {
      setIsCopied(true)
      timerRef.current = setTimeout(() => setIsCopied(false), COPY_FEEDBACK_MS)
    }
  }, [shareUrl])

  const handleNativeShare = useCallback(async () => {
    await nativeShare({ title, text: description, url: shareUrl })
  }, [title, description, shareUrl])

  const handleTwitterShare = useCallback(() => {
    openSnsPopup(getTwitterShareUrl(shareUrl, `${title} - ${description}`))
  }, [shareUrl, title, description])

  const handleFacebookShare = useCallback(() => {
    openSnsPopup(getFacebookShareUrl(shareUrl))
  }, [shareUrl])

  const handleLinkedInShare = useCallback(() => {
    openSnsPopup(getLinkedInShareUrl(shareUrl))
  }, [shareUrl])

  const handleKakaoShare = useCallback(() => {
    openSnsPopup(getKakaoShareUrl(shareUrl, title))
  }, [shareUrl, title])

  return {
    shareUrl,
    isCopied,
    isNativeShareSupported,
    handleCopyUrl,
    handleNativeShare,
    handleTwitterShare,
    handleFacebookShare,
    handleLinkedInShare,
    handleKakaoShare,
  }
}
