import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle } from '@/components/guide/guide-article'
import { getSiteFacts, UPDATE_CADENCE } from '@/lib/site-facts'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/** 본문 개정일. 방침이 바뀌면 이 값도 올린다(JSON-LD dateModified 와 공유). */
const UPDATED_AT = '2026-08-08'

const TITLE = '편집 방침'
const LEAD =
  '섹터킹의 내용이 어떻게 만들어지고 누가 책임지는지 밝힙니다. 화면의 숫자는 사람이 손대지 않는 자동 계산 결과이고, 월간 리포트는 AI가 초안을 쓴 뒤 사람이 검토해 발행하며, 일별 리포트와 섹터 분류는 사람이 직접 합니다. 현재 광고·제휴·유료 상품은 없습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description:
    '섹터킹의 콘텐츠 제작 방식(자동 계산·AI 초안·사람 검수 구분), 이해상충 여부, 투자 권유가 아니라는 고지, 오류 정정 방침을 공개합니다.',
  alternates: { canonical: `${BASE_URL}/editorial-policy` },
  openGraph: {
    title: `${TITLE} | Sector King`,
    description: LEAD,
    url: `${BASE_URL}/editorial-policy`,
    type: 'article',
  },
}

function Row({
  what,
  who,
  detail,
}: {
  what: string
  who: string
  detail: React.ReactNode
}) {
  return (
    <tr className="border-b border-border-subtle last:border-0">
      <td className="py-2 pr-4 align-top font-medium text-foreground">{what}</td>
      <td className="py-2 pr-4 align-top text-foreground whitespace-nowrap">{who}</td>
      <td className="py-2 align-top text-muted-foreground">{detail}</td>
    </tr>
  )
}

export default async function EditorialPolicyPage() {
  const facts = await getSiteFacts()

  return (
    <GuideArticle
      href="/editorial-policy"
      parent={{ href: '/about', label: '소개' }}
      title={TITLE}
      h1={TITLE}
      lead={LEAD}
      updatedAt={UPDATED_AT}
      related={[
        { href: '/about', label: '섹터킹 소개' },
        { href: '/data-sources', label: '데이터 출처와 수집 방식' },
        { href: '/contact', label: '문의 / 제보' },
      ]}
      sections={[
        {
          id: 'who-makes-what',
          heading: '누가 무엇을 만드는가',
          body: (
            <>
              <p>
                섹터킹의 콘텐츠는 만들어지는 방식이 종류마다 다릅니다. 어디까지가 자동이고
                어디부터 사람인지 구분해 밝힙니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th scope="col" className="py-2 pr-4 font-medium">종류</th>
                      <th scope="col" className="py-2 pr-4 font-medium">제작</th>
                      <th scope="col" className="py-2 font-medium">설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row
                      what="주가 · 시가총액 · 재무 지표"
                      who="자동"
                      detail={
                        <>
                          외부 출처에서 {UPDATE_CADENCE} 수집해 그대로 저장합니다. 사람이 개별
                          숫자를 고치지 않습니다.
                        </>
                      }
                    />
                    <Row
                      what="패권 점수 · 단기/장기 점수 · DCF"
                      who="자동"
                      detail={
                        <>
                          공개된 산식으로 계산합니다. 사람이 특정 종목의 점수를 조정하지
                          않습니다. 산식은{' '}
                          <Link href="/methodology" className="text-info hover:underline">
                            방법론
                          </Link>
                          에 있습니다.
                        </>
                      }
                    />
                    <Row
                      what="월간 마켓 리포트"
                      who="AI 초안 + 사람 검토"
                      detail={
                        <>
                          데이터 집계는 결정론적으로 계산하고, 그 결과를 설명하는 산문을 대규모
                          언어모델(LLM)이 작성합니다. 생성된 글은 초안(draft) 상태로 저장되며,
                          사람이 읽고 확인한 뒤에만 발행됩니다. 모델 호출이 실패하면 템플릿
                          기반 문장으로 대체됩니다.
                        </>
                      }
                    />
                    <Row
                      what="일별 마켓 리포트"
                      who="사람"
                      detail="운영팀이 직접 작성하고 발행합니다."
                    />
                    <Row
                      what={`섹터 분류 (${facts.sectorCount.toLocaleString('ko-KR')}개)`}
                      who="사람"
                      detail="어떤 종목을 어느 섹터에 넣을지는 사람이 GICS를 기준으로 판단합니다. 자동 분류가 아닙니다."
                    />
                    <Row
                      what="이용 안내 · 방법론 등 설명 문서"
                      who="사람"
                      detail="운영팀이 작성합니다."
                    />
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
        {
          id: 'review',
          heading: '무엇을 검수하고 무엇을 검수하지 않는가',
          body: (
            <>
              <p>
                <strong className="text-foreground">검수합니다.</strong> 발행되는 모든 글은
                사람이 읽고 내보냅니다. AI가 쓴 초안도 예외가 아닙니다. 섹터 분류를 바꿀 때도
                사람이 판단합니다.
              </p>
              <p>
                <strong className="text-foreground">검수하지 않습니다.</strong> 매일 수집되는
                개별 수치를 사람이 하나씩 확인하지는 않습니다. 자동 방어가 몇 가지 있지만
                범위가 제한적이라 그대로 밝힙니다.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>주말·휴장일에는 새 데이터를 저장하지 않습니다.</li>
                <li>
                  거래량이 0이나 빈 값으로 응답하면(장 시간 밖에 조회한 한국 종목에서 흔합니다)
                  기존에 저장된 값을 덮어쓰지 않습니다.
                </li>
                <li>
                  과거 이력을 소급 보완할 때는 액면분할·분사처럼 기업행위로 생기는 가짜
                  급등락을 경계 변동 폭 기준으로 걸러냅니다.
                </li>
              </ul>
              <p>
                반대로{' '}
                <strong className="text-foreground">
                  정기 수집에서 원본 값 자체가 틀린 경우를 자동으로 잡아내지는 못합니다.
                </strong>{' '}
                외부 출처가 틀리면 섹터킹도 틀립니다.
              </p>
              <p>
                즉 <strong className="text-foreground">숫자의 정확성은 외부 출처에 의존</strong>
                하고, 그 숫자를 어떻게 묶고 설명하는지가 섹터킹의 책임입니다.
              </p>
            </>
          ),
        },
        {
          id: 'conflicts',
          heading: '이해상충',
          body: (
            <>
              <p>
                <strong className="text-foreground">
                  현재 섹터킹에는 광고, 제휴 링크, 유료 상품, 후원이 없습니다.
                </strong>{' '}
                증권사·자산운용사를 비롯한 어떤 금융회사로부터도 대가를 받지 않으며, 특정 종목이나
                상품을 노출해 주는 조건의 계약도 없습니다.
              </p>
              <p>
                종목이 화면에 나오는 기준은 시가총액과 섹터 대표성뿐입니다. 돈을 낸다고 목록에
                들어가거나 점수가 오르는 경로는 존재하지 않습니다.
              </p>
              <p>
                이 상황이 바뀌면 — 광고를 붙이거나 유료 기능을 만들거나 제휴를 맺으면 — 이
                문서를 먼저 고치고 해당 화면에도 표시하겠습니다.
              </p>
            </>
          ),
        },
        {
          id: 'not-advice',
          heading: '투자 권유가 아닙니다',
          body: (
            <>
              <p>
                섹터킹은 공개된 데이터를 같은 기준으로 정리해 비교할 수 있게 만드는 도구입니다.
                특정 종목의 매수·매도를 권유하지 않으며, 투자자문업이나 유사투자자문업으로
                등록된 서비스가 아닙니다.
              </p>
              <p>
                점수가 높다고 매수 신호가 아닙니다. 점수는 규모·성장성·수익성·시장심리를 0~100
                으로 환산해 합산한 값이며 미래 수익률을 예측하지 않습니다. 목표주가와 투자의견은
                섹터킹의 판단이 아니라 증권사 애널리스트가 낸 값을 그대로 옮긴 것입니다.
              </p>
              <p>투자 판단과 그 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
            </>
          ),
        },
        {
          id: 'corrections',
          heading: '오류 정정',
          body: (
            <>
              <p>
                숫자가 이상하거나 분류가 틀렸다고 생각되면{' '}
                <Link href="/contact" className="text-info hover:underline">
                  문의/제보
                </Link>
                로 알려주세요. 어느 화면의 어떤 값인지와 그렇게 판단한 근거를 함께 보내주시면
                확인이 빠릅니다.
              </p>
              <p>확인된 오류는 이렇게 처리합니다.</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">표시 오류</strong>(문구·라벨·계산 표시)는
                  확인 즉시 수정합니다.
                </li>
                <li>
                  <strong className="text-foreground">수집·계산 로직의 버그</strong>는 원인을
                  고친 뒤 영향을 받은 과거 데이터까지 다시 계산합니다. 한 종목만 고치고 넘어가지
                  않습니다.
                </li>
                <li>
                  <strong className="text-foreground">외부 출처의 오류</strong>는 우리가 고칠 수
                  없습니다. 다만 명백한 이상치는 걸러내고, 값을 신뢰할 수 없는 항목은 숫자를
                  지어내지 않고 &quot;-&quot;로 비워 둡니다.
                </li>
                <li>
                  설명 문서의 내용이 사실과 달랐던 경우, 고치면서 해당 문서의{' '}
                  <strong className="text-foreground">최종 수정일</strong>을 갱신합니다.
                </li>
              </ul>
              <p>
                데이터의 구조적 한계 — 무엇을 추적하고 무엇을 추적하지 않는지 — 는{' '}
                <Link href="/data-sources" className="text-info hover:underline">
                  데이터 출처와 수집 방식
                </Link>
                에 정리해 두었습니다.
              </p>
            </>
          ),
        },
        {
          id: 'responsibility',
          heading: '책임 주체',
          body: (
            <p>
              이 사이트의 콘텐츠에 대한 책임은 <strong className="text-foreground">Sector
              King 운영팀</strong>에 있습니다. 만드는 사람들은{' '}
              <Link href="/about" className="text-info hover:underline">
                소개
              </Link>
              에서 볼 수 있고, 문의는{' '}
              <Link href="/contact" className="text-info hover:underline">
                문의/제보
              </Link>
              로 받습니다.
            </p>
          ),
        },
      ]}
    />
  )
}
