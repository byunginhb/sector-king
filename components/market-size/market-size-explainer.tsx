import { HelpCircle } from 'lucide-react'
import Link from 'next/link'

/** "이 차트 읽는 법" — 기본 접힘 인페이지 패널. native <details> 로 JS 없이 접근성 확보. */
export function MarketSizeExplainer() {
  return (
    <details className="sk-card group">
      <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-semibold text-card-foreground">
        <HelpCircle className="w-4 h-4 text-info" aria-hidden />
        이 차트 읽는 법
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">
          펼치기
        </span>
        <span className="ml-auto text-xs text-muted-foreground hidden group-open:inline">
          접기
        </span>
      </summary>

      <div className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">성장 전망</strong>은 두 지표를 각각 수평 막대로
          보여줍니다(지표 높은 순, 막대 클릭 시 섹터로 드릴다운). PC에서는 상단 토글로
          <strong className="text-foreground"> 버블 차트</strong>(가로=성장률, 세로=상승여력,
          크기=시총, 색=산업)로 전환할 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">매출 성장률</strong> — 애널리스트 매출 성장
            전망. 막대가 길수록 성장 기대가 큽니다.
          </li>
          <li>
            <strong className="text-foreground">목표주가 상승여력</strong> —
            (목표주가 − 현재가) ÷ 현재가. 막대가 길수록 애널리스트 기대가 높습니다.
          </li>
        </ul>
        <p>
          두 지표 값은 종목마다 다르므로 <strong className="text-foreground">시가총액 가중
          평균</strong>으로 묶습니다(소형주 왜곡 방지). 데이터가 없는 항목은 막대에서
          제외되지만, <strong className="text-foreground">트리맵(시총 비율)</strong>에는 시총이
          있으면 포함됩니다. 극단값은 막대를 상한에서 자르되 숫자는 실제값을 표기합니다.
        </p>
        <p>
          <strong className="text-foreground">통화 정규화</strong> — 시총·매출은 모두{' '}
          <code className="text-xs">toUsd()</code>로 USD 변환 후 합산합니다(혼합통화 왜곡
          방지). 표시 통화는 상단 토글로 ₩/$ 전환됩니다.
        </p>
        <p>
          <strong className="text-foreground">매출은 보조 지표</strong>입니다. 전체 추적
          종목의 약 1/3만 매출 데이터를 보유하므로, 각 항목에 실제 합산된 종목 수를 함께
          표기합니다(예: 12/40개). 커버리지가 낮으면 실제 시장 규모보다 작게 보일 수
          있습니다.
        </p>
        <p className="text-xs">
          점수·지표 산출 방식은{' '}
          <Link href="/methodology" className="text-primary hover:underline">
            산출 방법론
          </Link>{' '}
          문서를 참고하세요.
        </p>
      </div>
    </details>
  )
}
