'use client'

import { useState } from 'react'
import { Share2, Check, Copy, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useShare } from '@/hooks/use-share'

interface ShareButtonProps {
  title: string
  description: string
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.8 5.22 4.5 6.6-.2.73-.72 2.65-.82 3.06-.13.5.18.5.38.36.16-.1 2.5-1.7 3.52-2.38.46.06.93.1 1.42.1 5.52 0 10-3.58 10-7.9S17.52 3 12 3z" />
    </svg>
  )
}

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export function ShareButton({ title, description }: ShareButtonProps) {
  const {
    isCopied,
    isNativeShareSupported,
    handleCopyUrl,
    handleNativeShare,
    handleTwitterShare,
    handleFacebookShare,
    handleLinkedInShare,
    handleKakaoShare,
  } = useShare({ title, description })

  const [showToast, setShowToast] = useState(false)

  const onCopyUrl = async () => {
    await handleCopyUrl()
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  if (isNativeShareSupported) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNativeShare}
        className="relative"
        aria-label="공유"
      >
        <Share2 className="h-5 w-5" />
        <span className="sr-only">공유</span>
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="공유">
            <Share2 className="h-5 w-5" />
            <span className="sr-only">공유</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCopyUrl}>
            {isCopied ? (
              <Check className="w-4 h-4 mr-2 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {isCopied ? 'URL 복사됨!' : 'URL 복사'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleKakaoShare}>
            <KakaoIcon className="w-4 h-4 mr-2" />
            카카오톡
            <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTwitterShare}>
            <XTwitterIcon className="w-4 h-4 mr-2" />
            X (Twitter)
            <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleFacebookShare}>
            <FacebookIcon className="w-4 h-4 mr-2" />
            Facebook
            <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLinkedInShare}>
            <LinkedInIcon className="w-4 h-4 mr-2" />
            LinkedIn
            <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg"
          >
            URL이 클립보드에 복사되었습니다
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
