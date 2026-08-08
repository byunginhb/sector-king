import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle } from '@/components/guide/guide-article'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const SLUG = 'sector-rotation'
/** 본문 개정일. 내용을 고치면 이 값도 올린다. */
const UPDATED_AT = '2026-08-08'

const TITLE = '섹터 로테이션을 확인하는 방법'
const LEAD =
  '섹터 로테이션은 자금이 한 섹터에서 다른 섹터로 옮겨가는 현상을 말합니다. 확인하려면 한 섹터만 보지 말고 여러 섹터의 방향을 같은 기간에 나란히 놓고, 서로 반대로 움직이는 짝이 있는지를 봐야 합니다. 이 문서는 그 판별 순서와, 로테이션이 아닌 것을 로테이션으로 오해하지 않는 방법을 설명합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description:
    '섹터 로테이션이란 무엇이고 어떻게 확인하는가 — 같은 기간 여러 섹터를 비교해 반대 방향으로 움직이는 짝 찾기, 시장 전체 상승·하락과 구분하기, 흔한 오해 정리.',
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
          heading: '섹터 로테이션이란',
          body: (
            <>
              <p>
                투자 자금은 무한하지 않습니다. 어떤 섹터의 비중을 늘리려면 다른 곳을 줄여야
                합니다. 그래서 시장 참여자들의 판단이 한 방향으로 모이면{' '}
                <strong className="text-foreground">
                  특정 섹터가 오르는 동안 다른 섹터가 눌리는 패턴
                </strong>
                이 나타납니다. 이걸 섹터 로테이션이라고 부릅니다.
              </p>
              <p>
                교과서적으로는 경기 국면에 따라 경기민감주 → 소재 → 필수소비재 → 방어주 순으로
                순환한다는 설명이 많지만, 실제 시장이 그 순서를 그대로 따르는 경우는 드뭅니다.
                순서를 외우기보다 <strong className="text-foreground">지금 무엇이 무엇과
                반대로 움직이는지</strong>를 데이터로 확인하는 편이 낫습니다.
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
                <strong className="text-foreground">② 부호가 갈리는지 본다.</strong> 대부분의
                섹터가 같은 방향이면 로테이션이 아니라 시장 전체가 오르거나 내린 것입니다.
                로테이션은 <em>플러스인 섹터와 마이너스인 섹터가 동시에</em> 뚜렷할 때 성립합니다.
              </p>
              <p>
                <strong className="text-foreground">③ 기간을 바꿔 지속성을 본다.</strong> 며칠짜리
                엇갈림은 노이즈인 경우가 많습니다. 2주·1개월로 늘렸을 때도 같은 짝이 반대로
                움직이면 그때부터 의미가 생깁니다.
              </p>
              <p>
                <strong className="text-foreground">④ 종목 단위로 내려가 확인한다.</strong>{' '}
                섹터 수치는 구성 종목의 합입니다.{' '}
                <Link href="/sectors" className="text-info hover:underline">
                  섹터 목록
                </Link>
                에서 해당 섹터의 종목표를 열어, 섹터 전반이 고르게 움직였는지 상위 한두 종목이
                끌고 갔는지 보세요. 후자라면 로테이션이 아니라 개별 기업 이슈입니다.
              </p>
            </>
          ),
        },
        {
          id: 'not-rotation',
          heading: '로테이션이 아닌 것들',
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">시장 전체의 상승·하락.</strong> 모든 섹터가
                같은 방향이면 자금이 옮겨간 게 아니라 전체 평가액이 함께 움직인 것입니다.
              </li>
              <li>
                <strong className="text-foreground">대형주 한 종목의 급등락.</strong> 시가총액이
                큰 종목 하나가 여러 섹터에 속해 있으면 그 종목 때문에 여러 섹터가 동시에
                움직입니다. 로테이션처럼 보이지만 아닙니다.
              </li>
              <li>
                <strong className="text-foreground">기간을 짧게 잡았을 때의 엇갈림.</strong>{' '}
                하루이틀 방향이 갈리는 건 흔합니다.
              </li>
              <li>
                <strong className="text-foreground">구성 종목이 바뀐 섹터.</strong> 종목이 새로
                편입되거나 빠지면 합계가 변합니다. 섹터킹은 기간 변화율을 계산할 때 시작일과
                마지막 날 양쪽에 모두 있는 종목만 분모에 넣어 이 왜곡을 줄이지만, 완전히
                없애지는 못합니다.
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
                두 섹터가 반대로 움직였다는 사실만 보여줄 뿐, 같은 자금인지는 이 데이터로 알 수
                없습니다. 자세한 내용은{' '}
                <Link
                  href="/guide/market-cap-change-vs-net-buying"
                  className="text-info hover:underline"
                >
                  시가총액 변화와 순매수의 차이
                </Link>
                를 참고하세요.
              </p>
              <p>
                또한 과거에 반대로 움직였다는 사실이 앞으로도 그럴 것을 뜻하지 않습니다. 이
                화면은 무엇이 일어났는지를 보여주는 도구이지 예측 도구가 아닙니다.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
