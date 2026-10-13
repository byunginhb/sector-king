import { HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { RRG_PARAMS } from '@/lib/global-flow/rrg'

interface Props {
  sizeSources: { id: string; name: string; source: string }[]
}

/** 읽는 법·출처·한계 — 기본 접힘. native <details> 로 JS 없이 접근성 확보. */
export function GlobalFlowExplainer({ sizeSources }: Props) {
  return (
    <details className="sk-card group p-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-card-foreground">
        <HelpCircle className="h-4 w-4 text-info" aria-hidden />이 페이지 읽는 법 · 출처 · 한계
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">펼치기</span>
        <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">접기</span>
      </summary>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          주식 1주를 누가 사면 반드시 누가 팝니다. 그래서 &ldquo;주식에서 금으로 1조가
          이동했다&rdquo;는 직접 관측되는 숫자가 아닙니다. 이 페이지는 &ldquo;돈의 흐름&rdquo;을 세
          층으로 나눠 따로 보여줍니다.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-foreground">① 조류</strong> — 연준 총자산 − 재무부 계좌(TGA) −
            역레포. 시장 전체에 풀린 돈의 양입니다.
          </li>
          <li>
            <strong className="text-foreground">② 가치 변화</strong> — 자산군 규모 × 기간 수익률.
            산업 자금 흐름과 같은 정의(기간 시가 가치 변화)이며, 자산 간 이동액이 아닙니다. 그래서
            막대 사이에 화살표를 긋지 않습니다.
          </li>
          <li>
            <strong className="text-foreground">③ 실제 통로</strong> — 스테이블코인 발행량, MMF
            잔고, ETF 순설정, 고객예탁금, 외국인 순매수처럼 돈이 실제로 드나든 게 기록되는 곳입니다.
            이 층에서만 &ldquo;유입·유출&rdquo;이라고 말할 수 있습니다.
          </li>
        </ul>

        <div>
          <p className="font-semibold text-foreground">회전 궤적 (상대 회전 그래프)</p>
          <p className="mt-1">
            각 자산의 주간 달러 가격을 추적 자산 전체의 동일가중 평균(= &ldquo;돈 전체&rdquo;)으로
            나눈 뒤, 가로축은 그 비율을 최근 {RRG_PARAMS.n}주 평균과 비교한 상대 강도, 세로축은 상대
            강도가 {RRG_PARAMS.k}주 전보다 오르는지를 뜻하는 모멘텀입니다. 꼬리는 최근{' '}
            {RRG_PARAMS.tail}주 경로이고, 자산은 보통 개선 → 주도 → 둔화 → 약세 순으로 시계 방향으로
            돕니다. 공개 단순화 버전이며 상용 RRG 공식과 같지 않습니다.
          </p>
        </div>

        <div>
          <p className="font-semibold text-foreground">한 줄 결론은 어떻게 정하나</p>
          <p className="mt-1">
            위험 자산(주식·하이일드·크립토·원유·구리) 평균 수익률에서 안전 자산(국채·금·현금) 평균을
            뺀 값이 기준을 넘으면 &ldquo;위험자산 선호&rdquo;, 반대면 &ldquo;안전자산
            선호&rdquo;입니다. 기준은 최근 2년 동안 평소 3번 중 1번은 &ldquo;쏠림 없음&rdquo;이
            나오도록 기간별로 정했습니다. 정해진 규칙으로 만든 문장이고 전망이나 투자 권유가
            아닙니다.
          </p>
        </div>

        <div>
          <p className="font-semibold text-foreground">자산군 규모 출처 (추정치)</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {sizeSources.map((s) => (
              <li key={s.id}>
                <span className="text-foreground">{s.name}</span> — {s.source}
              </li>
            ))}
          </ul>
          <p className="mt-1">
            기준 시점 이후는 지수·ETF 수익률로 굴립니다. ETF 가격은 이자·배당을 포함한 총수익
            기준이라 채권 규모가 이자만큼 조금씩 커지고, 신규 발행·상장은 반영되지 않습니다.
            원유·구리·장기국채는 시장 &ldquo;가치&rdquo;를 정의하기 어려워 수익률과 회전 궤적에만
            넣었습니다.
          </p>
        </div>

        <div>
          <p className="font-semibold text-foreground">데이터 출처</p>
          <p className="mt-1">
            가격 Yahoo Finance · 순유동성·M2·MMF 미국 연준(FRED) · 스테이블코인 DefiLlama ·
            고객예탁금·외국인 순매수 네이버 증권. 평일 하루 4회 갱신하며, 연준 지표는 주간·월간·분기
            발표라 기준일이 다릅니다.
          </p>
        </div>

        <p>
          주식 안에서 돈이 어느 산업으로 가는지는{' '}
          <Link href="/#money-flow" className="text-primary underline underline-offset-2">
            홈의 산업 자금 흐름
          </Link>
          에서, 개념 설명은{' '}
          <Link
            href="/guide/cross-asset-flow"
            className="text-primary underline underline-offset-2"
          >
            자산군 간 자금 흐름 읽는 법
          </Link>
          에서 볼 수 있습니다.
        </p>
      </div>
    </details>
  )
}
