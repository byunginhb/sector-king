/**
 * 리다이렉트 대상 경로 검증 — 오픈 리다이렉터 차단의 단일 SoT.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 `startsWith('/') && !startsWith('//')` 로는 부족한가
 * ────────────────────────────────────────────────────────────────────
 *
 * URL 파서(WHATWG)는 **탭·CR·LF 를 제거한 뒤** 해석한다. 그래서 문자열
 * 검사만 통과시키면 제거된 뒤에 프로토콜 상대 URL 이 되살아난다:
 *
 *   "/{TAB}/evil.com"  → 검사 통과 (둘째 글자가 `/` 가 아니다)
 *                      → new URL(...) 이 탭을 지워 "//evil.com"
 *                      → https://evil.com  ← 외부 호스트로 나간다
 *
 * 실측(node): `new URL("/\t/evil.com", "https://sector-king.com").href`
 * === `"https://evil.com/"`. 탭·CR·LF 가 모두 같은 결과를 낸다.
 *
 * 백슬래시도 같은 부류다 — 브라우저와 URL 파서가 `\` 를 `/` 로 정규화하므로
 * `/\evil.com` 이 `//evil.com` 이 된다.
 *
 * 그래서 이 함수는 세 단계를 모두 거친다:
 *   1. 제어문자 제거 (파서가 어차피 지울 것을 **먼저** 지운다)
 *   2. 형태 검사 (`/` 로 시작, `//`·`/\` 아님)
 *   3. 파싱 결과의 출처 재확인 (1·2 를 빠져나간 미지의 형태 방어)
 *
 * 3단계까지 두는 이유는 1·2 가 "지금 아는 우회"만 막기 때문이다. 최종
 * 산출물을 origin 과 대조하면 우회 기법이 늘어나도 경계가 유지된다.
 */

/** 파서가 제거·정규화하는 문자들. C0 제어문자(탭·CR·LF 포함) + DEL. */
const STRIPPED_BY_URL_PARSER = /[\u0000-\u001F\u007F]/g

/** origin 을 알 수 없을 때 형태 검사에만 쓰는 기준값. 결과에 남지 않는다. */
const SHAPE_CHECK_BASE = 'https://sector-king.invalid'

/**
 * 안전한 내부 경로만 통과. 위험하거나 해석 불가면 `fallback`(기본 `'/'`).
 *
 * 반환값은 **정규화된 경로**(pathname + search + hash)다. 원본 문자열을
 * 그대로 돌려주면 호출부가 다시 파싱할 때 위 우회가 되살아난다.
 *
 * @param origin 같은 출처인지 대조할 기준. 미지정 시 내부 기준값으로 형태만
 *               확인한다(클라이언트·테스트처럼 origin 이 없는 자리).
 */
export function safeRedirectPath(
  raw: string | null | undefined,
  origin?: string,
  fallback = '/'
): string {
  if (!raw) return fallback

  const cleaned = raw.replace(STRIPPED_BY_URL_PARSER, '')
  if (!cleaned.startsWith('/')) return fallback
  if (cleaned.startsWith('//') || cleaned.startsWith('/\\')) return fallback

  const base = origin ?? SHAPE_CHECK_BASE
  try {
    const baseOrigin = new URL(base).origin
    const resolved = new URL(cleaned, base)
    if (resolved.origin !== baseOrigin) return fallback
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}

/** 형태만 묻는 술어 버전 — 기존 `isSafeRedirect` 호출부의 대체재. */
export function isSafeRedirectPath(
  raw: string | null | undefined
): raw is string {
  return Boolean(raw) && safeRedirectPath(raw, undefined, '') !== ''
}
