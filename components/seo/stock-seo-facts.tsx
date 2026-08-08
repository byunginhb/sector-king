import Link from 'next/link'
import { formatMarketCap, formatPrice, formatPriceChange } from '@/lib/format'
import { DATA_SOURCE, UPDATE_CADENCE } from '@/lib/site-facts'
import type { StockServerFacts } from '@/lib/stock-server'

/**
 * 종목 상세의 초기 HTML 본문 (Server Component).
 *
 * `StockDetailPage` 의 로딩 슬롯으로 넘겨 서버에서 렌더링한다. 데이터가 도착하면
 * 인사이트 섹션이 이 자리를 대체하므로 사용자에게 중복 노출되지 않지만,
 * JS 를 실행하지 않는 크롤러·답변 엔진에게는 이것이 종목 페이지의 본문이 된다.
 *
 * 표시 통화는 USD 고정 — 사용자 통화 토글은 클라이언트 상태라 서버가 알 수 없다.
 * 그래서 값에 통화 기호를 명시한다(하이드레이션 후에는 사용자 설정 통화로 표시된다).
 */
export function StockSeoFacts({ facts }: { facts: StockServerFacts }) {
  const displayName = facts.nameKo || facts.name
  const sectorText =
    facts.sectorNames.length > 0 ? facts.sectorNames.join(', ') : '분류된 섹터 없음'

  return (
    <section className="space-y-6">
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {displayName}({facts.ticker})은(는) 섹터킹에서 {sectorText} 섹터로 분류된 종목입니다.
        {facts.marketCapUsd
          ? ` ${facts.date ?? '최신 거래일'} 기준 시가총액은 ${formatMarketCap(facts.marketCapUsd)} 입니다.`
          : ''}{' '}
        아래는 최신 스냅샷의 핵심 수치이며, 패권 점수·재무 지표·주가 차트는 페이지가 완전히
        로드되면 함께 표시됩니다.
      </p>

      <div className="sk-card overflow-x-auto p-5">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="mb-3 text-left text-xs text-muted-foreground">
            {displayName}({facts.ticker}) 핵심 수치 — {facts.date ?? '기준일 미상'} 기준 · 갱신{' '}
            {UPDATE_CADENCE} · 출처 {DATA_SOURCE}
          </caption>
          <tbody>
            <Row label="시가총액" value={formatMarketCap(facts.marketCapUsd)} />
            <Row label="현재가" value={formatPrice(facts.priceUsd)} />
            <Row label="전일 대비" value={formatPriceChange(facts.priceChangePct)} />
            <Row label="52주 최고" value={formatPrice(facts.week52HighUsd)} />
            <Row label="52주 최저" value={formatPrice(facts.week52LowUsd)} />
            <Row label="섹터 분류" value={sectorText} />
          </tbody>
        </table>
      </div>

      <nav aria-label="관련 페이지">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {facts.industries.map((industry) => (
            <li key={industry.id}>
              <Link href={`/${industry.id}`} className="text-info hover:underline">
                {industry.name} 산업 지도
              </Link>
            </li>
          ))}
          <li>
            <Link href="/rankings" className="text-info hover:underline">
              전 종목 점수 랭킹
            </Link>
          </li>
          <li>
            <Link href="/methodology" className="text-info hover:underline">
              점수 산출 방법론
            </Link>
          </li>
          <li>
            <Link href="/guide" className="text-info hover:underline">
              지표 정의
            </Link>
          </li>
        </ul>
      </nav>

      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        여기 수치는 투자 권유가 아닙니다. 가격·시가총액은 통화가 다른 종목까지 비교할 수 있도록
        USD 로 환산한 값이며, 실시간 시세가 아니라 {UPDATE_CADENCE} 수집된 스냅샷입니다.
      </p>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border-subtle last:border-0">
      <th scope="row" className="py-2 pr-4 text-left font-medium text-muted-foreground">
        {label}
      </th>
      <td className="py-2 text-foreground">{value}</td>
    </tr>
  )
}
