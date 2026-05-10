/**
 * 외부 ingestion API 인증 헬퍼.
 *
 * 사용 시점: `/api/news/ingest` 같은 외부 자동화 호출(curl/스크립트/봇)에서
 * 인증된 admin 세션 쿠키 없이 Bearer 토큰으로 호출할 때.
 *
 * 보안:
 *  - timing-safe compare 로 토큰 비교
 *  - server-only — 클라이언트 번들 침투 차단
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

const HEADER_BEARER = 'authorization'
const HEADER_X_API_KEY = 'x-api-key'

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export interface ApiKeyGuardOk {
  ok: true
}

export interface ApiKeyGuardFail {
  ok: false
  response: NextResponse
}

/**
 * `Authorization: Bearer <key>` 또는 `X-API-Key: <key>` 헤더 검증.
 * 환경변수 envName 의 값과 timing-safe 비교.
 *
 * 실패 시 401(JSON) 반환. 환경변수 미설정이면 503(서비스 비활성화).
 */
export function requireApiKey(req: Request, envName: string): ApiKeyGuardOk | ApiKeyGuardFail {
  const expected = process.env[envName]
  if (!expected || expected.trim().length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: `${envName} 환경변수가 설정되지 않아 ingestion 이 비활성화되어 있습니다` },
        { status: 503 }
      ),
    }
  }

  const headerBearer = req.headers.get(HEADER_BEARER) ?? ''
  const headerXKey = req.headers.get(HEADER_X_API_KEY) ?? ''

  let presented = ''
  const bearerMatch = headerBearer.match(/^Bearer\s+(.+)$/i)
  if (bearerMatch) presented = bearerMatch[1].trim()
  else if (headerXKey) presented = headerXKey.trim()

  if (!presented) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Authorization Bearer 또는 X-API-Key 헤더가 필요합니다' },
        { status: 401 }
      ),
    }
  }

  if (!safeEqual(presented, expected)) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: '잘못된 API 키입니다' }, { status: 401 }),
    }
  }

  return { ok: true }
}
