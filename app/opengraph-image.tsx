import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'Sector King - 산업별 투자 패권 지도'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/woff2/Pretendard-Bold.woff2'

async function loadFont(): Promise<ArrayBuffer> {
  const res = await fetch(FONT_URL)
  return res.arrayBuffer()
}

export default async function OgImage() {
  const fontData = await loadFont()

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
          fontFamily: 'Pretendard',
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
              fontSize: '72px',
              fontWeight: 800,
              color: '#3b82f6',
              display: 'flex',
            }}
          >
            Sector King
          </div>

          <div
            style={{
              fontSize: '32px',
              color: '#94a3b8',
              fontWeight: 500,
              display: 'flex',
            }}
          >
            산업별 투자 패권 지도
          </div>
        </div>

        {/* Tags */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '48px',
          }}
        >
          {['시가총액 분석', '자금 흐름', '가격 변화율', '섹터 지배력'].map((tag) => (
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
          name: 'Pretendard',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  )
}
