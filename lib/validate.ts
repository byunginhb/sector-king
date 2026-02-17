const INDUSTRY_ID_PATTERN = /^[a-z0-9_-]+$/

export function validateIndustryId(industryId: string): boolean {
  return industryId.length <= 50 && INDUSTRY_ID_PATTERN.test(industryId)
}
