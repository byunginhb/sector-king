import { ImageResponse } from 'next/og'

/** OG 이미지 공통 사양 (신규 페이지 opengraph-image 들이 재사용). */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

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

interface OgImageOptions {
  /** 작은 상단 라벨 (예: SECTOR KING PICK) */
  eyebrow?: string
  /** 큰 제목 */
  title: string
  /** 부제 */
  subtitle?: string
  /** 하단 태그 칩 */
  tags?: string[]
}

/** 다크 그라데이션 + 제목/부제/태그의 공통 OG 이미지를 생성한다. */
export async function renderOgImage({
  eyebrow,
  title,
  subtitle,
  tags = [],
}: OgImageOptions) {
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
          fontFamily: 'Noto Sans KR',
          padding: '64px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #C68A28, #E5B14C, #C68A28)',
            display: 'flex',
          }}
        />

        {eyebrow ? (
          <div
            style={{
              fontSize: '24px',
              letterSpacing: '0.18em',
              fontWeight: 700,
              color: '#E5B14C',
              marginBottom: '20px',
              display: 'flex',
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <div
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: '#f1f5f9',
            textAlign: 'center',
            display: 'flex',
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              fontSize: '30px',
              fontWeight: 500,
              color: '#cbd5e1',
              marginTop: '20px',
              textAlign: 'center',
              display: 'flex',
            }}
          >
            {subtitle}
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
            {tags.map((tag) => (
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
        ) : null}

        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            color: '#64748b',
            fontSize: '18px',
            fontWeight: 700,
            display: 'flex',
          }}
        >
          Sector King · sector-king.com
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: 'Noto Sans KR', data: fontData, weight: 700, style: 'normal' }],
    }
  )
}
