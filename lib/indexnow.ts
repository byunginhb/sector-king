import 'server-only'

/**
 * IndexNow — 새로 생기거나 의미 있게 바뀐 URL 을 Bing·Naver 등에 즉시 알린다.
 *
 * 설계 원칙 하나: **매 배포마다 전체 URL 을 재전송하지 않는다.** 우리 데이터 페이지는
 * 하루 4번 숫자가 갱신되지만 그건 "콘텐츠가 새로 생긴 것"이 아니다. 전량 재전송은
 * 스팸으로 취급될 뿐 아니라 정작 중요한 신호(새 글)를 묻어버린다. 그래서 호출 지점을
 * **실제로 새 URL 이 생기는 순간**(마켓 리포트 발행)으로 한정한다.
 * 나머지는 sitemap 의 lastmod 로 충분하다.
 *
 * 키 검증: 엔드포인트가 `https://sector-king.com/{key}.txt` 를 가져가 본문이 key 와
 * 같은지 확인한다. 그래서 public/{key}.txt 가 배포돼 있어야 한다.
 */

const ENDPOINT = 'https://api.indexnow.org/IndexNow'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/**
 * IndexNow 키. 비밀이 아니다 — 어차피 `/{key}.txt` 로 공개된다.
 * 값을 바꾸려면 public/{key}.txt 파일명도 함께 바꿔야 한다.
 */
export const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY || '459ba1e83650f9d00b7b3f3eb537ca14'

/** IndexNow 는 1회 요청당 최대 1만 URL 을 허용하지만, 우리 호출은 늘 한 자릿수다. */
const MAX_URLS = 10_000

/**
 * URL 목록을 IndexNow 에 통지한다.
 *
 * 호출부를 절대 실패시키지 않는다 — 색인 통지가 안 됐다고 리포트 발행이 롤백되면
 * 그게 더 큰 사고다. 실패는 로그로만 남기고 `false` 를 돌려준다.
 */
export async function submitToIndexNow(urls: string[]): Promise<boolean> {
  const host = new URL(BASE_URL).host

  // 자기 도메인 URL 만 보낸다(다른 호스트가 섞이면 요청 전체가 422 로 거절된다).
  const unique = Array.from(new Set(urls)).filter((url) => {
    try {
      return new URL(url).host === host
    } catch {
      return false
    }
  })

  if (unique.length === 0) return false

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: unique.slice(0, MAX_URLS),
      }),
    })

    // 200 OK / 202 Accepted 는 성공. 나머지는 원인을 남긴다.
    //  400 잘못된 형식 · 403 키 검증 실패 · 422 host/URL 불일치 · 429 과다 요청
    if (res.ok) return true
    console.error(`[indexnow] HTTP ${res.status} — ${await res.text().catch(() => '')}`)
    return false
  } catch (error) {
    console.error('[indexnow] 요청 실패', error)
    return false
  }
}

/** 마켓 리포트 상세 URL 을 통지한다. */
export function submitNewsUrl(id: string): Promise<boolean> {
  return submitToIndexNow([`${BASE_URL}/news/${id}`, `${BASE_URL}/news`])
}
