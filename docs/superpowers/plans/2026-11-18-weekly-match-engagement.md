# Weekly Match Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 매치 카드/플로팅,49가상 체험, 본인 첫참여·월별점수·결과 카드 제공 후 검증·main 배포.

**Architecture:** 기존 공개 대진과 본인 선택/정산 원장을 읽는다. 월별 보상은 새 인증 GET에서 계산하고, 이미지/체험은 클라이언트 안에서만 처리한다. 신규 스키마나 공개 사용자 기록 없이 기존 UI를 확장한다.

**Tech Stack:** Next.js16/React19/TypeScript/pnpm/Supabase/React Query/기존CSS·Canvas.

**Spec:** `docs/superpowers/specs/2026-11-18-weekly-match-engagement-design.md`

## Global Constraints

- pnpm, 기존 디자인·인증·원장 재사용. 새 의존성/스키마/비밀값 추가 없음.
- pilot disabled와 기존 가격 검증·noindex·자동 실행 유지.
- 가상49명은 실제 참여·점수에 미합산. 원격 가짜 사용자/참여 생성 금지.
- 시즌=KST현재 월, endDate로 소속. 유효 적중1점, 나머지0. 최신 정정 반영.

## Review Focus

- 인증 실패/개인 API 장애 때 보상0·배지없음으로 성공처럼 오인하지 않는가.
- 페이지 제한,월 경계,최신 pending/정정/tie/void로 점수 중복·누락이 없는가.
- 모바일/작은 데스크톱에서 플로팅이 콘텐츠·모달·초점을 가리지 않는가.
- 실제 대진 조회 실패·접수보류에도 가상 체험은 구분되며 실제 결과를 꾸미지 않는가.
- 카드 내려받기 실패/정정/공유 취소가 성공으로 표시되거나 개인정보를 노출하지 않는가.

## Task 1 — 보상 서버

**Files:** 새 `lib/weekly-match/rewards.ts`, `app/api/me/weekly-match/rewards/route.ts`, 관련 unit tests. 공용 타입은 root 소유.
**Interfaces:** `GET`→`{success:true,data:{rewards:WeeklyMatchRewards}}`; own-user identity only. `WeeklyMatchRewards`/`WeeklyMatchResultCard`는 types.ts 참조.

- [ ] 월별산식/정정/페이지/인증·소유자·실패 테스트를 먼저 작성하고 실패 확인.
- [ ] 기존 원장의 최신 버전에서 서버 요약과 본인 확정 카드 DTO를 계산. count로 첫참여, 월별 선택은 정렬·페이지 읽기.
- [ ] 관련 tests 실행, 결과 인계. 공유 파일을 수정하지 않는다.

## Task 2 — 메인 발견

**Files:** 새 `components/weekly-match/weekly-match-home.tsx`, 관련 module/test, `components/industry-dashboard.tsx` 한 진입점.
**Interfaces:** 기존 `/api/weekly-match`와 queryKey `['weekly-match']`; 체험 `/weekly-match#practice`, 실제 `/weekly-match`.

- [ ] 시각/정산상태/장애/닫기·접기·모바일·IntersectionObserver 테스트.
- [ ] 기존 초기화 흐름과 상호작용하는 상단 카드/데스크톱 플로팅, 기존 analytics 적용.
- [ ] 단위 검사 후 인계. 모바일/실제 렌더는 root와 QA가 확인.

## Task 3 — 체험·보상·공유 연결

**Files:** 새 practice/rewards/result-card 컴포넌트, board/page와 E2E·관련 단위 검사, 운영 문서. root 소유.
**Interfaces:** GET rewards typedDTO, 저장 후 rewards query 무효화, 가상 체험은 API 쓰기 없음.

- [ ] 49명 고정·비합산, 정상/장애/로그아웃·저장후 갱신, 확정본인 카드만 가능·PNG 실패 검사를 작성.
- [ ] 화면과 Canvas 내보내기 연결. 새로고침/로그아웃/정정 시 잘못된 이전 사용자 결과를 보이지 않게 한다.
- [ ] 기존/신규 tests·타입·lint·production build·Chrome 실제 화면 검사와 독립 리뷰/QA.
- [ ] task 파일만 커밋·main 푸시·Vercel 성공·운영 URL 확인. 미검증 OAuth/미래가격은 구분해 보고.
