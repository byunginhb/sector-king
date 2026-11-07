import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle } from '@/components/guide/guide-article'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const SLUG = 'sector-rotation'
/** 본문 개정일. 내용을 고치면 이 값도 올린다. */
const UPDATED_AT = '2026-11-07'

const TITLE = '섹터 로테이션을 확인하는 방법'
const LEAD =
  '섹터 로테이션은 투자 비중과 시장의 주도권이 섹터 사이에서 바뀌는 흐름을 말합니다. 한 섹터가 오르고 다른 섹터가 내려야만 나타나는 것은 아닙니다. 같은 기간의 변화율과 상대 강도를 비교해 후보를 찾되, 섹터킹의 시가총액 변화만으로 실제 자금 이동을 증명할 수는 없습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description:
    '섹터 로테이션이란? 같은 기간 섹터별 변화율과 상대 강도를 비교하는 방법, 두 섹터가 모두 상승하는 예시, 실제 자금 이동과 구분해야 할 한계를 설명합니다.',
  alternates: { canonical: `${BASE_URL}/guide/${SLUG}` },
  openGraph: {
    title: `${TITLE} | Sector King`,
    description: LEAD,
    url: `${BASE_URL}/guide/${SLUG}`,
    type: 'article',
  },
}

export default function Page() {
  return (
    <GuideArticle
      href={`/guide/${SLUG}`}
      title={TITLE}
      h1={TITLE}
      lead={LEAD}
      updatedAt={UPDATED_AT}
      related={[
        { href: '/guide/how-to-read-money-flow', label: '자금 흐름 화면 읽는 법' },
        {
          href: '/guide/market-cap-change-vs-net-buying',
          label: '시가총액 변화 vs 순매수',
        },
        { href: '/sectors', label: '전체 섹터 목록' },
      ]}
      sections={[
        {
          id: 'what-is-rotation',
          heading: '섹터 로테이션은 꼭 한쪽이 내려야 하나요?',
          body: (
            <>
              <p>
                꼭 그렇지는 않습니다. 섹터별 성과를 비교할 때는 오르내리는 부호뿐 아니라{' '}
                <strong className="text-foreground">
                  다른 섹터에 비해 얼마나 강하거나 약했는지
                </strong>
                를 함께 봐야 합니다. 모든 섹터가 오르는 시장에서도 상대적으로 앞서는 섹터가
                바뀔 수 있습니다.
              </p>
              <p>
                예를 들어 같은 기간 A 섹터가 8%, B 섹터가 2% 올랐다면 A가 6%포인트 더
                강했습니다. 앞선 기간에는 B가 더 강했다면 주도 섹터 변화의 후보로 살펴볼 수
                있습니다. 이 예시만으로 B를 판 돈이 A로 갔다고 결론 낼 수는 없습니다.
              </p>
            </>
          ),
        },
        {
          id: 'how-to-check',
          heading: '확인하는 순서',
          body: (
            <>
              <p>
                <strong className="text-foreground">① 같은 기간으로 여러 섹터를 나란히 본다.</strong>{' '}
                한 섹터만 보면 그게 시장 전체 흐름인지 그 섹터만의 일인지 구분할 수 없습니다.
              </p>
              <p>
                <strong className="text-foreground">② 변화율 차이와 주도 섹터를 본다.</strong>{' '}
                같은 부호여도 변화율 차이가 클 수 있습니다. 금액 순위만 보면 원래 시가총액이
                큰 섹터가 앞서 보일 수 있으므로, 변화율도 함께 비교하세요.
              </p>
              <p>
                <strong className="text-foreground">③ 기간을 바꿔 지속성을 본다.</strong> 며칠과
                2주·1개월 구간에서 앞서는 섹터가 같은지 비교하세요. 한 번의 순위 차이보다
                여러 구간의 강약 변화를 함께 살피되, 기간이 겹치면 독립적인 확인은 아닙니다.
              </p>
              <p>
                <strong className="text-foreground">④ 종목 단위로 내려가 확인한다.</strong>{' '}
                섹터 수치는 구성 종목의 합입니다.{' '}
                <Link href="/sectors" className="text-info hover:underline">
                  섹터 목록
                </Link>
                에서 해당 섹터의 종목표를 열어, 섹터 전반이 고르게 움직였는지 상위 한두 종목이
                끌고 갔는지 보세요. 한 종목에 집중됐다면 섹터 전반의 흐름으로 확대 해석하지
                말고 해당 기업의 공시·실적 등을 확인하세요.
              </p>
            </>
          ),
        },
        {
          id: 'not-rotation',
          heading: '로테이션으로 단정하기 전에 확인할 것은?',
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">시장 전체의 상승·하락.</strong> 같은 방향의
                움직임만으로 주도권 이동을 판단할 수 없습니다. 섹터 사이의 변화율 차이와
                이전 구간 대비 강약 변화도 비교해야 합니다.
              </li>
              <li>
                <strong className="text-foreground">대형주 한 종목의 급등락.</strong> 시가총액이
                큰 종목 하나가 여러 섹터에 속해 있으면 그 종목 때문에 여러 섹터가 동시에
                움직일 수 있습니다. 각 섹터가 독립적으로 강해진 것으로 해석하지 마세요.
              </li>
              <li>
                <strong className="text-foreground">기간을 짧게 잡았을 때의 엇갈림.</strong>{' '}
                하루이틀 방향이 갈리는 건 흔합니다.
              </li>
              <li>
                <strong className="text-foreground">구성 종목이 바뀐 섹터.</strong> 종목이 새로
                편입되거나 빠지면 비교 대상이 바뀝니다. 현재 추적 종목에서도 시작일이나
                마지막 날 데이터가 빠지면 시총 합계가 달라질 수 있으므로, 변화가 모두 주가
                움직임 때문이라고 가정하지 마세요.
              </li>
            </ul>
          ),
        },
        {
          id: 'limits',
          heading: '이 방법의 한계',
          body: (
            <>
              <p>
                섹터킹의 자금 흐름은 시가총액 변화이지 실제 순매수가 아닙니다. 따라서{' '}
                <strong className="text-foreground">
                  &quot;A 섹터에서 빠진 돈이 B 섹터로 갔다&quot;를 직접 증명하지는 못합니다.
                </strong>{' '}
                섹터별 평가액의 강약을 보여줄 뿐, 실제로 누가 어느 섹터를 팔고 무엇을 샀는지는
                이 데이터로 알 수 없습니다. 자세한 내용은{' '}
                <Link
                  href="/guide/market-cap-change-vs-net-buying"
                  className="text-info hover:underline"
                >
                  시가총액 변화와 순매수의 차이
                </Link>
                를 참고하세요.
              </p>
              <p>
                또한 과거에 더 강했던 섹터가 앞으로도 앞설 것을 뜻하지 않습니다. 이
                화면은 무엇이 일어났는지를 보여주는 도구이지 예측 도구가 아닙니다.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
