import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle } from '@/components/guide/guide-article'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const SLUG = 'cross-asset-flow'
/** 본문 개정일. 내용을 고치면 이 값과 app/sitemap.ts 의 lastmod 를 같이 올린다. */
const UPDATED_AT = '2026-10-13'

const TITLE = '주식 밖 자금 흐름 읽는 법 — 달러·금·채권·비트코인'
const LEAD =
  '"돈이 주식에서 빠져 금으로 갔다"는 말은 직접 관측되는 사실이 아닙니다. 거래마다 사는 사람과 파는 사람이 있기 때문입니다. 대신 볼 수 있는 것은 세 가지입니다 — 시장 전체에 풀린 돈의 양, 자산군별 몸집 변화, 그리고 돈이 실제로 드나든 게 기록되는 통로. 이 문서는 셋을 구분해서 읽는 법과, "어디서 어디로"를 정직하게 보여주는 회전 궤적 읽는 법을 설명합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description:
    '주식·채권·금·달러·비트코인 사이 자금 흐름을 읽는 법 — 연준 순유동성, 자산군 시가 가치 변화, 스테이블코인·MMF·ETF 순설정, 상대 회전 그래프(RRG) 해석과 흔한 오해.',
  alternates: { canonical: `${BASE_URL}/guide/${SLUG}` },
  openGraph: {
    title: `${TITLE} | Sector King`,
    description: LEAD,
    url: `${BASE_URL}/guide/${SLUG}`,
    type: 'article',
  },
}

const strong = 'text-foreground'

export default function Page() {
  return (
    <GuideArticle
      href={`/guide/${SLUG}`}
      title={TITLE}
      h1={TITLE}
      lead={LEAD}
      updatedAt={UPDATED_AT}
      related={[
        { href: '/global-flow', label: '글로벌 자금 지도' },
        { href: '/guide/market-cap-change-vs-net-buying', label: '시가총액 변화 vs 순매수' },
        { href: '/guide/sector-rotation', label: '섹터 로테이션을 확인하는 방법' },
      ]}
      sections={[
        {
          id: 'why-not-observable',
          heading: '왜 "A에서 B로 이동"은 직접 볼 수 없나',
          body: (
            <>
              <p>
                누군가 주식을 팔고 금을 샀다면, 그 주식을 산 사람도 있고 그 금을 판 사람도 있습니다.
                주식을 산 사람의 돈은 주식으로 들어갔고, 금을 판 사람의 돈은 금에서 나왔습니다. 시장
                전체로 보면 주식에서 &ldquo;빠진&rdquo; 돈도, 금으로 &ldquo;들어간&rdquo; 돈도
                없습니다. 바뀐 건 <strong className={strong}>가격</strong>입니다.
              </p>
              <p>
                그래서 &ldquo;주식 시가총액이 1조 달러 줄고 금 시가 가치가 1조 달러 늘었다&rdquo;는
                두 사실을 화살표로 잇는 순간 측정하지 않은 이야기를 지어내게 됩니다. 섹터킹이 자산군
                사이에 화살표를 긋지 않는 이유입니다.
              </p>
            </>
          ),
        },
        {
          id: 'three-layers',
          heading: '대신 볼 수 있는 세 가지',
          body: (
            <>
              <p>
                <strong className={strong}>① 조류 — 시장 전체 돈의 양.</strong> 미국 연준 총자산에서
                재무부 계좌(TGA)와 역레포를 뺀 &ldquo;순유동성&rdquo;이 대표적입니다. 늘면 금융
                시스템에 돈이 풀리는 중이고, 줄면 거둬들이는 중입니다. 모든 자산의 수위를 함께
                올리거나 내리는 힘이지만, 인과가 증명된 신호는 아닙니다.
              </p>
              <p>
                <strong className={strong}>② 가치 변화 — 자산군의 몸집.</strong> 자산군 규모 × 기간
                수익률입니다. 섹터킹의 산업·섹터 자금 흐름과 같은 정의(기간 시가 가치 변화)라, 주식
                안과 밖을 같은 언어로 비교할 수 있습니다. 단 이것은 &ldquo;이동액&rdquo;이 아닙니다.
              </p>
              <p>
                <strong className={strong}>③ 실제 통로 — 기록되는 유출입.</strong> 스테이블코인
                발행량(크립토로 들어온 달러), MMF 잔고(대기 현금), ETF 순설정(좌수 변화 × 좌당 가치
                — 가격 효과가 빠진 신규 자금), 고객예탁금(국내 증시 대기 자금), 외국인 순매수(해외
                자금의 실제 매매 차이). 이 층에서만 &ldquo;유입&rdquo;과 &ldquo;유출&rdquo;을 단정할
                수 있습니다.
              </p>
            </>
          ),
        },
        {
          id: 'dollar-is-ruler',
          heading: '달러는 자산이 아니라 잣대다',
          body: (
            <p>
              모든 금액을 달러로 적으면, 달러가 강해지는 기간에는 다른 자산이 전부 조금씩 작아
              보입니다. 한국 주식은 지수가 그대로여도 원화가 약해지면 달러 기준으로 내립니다. 그래서
              달러 인덱스는 자산군 목록이 아니라 화면 맨 위{' '}
              <strong className={strong}>잣대 띠</strong>에 따로 둡니다. 결론을 읽기 전에 잣대가
              얼마나 움직였는지부터 확인하세요.
            </p>
          ),
        },
        {
          id: 'rotation-graph',
          heading: '회전 궤적으로 "어디서 어디로" 보기',
          body: (
            <>
              <p>
                화살표 대신 쓸 수 있는 도구가 상대 회전 그래프(RRG)입니다. 각 자산의 가격을 추적
                자산 전체의 평균으로 나눠 &ldquo;전체 대비 얼마나 강한가&rdquo;를 만들고, 가로축에
                그 강도, 세로축에 강도가 붙는 중인지(모멘텀)를 놓습니다.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className={strong}>개선(왼쪽 위)</strong> — 아직 약하지만 힘이 붙는 중
                </li>
                <li>
                  <strong className={strong}>주도(오른쪽 위)</strong> — 강하고 더 강해지는 중
                </li>
                <li>
                  <strong className={strong}>둔화(오른쪽 아래)</strong> — 강하지만 힘이 빠지는 중
                </li>
                <li>
                  <strong className={strong}>약세(왼쪽 아래)</strong> — 약하고 더 약해지는 중
                </li>
              </ul>
              <p>
                자산은 보통 이 순서로 시계 방향으로 돕니다. 한 자산이 둔화로 넘어가는 동안 다른
                자산이 개선에서 주도로 올라간다면, 상대적인 힘이 앞에서 뒤로 옮겨가는 중이라고 읽을
                수 있습니다. 이것이 측정 가능한 범위에서 &ldquo;어디서 어디로&rdquo;에 가장 가까운
                답입니다.
              </p>
            </>
          ),
        },
        {
          id: 'common-mistakes',
          heading: '흔한 오해',
          body: (
            <>
              <p>
                <strong className={strong}>&ldquo;유동성이 늘었으니 오른다.&rdquo;</strong>{' '}
                순유동성과 위험자산이 같이 움직인 시기가 많을 뿐, 늘면 반드시 오른다는 규칙은
                없습니다. 방향 확인용으로만 쓰세요.
              </p>
              <p>
                <strong className={strong}>
                  &ldquo;MMF가 사상 최대니 곧 증시로 들어온다.&rdquo;
                </strong>{' '}
                MMF 잔고는 금리가 높을 때 자연스럽게 커집니다. 잔고 수준보다 <em>변화 방향</em>이
                의미 있고, 미국 개인 MMF 통계는 약 6주 늦게 발표된다는 점도 감안해야 합니다.
              </p>
              <p>
                <strong className={strong}>
                  &ldquo;금 시가 가치가 커졌으니 돈이 금으로 갔다.&rdquo;
                </strong>{' '}
                금 가격이 오르면 지상의 금 전체 가치가 커질 뿐입니다. 실제 신규 자금은 금 ETF 순설정
                같은 통로 지표로 확인해야 합니다.
              </p>
            </>
          ),
        },
        {
          id: 'on-sector-king',
          heading: '섹터킹에서 확인하기',
          body: (
            <p>
              <Link href="/global-flow" className="text-primary underline underline-offset-2">
                글로벌 자금 지도
              </Link>
              는 위 세 층과 회전 궤적을 한 화면에 놓고, 기간(1주·1개월·3개월·1년)별 한 줄 결론을
              규칙에 따라 만듭니다. 주식이 받는 쪽으로 보이면{' '}
              <Link href="/#money-flow" className="text-primary underline underline-offset-2">
                홈의 산업 자금 흐름
              </Link>
              에서 주식 안의 어느 산업·섹터로 갔는지 이어서 볼 수 있습니다.
            </p>
          ),
        },
      ]}
    />
  )
}
