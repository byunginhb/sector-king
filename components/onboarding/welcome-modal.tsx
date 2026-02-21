'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WelcomeModalProps {
  open: boolean
  onComplete: () => void
}

const SLIDES = [
  {
    title: 'Sector King에 오신 것을 환영합니다',
    description:
      '산업별 섹터 시장 지배력을 한눈에 파악하는 투자 분석 대시보드입니다. 어떤 기업이 어떤 섹터를 지배하고 있는지, 자금은 어디로 흐르는지 시각적으로 확인하세요.',
    visual: 'welcome',
  },
  {
    title: '패권 점수로 기업 경쟁력을 분석하세요',
    description:
      'Hegemony Score는 규모, 성장, 수익성, 시장평가 4가지 차원으로 기업의 시장 지배력을 100점 만점으로 평가합니다. 순위가 높을수록 해당 섹터에서 강한 영향력을 가집니다.',
    visual: 'score',
  },
  {
    title: '자금이 어디로 흐르는지 추적하세요',
    description:
      '빨간 카드는 자금 유입(시가총액 증가), 파란 카드는 자금 유출(시가총액 감소)을 나타냅니다. MFI(Money Flow Index)로 매수/매도 우위를 판단할 수 있습니다.',
    visual: 'flow',
  },
  {
    title: '시작할 준비가 되셨나요?',
    description:
      '패권 지도, 자금 흐름, 가격 변화율, 통계 4개 페이지로 투자 분석을 시작하세요. 각 페이지에서 상세 가이드가 자동으로 안내합니다.',
    visual: 'ready',
  },
] as const

function WelcomeVisual({ visual }: { visual: string }) {
  if (visual === 'welcome') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="text-5xl font-bold bg-linear-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
          SK
        </div>
        <div className="flex gap-2">
          {['🖥️', '📊', '💰', '📈'].map((icon) => (
            <div
              key={icon}
              className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg"
            >
              {icon}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (visual === 'score') {
    return (
      <div className="space-y-2 w-full max-w-[240px] mx-auto">
        {[
          { label: '규모', color: 'bg-blue-500', width: '85%' },
          { label: '성장', color: 'bg-emerald-500', width: '70%' },
          { label: '수익성', color: 'bg-amber-500', width: '60%' },
          { label: '시장평가', color: 'bg-purple-500', width: '90%' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span className="w-14 text-muted-foreground shrink-0">{item.label}</span>
            <div className="flex-1 bg-muted rounded-full h-2">
              <div className={cn('rounded-full h-2', item.color)} style={{ width: item.width }} />
            </div>
          </div>
        ))}
        <div className="text-center mt-2">
          <span className="text-2xl font-bold text-foreground">76.3</span>
          <span className="text-sm text-muted-foreground"> / 100</span>
        </div>
      </div>
    )
  }

  if (visual === 'flow') {
    return (
      <div className="flex items-center gap-4 justify-center">
        <div className="rounded-lg border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-center">
          <div className="text-lg">💰</div>
          <div className="text-xs font-medium text-red-700 dark:text-red-300">유입</div>
          <div className="text-xs text-red-500">시총 증가</div>
        </div>
        <div className="text-muted-foreground text-lg">⇄</div>
        <div className="rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-center">
          <div className="text-lg">💸</div>
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">유출</div>
          <div className="text-xs text-blue-500">시총 감소</div>
        </div>
      </div>
    )
  }

  // ready
  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-[240px] mx-auto">
      {[
        { icon: '🗺️', label: '패권 지도' },
        { icon: '💰', label: '자금 흐름' },
        { icon: '📊', label: '가격 변화율' },
        { icon: '📈', label: '통계' },
      ].map((page) => (
        <div
          key={page.label}
          className="rounded-lg bg-muted p-3 text-center"
        >
          <div className="text-xl mb-1">{page.icon}</div>
          <div className="text-xs font-medium text-foreground">{page.label}</div>
        </div>
      ))}
    </div>
  )
}

export function WelcomeModal({ open, onComplete }: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const isLast = currentSlide === SLIDES.length - 1

  const handleNext = () => {
    if (isLast) {
      onComplete()
    } else {
      setCurrentSlide((prev) => prev + 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const slide = SLIDES[currentSlide]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onComplete()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="p-6 pb-4">
          <DialogTitle className="sr-only">온보딩</DialogTitle>
          <DialogDescription className="sr-only">서비스 소개 슬라이드</DialogDescription>

          {/* Visual */}
          <div className="h-36 flex items-center justify-center mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="w-full flex items-center justify-center"
              >
                <WelcomeVisual visual={slide.visual} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Text Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-bold text-foreground text-center mb-2">
                {slide.title}
              </h2>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            {/* Indicators */}
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === currentSlide
                      ? 'bg-primary w-5'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  aria-label={`슬라이드 ${i + 1}`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {!isLast && (
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  건너뛰기
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLast ? '시작하기' : '다음'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
