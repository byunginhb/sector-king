/**
 * LLM 산문 레이어 — 결정론 baseline 위에 서술 필드만 override.
 *
 * 원칙: LLM은 "숫자"가 아니라 "문장"만 만든다. 집계된 facts(숫자)를 입력으로 받아
 * 서술 필드(브리핑·해석·시나리오·driver 등)를 다듬는다. 숫자·티커·부호는 baseline
 * (결정론)이 소유하며 LLM은 건드리지 못한다(환각 차단).
 *
 * 제공자: OpenRouter (OpenAI 호환 /chat/completions). 모델은 OPENROUTER_MODEL 로 지정.
 * 폴백: OPENROUTER_API_KEY 없음 / 호출·파싱 실패 시 null 반환 → 호출부는 baseline
 * 을 그대로 발행한다(CI에서 키 없어도 파이프라인 성공).
 */
import { z } from 'zod'
import type { NewsReportInput } from '../news/schema'
import type { MonthlyFacts } from './aggregate'

const scenarioProse = z.object({
  body: z.string(),
  trigger: z.string(),
})

const themeProse = z.object({
  index: z.number().int(),
  interpretation: z.string(),
  nextCheckpoint: z.string(),
})

const playbookProse = z.object({
  signal: z.string(),
  action: z.string(),
})

const outlookProse = z.object({
  horizon: z.string(),
  summary: z.string(),
  base: scenarioProse,
  bull: scenarioProse,
  bear: scenarioProse,
  watchItems: z.array(z.string()),
  bottomLine: z.string(),
  playbook: z.array(playbookProse),
})

const reportProseSchema = z.object({
  thirtySecBrief: z.string(),
  driver: z.string(),
  oneLiner: z.string(),
  oneLineConclusion: z.string(),
  themeInterpretations: z.array(themeProse),
  scenarios: z.object({
    bear: scenarioProse,
    base: scenarioProse,
    bull: scenarioProse,
  }),
  outlook: outlookProse,
  noviceOneLineSummary: z.string(),
  noviceClosing: z.string(),
})

export type ReportProse = z.infer<typeof reportProseSchema>

const OPENROUTER_BASE =
  process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'anthropic/claude-sonnet-5'

const SYSTEM = `너는 데이터 기반 마켓 리포트의 한국어 카피라이터다. 아래 규칙을 반드시 지켜라.
- 입력으로 주어진 "집계 숫자(facts)"만 근거로 문장을 쓴다. 새 숫자·종목·비율을 지어내지 마라.
- 지정학·거시경제·뉴스 사건을 창작하지 마라(금리·전쟁·유가 등 외생 사건 언급 금지). 이 리포트는 순수 데이터 집계다.
- 시나리오는 "만약 이 흐름이 이어지면/반전되면" 같이 facts의 변수(섹터 부호, 상승/하락 종목 비율, 시총 변화)에 조건을 건 서술만 한다.
- **쉬운 말로 쓴다(가장 중요).** 독자는 투자 지식이 많지 않은 일반인도 포함된다. 전문용어와 어려운 한자어·영어 약어를 최대한 피하고 쉬운 우리말로 풀어 쓴다.
  - 이런 용어는 쓰지 말거나 쉬운 표현으로 바꿔라: 로테이션→"돈이 옮겨감", 모멘텀→"상승 힘/흐름", 밸류에이션→"주가가 비싼지 싼지", 컨센서스→"증권가 평균 의견", 브레드스/시장 폭→"오른 종목이 많은지", 디커플링→"따로 노는 현상", 되돌림→"다시 내려옴", 차익실현→"이익 보고 팔기".
  - 꼭 필요한 용어는 처음 한 번만 괄호로 짧게 풀이한다. 예: "증권가 목표주가(전문가들이 본 적정 주가)".
  - 한 문장은 짧고 명확하게. 리포트의 전문적인 형식(섹션 구성)은 유지하되, 설명은 친절하고 쉽게 한다.
- themeInterpretations는 입력 themeFlows의 각 index에 1:1로 대응해 작성한다.
- 개별 종목 매수를 단정하지 말고 관찰/점검 프레이밍을 쓴다.
- outlook(전망)은 실제 애널리스트 리포트처럼 향후 1~3개월을 내다보는 forward-looking 서술이며, 리포트에서 가장 공들여야 할 부분이다. 예측의 근거는 오직 이번 달 데이터(섹터 로테이션·점수 모멘텀·상승하락 비율·자금 유출입)의 지속/반전 가능성에 둔다. 금리·전쟁·유가 등 외생 거시 사건은 창작하지 마라.
  - summary: 다음 국면 종합 판단. 3~5문장으로 충분히 서술하되, 이번 달 로테이션이 왜 나타났고 어디서 지속/반전 신호를 찾아야 하는지 구체적으로 짚어라.
  - base/bull/bear: "이 흐름이 이어지면 ~ / 반전되면 ~" 조건부 시나리오. 각 body에 근거 데이터를 녹여라.
  - watchItems: 다음 달 지켜볼 구체적 데이터 포인트(5개 내외).
  - bottomLine: 투자자가 기억해야 할 핵심 한 문장(총정리). 지수 방향보다 무엇이 수익을 가르는지.
  - playbook: "관찰 신호 → 대응 액션" 4개 내외. signal은 데이터로 확인 가능한 구체 신호(예: 특정 섹터 유입 지속, breadth 개선, 급등주 점수 하락 전환), action은 그때 어떻게 대응할지(비중·진입·차익실현 등 관찰/점검 프레이밍). 개별 종목 매수 단정 금지.
- 반드시 지정된 JSON 스키마에 맞는 JSON 객체 하나만 출력한다(설명·코드펜스 금지).`

function buildUserPrompt(facts: MonthlyFacts, baseline: NewsReportInput): string {
  const themeSeeds = (baseline.expertView.themeFlows ?? []).map((t) => ({
    index: t.index,
    title: t.title,
    evidence: t.evidence,
  }))
  return [
    '아래는 이번 리포트의 집계 숫자(facts)와 서술이 필요한 슬롯이다.',
    '',
    'FACTS:',
    JSON.stringify(
      {
        period: `${facts.periodStart}~${facts.periodEnd} (${facts.tradingDays}거래일)`,
        marketPct: Number(facts.marketPct.toFixed(2)),
        breadth: { up: facts.breadthUp, down: facts.breadthDown },
        inflows: facts.inflows.map((f) => ({ name: f.name, pct: Number(f.pct.toFixed(1)) })),
        outflows: facts.outflows.map((f) => ({ name: f.name, pct: Number(f.pct.toFixed(1)) })),
        topGainers: facts.gainers.slice(0, 5).map((m) => ({ name: m.name, pct: Number(m.pct.toFixed(1)) })),
        topLosers: facts.losers.slice(0, 5).map((m) => ({ name: m.name, pct: Number(m.pct.toFixed(1)) })),
        themeUp: facts.themeUp.map((t) => ({ name: t.name, scoreDelta: Number(t.scoreDelta.toFixed(1)) })),
        themeDown: facts.themeDown.map((t) => ({ name: t.name, scoreDelta: Number(t.scoreDelta.toFixed(1)) })),
      },
      null,
      2
    ),
    '',
    'themeFlows 슬롯(각 index에 interpretation·nextCheckpoint 작성):',
    JSON.stringify(themeSeeds, null, 2),
    '',
    '위 facts만 근거로 reportProse 스키마의 모든 필드를 한국어로 작성하라.',
  ].join('\n')
}

// Anthropic 구조화 출력이 거부하는 JSON Schema 제약(숫자·문자열 범위 등)을 재귀 제거.
// z.number().int() 는 minimum/maximum(safe-int 범위)을 emit → 400. 이를 털어낸다.
const UNSUPPORTED_KEYS = [
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
]
function stripUnsupportedConstraints(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupportedConstraints)
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node)) {
      if (UNSUPPORTED_KEYS.includes(k)) continue
      out[k] = stripUnsupportedConstraints(v)
    }
    return out
  }
  return node
}

/** ```json 코드펜스나 앞뒤 잡텍스트가 섞여도 JSON 본문만 뽑아 파싱. */
function parseJsonLoose(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : content
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('JSON 객체를 찾을 수 없음')
  return JSON.parse(body.slice(start, end + 1))
}

/**
 * facts + baseline 으로 산문을 생성한다(OpenRouter). 키 없음/실패 시 null.
 * @param model OpenRouter 모델 슬러그. 기본 OPENROUTER_MODEL env → DEFAULT_MODEL.
 */
export async function generateProse(
  facts: MonthlyFacts,
  baseline: NewsReportInput,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL
): Promise<ReportProse | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn('[prose] OPENROUTER_API_KEY 없음 — 템플릿 산문(baseline)으로 폴백')
    return null
  }
  try {
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'X-Title': 'Sector King Monthly Report',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildUserPrompt(facts, baseline) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'report_prose',
            strict: false,
            schema: stripUnsupportedConstraints(z.toJSONSchema(reportProseSchema)),
          },
        },
      }),
    })
    if (!res.ok) {
      console.warn(
        `[prose] OpenRouter ${res.status} — baseline 폴백:`,
        (await res.text()).slice(0, 300)
      )
      return null
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = json.choices?.[0]?.message?.content
    if (!content) {
      console.warn('[prose] 빈 응답 — baseline 폴백')
      return null
    }
    const parsed = reportProseSchema.safeParse(parseJsonLoose(content))
    if (!parsed.success) {
      console.warn('[prose] 스키마 불일치 — baseline 폴백:', parsed.error.issues[0]?.message)
      return null
    }
    return parsed.data
  } catch (err) {
    console.error('[prose] 생성 실패 — baseline 폴백:', err)
    return null
  }
}

/** LLM 산문을 baseline 위에 override(불변 병합). 숫자·티커·factual 필드는 불변. */
export function applyProse(
  baseline: NewsReportInput,
  prose: ReportProse | null
): NewsReportInput {
  if (!prose) return baseline
  const themeById = new Map(prose.themeInterpretations.map((t) => [t.index, t]))
  return {
    ...baseline,
    oneLineConclusion: prose.oneLineConclusion || baseline.oneLineConclusion,
    expertView: {
      ...baseline.expertView,
      thirtySecBrief: prose.thirtySecBrief || baseline.expertView.thirtySecBrief,
      oneLiner: prose.oneLiner || baseline.expertView.oneLiner,
      themeFlows: (baseline.expertView.themeFlows ?? []).map((t) => {
        const p = themeById.get(t.index)
        return p
          ? { ...t, interpretation: p.interpretation, nextCheckpoint: p.nextCheckpoint }
          : t
      }),
      scenarios: {
        bear: { ...baseline.expertView.scenarios.bear, ...prose.scenarios.bear },
        base: { ...baseline.expertView.scenarios.base, ...prose.scenarios.base },
        bull: { ...baseline.expertView.scenarios.bull, ...prose.scenarios.bull },
      },
      fundFlow: {
        ...baseline.expertView.fundFlow,
        driver: prose.driver || baseline.expertView.fundFlow.driver,
      },
      // charts(숫자)는 불변, outlook(전망 산문)만 override
      monthly: baseline.expertView.monthly
        ? {
            charts: baseline.expertView.monthly.charts,
            outlook: {
              horizon: prose.outlook.horizon || baseline.expertView.monthly.outlook.horizon,
              summary: prose.outlook.summary || baseline.expertView.monthly.outlook.summary,
              base: { ...baseline.expertView.monthly.outlook.base, ...prose.outlook.base },
              bull: { ...baseline.expertView.monthly.outlook.bull, ...prose.outlook.bull },
              bear: { ...baseline.expertView.monthly.outlook.bear, ...prose.outlook.bear },
              watchItems:
                prose.outlook.watchItems.length > 0
                  ? prose.outlook.watchItems
                  : baseline.expertView.monthly.outlook.watchItems,
              bottomLine:
                prose.outlook.bottomLine || baseline.expertView.monthly.outlook.bottomLine,
              playbook:
                prose.outlook.playbook.length > 0
                  ? prose.outlook.playbook
                  : baseline.expertView.monthly.outlook.playbook,
            },
          }
        : baseline.expertView.monthly,
    },
    noviceView: {
      ...baseline.noviceView,
      oneLineSummary:
        prose.noviceOneLineSummary || baseline.noviceView.oneLineSummary,
      closing: prose.noviceClosing || baseline.noviceView.closing,
    },
  }
}
