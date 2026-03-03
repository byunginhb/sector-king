import type { Metadata } from 'next'
import Link from 'next/link'
import { SCORING } from '@/lib/scoring-methodology'
import { ScoringDiagram } from '@/components/methodology/scoring-diagram'
import { DataPipeline } from '@/components/methodology/data-pipeline'

export const metadata: Metadata = {
  title: '방법론',
  description:
    'Sector King의 데이터 수집, 패권 점수 산출 공식, 기업 선정 기준, 데이터 품질 기준을 설명합니다.',
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-bold text-foreground mb-4 scroll-mt-20">
      {children}
    </h2>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {children}
    </div>
  )
}

export default function MethodologyPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="홈으로 돌아가기"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">방법론</h1>
              <p className="text-sm text-muted-foreground">데이터 수집부터 점수 산출까지</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Table of Contents */}
        <nav aria-label="목차" className="mb-8 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground mb-2">목차</p>
          <ol className="space-y-1 text-sm text-muted-foreground">
            <li><a href="#data-collection" className="hover:text-foreground transition-colors">1. 데이터 수집</a></li>
            <li><a href="#scoring" className="hover:text-foreground transition-colors">2. 패권 점수 산출 공식</a></li>
            <li><a href="#ema" className="hover:text-foreground transition-colors">3. EMA 스무딩</a></li>
            <li><a href="#selection" className="hover:text-foreground transition-colors">4. 기업 선정 기준</a></li>
            <li><a href="#data-quality" className="hover:text-foreground transition-colors">5. 데이터 품질</a></li>
            <li><a href="#disclaimer" className="hover:text-foreground transition-colors">6. 한계점 및 면책</a></li>
          </ol>
        </nav>

        <div className="space-y-10">
          {/* Section 1: Data Collection */}
          <section>
            <SectionHeading id="data-collection">1. 데이터 수집</SectionHeading>
            <Card>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">데이터 출처</p>
                      <p className="text-sm text-muted-foreground">
                        Yahoo Finance (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">yfinance</code> 라이브러리)를 통해 전 세계 상장 기업의 주가, 시가총액, 거래량, 재무 지표를 수집합니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">수집 주기</p>
                      <p className="text-sm text-muted-foreground">매일 00:00 KST에 GitHub Actions를 통해 자동 수집됩니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">수집 항목</p>
                      <p className="text-sm text-muted-foreground">
                        <strong>매일:</strong> 시가총액, 주가, 거래량, 52주 최고가/최저가
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>주간:</strong> 매출 성장률, 수익 성장률, 영업이익률, ROE, 애널리스트 의견, 목표주가
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">데이터 파이프라인</p>
                  <DataPipeline />
                </div>
              </div>
            </Card>
          </section>

          {/* Section 2: Scoring Formula */}
          <section>
            <SectionHeading id="scoring">2. 패권 점수 산출 공식</SectionHeading>
            <Card>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  패권 점수는 4개 차원의 가중합으로 <strong className="text-foreground">{SCORING.totalMaxScore}점 만점</strong> 기준으로 산출됩니다.
                  각 지표는 정해진 범위 내에서 정규화(0~최대점수)된 후 합산됩니다.
                </p>

                <ScoringDiagram />

                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">정규화 범위</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="font-medium text-foreground">매출 성장률</p>
                      <p className="text-muted-foreground">{SCORING.growth.revenueGrowth.min * 100}% ~ {SCORING.growth.revenueGrowth.max * 100}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="font-medium text-foreground">수익 성장률</p>
                      <p className="text-muted-foreground">{SCORING.growth.earningsGrowth.min * 100}% ~ {SCORING.growth.earningsGrowth.max * 100}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="font-medium text-foreground">영업이익률</p>
                      <p className="text-muted-foreground">{SCORING.profitability.operatingMargin.min * 100}% ~ {SCORING.profitability.operatingMargin.max * 100}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="font-medium text-foreground">ROE</p>
                      <p className="text-muted-foreground">{SCORING.profitability.returnOnEquity.min * 100}% ~ {SCORING.profitability.returnOnEquity.max * 100}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="font-medium text-foreground">거래량 비율 상한</p>
                      <p className="text-muted-foreground">최대 {SCORING.scale.volumeRatio.cap}배</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="font-medium text-foreground">목표주가 괴리율</p>
                      <p className="text-muted-foreground">{SCORING.sentiment.targetUpside.min * 100}% ~ {SCORING.sentiment.targetUpside.max * 100}%</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    ※ 범위를 벗어나는 값은 최소/최대값으로 클램핑됩니다. 데이터가 없는 지표는 중간값(50%)으로 처리됩니다.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Section 3: EMA Smoothing */}
          <section>
            <SectionHeading id="ema">3. EMA 스무딩</SectionHeading>
            <Card>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  일일 점수의 급격한 변동을 완화하기 위해 <strong className="text-foreground">지수이동평균(EMA)</strong>으로 스무딩 처리됩니다.
                </p>
                <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm text-center text-foreground">
                  EMA = α × 오늘 점수 + (1 - α) × 어제 EMA
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    현재 <strong className="text-foreground">α = {SCORING.ema.alpha}</strong>로 설정되어 있어,
                    최근 데이터 {SCORING.ema.alpha * 100}%를 반영하고 기존 누적값 {(1 - SCORING.ema.alpha) * 100}%를 유지합니다.
                  </p>
                  <p>
                    이를 통해 하루의 이상 데이터로 인한 순위 급변을 방지하고, 안정적인 패권 순위를 유지합니다.
                  </p>
                  <p>
                    동일 점수일 경우 <strong className="text-foreground">시가총액이 큰 종목</strong>이 우선 순위를 받습니다.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Section 4: Company Selection */}
          <section>
            <SectionHeading id="selection">4. 기업 선정 기준</SectionHeading>
            <Card>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  각 섹터에서 <strong className="text-foreground">시가총액과 시장 대표성</strong>을 기준으로 큐레이션된 기업 목록을 추적합니다.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">9개</p>
                    <p className="text-xs text-muted-foreground">산업</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">30+</p>
                    <p className="text-xs text-muted-foreground">섹터</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">120+</p>
                    <p className="text-xs text-muted-foreground">기업</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">선정 원칙</p>
                  <ul className="space-y-1 text-xs list-disc pl-4">
                    <li>섹터별 시가총액 상위 기업 우선 포함</li>
                    <li>해당 분야의 핵심 플레이어 (기술 리더, 시장 지배자)</li>
                    <li>한국 기업은 KOSPI/KOSDAQ 상장 종목 대상</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  기업 추가·제거는 수동으로 진행되며, 새로운 섹터 추가나 산업 구조 변경 시 반영됩니다.
                  자동으로 신규 기업이 유입되지는 않습니다.
                </p>
              </div>
            </Card>
          </section>

          {/* Section 5: Data Quality */}
          <section>
            <SectionHeading id="data-quality">5. 데이터 품질</SectionHeading>
            <Card>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  각 기업의 <strong className="text-foreground">데이터 커버리지</strong>를 0.0~1.0 사이의 값으로 표시합니다.
                  7개 재무 필드(매출 성장률, 수익 성장률, 영업이익률, ROE, 애널리스트 의견, 애널리스트 수, 목표주가) 중 실제 수집된 비율입니다.
                </p>
                <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <span className="text-amber-600 dark:text-amber-400 shrink-0">⚠️</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    커버리지 0.7 미만인 기업은 &quot;데이터 제한적&quot; 경고가 표시됩니다.
                    데이터가 부족한 지표는 중간값으로 대체되므로 점수 정확도가 낮을 수 있습니다.
                  </p>
                </div>
                <p className="text-xs">
                  모든 기업이 동일한 수준의 데이터를 제공하지 않습니다. 특히 한국 기업은 Yahoo Finance에서 일부 재무 지표(영업이익률, 애널리스트 목표주가 등)가 미제공되는 경우가 있습니다.
                </p>
              </div>
            </Card>
          </section>

          {/* Section 6: Disclaimer */}
          <section>
            <SectionHeading id="disclaimer">6. 한계점 및 면책</SectionHeading>
            <Card>
              <div className="space-y-2 text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 text-muted-foreground">•</span>
                    <span><strong className="text-foreground">실시간 데이터가 아닙니다.</strong> 1일 1회(00:00 KST) 수집되며, 장중 변동은 반영되지 않습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 text-muted-foreground">•</span>
                    <span>장외시간 및 프리마켓 거래 변동은 미반영됩니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 text-muted-foreground">•</span>
                    <span>Yahoo Finance 데이터 자체의 지연이나 오류가 있을 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 text-muted-foreground">•</span>
                    <span>한국 기업의 KRW→USD 환율 변환에 고정 환율이 사용되어 실시간 환율과 차이가 있을 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 text-muted-foreground">•</span>
                    <span>큐레이션된 기업 목록은 수동 관리되므로, 신규 상장이나 상장 폐지가 즉시 반영되지 않습니다.</span>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-border rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-foreground">면책 고지</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    본 사이트의 정보는 투자 권유가 아니며, 정보 제공 목적으로만 제공됩니다.
                    투자 결정의 책임은 전적으로 이용자에게 있으며, Sector King은 이로 인한 손실에 대해 책임지지 않습니다.
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
