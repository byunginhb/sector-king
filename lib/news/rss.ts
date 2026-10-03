/**
 * 마켓 리포트 RSS 2.0 피드 조립 — 순수 함수만 둔다(조회는 `lib/news/public.ts`).
 *
 * 의존성 없이 문자열로 조립한다. 피드에 들어가는 값은 전부 관리자가 입력한 자유 텍스트라
 * (`AT&T`, `<b>`, 따옴표) 이스케이프를 빠뜨리면 XML 이 깨져 리더가 피드를 통째로 버린다.
 */

export const RSS_CONTENT_TYPE = 'application/rss+xml; charset=utf-8'

/** 피드에 싣는 최신 리포트 수. */
export const RSS_ITEM_LIMIT = 50

export interface RssReport {
  id: string
  title: string
  /** ISO 타임스탬프. 없으면 reportDate 로 대체한다. */
  publishedAt: string | null
  /** "YYYY-MM-DD" (KST 일자) */
  reportDate: string | null
  summary: string | null
  keywords?: string[] | null
}

export interface RssChannel {
  baseUrl: string
  title: string
  description: string
  /** 피드 자신의 경로 (예: "/news/rss.xml") */
  feedPath: string
}

// XML 1.0 이 허용하지 않는 제어 문자. 이스케이프로도 표현할 수 없어 제거해야 한다.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

/** XML 텍스트·속성 값으로 안전하게 넣을 수 있도록 이스케이프한다. */
export function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, '')
    .replace(/[&<>"']/g, (char) => XML_ENTITIES[char] ?? char)
}

/** RSS 가 요구하는 RFC 822 날짜. 해석할 수 없는 값이면 null. */
export function toRssDate(value: string | null | undefined): string | null {
  if (!value) return null
  // "YYYY-MM-DD" 는 KST 일자다 — 그대로 파싱하면 UTC 자정이 되어 하루 전날 15시(KST)로 읽힌다.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date.toUTCString()
}

function reportPubDate(report: RssReport): string | null {
  return toRssDate(report.publishedAt) ?? toRssDate(report.reportDate)
}

function buildItem(report: RssReport, baseUrl: string): string {
  const link = `${baseUrl}/news/${encodeURIComponent(report.id)}`
  const pubDate = reportPubDate(report)
  const summary =
    report.summary?.trim() ||
    `${report.title} — Sector King 마켓 리포트${report.reportDate ? ` (${report.reportDate})` : ''}`

  const lines = [
    `<title>${escapeXml(report.title)}</title>`,
    `<link>${escapeXml(link)}</link>`,
    `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
    ...(pubDate ? [`<pubDate>${pubDate}</pubDate>`] : []),
    `<description>${escapeXml(summary)}</description>`,
    ...(report.keywords ?? [])
      .filter((keyword) => keyword.trim().length > 0)
      .map((keyword) => `<category>${escapeXml(keyword)}</category>`),
  ]

  return `    <item>\n${lines.map((line) => `      ${line}`).join('\n')}\n    </item>`
}

/** RSS 2.0 문서 전체. `reports` 가 비어도 유효한 빈 피드를 돌려준다. */
export function buildRssFeed(channel: RssChannel, reports: readonly RssReport[]): string {
  const { baseUrl } = channel
  const feedUrl = `${baseUrl}${channel.feedPath}`
  // 입력이 최신순이라는 가정에 기대지 않고 가장 늦은 발행 시각을 직접 고른다.
  const latest = reports
    .map((report) => Date.parse(reportPubDate(report) ?? ''))
    .filter((time) => !Number.isNaN(time))
    .reduce<number | null>((max, time) => (max === null || time > max ? time : max), null)

  const head = [
    `<title>${escapeXml(channel.title)}</title>`,
    `<link>${escapeXml(`${baseUrl}/news`)}</link>`,
    `<description>${escapeXml(channel.description)}</description>`,
    '<language>ko</language>',
    ...(latest !== null
      ? [`<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>`]
      : []),
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
  ]

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    ...head.map((line) => `    ${line}`),
    ...reports.map((report) => buildItem(report, baseUrl)),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
