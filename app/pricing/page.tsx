/**
 * /pricing — 구독 안내 (플레이스홀더).
 *
 * 게이팅의 모든 업셀 CTA 가 여기로 착지한다. 이 페이지가 없으면 게이트는
 * 막다른 길이 되므로, 가격이 정해지기 전이라도 "등급별로 무엇이 열리는가" 만은
 * 먼저 서 있어야 한다.
 *
 * ⚠️ **가격을 지어내지 않는다.** 금액·할인·무료 체험 기간은 운영자가 정할 사항이고,
 * 여기에 임시 숫자를 적으면 그 숫자가 스크린샷으로 돌아다닌다. 상품 정의는
 * `lib/permissions/plans.ts` 에 있고 `priceKrw: null` 이면 화면이 "오픈 예정"을
 * 그린다 — 금액이 정해지면 그 파일의 숫자만 채우면 되고 이 파일은 손대지 않는다.
 *
 * 기능 목록은 `lib/permissions/features.ts` 레지스트리에서 파생한다 — 손으로 적은
 * 목록은 반드시 실제 게이트 설정과 어긋나고, 그 어긋남을 아무도 발견하지 못한다.
 * 표시 기준은 `recommendedMinTier`(카탈로그 조사 결과)이며, 실제 런타임 판정은
 * DB 오버라이드가 얹힌 정책이 한다.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Mail, Sparkle } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { FEATURES } from '@/lib/permissions/features'
import { TIER_LABEL, type Tier } from '@/lib/permissions/tier'
import {
  BILLING_PERIOD_LABEL,
  PLANS,
  formatPlanPrice,
} from '@/lib/permissions/plans'
import type { FeatureDef } from '@/lib/permissions/types'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export const metadata: Metadata = {
  // title 에 브랜드를 다시 붙이지 말 것 — 루트 layout 의 template 이 이미 붙인다.
  title: '구독 안내',
  description:
    '섹터킹 등급별로 열리는 기능 안내. 산출 기준과 데이터 범위는 구독 여부와 무관하게 모두 공개되어 있습니다.',
  alternates: { canonical: `${BASE_URL}/pricing` },
}

/** 카드로 세울 등급. `anon` 은 "무료" 카드에 합쳐지고 `admin` 은 상품이 아니다. */
const PLAN_TIERS: readonly Tier[] = ['free', 'basic', 'pro']

const PLAN_SUMMARY: Record<string, string> = {
  free: '계정을 만들면 열리는 범위입니다. 로그인만 하면 됩니다.',
  basic: '섹터·자금 흐름을 기간과 종목 단위까지 넓혀서 봅니다.',
  pro: '순위와 예측 정확도까지 전부 열립니다.',
}

/**
 * 기능을 등급 버킷으로 나눈다.
 *
 * `anon`(누구나)은 무료 카드로 접는다 — 별도 카드로 세우면 "가입하지 않는 것"이
 * 하나의 플랜처럼 보인다.
 */
function bucketFeatures(): Record<string, Array<[string, FeatureDef]>> {
  const buckets: Record<string, Array<[string, FeatureDef]>> = {
    free: [],
    basic: [],
    pro: [],
  }

  for (const [id, def] of Object.entries(FEATURES)) {
    if (def.retired) continue
    const tier = def.recommendedMinTier ?? def.defaultPolicy.minTier
    const bucket = tier === 'anon' || tier === 'free' ? 'free' : tier
    if (buckets[bucket]) buckets[bucket].push([id, def])
  }

  return buckets
}

export default function PricingPage() {
  const buckets = bucketFeatures()
  const hasCatalog = Object.values(buckets).some((list) => list.length > 0)

  return (
    <div className="min-h-screen">
      <GlobalTopBar subtitle="구독 안내 · 등급별로 열리는 기능" />

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <header>
          <p className="eyebrow eyebrow-accent">구독 안내</p>
          <h1 className="display mt-3 text-3xl sm:text-4xl">등급별로 열리는 기능</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/85">
            상위 등급은 하위 등급이 보는 것을 모두 포함합니다. 산출 기준(계산식·표본
            조건·데이터 출처)은 구독 여부와 무관하게{' '}
            <Link
              href="/methodology"
              className="underline underline-offset-2 hover:text-foreground"
            >
              방법론
            </Link>
            과{' '}
            <Link
              href="/data-sources"
              className="underline underline-offset-2 hover:text-foreground"
            >
              데이터 출처
            </Link>
            에 공개되어 있습니다.
          </p>
        </header>

        <div className="sk-rule my-8" />

        {/* 상품 안내 — 금액은 `plans.ts` 가 정하고, null 이면 "오픈 예정". */}
        <section className="sk-card p-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            <Sparkle className="h-3.5 w-3.5" aria-hidden />
            오픈 예정
          </span>
          <h2 className="mt-2 text-base font-semibold text-foreground">
            {BILLING_PERIOD_LABEL.monthly} 2종을 준비하고 있습니다
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <b className="font-semibold text-foreground">Basic</b> 과{' '}
            <b className="font-semibold text-foreground">Pro</b> 두 가지 월 구독으로
            열립니다. 금액과 결제 방식은 아직 확정되지 않았고, 확정 전까지 아래
            기능은 현재 공개 범위 그대로 이용하실 수 있습니다. 먼저 안내받고
            싶으시면 문의를 남겨 주세요.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Mail className="h-4 w-4" aria-hidden />
            오픈 알림 문의
          </Link>
        </section>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLAN_TIERS.map((tier) => {
            const items = buckets[tier] ?? []
            const plan = PLANS.find((p) => p.tier === tier) ?? null
            return (
              <section key={tier} className="sk-card flex flex-col p-5">
                <h2 className="flex flex-wrap items-center gap-1.5 text-base font-semibold text-foreground">
                  {plan?.name ?? TIER_LABEL[tier]}
                  {plan?.status === 'coming_soon' && (
                    <span className="rounded-full border border-border-subtle bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      오픈 예정
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {plan?.summary ?? PLAN_SUMMARY[tier]}
                </p>
                {/*
                  무료는 상품이 아니라 로그인만 하면 열리는 기본 범위다 —
                  가격 자리를 두면 "0원 상품"처럼 읽힌다.
                */}
                {plan ? (
                  <p className="mt-4">
                    <span className="text-sm font-semibold text-foreground">
                      {formatPlanPrice(plan) ?? '오픈 예정'}
                    </span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {BILLING_PERIOD_LABEL[plan.billingPeriod]}
                    </span>
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    로그인하면 바로 이용
                  </p>
                )}

                <ul className="mt-4 space-y-2 text-sm">
                  {items.map(([id, def]) => (
                    <li key={id} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                        aria-hidden
                      />
                      <span className="text-foreground/85">{def.label}</span>
                    </li>
                  ))}
                  {items.length === 0 ? (
                    /*
                      상위 등급은 하위 등급을 모두 포함하므로(페이지 상단 안내),
                      전용 기능이 아직 없다는 것이지 "아무것도 없다"가 아니다.
                      전용 기능 배정은 제품 결정이라 화면이 지어내지 않는다.
                    */
                    <li className="text-xs leading-relaxed text-muted-foreground">
                      {plan
                        ? '하위 등급의 모든 기능을 포함합니다. 전용 기능은 오픈 전까지 정리하고 있습니다.'
                        : '이 등급에 배정된 기능이 아직 없습니다.'}
                    </li>
                  ) : null}
                </ul>
              </section>
            )
          })}
        </div>

        {!hasCatalog ? (
          <p className="mt-6 border-l-2 border-primary bg-surface-2/50 px-4 py-2 text-sm text-foreground/85">
            등급별 기능 배정을 정리하는 중입니다. 지금은 모든 기능이 제한 없이
            열려 있습니다.
          </p>
        ) : null}

        <div className="sk-rule my-8" />

        <section>
          <h2 className="text-base font-semibold text-foreground">
            잠긴 화면에서도 그대로 열려 있는 것
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/85">
            <li>
              모든 지표의 계산식과 한계 —{' '}
              <Link
                href="/methodology"
                className="underline underline-offset-2 hover:text-foreground"
              >
                방법론
              </Link>
              ,{' '}
              <Link
                href="/guide"
                className="underline underline-offset-2 hover:text-foreground"
              >
                가이드
              </Link>
            </li>
            <li>
              어떤 데이터를 어디서 언제 가져오는지 —{' '}
              <Link
                href="/data-sources"
                className="underline underline-offset-2 hover:text-foreground"
              >
                데이터 출처
              </Link>
            </li>
            <li>검색엔진과 답변 엔진이 읽는 내용은 비로그인 사용자가 보는 것과 같습니다.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
