import { GuideSection } from './guide-section'
import { VALUATION_GUIDE_ROWS } from '@/lib/valuation-guide'

/**
 * 산업/기업 유형별 핵심 밸류에이션 지표 안내 (교육용).
 * SoT: lib/valuation-guide.ts (종목 상세의 "핵심 지표" 배지와 공유).
 */
export function ValuationMetricGuide() {
  return (
    <GuideSection
      id="valuation"
      title="D. 어떤 밸류에이션 지표를 볼까"
      description="산업 특성에 따라 중요한 지표가 다릅니다. 기업 유형별 중심 지표를 참고하세요."
    >
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">기업 유형</th>
              <th className="px-3 py-2 font-medium">핵심 지표</th>
              <th className="px-3 py-2 font-medium">함께 볼 지표</th>
            </tr>
          </thead>
          <tbody>
            {VALUATION_GUIDE_ROWS.map((row) => (
              <tr key={row.metric} className="border-b border-border-subtle last:border-0">
                <td className="px-3 py-2.5 text-foreground">{row.type}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                    {row.metric}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.companion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 space-y-1 text-[13px] leading-relaxed text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">PER</span>은 선행 PER과 산업 사이클을
          함께 보면 고점·저점 판단에 도움이 됩니다.
        </li>
        <li>
          <span className="font-medium text-foreground">PBR</span>은 ROE와 함께 봅니다. 낮은 PBR과
          높은 ROE가 겹치면 상대적으로 저평가된 신호일 수 있습니다.
        </li>
        <li>
          <span className="font-medium text-foreground">EV/EBITDA</span>는 자본구조(부채) 차이를
          보정해, 설비·감가상각이 큰 산업의 비교에 유리합니다.
        </li>
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        종목 상세 페이지의 &lsquo;밸류에이션 상대비교&rsquo;에서 각 기업의 핵심 지표를 자동으로
        표시합니다.
      </p>
    </GuideSection>
  )
}
