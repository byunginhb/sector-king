import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle } from '@/components/guide/guide-article'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const SLUG = 'market-cap-change-vs-net-buying'
/** 본문 개정일. 내용을 고치면 이 값도 올린다(JSON-LD dateModified 와 공유). */
const UPDATED_AT = '2026-11-07'

const TITLE = '시가총액 변화와 순매수는 무엇이 다른가'
const LEAD =
  '시가총액이 3조원 늘었다고 3조원이 순매수된 것은 아닙니다. 시가총액 변화는 종목의 평가액 차이이고, 순매수는 특정 투자자 집단의 매수 금액에서 매도 금액을 뺀 값입니다. 섹터킹의 "자금 흐름"은 앞의 시가총액 변화이며, 누가 얼마나 순매수했는지는 보여주지 않습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description:
    '시가총액 변화는 주가 × 주식수의 변화이고 순매수는 실제 체결된 매수·매도 차액입니다. 섹터킹의 자금 흐름 지표가 어느 쪽이며 왜 그렇게 계산하는지, 어떻게 읽어야 하는지 설명합니다.',
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
        { href: '/guide/sector-rotation', label: '섹터 로테이션 보는 법' },
        { href: '/sectors', label: '전체 섹터 목록' },
      ]}
      sections={[
        {
          id: 'definition',
          heading: '시가총액 변화와 순매수는 어떻게 다른가요?',
          body: (
            <>
              <p>
                <strong className="text-foreground">시가총액</strong>은 주가 × 상장주식수입니다.
                시가총액 변화는 기간 마지막 날의 시가총액에서 첫날의 시가총액을 뺀 값이며,
                섹터 단위에서는 그 섹터에 속한 종목들의 시가총액 합계로 계산합니다.
              </p>
              <p>
                <strong className="text-foreground">순매수</strong>는 특정 투자자 유형(외국인,
                기관, 개인 등)이 실제로 체결한 매수 금액에서 매도 금액을 뺀 값입니다. 예를 들어
                외국인이 700억원을 사고 500억원을 팔았다면 외국인 순매수는 200억원입니다.
              </p>
              <p>
                체결된 거래에는 매수자와 매도자가 함께 있습니다. 한 집단의 순매수는 다른
                집단의 순매도와 대응하므로, 외국인 순매수 200억원을 시장 전체에 새로 들어온
                현금 200억원이라고 해석할 수는 없습니다.
              </p>
              <p>
                섹터킹이 &quot;자금 흐름&quot;이라는 이름으로 보여주는 값은{' '}
                <strong className="text-foreground">앞의 것</strong>, 즉 시가총액 변화액입니다.
              </p>
            </>
          ),
        },
        {
          id: 'why-different',
          heading: '왜 크기가 전혀 다른가',
          body: (
            <>
              <p>
                주식수가 같다면 시가총액은 주가 변화에 따라 움직입니다. 그래서{' '}
                <strong className="text-foreground">
                  소량만 거래돼도 전체 평가액이 통째로 움직입니다.
                </strong>
              </p>
              <p>
                예를 들어 주식수가 그대로인 시가총액 100조원 종목의 주가가 3% 오르면 시가총액은
                3조원 늘어납니다. 그날 거래대금이 5,000억원이었다면 거래 규모는 5,000억원입니다.
                외국인 순매수 같은 집단별 차액은 별도 매수·매도 집계가 있어야 알 수 있습니다.
                이 숫자들은 서로 다른 질문에 답합니다.
              </p>
              <p>
                반대로 거래가 많아도 기간 시작과 끝의 주가와 주식수가 같으면 시가총액 변화는
                0입니다. 거래대금의 크기만으로 평가액 변화의 방향을 정할 수 없습니다.
              </p>
            </>
          ),
        },
        {
          id: 'why-we-use-it',
          heading: '섹터킹은 왜 시가총액 변화를 쓰는가',
          body: (
            <>
              <p>
                섹터킹은 한국과 미국의 추적 종목을 같은 화면에서 비교합니다. 저장된 종목별
                시가총액을 USD로 환산해 합산하면{' '}
                <strong className="text-foreground">같은 계산 방식으로 평가액 변화를 비교</strong>
                할 수 있습니다. 화면에서는 이를 선택한 원화·달러로 표시합니다.
              </p>
              <p>
                섹터 단위 집계에도 시가총액이 자연스럽습니다. 섹터는 종목의 묶음이고, 묶음의
                크기는 구성 종목 평가액의 합으로 정의되기 때문입니다.
              </p>
              <p>
                다만 이름이 &quot;자금 흐름&quot;이라 실제 유입 자금으로 오해되기 쉽습니다.
                금액을 해석할 때는 &quot;시가총액 변화액&quot;이라는 계산 기준을 먼저 확인하세요.
              </p>
            </>
          ),
        },
        {
          id: 'how-to-read',
          heading: '그러면 어떻게 읽어야 하나',
          body: (
            <>
              <p>
                <strong className="text-foreground">방향과 상대 크기</strong>를 보세요. 어떤
                섹터가 늘고 어떤 섹터가 줄었는지, 그 폭이 다른 섹터에 비해 큰지 작은지가 이
                지표가 답할 수 있는 질문입니다. 절대 금액을 &quot;이만큼의 돈이 들어왔다&quot;로
                읽지 마세요.
              </p>
              <p>
                여러 섹터가 함께 움직였는지, 특정 섹터만 차이가 큰지 비교하세요. 차이가 큰
                섹터는 시가총액 상위 종목에 변화가 집중됐는지 확인하되, 움직임의 원인은
                공시·실적 등으로 별도 확인해야 합니다.
              </p>
              <p>
                큰 섹터는 같은 비율로 움직여도 변화액이 훨씬 커 보입니다. 금액과 퍼센트를 함께
                보는 편이 왜곡이 적습니다.
              </p>
            </>
          ),
        },
        {
          id: 'limits',
          heading: '이 지표가 답하지 못하는 것',
          body: (
            <>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">누가 샀는지 모릅니다.</strong> 외국인인지
                  기관인지 개인인지 구분되지 않습니다.
                </li>
                <li>
                  <strong className="text-foreground">유입된 자금의 규모가 아닙니다.</strong>{' '}
                  평가액의 변화일 뿐입니다.
                </li>
                <li>
                  <strong className="text-foreground">
                    주가 외의 요인으로도 움직입니다.
                  </strong>{' '}
                  주식수가 바뀌거나 시작일·마지막 날의 종목 데이터가 누락돼도 합계가 달라질 수
                  있습니다. 현재 추적 종목의 두 시점 합계를 비교하는 값이므로, 구성·데이터
                  가용성의 차이를 순수한 주가 수익률로 해석하지 마세요.
                </li>
                <li>
                  <strong className="text-foreground">추적 종목만 집계합니다.</strong> 해당
                  섹터의 모든 상장 기업이 아니라 섹터킹이 선정한 종목의 합계입니다. 선정 기준은{' '}
                  <Link href="/methodology" className="text-info hover:underline">
                    방법론
                  </Link>
                  에 있습니다.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: 'mfi',
          heading: '섹터킹의 MFI도 실제 순매수인가요?',
          body: (
            <>
              <p>
                자금 흐름 화면에는 MFI(Money Flow Index)라는 0~100 값도 함께 나옵니다. 이건
                실제 순매수가 아닙니다. 섹터킹은 종목의 대표가격·거래량과 당일 가격 범위 내
                종가 위치를 이용한 별도 계산값을 표시합니다. 다른 서비스의 MFI와 이름만 보고
                같은 계산이라고 가정하지 마세요.
              </p>
              <p>섹터킹의 계산에 쓰는 값은 다음과 같습니다.</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>대표가격 = (고가 + 저가 + 종가) ÷ 3</li>
                <li>거래대금 추정값 = 대표가격 × 거래량 (실제 체결대금 합계와 다를 수 있음)</li>
              </ul>
              <p>집계 방식은 다음과 같습니다.</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">방향 판정 기준.</strong> 섹터킹은{' '}
                  <em>그날의 고가–저가 범위 안에서 종가가 어디에 있는지</em>로 판정합니다(중간보다
                  위면 positive, 중간 이하면 negative). 고가와 저가가 같거나 필요한 값이 없으면
                  해당 종목은 이 계산에서 제외되며, 전일 대비 방향이나 투자자별 매매는 반영하지 않습니다.
                </li>
                <li>
                  <strong className="text-foreground">집계 단위.</strong> 하루치를 섹터 안의 여러
                  종목에 걸쳐 USD로 환산해 합산하고, positive와 negative의 비율로 값을 만듭니다.
                </li>
                <li>
                  <strong className="text-foreground">기간 값.</strong> 선택한 기간의 MFI는 일별 값의
                  단순 평균입니다. 누적 계산이 아닙니다.
                </li>
              </ul>
              <p>
                또한 어떤 날 negative 거래대금이 0이면 비율을 100으로 제한하므로 MFI가 99 부근에서
                멈춥니다. 높은 값은 이 계산에서 positive로 분류된 거래대금 추정값의 비중이
                크다는 뜻입니다. 실제 매수자 수·순매수 금액이나 향후 상승 확률을 뜻하지 않습니다.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
