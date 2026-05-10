'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map as MapIcon,
  Wallet,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Monitor,
  ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react'
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
          섹터 킹
        </div>
        <div className="flex gap-2">
          {([Monitor, BarChart3, Wallet, TrendingUp] as LucideIcon[]).map((Icon, i) => (
            <div
              key={i}
              className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"
            >
              <Icon className="h-5 w-5 text-foreground" aria-hidden />
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
          { label: '규모', color: 'bg-chart-3', width: '85%' },
          { label: '성장', color: 'bg-chart-2', width: '70%' },
          { label: '수익성', color: 'bg-chart-1', width: '60%' },
          { label: '시장평가', color: 'bg-chart-4', width: '90%' },
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
        <div className="rounded-lg border-2 border-danger/40 bg-danger-bg px-4 py-3 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-danger" aria-hidden />
          <div className="text-xs font-medium text-danger mt-1">유입</div>
          <div className="text-xs text-danger/80">시총 증가</div>
        </div>
        <ArrowLeftRight className="h-5 w-5 text-muted-foreground" aria-hidden />
        <div className="rounded-lg border-2 border-info/40 bg-info-bg px-4 py-3 text-center">
          <TrendingDown className="h-5 w-5 mx-auto text-info" aria-hidden />
          <div className="text-xs font-medium text-info mt-1">유출</div>
          <div className="text-xs text-info/80">시총 감소</div>
        </div>
      </div>
    )
  }

  // ready
  const pages: { Icon: LucideIcon; label: string }[] = [
    { Icon: MapIcon, label: '패권 지도' },
    { Icon: Wallet, label: '자금 흐름' },
    { Icon: BarChart3, label: '가격 변화율' },
    { Icon: TrendingUp, label: '통계' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-[240px] mx-auto">
      {pages.map((page) => (
        <div
          key={page.label}
          className="rounded-lg bg-muted p-3 text-center"
        >
          <div className="flex justify-center mb-1">
            <page.Icon className="h-5 w-5 text-foreground" aria-hidden />
          </div>
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
