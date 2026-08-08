import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle } from '@/components/guide/guide-article'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const SLUG = 'market-cap-change-vs-net-buying'
/** 본문 개정일. 내용을 고치면 이 값도 올린다(JSON-LD dateModified 와 공유). */
const UPDATED_AT = '2026-08-08'

const TITLE = '시가총액 변화와 순매수는 무엇이 다른가'
const LEAD =
  '섹터킹의 "자금 흐름"은 선택한 기간 동안 섹터 시가총액 합계가 얼마나 늘거나 줄었는지를 나타내는 값이며, 외국인·기관 순매수처럼 실제로 오간 매매 대금이 아닙니다. 둘은 방향이 같을 때가 많지만 크기의 의미가 전혀 다릅니다. 이 문서는 두 지표가 어떻게 다르고 각각을 언제 봐야 하는지 설명합니다.'

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
          heading: '두 지표의 정의',
          body: (
            <>
              <p>
                <strong className="text-foreground">시가총액</strong>은 주가 × 상장주식수입니다.
                시가총액 변화는 기간 마지막 날의 시가총액에서 첫날의 시가총액을 뺀 값이며,
                섹터 단위에서는 그 섹터에 속한 종목들의 시가총액 합계로 계산합니다.
              </p>
              <p>
                <strong className="text-foreground">순매수</strong>는 특정 투자자 유형(외국인,
                기관, 개인 등)이 실제로 체결한 매수 금액에서 매도 금액을 뺀 값입니다. 시장에
                실제로 들어오고 나간 돈이며, 거래가 일어나야만 발생합니다.
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
                시가총액은 마지막 체결가에 전체 주식수를 곱한 값입니다. 그래서{' '}
                <strong className="text-foreground">
                  소량만 거래돼도 전체 평가액이 통째로 움직입니다.
                </strong>
              </p>
              <p>
                예를 들어 시가총액 100조원인 종목이 하루에 3% 오르면 시가총액은 3조원 늘어납니다.
                그런데 그날 실제 거래대금이 5,000억원이었다면, 시장에서 오간 돈은 5,000억원이고
                그중 순매수는 더 작습니다. 시가총액이 3조원 늘었다고 3조원이 유입된 것이 아닙니다.
              </p>
              <p>
                극단적으로는 한 주도 거래되지 않아도 호가가 바뀌면 시가총액은 변합니다. 반대로
                거래가 아주 많아도 주가가 제자리면 시가총액 변화는 0입니다.
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
                섹터킹은 한국과 미국 상장 종목을 같은 화면에서 비교합니다. 한국은 거래소가
                투자자 유형별 순매수를 공개하지만, 미국은 같은 형태의 일별 투자자 유형별
                순매수 데이터를 공개하지 않습니다. 두 시장을 하나의 잣대로 나란히 놓으려면{' '}
                <strong className="text-foreground">양쪽에서 똑같이 계산할 수 있는 값</strong>이
                필요했고, 그게 시가총액 변화입니다.
              </p>
              <p>
                섹터 단위 집계에도 시가총액이 자연스럽습니다. 섹터는 종목의 묶음이고, 묶음의
                크기는 구성 종목 평가액의 합으로 정의되기 때문입니다.
              </p>
              <p>
                다만 이름이 &quot;자금 흐름&quot;이라 실제 유입 자금으로 오해되기 쉽습니다.
                그래서 자금 흐름이 나오는 모든 화면에 이 한계를 함께 적어두고 있습니다.
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
                여러 섹터가 같은 방향으로 크게 움직였다면 개별 종목 이슈보다 시장 전반의
                재평가일 가능성이 큽니다. 한 섹터만 튀었다면 그 섹터의 시가총액 상위 종목을
                먼저 확인하세요 — 대개 한두 종목이 그 움직임을 만듭니다.
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
                  유상증자로 주식수가 늘거나, 종목이 섹터에 새로 편입되거나 빠져도 합계가
                  변합니다. 섹터킹은 기간 변화율을 계산할 때 시작일과 마지막 날 양쪽에 모두
                  존재하는 종목만 분모에 넣어 이 왜곡을 일부 줄이지만, 완전히 제거하지는
                  못합니다.
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
          heading: 'MFI는 또 다른 지표입니다 (표준과 다른 점)',
          body: (
            <>
              <p>
                자금 흐름 화면에는 MFI(Money Flow Index)라는 0~100 값도 함께 나옵니다. 이건
                시가총액 변화와 별개로 <strong className="text-foreground">거래대금</strong>을
                기반으로 계산합니다. 다만{' '}
                <strong className="text-foreground">
                  일반적으로 알려진 Wilder의 MFI와 계산 방식이 다릅니다.
                </strong>{' '}
                같은 이름이라 그대로 비교하면 오해가 생기므로 차이를 밝힙니다.
              </p>
              <p>공통점은 대표가격과 거래대금의 정의입니다.</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>대표가격 = (고가 + 저가 + 종가) ÷ 3</li>
                <li>거래대금 = 대표가격 × 거래량</li>
              </ul>
              <p>다른 점은 세 가지입니다.</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">방향 판정 기준.</strong> 표준 MFI는 대표가격을{' '}
                  <em>전일과 비교</em>해 오르면 positive, 내리면 negative로 분류합니다. 섹터킹은{' '}
                  <em>그날의 고가–저가 범위 안에서 종가가 어디에 있는지</em>로 판정합니다(중간보다
                  위면 positive). 하루 안의 매수 우위를 보려는 의도지만, 전일 대비 흐름은 반영되지
                  않습니다.
                </li>
                <li>
                  <strong className="text-foreground">집계 단위.</strong> 표준 MFI는 한 종목의 14기간
                  누적으로 계산합니다. 섹터킹은 하루치를 섹터 안의 여러 종목에 걸쳐 합산합니다.
                </li>
                <li>
                  <strong className="text-foreground">기간 값.</strong> 선택한 기간의 MFI는 일별 값의
                  단순 평균입니다. 누적 계산이 아닙니다.
                </li>
              </ul>
              <p>
                또한 어떤 날 negative 거래대금이 0이면 비율을 100으로 제한하므로 MFI가 99 부근에서
                멈춥니다. 극단값은 &quot;압도적 매수 우위&quot; 정도로만 읽고 수치 자체를 다른
                서비스의 MFI와 직접 비교하지 마세요.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
