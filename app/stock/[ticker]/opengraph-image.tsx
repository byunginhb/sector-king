import { ImageResponse } from 'next/og'
import { getStockSummary } from '@/lib/stock-server'
import { formatMarketCap } from '@/lib/format'

export const runtime = 'nodejs'
export const alt = '종목 시가총액·패권 점수'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadFont(): Promise<ArrayBuffer> {
  const css = await (
    await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      }
    )
  ).text()
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(opentype|truetype|woff)'\)/)
  const url = match?.[1]
  if (!url) throw new Error('Font URL not found')
  const res = await fetch(url)
  return res.arrayBuffer()
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params
  const [summary, fontData] = await Promise.all([getStockSummary(ticker), loadFont()])

  const name = summary ? summary.nameKo || summary.name : ticker
  const marketCapLabel =
    summary?.marketCapUsd != null ? formatMarketCap(summary.marketCapUsd) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'Noto Sans KR',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6, #0ea5e9, #3b82f6)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '0 80px',
          }}
        >
          <div
            style={{
              fontSize: '64px',
              fontWeight: 800,
              color: '#f1f5f9',
              display: 'flex',
              textAlign: 'center',
            }}
          >
            {name}
          </div>

          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#94a3b8',
              display: 'flex',
            }}
          >
            {ticker}
          </div>

          {marketCapLabel && (
            <div
              style={{
                marginTop: '8px',
                padding: '10px 28px',
                borderRadius: '9999px',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '26px',
                fontWeight: 500,
                display: 'flex',
              }}
            >
              시가총액 {marketCapLabel}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: '36px',
            fontSize: '26px',
            fontWeight: 500,
            color: '#3b82f6',
            display: 'flex',
          }}
        >
          Sector King
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            color: '#475569',
            fontSize: '16px',
            display: 'flex',
          }}
        >
          sector-king.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Noto Sans KR',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  )
}
