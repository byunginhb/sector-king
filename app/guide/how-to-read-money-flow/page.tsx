import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle } from '@/components/guide/guide-article'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const SLUG = 'how-to-read-money-flow'
/** 본문 개정일. 내용을 고치면 이 값도 올린다. */
const UPDATED_AT = '2026-08-08'

const TITLE = '시장의 돈이 어디로 흐르는지 읽는 방법'
const LEAD =
  '어느 산업·섹터의 몸값이 커지고 어디가 줄어드는지는 섹터별 시가총액 변화를 나란히 놓고 보면 드러납니다. 이 문서는 섹터킹의 자금 흐름 화면을 순서대로 읽는 방법과, 흔히 잘못 읽는 지점을 정리합니다. 화면의 모든 금액은 통화가 다른 종목까지 USD로 환산한 뒤 합산한 값입니다.'

export const metadata: Metadata = {
  title: TITLE,
  description:
    '섹터별 시가총액 변화로 시장의 자금 흐름을 읽는 순서 — 기간 고르기, 방향과 폭 보기, 상위 기여 종목 확인, 흔한 오독 피하기. 섹터킹 자금 흐름 화면 사용법.',
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
        {
          href: '/guide/market-cap-change-vs-net-buying',
          label: '시가총액 변화 vs 순매수',
        },
        { href: '/guide/sector-rotation', label: '섹터 로테이션 보는 법' },
        { href: '/sectors', label: '전체 섹터 목록' },
      ]}
      sections={[
        {
          id: 'what-you-see',
          heading: '1단계 — 화면이 무엇을 보여주는지 먼저 안다',
          body: (
            <>
              <p>
                자금 흐름 화면은 선택한 기간 동안{' '}
                <strong className="text-foreground">
                  각 섹터의 시가총액 합계가 얼마나 늘거나 줄었는지
                </strong>
                를 보여줍니다. 유입(초록)·유출(빨강)은 그 값의 부호입니다.
              </p>
              <p>
                여기서 &quot;돈&quot;은 실제로 오간 매매 대금이 아니라 시장이 그 섹터에 매긴
                값의 변화입니다. 이 차이가 헷갈린다면{' '}
                <Link
                  href="/guide/market-cap-change-vs-net-buying"
                  className="text-info hover:underline"
                >
                  시가총액 변화와 순매수의 차이
                </Link>
                를 먼저 읽는 편이 좋습니다.
              </p>
            </>
          ),
        },
        {
          id: 'pick-period',
          heading: '2단계 — 질문에 맞는 기간을 고른다',
          body: (
            <>
              <p>
                기간을 바꾸면 답이 바뀝니다. 짧은 기간은 뉴스 한 건에도 크게 흔들리고, 긴
                기간은 추세를 보여주는 대신 최근 반전을 놓칩니다.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">며칠</strong> — 특정 이벤트(실적, 정책
                  발표)의 반응을 볼 때
                </li>
                <li>
                  <strong className="text-foreground">2주~1개월</strong> — 자금이 실제로 옮겨가고
                  있는지 볼 때. 기본값으로 쓰기 무난합니다
                </li>
                <li>
                  <strong className="text-foreground">그 이상</strong> — 산업 구조 변화를 볼 때
                </li>
              </ul>
              <p>
                하나의 기간만 보고 결론 내리지 말고, 짧은 기간과 긴 기간의 방향이 같은지
                다른지를 비교하세요. 방향이 엇갈리면 최근에 흐름이 바뀌고 있다는 신호입니다.
              </p>
            </>
          ),
        },
        {
          id: 'direction-and-size',
          heading: '3단계 — 방향과 폭을 함께 본다',
          body: (
            <>
              <p>
                큰 섹터는 같은 비율로 움직여도 금액이 훨씬 크게 나옵니다. 반도체가 1% 오르면
                작은 섹터가 20% 오른 것보다 큰 금액이 됩니다.{' '}
                <strong className="text-foreground">금액과 퍼센트를 같이 보세요.</strong>
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  금액도 크고 비율도 큰 섹터 → 시장의 관심이 실제로 쏠린 곳
                </li>
                <li>
                  금액만 큰 섹터 → 원래 덩치가 커서 그런 것일 수 있음
                </li>
                <li>
                  비율만 큰 섹터 → 작은 섹터의 변동. 종목 한둘이 만든 결과일 가능성이 높음
                </li>
              </ul>
            </>
          ),
        },
        {
          id: 'drill-down',
          heading: '4단계 — 누가 그 움직임을 만들었는지 확인한다',
          body: (
            <>
              <p>
                섹터 수치는 구성 종목의 합계입니다. 상위 한두 종목의 비중이 크면 섹터 지표가
                사실상 그 종목을 따라갑니다. 그래서 눈에 띄는 섹터를 발견하면 반드시 종목
                단위로 내려가 확인해야 합니다.
              </p>
              <p>
                <Link href="/sectors" className="text-info hover:underline">
                  섹터 목록
                </Link>
                에서 해당 섹터로 들어가면 시가총액 순으로 정렬된 종목표가 나옵니다. 상위 종목의
                전일 대비 등락을 보면 섹터 움직임의 출처가 대개 바로 보입니다.
              </p>
              <p>
                섹터 전체가 고르게 움직였다면 산업 전반의 재평가, 한 종목만 크게 움직였다면 그
                기업의 개별 사정일 가능성이 큽니다. 둘은 의미가 완전히 다릅니다.
              </p>
            </>
          ),
        },
        {
          id: 'common-mistakes',
          heading: '흔한 오독 네 가지',
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">
                  &quot;유입 3조원&quot;을 3조원이 들어온 것으로 읽는다.
                </strong>{' '}
                평가액의 변화이지 매매 대금이 아닙니다.
              </li>
              <li>
                <strong className="text-foreground">
                  유입이 큰 섹터를 곧바로 매수 후보로 본다.
                </strong>{' '}
                이미 오른 결과를 보고 있는 것입니다. 이 화면은 무엇이 일어났는지를 알려주지
                무엇이 일어날지를 알려주지 않습니다.
              </li>
              <li>
                <strong className="text-foreground">한 기간만 보고 추세라고 판단한다.</strong>{' '}
                기간을 바꿔 방향이 유지되는지 확인하세요.
              </li>
              <li>
                <strong className="text-foreground">
                  섹터 시가총액의 단순 합을 시장 전체 규모로 읽는다.
                </strong>{' '}
                한 종목이 여러 섹터에 속할 수 있어 섹터 합계는 중복을 포함합니다. 그래서
                섹터킹은 산업 간 총합을 표시하지 않습니다.
              </li>
            </ul>
          ),
        },
      ]}
    />
  )
}
