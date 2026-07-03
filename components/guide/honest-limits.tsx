import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { GuideSection } from './guide-section'

interface LimitEntry {
  title: string
  body: string
}

/**
 * 섹션 D — 정직한 한계 고지.
 * 문구는 audit-theory.md "설명 페이지에 정직하게 고지해야 할 한계 목록" 표 8항목을 그대로 사용.
 */
const LIMITS: LimitEntry[] = [
  {
    title: '환율 고정',
    body: '달러($) 표시 시 고정 환율(약 1,450원)로 환산하며, 실시간 환율을 반영하지 않습니다. 기본 표시는 원화(₩)이며 상단 통화 토글로 전환할 수 있습니다.',
  },
  {
    title: '데이터 수집 시점',
    body: 'KST 16:30, 다음날 07:00 2회 수집합니다. 당일 최종값은 오전 7시 이후 반영됩니다.',
  },
  {
    title: '자금 흐름 정의',
    body: '자금 흐름 수치는 섹터 시가총액의 기간 변화액입니다. 실제 매수/매도 자금을 직접 측정하지 않습니다.',
  },
  {
    title: 'MFI 구현 방식',
    body: '매수압력 지수(0-100)는 당일 종가의 일중 위치를 기준으로 계산됩니다 (표준 Wilder MFI와 다름).',
  },
  {
    title: '결측 데이터 처리',
    body: '일부 항목(특히 earnings_growth 25%)이 수집되지 않을 경우 해당 항목에 중간값(50%)을 부여합니다. 데이터 신뢰도는 종목 상세 화면에서 확인하세요.',
  },
  {
    title: 'yfinance 기준 시점',
    body: 'PER은 과거 12개월 기준, PEG는 Forward 기반, 매출/이익 성장률은 분기 YoY입니다. 실시간 재무 데이터가 아닙니다.',
  },
  {
    title: '패권 점수 결측 폴백',
    body: '애널리스트 미커버 종목이나 데이터 미수집 항목은 중간 점수를 받으며, 이는 실제 실적과 다를 수 있습니다.',
  },
  {
    title: '소표본 percentile',
    body: '섹터 종목 수가 적을 경우(≥4개) percentile은 25% 단위로 거칠게 표시됩니다.',
  },
]

/** 섹션 D — 정직한 한계 고지 + 투자 권유 아님 면책. */
export function HonestLimits() {
  return (
    <GuideSection
      id="limits"
      title="E. 정직한 주의사항"
      description="유료 신뢰의 핵심입니다. 이 서비스의 숫자가 가진 한계를 숨기지 않고 알려드립니다."
    >
      <div className="rounded-xl border border-warning/30 bg-warning/10 p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
          <p className="text-sm font-semibold text-foreground">
            반드시 알아두세요
          </p>
        </div>

        <dl className="space-y-3">
          {LIMITS.map((limit) => (
            <div key={limit.title}>
              <dt className="text-sm font-medium text-foreground">
                {limit.title}
              </dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">
                {limit.body}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 border-t border-warning/30 pt-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">투자 권유가 아닙니다.</span>{' '}
            본 서비스의 모든 정보는 정보 제공 목적이며, 투자 결정과 그 결과에 대한
            책임은 전적으로 이용자에게 있습니다.
          </p>
          <Link
            href="/methodology#disclaimer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-info hover:underline"
          >
            한계점·면책 더 자세히 보기
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </GuideSection>
  )
}
