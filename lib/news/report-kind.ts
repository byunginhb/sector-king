/**
 * 리포트 종류(일간/주간/월간) 파생 — 스키마 마이그레이션 없이 coverKeywords 컨벤션으로 판별.
 *
 * 월간/주간 리포트는 coverKeywords 에 예약어("월간"/"주간")를 넣어 발행한다
 * (scripts/generate-monthly-report.ts → buildMeta). 기존 일간 리포트는 무변경으로
 * 자동 'daily'. 피드 필터/이메일 세그먼트가 필요해지면 news_reports 에 report_kind
 * 컬럼을 추가해 승격(하위호환 백필).
 */
export type ReportKind = 'daily' | 'weekly' | 'monthly'

export const MONTHLY_KEYWORD = '월간'
export const WEEKLY_KEYWORD = '주간'

export function resolveReportKind(r: {
  coverKeywords?: string[] | null
  title?: string | null
}): ReportKind {
  const keywords = r.coverKeywords ?? []
  if (keywords.includes(MONTHLY_KEYWORD) || /월간/.test(r.title ?? '')) {
    return 'monthly'
  }
  if (keywords.includes(WEEKLY_KEYWORD) || /주간/.test(r.title ?? '')) {
    return 'weekly'
  }
  return 'daily'
}

/** 홈 카드 라벨: 월간/주간은 정기 종합, 일간은 오늘의 리포트. */
export function reportKindLabel(kind: ReportKind): string {
  switch (kind) {
    case 'monthly':
      return '이 달의 마켓 리포트'
    case 'weekly':
      return '이번 주 마켓 리포트'
    default:
      return '오늘의 마켓 리포트'
  }
}
