/**
 * 마켓 리포트 zod 스키마.
 *
 * - 관리자 입력 검증 (POST/PATCH /api/admin/news/*)
 * - 시드 스크립트 검증
 * - 타입은 `drizzle/supabase-schema.ts` 와 1:1 일치 (양방향 추론)
 */
import { z } from 'zod'

// ----------------------------------------------------------------------------
// 공용
// ----------------------------------------------------------------------------
export const tickerRefSchema = z
  .object({
    symbol: z.string().min(1).max(20),
    exchange: z.string().max(20).optional(),
    name: z.string().max(120).optional(),
    industryId: z.string().max(40).optional(),
  })
  .strict()

// ----------------------------------------------------------------------------
// 전문가용
// ----------------------------------------------------------------------------
export const headlineItemSchema = z
  .object({
    index: z.number().int().min(1),
    category: z.string().min(1).max(60),
    title: z.string().min(1).max(300),
    tickers: z.array(tickerRefSchema).default([]),
    core: z.string().min(1).max(800),
    point: z.string().min(1).max(800),
    keywords: z.array(z.string().max(40)).default([]),
  })
  .strict()

export const themeFlowItemSchema = z
  .object({
    index: z.number().int().min(1),
    title: z.string().min(1).max(200),
    evidence: z.string().min(1).max(800),
    interpretation: z.string().min(1).max(1200),
    nextCheckpoint: z.string().min(1).max(800),
  })
  .strict()

export const actionIdeaItemSchema = z
  .object({
    label: z.enum(['watchlist', 'report', 'risk', 'sector', 'dividend']),
    body: z.string().min(1).max(1500),
    tickers: z.array(tickerRefSchema).optional(),
  })
  .strict()

export const scenarioKindSchema = z.enum(['bear', 'base', 'bull'])

export const scenarioItemSchema = z
  .object({
    kind: scenarioKindSchema,
    body: z.string().min(1).max(1500),
    trigger: z.string().min(1).max(800),
  })
  .strict()

export const sectorFlowSchema = z
  .object({
    name: z.string().min(1).max(80),
    ytdPct: z.number().optional(),
    note: z.string().max(800).default(''),
  })
  .strict()

export const fundFlowMapSchema = z
  .object({
    outflows: z.array(sectorFlowSchema).default([]),
    inflows: z.array(sectorFlowSchema).default([]),
    driver: z.string().max(2000).default(''),
  })
  .strict()

export const koreanStockOpinionSchema = z.enum([
  'buy',
  'buy_selective',
  'neutral',
  'reduce',
])

export const koreanStockItemSchema = z
  .object({
    index: z.number().int().min(1),
    name: z.string().min(1).max(60),
    code: z.string().min(1).max(20),
    opinion: koreanStockOpinionSchema,
    rationale: z.string().min(1).max(1500),
    risk: z.string().max(1500).default(''),
    comment: z.string().max(1500).default(''),
  })
  .strict()

export const expertViewSchema = z
  .object({
    thirtySecBrief: z.string().min(1).max(3000),
    headlines: z.array(headlineItemSchema).default([]),
    themeFlows: z.array(themeFlowItemSchema).default([]),
    actions: z.array(actionIdeaItemSchema).default([]),
    scenarios: z
      .object({
        bear: scenarioItemSchema,
        base: scenarioItemSchema,
        bull: scenarioItemSchema,
      })
      .strict(),
    oneLiner: z.string().min(1).max(500),
    fundFlow: fundFlowMapSchema,
    koreanStocks: z.array(koreanStockItemSchema).default([]),
  })
  .strict()

// ----------------------------------------------------------------------------
// 초보자용
// ----------------------------------------------------------------------------
export const noviceEventItemSchema = z
  .object({
    index: z.number().int().min(1),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000),
  })
  .strict()

export const noviceStockBucketSchema = z.enum([
  'will_rise',
  'will_fall',
  'buy_on_dip',
])

export const noviceStockRowSchema = z
  .object({
    ticker: tickerRefSchema,
    reason: z.string().min(1).max(500),
  })
  .strict()

export const noviceStockTableSchema = z
  .object({
    bucket: noviceStockBucketSchema,
    rows: z.array(noviceStockRowSchema).default([]),
  })
  .strict()

export const noviceStockActionSchema = z.enum([
  '사',
  '조심하면서 사',
  '지켜봐',
  '안 사',
])

export const noviceKoreanStockItemSchema = z
  .object({
    index: z.number().int().min(1),
    name: z.string().min(1).max(60),
    code: z.string().min(1).max(20),
    action: noviceStockActionSchema,
    body: z.string().min(1).max(2000),
  })
  .strict()

export const noviceViewSchema = z
  .object({
    oneLineSummary: z.string().min(1).max(800),
    events: z.array(noviceEventItemSchema).default([]),
    stockTables: z.array(noviceStockTableSchema).default([]),
    koreanStocks: z.array(noviceKoreanStockItemSchema).default([]),
    closing: z.string().min(1).max(800),
  })
  .strict()

// ----------------------------------------------------------------------------
// 리포트 본문
// ----------------------------------------------------------------------------
export const reportStatusSchema = z.enum(['draft', 'published', 'archived'])

/** YYYY-MM-DD 검증 */
export const reportDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')

export const newsReportInputSchema = z
  .object({
    title: z.string().min(1).max(200),
    status: reportStatusSchema.default('draft'),
    reportDate: reportDateSchema,
    oneLineConclusion: z.string().max(500).nullable().optional(),
    coverKeywords: z.array(z.string().max(40)).default([]),
    expertView: expertViewSchema,
    noviceView: noviceViewSchema,
  })
  .strict()

export type NewsReportInput = z.infer<typeof newsReportInputSchema>

export const newsReportPatchSchema = newsReportInputSchema.partial()

export type NewsReportPatch = z.infer<typeof newsReportPatchSchema>
