/**
 * 클라이언트에서도 읽는 사이트 상수.
 *
 * `lib/site-facts.ts` 는 `server-only` + `getDb()` 라 클라이언트 컴포넌트가
 * import 할 수 없다. 그런데 갱신 주기 문구는 화면 곳곳(대부분 클라이언트
 * 컴포넌트)에서 필요하다 — 그렇다고 각자 문자열을 적으면 **정확히 과거에 났던
 * 사고**가 재발한다(같은 값이 화면 7곳에서 어긋나 있었다).
 *
 * 그래서 값은 여기 한 곳에 두고 `site-facts` 가 re-export 한다. 기존 import
 * 경로는 그대로 동작하며 SoT 는 여전히 하나다.
 */

/**
 * 데이터 수집 주기 — metadata·본문·JSON-LD 가 같은 문구를 쓰도록 여기서만 정의한다("실시간" 금지).
 *
 * 값의 근거는 `.github/workflows/update-data.yml` 의 cron 4개다. 문자열을 손으로 바꾸지 말고
 * 워크플로를 먼저 확인할 것 — 이전 값("1일 2회")은 어느 시점의 옛 푸터 문구가 검증 없이
 * 굳어진 것이었고, 실제 cron 과 어긋난 채로 전 페이지에 노출되고 있었다.
 *
 * 화면 반영도 같은 주기다 — 배포된 DB 는 빌드 시점에 db-snapshot 에서 받아온 파일인데,
 * 워크플로 마지막 `Trigger site rebuild` 스텝이 수집 직후 Vercel Deploy Hook 을 쳐서
 * 재배포한다. (그 훅을 붙이기 전에는 수집 4회/일 vs 반영 약 1회/일로 벌어져 있었다.)
 * 그래도 사용자에게 최종 근거는 각 화면에 찍히는 "데이터 기준일"이다.
 */
export const UPDATE_CADENCE = '평일 1일 4회(KST 07:00 · 12:00 · 16:30 · 22:00)'
export const DATA_SOURCE = 'Yahoo Finance'
