# 검색 진입·참여 전환 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 기존 검색 진입 페이지의 답변·지표 설명을 정확히 하고 관심 목록으로 연결한 뒤 검증하여 main에 배포한다.

**Architecture:** 기존 Next.js 서버 본문과 디자인 토큰을 유지한다. 가이드 콘텐츠와 참여 안내·FAQ를 파일별로 분리해 작업하고, 시장 DB·사용자 스키마·금액 API는 바꾸지 않는다. 주간 매치는 합의된 4순위 범위인 설계·읽기 전용 데이터 검증까지 진행한다.

**Tech Stack:** Next.js 16.1.4, React 19.2.3, TypeScript, pnpm 10.10.0, 기존 Supabase·SQLite·GA 이벤트.

**Spec:** `docs/wiki/features/user-engagement/candidates.md` 12절. 사용자의 2026-11-07 구현·검증·main 커밋/푸시 요청으로 실행 승인됨.

## Global Constraints

- pnpm만 사용. 신규 의존성·유료 서비스·운영 DB 변경 없음.
- 기존 하네스·AGENTS·gitignore 변경은 보존하며 이번 커밋에서 제외한다.
- 실제 제공 중인 기능만 안내. 인증·접근 권한·통화 계약 유지.
- 기존 UI의 `sk-card`, `font-display`, `text-info`, Lucide·간격을 재사용. 새로운 랜딩·디자인 시스템을 만들지 않는다.
- 사용자에게 제공되는 본문과 structured data가 일치해야 한다.

## Review Focus

- 로그인 전 관심 목록 링크가 인증 후 원래 목적지로 이어지는가?
- 가이드가 실제 순매수와 시가총액 변화, 상대 강도와 자금 이동을 혼동하지 않는가?
- 개인정보·검색 파라미터가 분석 이벤트에 포함되지 않는가?
- 질문·답변이 초기 HTML뿐 아니라 최종 화면에도 남는가?
- DB 갱신 부작용 없이 빌드하고 실제 배포 커밋까지 확인하는가?

### Task 1: 기존 가이드 3편 보강

**Files:** `app/guide/{how-to-read-money-flow,market-cap-change-vs-net-buying,sector-rotation}/page.tsx`.

**Interfaces:** 기존 `GuideArticle` props 유지. UPDATED_AT은 2026-11-07. sitemap 날짜 수정은 메인이 담당.

- [ ] 기존 계산·화면을 읽고 질문형 요약·계산 예시·한계를 보강한다. 단순 문구 변경을 위한 구현 복제 테스트는 추가하지 않는다.
- [ ] 시가총액 변화는 순매수 대용이 아님을 명확히 하고, 두 섹터가 모두 오르더라도 상대 강도가 달라질 수 있음을 설명한다.
- [ ] 해당 파일 ESLint와 전체 통합 타입/빌드·브라우저 점검으로 검증한다.

### Task 2: 질문 답변·관심 목록 진입 보강

**Files:** `components/guide/guide-article.tsx`, `components/me/watchlist-prompt.tsx`, `components/seo/page-faq.tsx`, `lib/seo-faq.ts`, `components/json-ld.tsx`, `app/rankings/page.tsx`, `app/[industryId]/rankings/page.tsx`, `app/indices/page.tsx`, `__tests__/unit/search-engagement.test.tsx`.

**Interfaces:** `WatchlistPrompt()`는 기존 `/sectors`·`/me/watchlist` 링크와 `select_content` 이벤트만 제공. `PageFaq({ items })`는 동일 질문 데이터로 가시 본문과 FAQ JSON-LD를 렌더한다.

- [ ] CTA 링크·개인정보 없는 이벤트·FAQ 가시 본문 계약을 테스트하고 실제 실패를 확인한다.
- [ ] 가이드 마지막에 관심 목록 안내를 연결한다. 개별 별표·저장 이벤트는 기존 훅을 유지한다.
- [ ] FAQ 픽 설명에 단기·장기·DCF와 성향 가중치를 반영하고, 가시 질문과 JSON-LD가 같은 원천을 사용하게 한다.
- [ ] 타깃 테스트·ESLint로 검증한다. 클릭은 저장 완료가 아님을 분석 의미에 유지한다.

### Task 3: 통합·데이터 검증·배포

**Files:** `app/sitemap.ts`, `docs/wiki/features/user-engagement/{candidates,release-2026-11-07,weekly-match-design}.md`, 본 계획.

**Interfaces:** API·사용자 데이터 변경 없음. 매치 설계는 read-only SQLite 관찰 결과에 근거하며 운영 경기로 출시하지 않는다.

- [ ] 공개 대표 URL 6종을 점검하고 확인된 필수 결함만 수정한다.
- [ ] 가이드 수정일을 sitemap과 일치시키고 K01/K04/K05/K06의 실제 대표 페이지·첫 전환을 기록한다.
- [ ] 주간 매치의 최소 규칙·과거 데이터 가용성·미확정 사항을 문서화한다.
- [ ] 독립 코드 리뷰와 QA를 수행하고 중요 결함을 해결한다.
- [ ] 유닛 테스트·타입·변경 파일 lint·production build·모바일/데스크톱 렌더를 확인한다.
- [ ] 작업 파일만 main에 커밋·일반 push한다. 원격 SHA와 배포 READY·실제 공개 흐름을 확인한다.

## 실행 결과

착수: 2026-11-07. 세부 검사 근거는 release 문서에 기록한다. 기존 사용자 변경은 작업 시작 상태와 비교해 보존한다.
