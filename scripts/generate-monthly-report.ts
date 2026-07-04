/**
 * 월간(/주간) 마켓 리포트 생성기 — #16.
 *
 * 파이프라인: SQLite 집계(결정론) → baseline 산문 → LLM 산문 override(옵션) →
 *   newsReportInputSchema 검증 → 파일 출력 또는 /api/news/ingest POST(멱등).
 *
 * 사용:
 *   pnpm tsx scripts/generate-monthly-report.ts --month=2026-06
 *   pnpm tsx scripts/generate-monthly-report.ts --month=2026-06 --no-llm
 *   pnpm tsx scripts/generate-monthly-report.ts --month=2026-06 --ingest [--publish]
 *
 * 플래그:
 *   --month=YYYY-MM   대상 월(필수, --start/--end 없을 때)
 *   --start=YYYY-MM-DD --end=YYYY-MM-DD   기간 직접 지정(주간 확장용)
 *   --db=path         SQLite 경로(기본 data/hegemony.db)
 *   --out=path        JSON 출력 경로(기본 _workspace/13_monthly_report/output/<reportDate>.json)
 *   --no-llm          LLM 산문 건너뛰고 결정론 baseline만
 *   --ingest          /api/news/ingest 로 POST (기본은 파일 출력만)
 *   --publish         status=published 로 발행(기본 draft)
 *
 * 환경변수:
 *   OPENROUTER_API_KEY   (선택, 없으면 결정론 baseline 산문으로 폴백)
 *   OPENROUTER_MODEL     (선택, 기본 anthropic/claude-sonnet-5)
 *   --ingest 시: NEWS_INGEST_API_KEY (필수) · INGEST_URL 또는 NEXT_PUBLIC_SITE_URL (기본 localhost:3000)
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { aggregateMonthly } from '../lib/reports/aggregate'
import { buildBaseline, buildMeta } from '../lib/reports/baseline'
import { generateProse, applyProse } from '../lib/reports/prose'
import { newsReportInputSchema } from '../lib/news/schema'

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (const a of argv) {
    if (!a.startsWith('--')) continue
    const [k, v] = a.slice(2).split('=')
    out[k] = v === undefined ? true : v
  }
  return out
}

/** 월 문자열(YYYY-MM)로 [초일, 말일] 계산. */
function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) {
    throw new Error(`잘못된 --month: ${month} (YYYY-MM 형식이어야 함)`)
  }
  const lastDay = new Date(y, m, 0).getDate() // m월 0일 = m월 마지막 날
  const pad = (n: number) => String(n).padStart(2, '0')
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(lastDay)}` }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let start: string
  let end: string
  if (typeof args.start === 'string' && typeof args.end === 'string') {
    start = args.start
    end = args.end
  } else if (typeof args.month === 'string') {
    ;({ start, end } = monthBounds(args.month))
  } else {
    console.error('사용법: --month=YYYY-MM (또는 --start=YYYY-MM-DD --end=YYYY-MM-DD)')
    process.exit(1)
    return
  }
  const reportDate = end

  const dbPath = resolve(
    typeof args.db === 'string' ? args.db : 'data/hegemony.db'
  )

  console.log(`[report] 집계 ${start} ~ ${end} (db=${dbPath})`)
  const facts = aggregateMonthly(dbPath, start, end)
  console.log(
    `[report] 거래일 ${facts.tradingDays}, 시장 ${facts.marketPct.toFixed(2)}%, ` +
      `유입 top=${facts.inflows[0]?.name ?? '-'}, 유출 top=${facts.outflows[0]?.name ?? '-'}, ` +
      `상승/하락 ${facts.breadthUp}/${facts.breadthDown}, KR ${facts.krStocks.length}`
  )

  const meta = buildMeta(facts, reportDate)
  meta.status = args.publish ? 'published' : 'draft'

  const baseline = buildBaseline(facts, meta)

  let report = baseline
  if (!args['no-llm']) {
    const prose = await generateProse(facts, baseline)
    report = applyProse(baseline, prose)
    console.log(`[report] LLM 산문: ${prose ? '적용됨' : '폴백(baseline)'}`)
  } else {
    console.log('[report] --no-llm: 결정론 baseline 사용')
  }

  // 검증 (.strict — 미지 키 0). 실패 시 상세 로그 후 종료.
  const parsed = newsReportInputSchema.safeParse(report)
  if (!parsed.success) {
    console.error('[report] 스키마 검증 실패:')
    for (const i of parsed.error.issues) {
      console.error(`  · ${i.path.join('.')}: ${i.message}`)
    }
    process.exit(1)
    return
  }
  const valid = parsed.data

  if (args.supabase) {
    // 러닝 서버 없이 Supabase 에 직접 upsert (service_role). 멱등: (report_date, title).
    const { createClient } = await import('@supabase/supabase-js')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
    const serviceRole =
      process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRole) {
      console.error('[report] --supabase 에는 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE 필요')
      process.exit(1)
      return
    }
    const sb = createClient(url, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const row = {
      title: valid.title,
      status: valid.status,
      report_date: valid.reportDate,
      one_line_conclusion: valid.oneLineConclusion ?? null,
      cover_keywords: valid.coverKeywords,
      expert_view: valid.expertView,
      novice_view: valid.noviceView,
      published_at: valid.status === 'published' ? new Date().toISOString() : null,
    }
    const { data: existing } = await sb
      .from('news_reports')
      .select('id')
      .eq('report_date', valid.reportDate)
      .eq('title', valid.title)
      .maybeSingle()
    if (existing?.id) {
      const { error } = await sb.from('news_reports').update(row).eq('id', existing.id)
      if (error) {
        console.error('[report] Supabase update 실패:', error.message)
        process.exit(1)
        return
      }
      console.log(`[report] Supabase 갱신: id=${existing.id} status=${valid.status}`)
    } else {
      const { data: ins, error } = await sb
        .from('news_reports')
        .insert(row)
        .select('id')
        .single()
      if (error || !ins) {
        console.error('[report] Supabase insert 실패:', error?.message)
        process.exit(1)
        return
      }
      console.log(`[report] Supabase 적재: id=${ins.id} status=${valid.status}`)
    }
  } else if (args.ingest) {
    const key = process.env.NEWS_INGEST_API_KEY
    if (!key) {
      console.error('[report] --ingest 에는 NEWS_INGEST_API_KEY 필요')
      process.exit(1)
      return
    }
    const base =
      process.env.INGEST_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000'
    const url = `${base.replace(/\/$/, '')}/api/news/ingest`
    console.log(`[report] POST ${url} (status=${valid.status})`)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(valid),
    })
    const json = (await res.json()) as {
      success: boolean
      data?: { id: string; action: string }
      error?: string
    }
    if (!res.ok || !json.success) {
      console.error(`[report] ingest 실패 (${res.status}):`, json.error ?? json)
      process.exit(1)
      return
    }
    console.log(
      `[report] ingest 성공: id=${json.data?.id} action=${json.data?.action}`
    )
  } else {
    const outPath = resolve(
      typeof args.out === 'string'
        ? args.out
        : `_workspace/13_monthly_report/output/${reportDate}.json`
    )
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, JSON.stringify(valid, null, 2), 'utf8')
    console.log(`[report] 파일 출력: ${outPath}`)
    console.log('[report] (발행하려면 --ingest [--publish] 추가)')
  }
}

main().catch((err) => {
  console.error('[report] 치명적 오류:', err)
  process.exit(1)
})
