import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  companies,
  companyProfiles,
  companyScores,
  dailySnapshots,
  sectorCompanies,
  sectors,
} from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import { computeDcf } from '@/lib/dcf'
import { resolveRange } from '@/lib/api-helpers'
import type { ApiResponse, CompanyDetailResponse } from '@/types'

export const revalidate = 3600 // 1 hour cache

/** 가격 history 허용 일수. 누락 시 30(기존 동작 보존 → 모달 무영향). */
const HISTORY_RANGES = [30, 60, 90, 129] as const

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
): Promise<NextResponse<ApiResponse<CompanyDetailResponse>>> {
  try {
    const { ticker } = await params
    const db = getDb()

    const historyLimit = resolveRange(new URL(request.url).searchParams, {
      allowed: HISTORY_RANGES,
      fallback: 30,
    })

    // Get company info
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.ticker, ticker))
      .limit(1)

    if (company.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      )
    }

    // Get company profile
    const profile = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.ticker, ticker))
      .limit(1)

    // Get latest snapshot
    const snapshot = await db
      .select()
      .from(dailySnapshots)
      .where(eq(dailySnapshots.ticker, ticker))
      .orderBy(desc(dailySnapshots.date))
      .limit(1)

    // Get price history (default 30 days, ?range= 로 확장 — 모달은 미지정이라 30일 유지)
    const history = await db
      .select({
        date: dailySnapshots.date,
        price: dailySnapshots.price,
        volume: dailySnapshots.volume,
      })
      .from(dailySnapshots)
      .where(eq(dailySnapshots.ticker, ticker))
      .orderBy(desc(dailySnapshots.date))
      .limit(historyLimit)

    // Get company scores
    const scoreResult = await db
      .select()
      .from(companyScores)
      .where(eq(companyScores.ticker, ticker))
      .limit(1)

    const scoreRow = scoreResult[0] ?? null

    // Get sectors this company belongs to
    const companySectors = await db
      .select({
        sectorId: sectorCompanies.sectorId,
        rank: sectorCompanies.rank,
        sectorName: sectors.name,
        sectorNameEn: sectors.nameEn,
      })
      .from(sectorCompanies)
      .leftJoin(sectors, eq(sectorCompanies.sectorId, sectors.id))
      .where(eq(sectorCompanies.ticker, ticker))

    // 가산 확장용 파생값 (모달 무영향, 전부 옵셔널/nullable)
    const snap = snapshot[0] ?? null
    // 52주 위치: (price-low)/(high-low). 동일 ticker 비율이므로 변환 불요 (raw 그대로 계산).
    const week52Position =
      snap &&
      snap.price != null &&
      snap.week52High != null &&
      snap.week52Low != null &&
      snap.week52High > snap.week52Low
        ? Math.min(
            1,
            Math.max(0, (snap.price - snap.week52Low) / (snap.week52High - snap.week52Low))
          )
        : null

    // 애널리스트 상승여력: target/current 둘 다 USD 환산 후 비율 계산
    const targetMeanPriceUsd =
      scoreRow?.targetMeanPrice != null ? toUsd(scoreRow.targetMeanPrice, ticker) : null
    const currentPriceUsd = snap?.price != null ? toUsd(snap.price, ticker) : null
    const upsidePct =
      targetMeanPriceUsd != null && currentPriceUsd != null && currentPriceUsd > 0
        ? (targetMeanPriceUsd - currentPriceUsd) / currentPriceUsd
        : null
    const analystUpside =
      targetMeanPriceUsd != null || currentPriceUsd != null
        ? { targetMeanPriceUsd, currentPriceUsd, upsidePct }
        : null

    // DCF(내재가치 절대평가) — 랭킹과 동일 lib/dcf 엔진. FCF 는 네이티브(DB값) 유지,
    // 주당 내재가치만 1회 toUsd. 규모가산·현재가는 USD 환산값 전달.
    const dcfRes = computeDcf({
      freeCashflow: scoreRow?.freeCashflow ?? null, // native — do NOT toUsd
      revenueGrowth: scoreRow?.revenueGrowth ?? null,
      beta: scoreRow?.beta ?? null,
      debtToEquity: scoreRow?.debtToEquity ?? null,
      marketCapNative: snap?.marketCap ?? null,
      priceNative: snap?.price ?? null,
      marketCapUsd: snap?.marketCap != null ? toUsd(snap.marketCap, ticker) : null,
      priceUsd: currentPriceUsd,
      intrinsicToUsd: (nativePerShare) => toUsd(nativePerShare, ticker),
      sector: profile[0]?.sector ?? null,
    })
    const dcf = {
      score: dcfRes.dcfScore,
      upsidePct: dcfRes.dcfUpsidePct,
      intrinsicUsd: dcfRes.dcfIntrinsicUsd,
      available: dcfRes.dcfAvailable,
      reason: dcfRes.dcfReason,
      discountRate: dcfRes.dcfDiscountRate,
      // 연도별 예측 현금흐름 — 네이티브 FCF·PV 를 표시용 USD 로 변환(#24)
      projections:
        dcfRes.dcfProjections?.map((p) => ({
          year: p.year,
          fcf: toUsd(p.fcf, ticker),
          pv: toUsd(p.pv, ticker),
        })) ?? null,
      terminalPv:
        dcfRes.dcfTerminalPv != null ? toUsd(dcfRes.dcfTerminalPv, ticker) : null,
    }

    // 멀티섹터 패권 요약 (전 섹터 대상, 기존 sectors 결과로 집계 — 추가 쿼리 0)
    const validRanks = companySectors
      .map((s) => s.rank)
      .filter((r): r is number => typeof r === 'number')
    const dominance =
      companySectors.length > 0
        ? {
            sectorCount: companySectors.length,
            topRankCount: companySectors.filter((s) => s.rank === 1).length,
            bestRank: validRanks.length > 0 ? Math.min(...validRanks) : null,
          }
        : null

    return NextResponse.json({
      success: true,
      data: {
        company: company[0],
        profile: profile[0] || null,
        // 가격 필드(marketCap/price/week52High/week52Low/history.price) 는 USD 정규화.
        // priceChange/volume/peRatio/pegRatio 는 통화 무관.
        snapshot: snapshot[0]
          ? {
              marketCap:
                snapshot[0].marketCap != null
                  ? toUsd(snapshot[0].marketCap, ticker)
                  : null,
              price:
                snapshot[0].price != null
                  ? toUsd(snapshot[0].price, ticker)
                  : null,
              priceChange: snapshot[0].priceChange,
              week52High:
                snapshot[0].week52High != null
                  ? toUsd(snapshot[0].week52High, ticker)
                  : null,
              week52Low:
                snapshot[0].week52Low != null
                  ? toUsd(snapshot[0].week52Low, ticker)
                  : null,
              volume: snapshot[0].volume,
              peRatio: snapshot[0].peRatio,
              pegRatio: snapshot[0].pegRatio,
              // 08_stock_insights 가산 확장
              week52Position,
              dayHigh:
                snapshot[0].dayHigh != null
                  ? toUsd(snapshot[0].dayHigh, ticker)
                  : null,
              dayLow:
                snapshot[0].dayLow != null
                  ? toUsd(snapshot[0].dayLow, ticker)
                  : null,
              avgVolume: snapshot[0].avgVolume,
            }
          : null,
        history: history
          .filter((h) => h.price !== null)
          .map((h) => ({
            date: h.date,
            price: toUsd(h.price as number, ticker),
            volume: h.volume || 0,
          }))
          .reverse(),
        score: scoreRow
          ? {
              total: scoreRow.smoothedScore ?? 0,
              scale: scoreRow.scaleScore ?? 0,
              growth: scoreRow.growthScore ?? 0,
              profitability: scoreRow.profitabilityScore ?? 0,
              sentiment: scoreRow.sentimentScore ?? 0,
              dataQuality: scoreRow.dataQuality ?? 0,
              revenueGrowth: scoreRow.revenueGrowth,
              earningsGrowth: scoreRow.earningsGrowth,
              operatingMargin: scoreRow.operatingMargin,
              returnOnEquity: scoreRow.returnOnEquity,
              recommendationKey: scoreRow.recommendationKey,
              analystCount: scoreRow.analystCount,
              targetMeanPrice:
                scoreRow.targetMeanPrice != null
                  ? toUsd(scoreRow.targetMeanPrice, ticker)
                  : null,
              // 08_stock_insights 가산 확장 (beta/debtToEquity 무차원, freeCashflow=toUsd)
              beta: scoreRow.beta,
              debtToEquity: scoreRow.debtToEquity,
              freeCashflow:
                scoreRow.freeCashflow != null
                  ? toUsd(scoreRow.freeCashflow, ticker)
                  : null,
            }
          : null,
        sectors: companySectors.map((s) => ({
          sector: {
            id: s.sectorId ?? '',
            name: s.sectorName ?? '',
            nameEn: s.sectorNameEn,
          },
          rank: s.rank,
        })),
        // 08_stock_insights 가산 확장 (옵셔널 → 모달 무손상)
        analystUpside,
        dominance,
        // 12_dcf_score 가산 확장
        dcf,
      },
    })
  } catch (error) {
    console.error('Company API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}
