import { ImageResponse } from 'next/og'
import { getAllIndustries } from '@/lib/industry'

export const runtime = 'nodejs'
export const alt = '산업별 패권 지도'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadFont(): Promise<ArrayBuffer> {
  const css = await (
    await fetch('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
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
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  const [industries, fontData] = await Promise.all([getAllIndustries(), loadFont()])
  const industry = industries.find((i) => i.id === industryId)

  const icon = industry?.icon ?? ''
  const name = industry?.name ?? 'Sector King'

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
        {/* Top gradient accent */}
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

        {/* Industry icon */}
        <div
          style={{
            fontSize: '80px',
            marginBottom: '8px',
            display: 'flex',
          }}
        >
          {icon}
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: '#f1f5f9',
              display: 'flex',
            }}
          >
            {name} 패권 지도
          </div>

          <div
            style={{
              fontSize: '28px',
              fontWeight: 500,
              color: '#3b82f6',
              display: 'flex',
            }}
          >
            Sector King
          </div>
        </div>

        {/* Tags */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '40px',
          }}
        >
          {['시가총액 분석', '자금 흐름', '가격 변화율'].map((tag) => (
            <div
              key={tag}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '18px',
                display: 'flex',
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            color: '#475569',
            fontSize: '16px',
            display: 'flex',
          }}
        >
          sectorking.co.kr
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
