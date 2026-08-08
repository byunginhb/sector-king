/**
 * /about — 섹터킹 소개 페이지.
 *
 * 만든 이유 · 누구를 위한 서비스인지 · 함께 참여 권유(문의 채널) · 함께하는 사람들.
 * 인물은 Supabase `contributors` 를 서버에서 직접 조회(어드민 /admin/contributors 에서 관리).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Instagram,
  AtSign,
  Globe,
  MessageSquare,
  Compass,
  Users,
  BookOpen,
  Newspaper,
  LineChart,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { PixelAvatar } from '@/components/contributors/pixel-avatar'
import { EmailCopy } from '@/components/contributors/email-copy'
import {
  CONTRIBUTOR_COLUMNS,
  rowToDto,
  type ContributorDTO,
} from '@/lib/contributors/dto'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export const metadata: Metadata = {
  // title 에 브랜드를 다시 붙이지 말 것 — 루트 layout 의 template('%s | Sector King')이 이미 붙인다.
  title: '소개',
  description:
    '섹터킹을 만든 이유와 함께하는 사람들. 돈이 어디로 흐르는지 한눈에 보고 싶은 누구나 환영합니다.',
  alternates: { canonical: `${BASE_URL}/about` },
}

export default async function AboutPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contributors')
    .select(CONTRIBUTOR_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  const people: ContributorDTO[] = (data ?? []).map((row) =>
    rowToDto(row as Parameters<typeof rowToDto>[0])
  )

  return (
    <div className="min-h-screen">
      <GlobalTopBar subtitle="소개 · 섹터킹을 만든 이유" />

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-12">
        {/* 히어로 */}
        <section className="text-center space-y-3 pt-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            돈이 어디로 흐르는가
          </h1>
          <p className="text-base text-muted-foreground">
            섹터킹은 산업·섹터·종목의 자금 흐름을 한눈에 보여주는 대시보드입니다.
          </p>
        </section>

        {/* 만든 이유 — 번호형 플로우(카드 아님) */}
        <section className="space-y-5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" aria-hidden />
            왜 만들었나
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            시장은 매일 방대한 숫자를 쏟아내지만, 정작 <strong className="text-foreground font-semibold">지금 돈이
            어느 산업으로 몰리는지</strong>는 흩어진 데이터 속에 묻혀 있습니다.
            섹터킹은 그 흐름을 먼저 보여주려고 만들었습니다.
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
            <ReasonStep
              step="01"
              title="숫자는 넘치는데 흐름이 안 보인다"
              body="개별 종목 시세만으로는 큰 돈의 방향을 읽기 어렵습니다."
            />
            <ReasonStep
              step="02"
              title="산업·섹터로 묶어서 본다"
              body="시가총액과 자금 흐름을 산업 단위로 묶어 큰 그림을 먼저 보여줍니다."
            />
            <ReasonStep
              step="03"
              title="초보도 직관적으로"
              body="복잡한 재무 지표를 쉬운 시각화로 풀어, 누구나 흐름을 읽게 합니다."
            />
          </ol>
        </section>

        {/* 누구를 위한 — 세로 행 리스트 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            누구를 위한 서비스인가
          </h2>

          <div className="divide-y divide-border sk-card">
            <AudienceRow
              icon={<LineChart className="h-5 w-5 text-primary" aria-hidden />}
              title="흐름을 먼저 보고 싶은 분"
              body="개별 종목보다 산업·섹터의 큰 흐름과 자금 이동을 매일 가볍게 확인하고 싶은 분."
            />
            <AudienceRow
              accent
              icon={<BookOpen className="h-5 w-5 text-primary" aria-hidden />}
              title="경제·금융 초보자"
              body={
                <>
                  <Link href="/news" className="text-primary font-medium hover:underline">
                    뉴스 요약
                  </Link>{' '}
                  메뉴의 <strong className="text-foreground font-semibold">초보자용</strong>이
                  매일 아주 쉬운 하루 요약을 제공합니다. 핵심 사건과 주목 종목만 쏙쏙.
                </>
              }
            />
            <AudienceRow
              accent
              icon={<Newspaper className="h-5 w-5 text-primary" aria-hidden />}
              title="깊이 보고 싶은 전문가"
              body={
                <>
                  같은{' '}
                  <Link href="/news" className="text-primary font-medium hover:underline">
                    뉴스 요약
                  </Link>{' '}
                  메뉴의 <strong className="text-foreground font-semibold">전문가용</strong>은
                  헤드라인·시나리오·자금 흐름·한국 주식까지 깊이 있게 정리합니다.
                </>
              }
            />
          </div>
        </section>

        {/* 함께 참여 권유 + 문의 채널 */}
        <section className="sk-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">함께 만들어요</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            섹터킹은 누구나 함께 만들어가길 바랍니다. 아이디어 제안, 데이터 제보,
            피드백 무엇이든 환영합니다. 아래 채널로 편하게 연락 주세요.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              문의 / 제보하기
            </Link>
            <a
              href="https://www.threads.com/@ssector.king"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 sk-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
            >
              <AtSign className="h-4 w-4" aria-hidden />
              쓰레드 @ssector.king
            </a>
          </div>
        </section>

        {/* 함께하는 사람들 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            함께하는 사람들
          </h2>
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              곧 소개될 예정입니다.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {people.map((p) => (
                <li
                  key={p.id}
                  className="sk-card p-5 flex items-start gap-4"
                >
                  <PixelAvatar
                    gender={p.gender}
                    variant={p.avatarVariant}
                    size={64}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <p className="text-base font-bold text-foreground truncate">
                        {p.nickname}
                      </p>
                      <div className="flex items-center gap-2.5 shrink-0 text-muted-foreground">
                        {p.instagramUrl && (
                          <a
                            href={p.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${p.nickname} 인스타그램`}
                            className="hover:text-foreground"
                          >
                            <Instagram className="h-4 w-4" aria-hidden />
                          </a>
                        )}
                        {p.threadsUrl && (
                          <a
                            href={p.threadsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${p.nickname} 쓰레드`}
                            className="hover:text-foreground"
                          >
                            <AtSign className="h-4 w-4" aria-hidden />
                          </a>
                        )}
                        {p.blogUrl && (
                          <a
                            href={p.blogUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${p.nickname} 블로그`}
                            className="hover:text-foreground"
                          >
                            <Globe className="h-4 w-4" aria-hidden />
                          </a>
                        )}
                      </div>
                    </div>
                    {p.bio && (
                      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                        {p.bio}
                      </p>
                    )}
                    {p.email && <EmailCopy email={p.email} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 신뢰 문서 — /data-sources·/editorial-policy 의 빵부스러기 상위가 이 페이지라
            여기서 되돌아가는 링크가 있어야 크롤 경로가 끊기지 않는다. */}
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-lg font-semibold text-foreground">
            더 투명하게
          </h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/data-sources"
                className="text-sm font-medium text-info hover:underline"
              >
                데이터 출처와 수집 방식
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                어떤 숫자가 어디서 오고 언제 갱신되는지, 무엇이 섹터킹이 직접 계산한 값인지.
              </p>
            </li>
            <li>
              <Link
                href="/editorial-policy"
                className="text-sm font-medium text-info hover:underline"
              >
                편집 방침
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                자동 계산·AI 초안·사람 검수의 경계, 이해상충 여부, 오류 정정 방침.
              </p>
            </li>
            <li>
              <Link
                href="/methodology"
                className="text-sm font-medium text-info hover:underline"
              >
                방법론
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                점수 산출 공식과 종목 선정 기준.
              </p>
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}

function ReasonStep({
  step,
  title,
  body,
}: {
  step: string
  title: string
  body: string
}) {
  return (
    <li className="space-y-1.5 border-t-2 border-primary/30 pt-3">
      <span className="block text-2xl font-bold tabular-nums text-primary/40">
        {step}
      </span>
      <p className="text-sm font-bold text-foreground leading-snug">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </li>
  )
}

function AudienceRow({
  icon,
  title,
  body,
  accent,
}: {
  icon: React.ReactNode
  title: string
  body: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className="flex items-start gap-4 p-4 sm:p-5">
      <div
        className={
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-md ' +
          (accent ? 'bg-primary/15' : 'bg-surface-2')
        }
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
          {body}
        </p>
      </div>
    </div>
  )
}
