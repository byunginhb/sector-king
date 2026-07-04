import { describe, it, expect } from 'vitest'
import {
  classifyOpinion,
  isDataSuspect,
  type MonthlyFacts,
} from '@/lib/reports/aggregate'
import { buildBaseline, buildMeta } from '@/lib/reports/baseline'
import { applyProse, type ReportProse } from '@/lib/reports/prose'
import { newsReportInputSchema } from '@/lib/news/schema'

describe('isDataSuspect (분할/스테일 가드)', () => {
  it('KLAC 분할(raw -84.4% vs 복리 +70.7%)은 발산 155pp → 제외', () => {
    expect(isDataSuspect(-84.4, 70.7)).toBe(true)
  })
  it('삼성전자 경계(raw -4.3% vs 복리 +9.0%) 13.3pp → 통과', () => {
    expect(isDataSuspect(-4.3, 9.0)).toBe(false)
  })
  it('진성 급등(PSK raw 109.1 vs 복리 99.1) 10pp → 통과', () => {
    expect(isDataSuspect(109.1, 99.1)).toBe(false)
  })
})

describe('classifyOpinion (recommendation_key → enum)', () => {
  it('strong_buy → buy', () => {
    expect(classifyOpinion('strong_buy', 38, -4)).toBe('buy')
  })
  it('buy + 상방 15%+ → buy', () => {
    expect(classifyOpinion('buy', 18, 3)).toBe('buy')
  })
  it('buy + 상방 15% 미만 → buy_selective', () => {
    expect(classifyOpinion('buy', -2, 8)).toBe('buy_selective')
  })
  it('buy + 낙폭 20%+ & 상방 30%+ → buy_selective (낙폭+상방)', () => {
    expect(classifyOpinion('buy', 51, -34)).toBe('buy_selective')
  })
  it('hold / none → neutral', () => {
    expect(classifyOpinion('hold', 5, 1)).toBe('neutral')
    expect(classifyOpinion('none', null, 0)).toBe('neutral')
  })
  it('underperform → reduce', () => {
    expect(classifyOpinion('underperform', -10, -5)).toBe('reduce')
  })
})

function sampleFacts(): MonthlyFacts {
  return {
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    tradingDays: 22,
    marketFirstUsd: 80.22e12,
    marketLastUsd: 80.43e12,
    marketPct: 0.26,
    breadthUp: 259,
    breadthDown: 309,
    inflows: [
      { name: '우주', flowUsd: 758.3e9, pct: 16.98, members: 8 },
      { name: '장비', flowUsd: 658.5e9, pct: 37.61, members: 17 },
    ],
    outflows: [{ name: 'IaaS', flowUsd: -1433e9, pct: -12.05, members: 10 }],
    gainers: [
      {
        ticker: '319660.KQ',
        code: '319660',
        name: '피에스케이',
        region: 'KR',
        pct: 109.1,
        priceFirstUsd: 10,
        priceLastUsd: 21,
        mcapLastUsd: 5e9,
        volume: 1000,
        scoreDelta: 2,
        sectorName: '장비',
      },
    ],
    losers: [
      {
        ticker: '018260.KS',
        code: '018260',
        name: '삼성에스디에스',
        region: 'KR',
        pct: -47.3,
        priceFirstUsd: 100,
        priceLastUsd: 53,
        mcapLastUsd: 10e9,
        volume: 500,
        scoreDelta: -3,
        sectorName: 'IT서비스',
      },
    ],
    themeUp: [{ name: '데이터 센터', scoreDelta: 3.45, members: 5 }],
    themeDown: [{ name: 'IT서비스/SI', scoreDelta: -10.66, members: 4 }],
    krStocks: [
      {
        code: '005930',
        name: '삼성전자',
        pct: -4.3,
        mcapLastUsd: 1512e9,
        recommendationKey: 'strong_buy',
        analystCount: 36,
        upsidePct: 38,
        opinion: 'buy',
      },
    ],
  }
}

describe('buildBaseline → newsReportInputSchema (.strict 통과)', () => {
  it('결정론 baseline이 스키마를 통과한다', () => {
    const facts = sampleFacts()
    const meta = buildMeta(facts, '2026-06-30')
    const report = buildBaseline(facts, meta)
    const parsed = newsReportInputSchema.safeParse(report)
    expect(parsed.success).toBe(true)
  })

  it('coverKeywords에 "월간" 포함, reportDate=말일', () => {
    const facts = sampleFacts()
    const meta = buildMeta(facts, '2026-06-30')
    expect(meta.coverKeywords).toContain('월간')
    expect(meta.reportDate).toBe('2026-06-30')
  })

  it('LLM 산문 override 후에도 스키마 통과 + 숫자 필드 불변', () => {
    const facts = sampleFacts()
    const meta = buildMeta(facts, '2026-06-30')
    const baseline = buildBaseline(facts, meta)
    const prose: ReportProse = {
      thirtySecBrief: 'LLM이 다듬은 브리핑.',
      driver: 'LLM driver.',
      oneLiner: 'LLM 한 줄.',
      oneLineConclusion: 'LLM 결론.',
      themeInterpretations: [],
      scenarios: {
        bear: { body: 'b', trigger: 't' },
        base: { body: 'b', trigger: 't' },
        bull: { body: 'b', trigger: 't' },
      },
      outlook: {
        horizon: '향후 1~3개월',
        summary: 'LLM 전망 요약.',
        base: { body: 'ob', trigger: 'ot' },
        bull: { body: 'ob', trigger: 'ot' },
        bear: { body: 'ob', trigger: 'ot' },
        watchItems: ['항목1'],
      },
      noviceOneLineSummary: '쉬운 요약.',
      noviceClosing: '쉬운 정리.',
    }
    const merged = applyProse(baseline, prose)
    // 산문은 바뀌고
    expect(merged.expertView.thirtySecBrief).toBe('LLM이 다듬은 브리핑.')
    // 숫자(fundFlow inflows)는 baseline 그대로
    expect(merged.expertView.fundFlow.inflows).toEqual(
      baseline.expertView.fundFlow.inflows
    )
    // 월간 charts(숫자)는 불변, outlook(전망 산문)만 override
    expect(merged.expertView.monthly?.charts).toEqual(
      baseline.expertView.monthly?.charts
    )
    expect(merged.expertView.monthly?.outlook.summary).toBe('LLM 전망 요약.')
    expect(newsReportInputSchema.safeParse(merged).success).toBe(true)
  })

  it('prose=null이면 baseline 그대로(폴백)', () => {
    const facts = sampleFacts()
    const meta = buildMeta(facts, '2026-06-30')
    const baseline = buildBaseline(facts, meta)
    expect(applyProse(baseline, null)).toBe(baseline)
  })
})
