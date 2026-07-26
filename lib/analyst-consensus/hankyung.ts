/**
 * 한경 컨센서스(기업 리포트) 크롤 클라이언트.
 *
 * API: GET https://markets.hankyung.com/api/v2/consensus/search/report
 *   - reportType=CO (기업), Laravel 페이지네이터(total/last_page/next_page_url)
 *   - Authorization: Bearer <정적 토큰> — Nuxt 번들에 하드코딩된 공개 앱 토큰
 *     (세션/로그인 무관). 배포 시 로테이션 가능 → 401 시 번들에서 재추출.
 *
 * 이 모듈은 DB 를 모른다(순수 fetch/파싱). 티커 매칭·upsert 는 ingest.ts.
 * 서버 전용(cron 라우트 + 백필 스크립트에서만 import). 'server-only' 가드는
 * tsx 백필에서 모듈 해석이 안 돼 생략 — 클라이언트에서 import 되는 경로 없음.
 */

const API_URL = 'https://markets.hankyung.com/api/v2/consensus/search/report'
const PAGE_URL = 'https://markets.hankyung.com/consensus'
const PER_PAGE = 100

// 번들 하드코딩 정적 토큰(2026-07 확인). env override 우선, 로테이션 시 번들 재추출로 자가치유.
const FALLBACK_TOKEN =
  process.env.HANKYUNG_CONSENSUS_TOKEN ||
  '0ZdNlr7LrQoawewqweq78k6usasBsqhqSIaUarSTf8mxnHuQVh9CvKAfpUy94LhBmZMg'

const COMMON_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (compatible; sector-king/1.0)',
  Referer: PAGE_URL,
  Accept: 'application/json',
}

/** 한경 API 원본 행(사용 필드만 명시, 나머지는 raw 로 통째 보존). */
export interface HankyungRow {
  REPORT_IDX: number
  BUSINESS_CODE: string
  BUSINESS_NAME: string
  MARKET_TYPE?: string
  OFFICE_NAME: string
  PUBLISH_CODE?: string
  REPORT_WRITER?: string
  REPORT_TITLE?: string
  REPORT_DATE: string
  TARGET_STOCK_PRICES?: string | null
  OLD_TARGET_STOCK_PRICES?: string | null
  GRADE_VALUE?: string | null
  OLD_GRADE_VALUE?: string | null
  REPORT_FILEPATH?: string | null
  REPORT_FILENAME?: string | null
  THUMBNAIL?: string | null
  [k: string]: unknown
}

/** 정규화된 리포트(ingest 입력). 목표가는 KRW 네이티브 원문. */
export interface ParsedReport {
  reportIdx: number
  externalId: string
  businessCode: string
  businessName: string
  marketType: string | null
  officeName: string
  publishCode: string | null
  reportWriter: string
  writers: string[]
  reportTitle: string | null
  reportDate: string
  targetPrice: number | null
  oldTargetPrice: number | null
  gradeValue: string | null
  oldGradeValue: string | null
  pdfUrl: string | null
  pdfFilename: string | null
  thumbnailUrl: string | null
  raw: HankyungRow
}

/** '70000' → 70000, '0'/''/null/NaN → null (목표가 없음). */
function toPrice(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) && n > 0 ? n : null
}

/** '송유림,김예림' → ['송유림','김예림'] (trim·빈값·중복 제거). */
export function splitWriters(raw: string | null | undefined): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const name = part.trim()
    if (name) seen.add(name)
  }
  return [...seen]
}

export function parseReport(row: HankyungRow): ParsedReport {
  return {
    reportIdx: row.REPORT_IDX,
    externalId: `hankyung:${row.REPORT_IDX}`,
    businessCode: String(row.BUSINESS_CODE || '').trim(),
    businessName: String(row.BUSINESS_NAME || '').trim(),
    marketType: row.MARKET_TYPE ? String(row.MARKET_TYPE) : null,
    officeName: String(row.OFFICE_NAME || '').trim(),
    publishCode: row.PUBLISH_CODE ? String(row.PUBLISH_CODE) : null,
    reportWriter: String(row.REPORT_WRITER || '').trim(),
    writers: splitWriters(row.REPORT_WRITER),
    reportTitle: row.REPORT_TITLE ? String(row.REPORT_TITLE).trim() : null,
    reportDate: String(row.REPORT_DATE || '').slice(0, 10),
    targetPrice: toPrice(row.TARGET_STOCK_PRICES),
    oldTargetPrice: toPrice(row.OLD_TARGET_STOCK_PRICES),
    gradeValue: row.GRADE_VALUE ? String(row.GRADE_VALUE) : null,
    oldGradeValue: row.OLD_GRADE_VALUE ? String(row.OLD_GRADE_VALUE) : null,
    pdfUrl: row.REPORT_FILEPATH ? String(row.REPORT_FILEPATH) : null,
    pdfFilename: row.REPORT_FILENAME ? String(row.REPORT_FILENAME) : null,
    thumbnailUrl: row.THUMBNAIL ? String(row.THUMBNAIL) : null,
    raw: row,
  }
}

/** Nuxt 번들에서 현재 Bearer 토큰 재추출(로테이션 자가치유). 실패 시 null. */
async function extractTokenFromBundle(): Promise<string | null> {
  try {
    const html = await (await fetch(PAGE_URL, { headers: COMMON_HEADERS })).text()
    const scripts = [...html.matchAll(/\/_nuxt\/[A-Za-z0-9_.-]+\.js/g)].map((m) => m[0])
    for (const src of [...new Set(scripts)]) {
      const js = await (
        await fetch(`https://markets.hankyung.com${src}`, { headers: COMMON_HEADERS })
      ).text()
      // 코드 형태: .Authorization="Bearer ".concat("<token>")
      const m = js.match(/"Bearer "\.concat\("([A-Za-z0-9]{20,})"\)/)
      if (m) return m[1]
    }
  } catch {
    // 무시 — 폴백 토큰 사용
  }
  return null
}

interface Paginated {
  // page1=배열, page2+=인덱스 키 객체 (Laravel json_encode quirk)
  data: HankyungRow[] | Record<string, HankyungRow>
  total: number
  last_page: number
  current_page: number
}

function isAuthError(status: number, body: string): boolean {
  return status === 401 || status === 403 || body.includes('인가되지 않은')
}

async function fetchPage(
  page: number,
  fromDate: string,
  toDate: string,
  token: string
): Promise<{ ok: true; json: Paginated } | { ok: false; auth: boolean }> {
  const url =
    `${API_URL}?page=${page}&reportType=CO&fromDate=${fromDate}&toDate=${toDate}` +
    `&gradeCode=ALL&changePrices=ALL&searchType=ALL&reportRange=${PER_PAGE}`
  const res = await fetch(url, {
    headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
  })
  const text = await res.text()
  if (!res.ok || isAuthError(res.status, text)) {
    return { ok: false, auth: isAuthError(res.status, text) }
  }
  return { ok: true, json: JSON.parse(text) as Paginated }
}

/**
 * 지정 구간의 기업(CO) 리포트 전량 크롤. 페이지 순회 + 401 시 토큰 1회 재추출.
 * @returns 정규화된 리포트 배열 + 서버 보고 총건수
 */
export async function fetchConsensusReports(
  fromDate: string,
  toDate: string
): Promise<{ reports: ParsedReport[]; total: number }> {
  let token = FALLBACK_TOKEN
  let refreshed = false
  const rows: HankyungRow[] = []
  let total = 0
  let page = 1
  let lastPage = 1

  while (page <= lastPage) {
    let result = await fetchPage(page, fromDate, toDate, token)
    if (!result.ok && result.auth && !refreshed) {
      const fresh = await extractTokenFromBundle()
      refreshed = true
      if (fresh) {
        token = fresh
        result = await fetchPage(page, fromDate, toDate, token)
      }
    }
    if (!result.ok) {
      throw new Error(
        `한경 컨센서스 API 실패 (page ${page}, ${result.auth ? '인증 거부 — 토큰 로테이션 의심' : 'HTTP 오류'})`
      )
    }
    // Laravel 페이지네이터 quirk: page1 은 data=배열(키 0~99), page2+ 는 키가
    // 비순차(100~)라 json_encode 가 객체로 직렬화 → Object.values 로 정규화.
    const data = result.json.data
    rows.push(...(Array.isArray(data) ? data : Object.values(data ?? {})))
    total = result.json.total
    lastPage = result.json.last_page
    page += 1
    if (page <= lastPage) await new Promise((r) => setTimeout(r, 150)) // 예의상 지연
  }

  return { reports: rows.map(parseReport), total }
}
