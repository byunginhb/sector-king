/**
 * 집계 facts → 결정론 NewsReportInput(템플릿 산문).
 *
 * LLM 없이도 항상 유효한 리포트를 만든다(스키마 통과 보장). LLM 산문은 이 위에
 * override 로 얹는다(lib/reports/prose.ts + merge). 숫자는 전부 facts 에서 오며
 * 여기서 창작하지 않는다(거시/지정학 서술 금지, 데이터 접지).
 */
import type { NewsReportInput } from '../news/schema'
import type { KrOpinion, Mover, MonthlyFacts, SectorFlow } from './aggregate'

const SOURCE = 'Sector King 데이터 집계'

function monthLabel(reportDate: string): string {
  return `${Number(reportDate.slice(5, 7))}월`
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

/** USD 절댓값을 $Xtn/$Xbn/$Xm 로. 부호 포함. */
function fmtUsd(v: number): string {
  const sign = v < 0 ? '-' : '+'
  const a = Math.abs(v)
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}tn`
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(1)}bn`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(0)}m`
  return `${sign}$${a.toFixed(0)}`
}

const OPINION_TO_ACTION: Record<KrOpinion, '사' | '조심하면서 사' | '지켜봐' | '안 사'> = {
  buy: '사',
  buy_selective: '조심하면서 사',
  neutral: '지켜봐',
  reduce: '안 사',
}

const OPINION_KO: Record<KrOpinion, string> = {
  buy: '매수',
  buy_selective: '선별 매수',
  neutral: '중립',
  reduce: '비중 축소',
}

export interface ReportMeta {
  title: string
  reportDate: string
  status: 'draft' | 'published'
  coverKeywords: string[]
  oneLineConclusion: string
}

export function buildMeta(facts: MonthlyFacts, reportDate: string): ReportMeta {
  const m = monthLabel(reportDate)
  const inTop = facts.inflows[0]?.name ?? '일부 섹터'
  const outTop = facts.outflows[0]?.name ?? '일부 섹터'
  const breadth = facts.breadthUp >= facts.breadthDown ? '상승 우위' : '하락 우위'
  return {
    title: `${m} 마켓 리포트 — 돈이 몰린 곳과 빠진 곳`,
    reportDate,
    status: 'draft',
    coverKeywords: ['월간', reportDate.slice(0, 7), inTop, outTop, '섹터로테이션'],
    oneLineConclusion: `${m}엔 ${inTop}로 자금이 몰리고 ${outTop}에서 빠지며, ${breadth}의 한 달이었다.`,
  }
}

function flowNote(f: SectorFlow, month: string): string {
  return `${month} 시총 ${fmtUsd(f.flowUsd)} (${fmtPct(f.pct)}) · 구성 ${f.members}종목`
}

function moverCore(mv: Mover, month: string): string {
  return `${month} 등락 ${fmtPct(mv.pct)} (종가 시총 $${(mv.mcapLastUsd / 1e9).toFixed(1)}bn, 점수변화 ${mv.scoreDelta >= 0 ? '+' : ''}${mv.scoreDelta.toFixed(1)}).`
}

/** 월간 애널리스트 전용 차트·전망 데이터(결정론). outlook 은 LLM 이 override. */
function buildMonthly(
  facts: MonthlyFacts,
  month: string
): NonNullable<NewsReportInput['expertView']['monthly']> {
  const sectorFlows = [...facts.inflows, ...facts.outflows]
    .map((f) => ({ name: f.name, flowUsd: f.flowUsd, pct: Number(f.pct.toFixed(2)) }))
    .sort((a, b) => Math.abs(b.flowUsd) - Math.abs(a.flowUsd))

  const inTop = facts.inflows[0]
  const outTop = facts.outflows[0]
  const breadth = facts.breadthUp >= facts.breadthDown ? '상승 우위' : '하락 우위'

  return {
    charts: {
      periodStart: facts.periodStart,
      periodEnd: facts.periodEnd,
      tradingDays: facts.tradingDays,
      marketFirstUsd: facts.marketFirstUsd,
      marketLastUsd: facts.marketLastUsd,
      marketPct: Number(facts.marketPct.toFixed(2)),
      breadthUp: facts.breadthUp,
      breadthDown: facts.breadthDown,
      sectorFlows,
      topGainers: facts.gainers
        .slice(0, 8)
        .map((m) => ({ code: m.code, name: m.name, pct: Number(m.pct.toFixed(1)) })),
      topLosers: facts.losers
        .slice(0, 8)
        .map((m) => ({ code: m.code, name: m.name, pct: Number(m.pct.toFixed(1)) })),
      scoreThemesUp: facts.themeUp.map((t) => ({
        name: t.name,
        delta: Number(t.scoreDelta.toFixed(1)),
      })),
      scoreThemesDown: facts.themeDown.map((t) => ({
        name: t.name,
        delta: Number(t.scoreDelta.toFixed(1)),
      })),
    },
    outlook: {
      horizon: '향후 1~3개월',
      summary: inTop
        ? `${month} 데이터는 ${inTop.name}로의 자금 유입과 ${outTop ? `${outTop.name} 이탈` : '일부 섹터 약세'}이라는 로테이션을 보여준다. 지수는 ${fmtPct(facts.marketPct)}의 보합권으로, 방향성보다 섹터 선택이 중요한 국면이 이어질 것으로 본다.`
        : `${month} 흐름 기준 전망.`,
      base: {
        body: inTop
          ? `${inTop.name} 유입과 ${outTop ? `${outTop.name} 이탈` : '일부 약세'} 로테이션이 관성으로 이어진다면, 지수는 ${fmtPct(facts.marketPct)} 부근 보합 속 섹터 차별화가 지속될 전망.`
          : `${month} 흐름 지속 시 보합 전망.`,
        trigger: '월간 섹터 시총 변화 부호 유지 + 상승/하락 종목 비율 안정.',
      },
      bull: {
        body: outTop
          ? `이탈 섹터(${outTop.name})가 반등하며 상승 종목 비율이 개선되면, ${breadth} 구도가 풀리고 지수 상방이 열릴 수 있다.`
          : `상승 종목 비율 개선 시 상방 전망.`,
        trigger: '하락 종목 비율 축소 + 이탈 섹터 시총 반등 전환.',
      },
      bear: {
        body: inTop
          ? `주도 섹터(${inTop.name})마저 차익실현으로 되돌림되면, 지지 요인이 사라지며 하방 압력이 확산될 수 있다.`
          : `주도 섹터 부재 시 하방 전망.`,
        trigger: '유입 섹터 월간 변화율 음전환 + 상승 종목 비율 급감.',
      },
      watchItems: [
        inTop ? `${inTop.name} 섹터 자금 유입 지속 여부` : '주도 섹터 형성 여부',
        outTop ? `${outTop.name} 섹터 이탈 진정 신호` : '이탈 섹터 반등 신호',
        `상승/하락 종목 비율(현재 ${facts.breadthUp}:${facts.breadthDown}) 개선 여부`,
        facts.gainers[0] ? `${facts.gainers[0].name} 등 급등주 과열·되돌림` : '급등주 과열',
      ],
      bottomLine: inTop
        ? `${month}은 ${inTop.name} 유입·${outTop ? `${outTop.name} 이탈` : '일부 약세'}의 로테이션 장세였다. 다음 국면은 이 흐름의 지속 vs 반전 여부가 관건이며, 지수 방향보다 섹터·종목 선택이 수익을 가른다.`
        : `${month} 흐름의 지속 여부가 관건이다.`,
      playbook: [
        {
          signal: inTop
            ? `${inTop.name} 섹터 시총 유입이 다음 달에도 (+)를 유지`
            : '주도 섹터 형성',
          action: '유입 지속 시 주도 테마 비중 유지, 신규 진입은 과열도 점검 후 분할',
        },
        {
          signal: outTop
            ? `${outTop.name} 등 이탈 섹터의 월간 변화율이 (−)→(+)로 전환`
            : '이탈 섹터 반등',
          action: '반전 초기 신호이므로 소액 관찰 진입, 추세 확인 후 확대',
        },
        {
          signal: `상승/하락 종목 비율(현재 ${facts.breadthUp}:${facts.breadthDown})이 상승 우위로 개선`,
          action: '시장 폭 개선은 위험선호 신호 — 지수·경기민감주 비중 확대 검토',
        },
        {
          signal: facts.gainers[0]
            ? `${facts.gainers[0].name} 등 급등주 점수(모멘텀)가 하락 전환`
            : '급등주 모멘텀 둔화',
          action: '가격만 오른 종목은 차익실현 우선순위 — 점수 동반 상승 종목으로 교체',
        },
      ],
    },
  }
}

export function buildBaseline(
  facts: MonthlyFacts,
  meta: ReportMeta
): NewsReportInput {
  const month = monthLabel(meta.reportDate)
  const src = [{ name: `${SOURCE} (${month} ${facts.tradingDays}거래일)` }]

  const inTop = facts.inflows[0]
  const outTop = facts.outflows[0]

  // ── expertView ────────────────────────────────────────────────
  const thirtySecBrief =
    `${meta.reportDate.slice(0, 4)}년 ${month}, 추적 종목 전체 시총은 ${fmtPct(facts.marketPct)} 변동했다. ` +
    (inTop ? `자금은 ${inTop.name}(${fmtPct(inTop.pct)})로 가장 크게 유입되고 ` : '') +
    (outTop ? `${outTop.name}(${fmtPct(outTop.pct)})에서 이탈했다. ` : '') +
    `상승 ${facts.breadthUp}종목 / 하락 ${facts.breadthDown}종목. ` +
    `[수집방법: ${month} ${facts.tradingDays}거래일 종가 시총·점수 집계, 가격성 필드 USD 환산 후 합산]`

  const headlines = [
    ...facts.gainers.slice(0, 4).map((mv, i) => ({
      index: i + 1,
      category: `${month} 급등`,
      title: `${mv.name}, ${month} ${fmtPct(mv.pct)}`,
      tickers: [{ symbol: mv.ticker, name: mv.name }],
      core: moverCore(mv, month),
      point:
        mv.scoreDelta >= 0
          ? '가격과 점수가 동반 상승 — 모멘텀 지속 구간.'
          : '가격은 올랐으나 점수는 하락 — 되돌림 여지 관찰.',
      keywords: [mv.sectorName ?? '', '상승'].filter(Boolean),
      sources: src,
    })),
    ...facts.losers.slice(0, 4).map((mv, i) => ({
      index: i + 5,
      category: `${month} 급락`,
      title: `${mv.name}, ${month} ${fmtPct(mv.pct)}`,
      tickers: [{ symbol: mv.ticker, name: mv.name }],
      core: moverCore(mv, month),
      point:
        mv.scoreDelta <= 0
          ? '가격과 점수가 동반 하락 — 약세 지속 관찰.'
          : '가격은 내렸으나 점수는 견조 — 낙폭 과대 여부 점검.',
      keywords: [mv.sectorName ?? '', '하락'].filter(Boolean),
      sources: src,
    })),
  ]

  const themeFlows = [
    facts.themeUp.length > 0 && {
      index: 1,
      title: `점수 개선 리더: ${facts.themeUp.slice(0, 3).map((t) => t.name).join('·')}`,
      evidence: facts.themeUp
        .slice(0, 3)
        .map((t) => `${t.name} 평균 점수 +${t.scoreDelta.toFixed(1)}(${t.members}종목)`)
        .join(', '),
      interpretation: '펀더멘털 점수가 개선된 섹터 — 가격 반영 지연 여부를 자금흐름과 교차 확인.',
      nextCheckpoint: '다음 기간 해당 섹터 시총 변화가 점수 개선을 따라가는지 확인.',
    },
    facts.themeDown.length > 0 && {
      index: 2,
      title: `점수 하락 래거드: ${facts.themeDown.slice(0, 3).map((t) => t.name).join('·')}`,
      evidence: facts.themeDown
        .slice(0, 3)
        .map((t) => `${t.name} 평균 점수 ${t.scoreDelta.toFixed(1)}(${t.members}종목)`)
        .join(', '),
      interpretation: '펀더멘털 점수가 약화된 섹터 — 가격 약세와 동조하는지 관찰.',
      nextCheckpoint: '다음 기간 점수 추세 반전 여부 확인.',
    },
    inTop &&
      outTop && {
        index: 3,
        title: `자금 로테이션: ${inTop.name} 유입 ↔ ${outTop.name} 이탈`,
        evidence: `${inTop.name} ${fmtUsd(inTop.flowUsd)}(${fmtPct(inTop.pct)}) 유입, ${outTop.name} ${fmtUsd(outTop.flowUsd)}(${fmtPct(outTop.pct)}) 이탈`,
        interpretation: `${month} 자금은 ${inTop.name} 쪽으로 이동했다. 지수 전체는 ${fmtPct(facts.marketPct)}로 내부 로테이션이 본질.`,
        nextCheckpoint: `${inTop.name} 유입 지속 및 ${outTop.name} 이탈 진정 여부.`,
      },
  ].filter(Boolean) as NewsReportInput['expertView']['themeFlows']

  const toSectorFlow = (f: SectorFlow) => ({
    name: f.name,
    ytdPct: Number(f.pct.toFixed(2)), // 스키마 필드명은 ytdPct이나 값은 당월 변화율
    note: flowNote(f, month),
  })

  const driver = inTop
    ? `${month} 자금 흐름의 최대 동인은 ${inTop.name} 섹터 시총 ${fmtUsd(inTop.flowUsd)} 증가다.` +
      (outTop ? ` 반대편에서는 ${outTop.name}가 ${fmtUsd(outTop.flowUsd)} 이탈했다.` : '') +
      ` 시장 전체는 ${fmtPct(facts.marketPct)}로 지수 횡보 속 내부 로테이션이 특징.`
    : `${month}은 뚜렷한 자금 유입 섹터가 없었다.`

  const koreanStocks = facts.krStocks.map((k, i) => ({
    index: i + 1,
    name: k.name,
    code: k.code,
    opinion: k.opinion,
    rationale:
      `${month} ${fmtPct(k.pct)}, 종가 시총 $${(k.mcapLastUsd / 1e9).toFixed(0)}bn` +
      (k.recommendationKey ? `, 컨센서스 ${k.recommendationKey}` : '') +
      (k.upsidePct != null ? `, 목표가 대비 ${fmtPct(k.upsidePct)}` : '') +
      '.',
    risk:
      k.upsidePct != null && k.upsidePct < 0
        ? '현재가가 목표가를 상회 — 밸류에이션 부담.'
        : '섹터 변동성 및 컨센서스 하향 가능성 점검.',
    comment: `${OPINION_KO[k.opinion]} 관점(룰 기반).`,
  }))

  // 데이터 접지형 시나리오(조건부). 외생 사건 창작 금지.
  const scenarios = {
    base: {
      kind: 'base' as const,
      body: inTop
        ? `${month} 로테이션(${inTop.name} 유입${outTop ? `·${outTop.name} 이탈` : ''})이 유지되는 경우, 지수는 ${fmtPct(facts.marketPct)} 부근의 횡보 속 섹터 차별화가 이어진다.`
        : `${month} 흐름이 유지되는 기본 시나리오.`,
      trigger: '월간 섹터 시총 변화 부호 유지 + 상승/하락 종목 비율 안정.',
    },
    bull: {
      kind: 'bull' as const,
      body: outTop
        ? `이탈 섹터(${outTop.name})가 반등하고 상승 종목 비율이 개선되면 전면 회복 국면.`
        : '상승 종목 비율이 개선되면 회복 국면.',
      trigger: '하락 종목 비율 축소 + 이탈 섹터 시총 반등 전환.',
    },
    bear: {
      kind: 'bear' as const,
      body: inTop
        ? `유입 섹터(${inTop.name})마저 차익실현으로 되돌림되면 하방 확산.`
        : '주도 섹터 부재 속 하방 확산 시나리오.',
      trigger: '유입 섹터 월간 변화율 음전환 + 상승 종목 비율 급감.',
    },
  }

  const oneLiner = meta.oneLineConclusion

  // ── noviceView ────────────────────────────────────────────────
  const oneLineSummary = inTop
    ? `지난 ${month}엔 ${inTop.name} 쪽으로 돈이 몰렸고${outTop ? `, ${outTop.name}에서 돈이 빠졌어` : ''}.`
    : `지난 ${month} 시장 요약.`

  const events = [
    ...facts.gainers.slice(0, 3).map((mv, i) => ({
      index: i + 1,
      title: `${mv.name} ${month}에 ${fmtPct(mv.pct)}`,
      body: `${mv.name}이(가) ${month} 한 달 ${fmtPct(mv.pct)} 움직였어. ${mv.sectorName ?? ''} 흐름과 관련 있어.`.trim(),
    })),
    ...facts.losers.slice(0, 2).map((mv, i) => ({
      index: i + 4,
      title: `${mv.name} ${month}에 ${fmtPct(mv.pct)}`,
      body: `${mv.name}은(는) ${month}에 ${fmtPct(mv.pct)} 내렸어.`,
    })),
  ]

  const willRise = facts.gainers
    .filter((mv) => mv.scoreDelta >= 0)
    .slice(0, 5)
    .map((mv) => ({
      ticker: { symbol: mv.ticker, name: mv.name },
      reason: `${month} ${fmtPct(mv.pct)} 강세, 점수도 개선(${month} 흐름 기준).`,
    }))
  const willFall = facts.losers
    .filter((mv) => mv.scoreDelta <= 0)
    .slice(0, 5)
    .map((mv) => ({
      ticker: { symbol: mv.ticker, name: mv.name },
      reason: `${month} ${fmtPct(mv.pct)} 약세, 점수도 하락(${month} 흐름 기준).`,
    }))
  const buyOnDip = facts.krStocks
    .filter((k) => k.pct <= -15 && k.upsidePct != null && k.upsidePct >= 25)
    .slice(0, 5)
    .map((k) => ({
      ticker: { symbol: k.code, name: k.name },
      reason: `${month} ${fmtPct(k.pct)} 하락했지만 목표가 대비 ${fmtPct(k.upsidePct ?? 0)} 여유(${month} 기준).`,
    }))
  const stockTables = [
    willRise.length > 0 && { bucket: 'will_rise' as const, rows: willRise },
    willFall.length > 0 && { bucket: 'will_fall' as const, rows: willFall },
    buyOnDip.length > 0 && { bucket: 'buy_on_dip' as const, rows: buyOnDip },
  ].filter(Boolean) as NewsReportInput['noviceView']['stockTables']

  const noviceKorean = facts.krStocks.slice(0, 5).map((k, i) => ({
    index: i + 1,
    name: k.name,
    code: k.code,
    action: OPINION_TO_ACTION[k.opinion],
    body: `${month}에 ${fmtPct(k.pct)} 움직였어. ${OPINION_KO[k.opinion]} 관점이야.`,
  }))

  const closing = `${month} 요점: 돈은 ${inTop?.name ?? '일부 섹터'}로${outTop ? `, ${outTop.name}에선 빠짐` : ''}. 지수는 ${fmtPct(facts.marketPct)}.`

  return {
    title: meta.title,
    status: meta.status,
    reportDate: meta.reportDate,
    oneLineConclusion: meta.oneLineConclusion,
    coverKeywords: meta.coverKeywords,
    expertView: {
      thirtySecBrief,
      headlines,
      themeFlows,
      actions: [
        inTop && {
          label: 'sector' as const,
          body: `${month} 최대 유입 섹터 ${inTop.name}(${fmtPct(inTop.pct)}) 관찰 — 유입 지속 여부 점검.`,
        },
        facts.gainers[0] && {
          label: 'watchlist' as const,
          body: `${month} 급등 상위 ${facts.gainers[0].name}(${fmtPct(facts.gainers[0].pct)}) — 과열/되돌림 관찰.`,
        },
        outTop && {
          label: 'risk' as const,
          body: `${month} 최대 이탈 섹터 ${outTop.name}(${fmtPct(outTop.pct)}) — 추가 약세 리스크 점검.`,
        },
      ].filter(Boolean) as NewsReportInput['expertView']['actions'],
      scenarios,
      oneLiner,
      fundFlow: {
        inflows: facts.inflows.map(toSectorFlow),
        outflows: facts.outflows.map(toSectorFlow),
        driver,
      },
      koreanStocks,
      monthly: buildMonthly(facts, month),
    },
    noviceView: {
      oneLineSummary,
      events,
      stockTables,
      koreanStocks: noviceKorean,
      closing,
    },
  }
}
