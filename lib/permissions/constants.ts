/**
 * 게이팅 시스템 상수 — 서버·클라이언트가 공유하는 이름과 값.
 *
 * 문자열을 두 곳에 적으면 반드시 한 곳만 고쳐진다. 쿠키 이름·CSS 클래스·
 * 캐시 태그는 전부 여기 한 곳에서만 정의한다.
 */

import type { Tier } from './tier'

/**
 * 미리보기 쿠키.
 *
 * `httpOnly` 가 **아니어야** 클라이언트 게이트도 같은 값을 읽는다.
 * 보안 경계가 아니기 때문에 안전하다 — 미리보기는 순수 표시 레이어이고
 * 실제 권한(쓰기 API·결제·관리자 API)은 관리자 그대로다.
 */
export const PREVIEW_COOKIE = 'sk_preview_tier'

/** 30분. 미리보기를 켠 채 잊어버리는 사고를 시간이 해결한다. */
export const PREVIEW_MAX_AGE_SEC = 1800

/** 미리보기 진입용 쿼리 파라미터. 관리자가 아니면 조용히 무시된다. */
export const PREVIEW_QUERY_PARAM = 'preview_tier'

/** 미리보기 세그먼트에 노출할 등급 — `admin` 은 "종료"와 같은 뜻이라 뺀다. */
export const PREVIEW_TIERS: readonly Tier[] = ['anon', 'free', 'basic', 'pro']

/**
 * 게이트 루트 클래스 — CSS 훅이 아니라 **계약**이다.
 * 페이월 구조화 데이터(`isAccessibleForFree:false`)의 `cssSelector` 가
 * 이 값을 가리키므로, 이름을 바꾸면 SEO 마크업이 거짓이 된다.
 */
export const GATED_ROOT_CLASS = 'sk-gated'

/** 정책 캐시 태그. 어드민 저장 성공 직후 `revalidateTag` 대상. */
export const POLICY_CACHE_TAG = 'feature-permissions'

/** 캐시 백스톱. 태그 무효화가 실패해도 이 시간 안에 반영된다. */
export const POLICY_CACHE_REVALIDATE_SEC = 300

/** 업셀 CTA 기본 착지점 — 필요한 등급에 따라 달라진다. */
export const UPGRADE_HREF = '/pricing'
export const LOGIN_HREF = '/login'
