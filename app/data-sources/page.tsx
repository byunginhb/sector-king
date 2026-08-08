import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle } from '@/components/guide/guide-article'
import { getSiteFacts, UPDATE_CADENCE } from '@/lib/site-facts'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/** 본문 개정일. 출처·주기가 바뀌면 이 값도 올린다(JSON-LD dateModified 와 공유). */
const UPDATED_AT = '2026-08-08'

const TITLE = '데이터 출처와 수집 방식'
const LEAD =
  '섹터킹 화면의 숫자가 어디서 오고 언제 갱신되는지, 무엇이 원본 데이터이고 무엇이 섹터킹이 직접 계산한 값인지 밝힙니다. 주가·재무는 Yahoo Finance, 애널리스트 리포트는 한경 컨센서스, 미국 경제지표 일정은 FRED에서 가져오며, 섹터 분류와 각종 점수는 섹터킹이 자체 산출합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description:
    '섹터킹이 사용하는 데이터 출처(Yahoo Finance, 한경 컨센서스, FRED)와 각각의 수집 주기, 자체 산출 지표의 범위, 그리고 데이터의 한계를 공개합니다.',
  alternates: { canonical: `${BASE_URL}/data-sources` },
  openGraph: {
    title: `${TITLE} | Sector King`,
    description: LEAD,
    url: `${BASE_URL}/data-sources`,
    type: 'article',
  },
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="py-2 pr-4 align-top text-foreground">{children}</td>
}

export default async function DataSourcesPage() {
  const facts = await getSiteFacts()

  return (
    <GuideArticle
      href="/data-sources"
      parent={{ href: '/about', label: '소개' }}
      title={TITLE}
      h1={TITLE}
      lead={LEAD}
      updatedAt={UPDATED_AT}
      related={[
        { href: '/editorial-policy', label: '편집 방침' },
        { href: '/about', label: '섹터킹 소개' },
        { href: '/guide', label: '이용 안내' },
        {
          href: '/guide/market-cap-change-vs-net-buying',
          label: '시가총액 변화 vs 순매수',
        },
      ]}
      sections={[
        {
          id: 'sources',
          heading: '외부 데이터 출처',
          body: (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">출처</th>
                    <th scope="col" className="py-2 pr-4 font-medium">가져오는 데이터</th>
                    <th scope="col" className="py-2 pr-4 font-medium">수집 주기</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-subtle">
                    <Cell>
                      <a
                        href="https://finance.yahoo.com/"
                        rel="nofollow noopener"
                        target="_blank"
                        className="text-info hover:underline"
                      >
                        Yahoo Finance
                      </a>
                    </Cell>
                    <Cell>
                      주가·시가총액·거래량·52주 고저, 재무 지표(PER·PBR·ROE 등), 애널리스트
                      투자의견과 목표주가, 의견 분포 추이, 실적 발표 일정, 세계 주요 지수
                    </Cell>
                    <Cell>{UPDATE_CADENCE}</Cell>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <Cell>
                      <a
                        href="https://markets.hankyung.com/consensus"
                        rel="nofollow noopener"
                        target="_blank"
                        className="text-info hover:underline"
                      >
                        한경 컨센서스
                      </a>
                    </Cell>
                    <Cell>
                      국내 증권사 애널리스트 리포트의 종목·작성자·기관·목표주가.{' '}
                      <Link href="/analysts" className="text-info hover:underline">
                        애널리스트 성적표
                      </Link>
                      의 원본입니다
                    </Cell>
                    <Cell>평일 1일 1회 (KST 19:00)</Cell>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <Cell>
                      <a
                        href="https://fred.stlouisfed.org/"
                        rel="nofollow noopener"
                        target="_blank"
                        className="text-info hover:underline"
                      >
                        FRED (세인트루이스 연은)
                      </a>
                    </Cell>
                    <Cell>미국 경제지표 발표 일정(고용보고서, CPI 등)</Cell>
                    <Cell>평일 1일 1회 (KST 06:00)</Cell>
                  </tr>
                  <tr className="last:border-0">
                    <Cell>섹터킹 직접 입력</Cell>
                    <Cell>
                      FRED가 다루지 않는 일정(FOMC 등)과 한국 경제지표 일정. 관리자가 공식
                      발표를 확인해 등록합니다
                    </Cell>
                    <Cell>수시</Cell>
                  </tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: 'own-work',
          heading: '섹터킹이 직접 만드는 것',
          body: (
            <>
              <p>
                다음은 외부에서 받아온 값이 아니라 섹터킹이 계산하거나 판단한 결과입니다. 산식은{' '}
                <Link href="/methodology" className="text-info hover:underline">
                  방법론
                </Link>
                에 전부 공개되어 있습니다.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">섹터 분류.</strong> 한국·미국 상장 종목
                  {' '}{facts.companyCount.toLocaleString('ko-KR')}곳을{' '}
                  {facts.industryCount}개 산업 · {facts.sectorCount.toLocaleString('ko-KR')}개
                  섹터로 나눈 자체 분류 체계입니다. 산업 귀속은 GICS를 기준으로 삼았습니다
                </li>
                <li>
                  <strong className="text-foreground">패권 점수·단기/장기 점수.</strong> 규모,
                  성장성, 수익성, 시장심리를 0~100으로 환산해 가중 합산한 값
                </li>
                <li>
                  <strong className="text-foreground">DCF 점수와 상승예측.</strong> 공개 재무
                  데이터로 계산한 2단계 현금흐름할인 결과
                </li>
                <li>
                  <strong className="text-foreground">자금 흐름과 MFI.</strong> 섹터별 시가총액
                  변화와 거래대금 기반 지수.{' '}
                  <Link
                    href="/guide/market-cap-change-vs-net-buying"
                    className="text-info hover:underline"
                  >
                    표준 MFI와 다른 점
                  </Link>
                  을 확인하세요
                </li>
                <li>
                  <strong className="text-foreground">애널리스트 예측 적중률.</strong> 리포트의
                  목표주가 방향과 이후 실제 주가 방향을 대조해 채점한 값. 채점 규칙은 섹터킹이
                  정한 것이며 증권사나 한국경제신문의 평가가 아닙니다
                </li>
                <li>
                  <strong className="text-foreground">마켓 리포트.</strong> 사람이 작성하고
                  검수합니다
                </li>
              </ul>
            </>
          ),
        },
        {
          id: 'currency',
          heading: '통화 처리',
          body: (
            <>
              <p>
                한국 종목은 원, 미국 종목은 달러로 수집됩니다. 두 시장을 한 화면에서 더하거나
                비교하려면 기준이 하나여야 하므로,{' '}
                <strong className="text-foreground">
                  가격·시가총액은 모두 USD로 환산한 뒤 집계
                </strong>
                합니다. 화면 우측 상단의 통화 토글은 이 USD 값을 표시할 때만 원화로 되돌리는
                표시 기능이며, 계산 자체에는 영향을 주지 않습니다.
              </p>
              <p>
                환율은 고정 상수를 사용합니다. 실시간 환율이 아니므로 원화 표기 금액은 대략적인
                크기로만 보세요.
              </p>
            </>
          ),
        },
        {
          id: 'freshness',
          heading: '언제 갱신되나',
          body: (
            <>
              <p>
                주가·재무 데이터는 {UPDATE_CADENCE} 자동 수집되고, 수집이 끝나면 곧바로 사이트에
                반영됩니다. 각 화면에 표시되는{' '}
                <strong className="text-foreground">&quot;데이터 기준일&quot;</strong>이 그 화면
                숫자의 실제 기준입니다. 갱신 주기 설명보다 이 날짜를 믿으세요.
              </p>
              <p>
                <strong className="text-foreground">실시간 시세가 아닙니다.</strong> 장중 변동,
                시간외 거래, 프리마켓은 반영되지 않습니다. 매매 판단에 실시간 가격이 필요하다면
                증권사 시세를 확인하세요.
              </p>
              <p>
                주말과 공휴일에는 새 거래일 데이터가 없으므로 직전 거래일 값이 그대로 표시됩니다.
              </p>
            </>
          ),
        },
        {
          id: 'limits',
          heading: '데이터의 한계',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">전 종목이 아닙니다.</strong> 시가총액과 섹터
                대표성을 기준으로 선정한 {facts.companyCount.toLocaleString('ko-KR')}곳만
                추적합니다. 화면의 &quot;시가총액 합계&quot;는 시장 전체가 아니라 추적 종목의
                합입니다
              </li>
              <li>
                <strong className="text-foreground">원본 오류는 그대로 전달됩니다.</strong>{' '}
                Yahoo Finance의 값이 틀리면 섹터킹도 틀립니다. 명백한 이상치는 수집 단계에서
                걸러내지만(예: 분할·분사로 인한 가짜 급등락) 모든 오류를 잡지는 못합니다
              </li>
              <li>
                <strong className="text-foreground">일부 종목은 항목이 비어 있습니다.</strong>{' '}
                재무 데이터가 없으면 해당 점수는 계산되지 않고 &quot;-&quot;로 표시됩니다
              </li>
              <li>
                <strong className="text-foreground">한 종목이 여러 섹터에 속할 수 있습니다.</strong>{' '}
                그래서 섹터 시가총액의 단순 합은 중복을 포함하며, 섹터킹은 산업 간 총합을
                표시하지 않습니다
              </li>
            </ul>
          ),
        },
        {
          id: 'correction',
          heading: '오류를 발견하면',
          body: (
            <p>
              숫자가 이상하거나 분류가 틀렸다고 생각되면{' '}
              <Link href="/contact" className="text-info hover:underline">
                문의/제보
              </Link>
              로 알려주세요. 어느 화면의 어떤 값인지와 근거를 함께 보내주시면 확인이 빠릅니다.
              확인된 오류는 수정하고, 수치에 영향이 큰 수정이라면 이 문서의 최종 수정일을
              갱신합니다.
            </p>
          ),
        },
      ]}
    />
  )
}
