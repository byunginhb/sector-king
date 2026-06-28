import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { SCORING } from '@/lib/scoring-methodology'
import { SHORT_WEIGHTS, LONG_WEIGHTS } from '@/lib/ranking-score'
import {
  FORECAST_YEARS,
  TERMINAL_GROWTH,
  R_MIN,
  R_MAX,
  INITIAL_GROWTH_CAP_LOW,
  INITIAL_GROWTH_CAP_HIGH,
} from '@/lib/dcf'
import { ScoringDiagram } from '@/components/methodology/scoring-diagram'
import { DataPipeline } from '@/components/methodology/data-pipeline'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

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
      <GlobalTopBar subtitle="방법론 · 데이터 수집부터 점수 산출까지" />

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
                    <span className="shrink-0 w-6 h-6 rounded-full bg-info/10 text-info flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">데이터 출처</p>
                      <p className="text-sm text-muted-foreground">
                        Yahoo Finance (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">yfinance</code> 라이브러리)를 통해 전 세계 상장 기업의 주가, 시가총액, 거래량, 재무 지표를 수집합니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-info/10 text-info flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">수집 주기</p>
                      <p className="text-sm text-muted-foreground">매일 00:00 KST에 GitHub Actions를 통해 자동 수집됩니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-info/10 text-info flex items-center justify-center text-xs font-bold">3</span>
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
                <div className="flex items-center gap-3 rounded-lg bg-warning-bg border border-warning/30 p-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" aria-hidden />
                  <p className="text-xs text-warning">
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

          {/* Section 6: Ranking Scores (Short/Long) */}
          <section>
            <SectionHeading id="ranking-scores">6. 단기·장기 점수 (랭킹)</SectionHeading>
            <Card>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  점수 랭킹(<strong className="text-foreground">/rankings</strong>)의{' '}
                  <strong className="text-foreground">단기·장기 점수</strong>는 패권 점수와 같은
                  데이터를 서로 다른 관점으로 가중평균한 0~100 점수입니다. 종목 상세 화면과 동일한
                  산식으로 계산되어 두 화면에서 같은 값을 보여줍니다.
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    단기 점수 — &lsquo;지금 흐름&rsquo;
                  </p>
                  <p>최근 분위기·타이밍을 봅니다. 세 가지를 가중평균합니다.</p>
                  <ul className="space-y-1 text-xs list-disc pl-4">
                    <li>
                      <strong className="text-foreground">
                        모멘텀 {Math.round(SHORT_WEIGHTS.momentum * 100)}%
                      </strong>{' '}
                      — 최근 15거래일 점수 변화(추세)
                    </li>
                    <li>
                      <strong className="text-foreground">
                        52주 위치 {Math.round(SHORT_WEIGHTS.week52Position * 100)}%
                      </strong>{' '}
                      — 1년 최고·최저 범위에서 현재가의 위치
                    </li>
                    <li>
                      <strong className="text-foreground">
                        시장 심리 {Math.round(SHORT_WEIGHTS.sentiment * 100)}%
                      </strong>{' '}
                      — 애널리스트 투자의견·목표주가 기대
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    장기 점수 — &lsquo;오래 묵힐 가치&rsquo;
                  </p>
                  <p>사업의 펀더멘털을 봅니다. 네 가지를 가중평균합니다.</p>
                  <ul className="space-y-1 text-xs list-disc pl-4">
                    <li>
                      <strong className="text-foreground">
                        수익성 {Math.round(LONG_WEIGHTS.profitability * 100)}%
                      </strong>{' '}
                      — 영업이익률·자기자본이익률(ROE)
                    </li>
                    <li>
                      <strong className="text-foreground">
                        성장성 {Math.round(LONG_WEIGHTS.growth * 100)}%
                      </strong>{' '}
                      — 매출·이익 성장률
                    </li>
                    <li>
                      <strong className="text-foreground">
                        규모 {Math.round(LONG_WEIGHTS.scale * 100)}%
                      </strong>{' '}
                      — 섹터 내 시가총액 비중·거래 활성도
                    </li>
                    <li>
                      <strong className="text-foreground">
                        목표주가 상승여력 {Math.round(LONG_WEIGHTS.upside * 100)}%
                      </strong>{' '}
                      — 애널리스트 목표가 대비 현재가
                    </li>
                  </ul>
                </div>

                <p className="text-xs">
                  ※ 일부 지표가 없는 종목은 나머지 지표로 가중치를 다시 나눠(재배분) 점수를 매깁니다.
                  신규 상장 등으로 추세 데이터가 짧으면 &lsquo;추세 데이터 짧음&rsquo;으로 표시됩니다.
                  섹터킹 픽은 이 단기·장기 점수에 가치(DCF) 점수를 더해 성향별 가중치로 합산합니다.
                </p>
              </div>
            </Card>
          </section>

          {/* Section 7: Value Score (DCF) */}
          <section>
            <SectionHeading id="dcf">7. 가치 점수(DCF) (참고 지표)</SectionHeading>
            <Card>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  점수 랭킹의 <strong className="text-foreground">DCF 점수·상승예측</strong>은
                  패권 점수와 별개의 <strong className="text-foreground">독립 보조 지표</strong>입니다.
                  회사가 앞으로 벌어들일 잉여현금흐름(FCF)을 추정해 적정 가치(내재가치)를 환산하고,
                  현재가가 그보다 싼지를 0~100점과 상승예측 %로 나타냅니다.
                </p>
                <p>
                  표준 2단계 DCF를 사용합니다. 예측기간{' '}
                  <strong className="text-foreground">{FORECAST_YEARS}년</strong> 동안의 현금흐름
                  현재가치 합에, 그 이후의 잔존가치(영구 성장률{' '}
                  {(TERMINAL_GROWTH * 100).toFixed(1)}%)를 더해 내재가치를 구합니다. 할인율은
                  베타·부채비율·기업 규모에 따라{' '}
                  <strong className="text-foreground">
                    {(R_MIN * 100).toFixed(0)}%~{(R_MAX * 100).toFixed(0)}%
                  </strong>{' '}
                  범위에서 도출됩니다.
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">주요 가정</p>
                  <ul className="space-y-1 text-xs list-disc pl-4">
                    <li>
                      초기 성장률은 매출 성장률을 {(INITIAL_GROWTH_CAP_LOW * 100).toFixed(0)}%~
                      {(INITIAL_GROWTH_CAP_HIGH * 100).toFixed(0)}% 로 제한해 사용하고, 예측기간에
                      걸쳐 영구 성장률로 선형 수렴시킵니다.
                    </li>
                    <li>주식 수는 시가총액 ÷ 현재가로 역산합니다.</li>
                    <li>
                      현금흐름이 마이너스이거나 자료가 부족한 종목, 은행·보험 등 현금흐름 정의가 다른
                      업종은 제외됩니다.
                    </li>
                  </ul>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-warning-bg border border-warning/30 p-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" aria-hidden />
                  <p className="text-xs text-warning">
                    미래 성장·할인율 가정이 들어가 가정이 바뀌면 결과가 크게 달라집니다. 상승예측
                    %는 미래 주가를 약속하지 않는 참고용 추정치입니다.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Section 8: Disclaimer */}
          <section>
            <SectionHeading id="disclaimer">8. 한계점 및 면책</SectionHeading>
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
