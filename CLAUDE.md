# sector-king

Next.js 15 + TypeScript + Drizzle/SQLite + React Query + framer-motion + recharts 기반의 멀티 산업 주식 대시보드.

## 패키지 매니저

`pnpm`만 사용. `pnpm-lock.yaml` 외 lockfile 생성 금지.

## 하네스: sector-king domain harness

**목표:** 산업/섹터/티커 데이터 모델, 필터 체인(`lib/industry.ts`), API 라우트, UI 페이지가 동시에 영향받는 작업을 안전하게 조율한다.

**트리거:** 다음 영역에 걸치는 작업 요청 시 `sk-orchestrator` 스킬을 사용한다.
- 산업/섹터/티커 데이터 모델 변경, 시드/마이그레이션
- region(전체/국내/해외) 필터 도입·확장
- 섹터별 누락 티커 보완
- 산업 대시보드/money-flow/price-changes/statistics/hegemony-map의 동시 변경
- 위 영역의 재실행, 수정, 보완

단순 질문·단일 파일 편집은 직접 응답한다.

**에이전트 (`.claude/agents/`):** sk-data-modeler, sk-ticker-curator, sk-filter-architect, sk-ui-planner, sk-implementer, sk-verifier

**작업 디렉토리:** `_workspace/01_plan/`, `_workspace/02_impl/`, `_workspace/03_verify/` (gitignore 권장)

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-09 | 초기 하네스 구성 | 전체 | region 필터(전체/국내/해외) + 누락 티커 보완 작업 시작 |
| 2026-05-09 | S1~S5 완료 — region 토글 + 티커 보완 출시 | DB 스키마, lib/region, API 8개, hook 8개, UI 5개 페이지 | 통합 기획서 수락 기준 14개 코드 검증 통과 |
