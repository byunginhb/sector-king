/**
 * Supabase row ↔ API DTO 변환 헬퍼.
 */
import type {
  NewsReportDTO,
  NewsReportListItem,
  ExpertView,
  NoviceView,
  ReportStatus,
} from '@/drizzle/supabase-schema'

interface RawNewsReportRow {
  id: string
  title: string
  status: string
  published_at: string | null
  report_date: string
  one_line_conclusion: string | null
  cover_keywords: string[] | null
  expert_view: ExpertView | null
  novice_view: NoviceView | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const EMPTY_EXPERT: ExpertView = {
  thirtySecBrief: '',
  headlines: [],
  themeFlows: [],
  actions: [],
  scenarios: {
    bear: { kind: 'bear', body: '', trigger: '' },
    base: { kind: 'base', body: '', trigger: '' },
    bull: { kind: 'bull', body: '', trigger: '' },
  },
  oneLiner: '',
  fundFlow: { outflows: [], inflows: [], driver: '' },
  koreanStocks: [],
}

const EMPTY_NOVICE: NoviceView = {
  oneLineSummary: '',
  events: [],
  stockTables: [],
  koreanStocks: [],
  closing: '',
}

function toStatus(s: string): ReportStatus {
  return s === 'published' || s === 'archived' ? s : 'draft'
}

export function rowToDto(row: RawNewsReportRow): NewsReportDTO {
  return {
    id: row.id,
    title: row.title,
    status: toStatus(row.status),
    publishedAt: row.published_at,
    reportDate: row.report_date,
    oneLineConclusion: row.one_line_conclusion,
    coverKeywords: row.cover_keywords ?? [],
    expertView: row.expert_view ?? EMPTY_EXPERT,
    noviceView: row.novice_view ?? EMPTY_NOVICE,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToListItem(row: RawNewsReportRow): NewsReportListItem {
  return {
    id: row.id,
    title: row.title,
    status: toStatus(row.status),
    publishedAt: row.published_at,
    reportDate: row.report_date,
    oneLineConclusion: row.one_line_conclusion,
    coverKeywords: row.cover_keywords ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const NEWS_LIST_COLUMNS =
  'id, title, status, published_at, report_date, one_line_conclusion, cover_keywords, created_at, updated_at'

export const NEWS_FULL_COLUMNS =
  'id, title, status, published_at, report_date, one_line_conclusion, cover_keywords, expert_view, novice_view, created_by, created_at, updated_at'
