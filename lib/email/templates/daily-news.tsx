/**
 * 일별 마켓 리포트 이메일 템플릿 (React Email).
 *
 * 디자인 원칙:
 *   - 인라인 CSS (이메일 호환)
 *   - 라이트 베이스 — 보수적 톤 (대부분 메일 클라이언트는 다크 배경 부정확)
 *   - 초보자(noviceView)용 우선 — 한 줄 요약 → 이벤트 Top 3 → 주목 종목 → 한국 주식 → 마무리
 *   - 풋터에 전문가 뷰 링크 + 구독 해지 안내
 */
import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components'
import type {
  NewsReportDTO,
  NoviceStockTable,
  NoviceKoreanStockItem,
} from '@/drizzle/supabase-schema'

// ----------------------------------------------------------------------------
// 색상 / 토큰 — 인라인 CSS 그대로 박힘
// ----------------------------------------------------------------------------
const COLOR = {
  bg: '#f8fafc', // slate-50
  surface: '#ffffff',
  border: '#e2e8f0', // slate-200
  borderStrong: '#cbd5e1', // slate-300
  ink: '#0f172a', // slate-900
  inkSoft: '#475569', // slate-600
  muted: '#64748b', // slate-500
  accent: '#b45309', // amber-700 (가독성 우선)
  accentSoft: '#fef3c7', // amber-100
  success: '#15803d', // green-700
  danger: '#b91c1c', // red-700
} as const

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", "Noto Sans KR", sans-serif'

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------
export interface DailyNewsEmailProps {
  report: NewsReportDTO
  /** 풀 사이트 URL (e.g. https://sector-king.com) — 없으면 상대 경로 */
  siteUrl?: string
  /** 수신자 이름 (있으면 인사말) */
  recipientName?: string
  /** 구독 해지 페이지 URL (보통 ${siteUrl}/me/settings) */
  unsubscribeUrl?: string
}

// ----------------------------------------------------------------------------
// 보조 라벨
// ----------------------------------------------------------------------------
const BUCKET_LABEL: Record<NoviceStockTable['bucket'], string> = {
  will_rise: '오를 가능성이 높아요',
  will_fall: '조심해야 해요',
  buy_on_dip: '눌릴 때 노려볼 만',
}

const ACTION_COLOR: Record<NoviceKoreanStockItem['action'], string> = {
  사: COLOR.success,
  '조심하면서 사': COLOR.accent,
  지켜봐: COLOR.muted,
  '안 사': COLOR.danger,
}

// ----------------------------------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------------------------------
export function DailyNewsEmail({
  report,
  siteUrl = '',
  recipientName,
  unsubscribeUrl,
}: DailyNewsEmailProps) {
  const novice = report.noviceView
  const events = (novice.events ?? []).slice(0, 3)
  const willRise = (novice.stockTables ?? []).find(
    (t) => t.bucket === 'will_rise'
  )
  const koreanStocks = (novice.koreanStocks ?? []).slice(0, 2)
  const detailUrl = siteUrl
    ? `${siteUrl}/news/${report.id}`
    : `/news/${report.id}`
  const expertUrl = siteUrl
    ? `${siteUrl}/news/${report.id}?view=expert`
    : `/news/${report.id}?view=expert`
  const settingsUrl = siteUrl ? `${siteUrl}/me/settings` : '/me/settings'
  const unsubLinkUrl = unsubscribeUrl ?? settingsUrl

  const previewText =
    novice.oneLineSummary?.slice(0, 120) ||
    report.oneLineConclusion?.slice(0, 120) ||
    '오늘의 마켓 리포트가 도착했습니다'

  return (
    <Html lang="ko">
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: COLOR.bg,
          fontFamily: FONT_STACK,
          margin: 0,
          padding: 0,
          color: COLOR.ink,
        }}
      >
        <Container
          style={{
            maxWidth: 640,
            margin: '0 auto',
            padding: '24px 16px',
          }}
        >
          {/* 헤더 */}
          <Section
            style={{
              padding: '8px 0 16px 0',
              borderBottom: `1px solid ${COLOR.border}`,
            }}
          >
            <Row>
              <Column>
                <Text
                  style={{
                    margin: 0,
                    fontSize: 13,
                    letterSpacing: 1,
                    color: COLOR.accent,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Sector King
                </Text>
                <Text
                  style={{
                    margin: '2px 0 0 0',
                    fontSize: 12,
                    color: COLOR.muted,
                  }}
                >
                  {report.reportDate} · 일별 마켓 리포트
                </Text>
              </Column>
            </Row>
          </Section>

          {/* 인사말 + 제목 */}
          <Section style={{ padding: '20px 0 8px 0' }}>
            {recipientName && (
              <Text
                style={{
                  margin: '0 0 8px 0',
                  fontSize: 13,
                  color: COLOR.muted,
                }}
              >
                안녕하세요 {recipientName} 님,
              </Text>
            )}
            <Heading
              as="h1"
              style={{
                margin: 0,
                fontSize: 22,
                lineHeight: 1.35,
                fontWeight: 700,
                color: COLOR.ink,
                letterSpacing: '-0.01em',
              }}
            >
              {report.title}
            </Heading>
          </Section>

          {/* 한 줄 요약 */}
          {novice.oneLineSummary && (
            <Section
              style={{
                marginTop: 12,
                backgroundColor: COLOR.accentSoft,
                borderLeft: `3px solid ${COLOR.accent}`,
                padding: '12px 14px',
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: COLOR.ink,
                  fontWeight: 500,
                }}
              >
                {novice.oneLineSummary}
              </Text>
            </Section>
          )}

          {/* 오늘 무슨 일이 있었어 */}
          {events.length > 0 && (
            <Section style={{ marginTop: 28 }}>
              <Heading
                as="h2"
                style={{
                  margin: '0 0 10px 0',
                  fontSize: 15,
                  fontWeight: 700,
                  color: COLOR.ink,
                }}
              >
                오늘 무슨 일이 있었어
              </Heading>
              {events.map((ev, i) => (
                <div
                  key={ev.index ?? i}
                  style={{
                    backgroundColor: COLOR.surface,
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLOR.ink,
                      lineHeight: 1.45,
                    }}
                  >
                    {i + 1}. {ev.title}
                  </Text>
                  <Text
                    style={{
                      margin: '6px 0 0 0',
                      fontSize: 13,
                      color: COLOR.inkSoft,
                      lineHeight: 1.55,
                    }}
                  >
                    {truncate(ev.body, 220)}
                  </Text>
                </div>
              ))}
            </Section>
          )}

          {/* 주목 종목 */}
          {willRise && willRise.rows.length > 0 && (
            <Section style={{ marginTop: 28 }}>
              <Heading
                as="h2"
                style={{
                  margin: '0 0 10px 0',
                  fontSize: 15,
                  fontWeight: 700,
                  color: COLOR.ink,
                }}
              >
                주목 종목 — {BUCKET_LABEL.will_rise}
              </Heading>
              <div
                style={{
                  backgroundColor: COLOR.surface,
                  border: `1px solid ${COLOR.border}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {willRise.rows.slice(0, 3).map((row, idx) => (
                  <div
                    key={`${row.ticker.symbol}-${idx}`}
                    style={{
                      padding: '12px 14px',
                      borderBottom:
                        idx < Math.min(willRise.rows.length, 3) - 1
                          ? `1px solid ${COLOR.border}`
                          : 'none',
                    }}
                  >
                    <Text
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: COLOR.ink,
                      }}
                    >
                      {row.ticker.symbol}
                      {row.ticker.name ? ` · ${row.ticker.name}` : ''}
                    </Text>
                    <Text
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: 12,
                        color: COLOR.inkSoft,
                        lineHeight: 1.5,
                      }}
                    >
                      {truncate(row.reason, 160)}
                    </Text>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 한국 주식 한마디 */}
          {koreanStocks.length > 0 && (
            <Section style={{ marginTop: 28 }}>
              <Heading
                as="h2"
                style={{
                  margin: '0 0 10px 0',
                  fontSize: 15,
                  fontWeight: 700,
                  color: COLOR.ink,
                }}
              >
                한국 주식 한마디
              </Heading>
              {koreanStocks.map((ks) => (
                <div
                  key={`${ks.code}-${ks.index}`}
                  style={{
                    backgroundColor: COLOR.surface,
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 8,
                  }}
                >
                  <Row>
                    <Column>
                      <Text
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: COLOR.ink,
                        }}
                      >
                        {ks.name}{' '}
                        <span style={{ color: COLOR.muted, fontWeight: 400 }}>
                          {ks.code}
                        </span>
                      </Text>
                    </Column>
                    <Column align="right">
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#ffffff',
                          backgroundColor: ACTION_COLOR[ks.action],
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}
                      >
                        {ks.action}
                      </span>
                    </Column>
                  </Row>
                  <Text
                    style={{
                      margin: '6px 0 0 0',
                      fontSize: 12,
                      color: COLOR.inkSoft,
                      lineHeight: 1.55,
                    }}
                  >
                    {truncate(ks.body, 200)}
                  </Text>
                </div>
              ))}
            </Section>
          )}

          {/* 한 줄 정리 */}
          {novice.closing && (
            <Section
              style={{
                marginTop: 28,
                padding: '14px 16px',
                backgroundColor: COLOR.surface,
                border: `1px solid ${COLOR.borderStrong}`,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: COLOR.muted,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                한 줄 정리
              </Text>
              <Text
                style={{
                  margin: '6px 0 0 0',
                  fontSize: 14,
                  color: COLOR.ink,
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                {novice.closing}
              </Text>
            </Section>
          )}

          {/* CTA */}
          <Section style={{ marginTop: 28, textAlign: 'center' }}>
            <Link
              href={detailUrl}
              style={{
                display: 'inline-block',
                backgroundColor: COLOR.ink,
                color: '#ffffff',
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              웹에서 전체 보기
            </Link>
            <div style={{ marginTop: 10 }}>
              <Link
                href={expertUrl}
                style={{
                  fontSize: 12,
                  color: COLOR.accent,
                  textDecoration: 'underline',
                }}
              >
                전문가용 전체 리포트 보기 →
              </Link>
            </div>
          </Section>

          <Hr style={{ borderColor: COLOR.border, margin: '32px 0 16px 0' }} />

          {/* 풋터 */}
          <Section>
            <Text
              style={{
                margin: 0,
                fontSize: 11,
                color: COLOR.muted,
                lineHeight: 1.6,
              }}
            >
              본 메일은 sector-king 의 일별 마켓 리포트 구독 사용자에게
              발송됩니다. 본 리포트는 투자 조언이 아닌 정보 제공 목적입니다.
              모든 투자 판단은 본인의 책임하에 이루어져야 합니다.
            </Text>
            <Text
              style={{
                margin: '10px 0 0 0',
                fontSize: 11,
                color: COLOR.muted,
              }}
            >
              <Link
                href={unsubLinkUrl}
                style={{ color: COLOR.accent, textDecoration: 'underline' }}
              >
                메일 수신 해지
              </Link>
              {' · '}
              <Link
                href={settingsUrl}
                style={{ color: COLOR.accent, textDecoration: 'underline' }}
              >
                수신 시간 변경
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ----------------------------------------------------------------------------
// 헬퍼
// ----------------------------------------------------------------------------
function truncate(s: string, n: number): string {
  if (!s) return ''
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s
}

export default DailyNewsEmail
