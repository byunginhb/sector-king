---
name: sk-orchestrator
description: sector-king 프로젝트 전용 오케스트레이터. 산업/섹터/티커 데이터 모델 변경, region(전체/국내/해외) 필터 도입, 누락 티커 보완, 페이지 전반 UX 변경 같이 멀티 영역에 걸친 작업을 기획→구현→검증의 단계로 조율한다. "전체/국내/해외", "region 토글", "티커 보완", "섹터 누락", "industry 필터 확장", "다시 실행", "재실행", "기획부터", "보완", "수정"이 등장하면 반드시 이 스킬을 사용한다.
---

# sk-orchestrator

sector-king 프로젝트의 도메인 작업을 단계적으로 조율한다. 데이터 모델·티커 큐레이션·필터 체인·UX가 동시에 영향받는 작업을 안전하게 처리하기 위한 워크플로우다.

## 사용 시점

- "전체/국내/해외로 나눠서 보고 싶어"
- "섹터에 티커가 빠졌어"
- "industry 필터에 region 추가해줘"
- "money-flow / price-changes / statistics를 한번에 바꿔줘"
- 위 영역의 재실행/수정/보완 요청

## Phase 0: 컨텍스트 확인

작업 시작 전 다음을 확인한다:

1. `_workspace/01_plan/` 존재 여부
   - 없음 → **초기 실행** (Phase 1부터)
   - 있음 + 사용자가 부분 수정 → **부분 재실행** (해당 에이전트만 재호출)
   - 있음 + 사용자가 새 요구사항 → 기존 `_workspace/`를 `_workspace_prev_{timestamp}/`로 이동 후 **새 실행**
2. `_workspace/01_plan/APPROVED` 마커
   - 있음 → 구현 단계 진입 가능
   - 없음 → 사용자 승인이 필요

## Phase 1: 기획 (병렬 서브 에이전트)

**실행 모드: 서브 에이전트 (병렬)**

다음 4명을 `Agent` 도구로 동시에 호출한다 (`run_in_background: true`):

1. `sk-data-modeler` → `_workspace/01_plan/data-model.md`
2. `sk-ticker-curator` → `_workspace/01_plan/ticker-gaps.md`
3. `sk-filter-architect` → `_workspace/01_plan/filter-chain.md`
4. `sk-ui-planner` → `_workspace/01_plan/ui-plan.md`

모든 호출에 `model: "opus"` 명시.

각 에이전트에게 전달할 공통 컨텍스트:
- 사용자 요구사항 원문
- 프로젝트 핵심 파일 경로 (`lib/industry.ts`, `drizzle/schema.ts`, `app/[industryId]/`, `components/`)
- 4명이 서로 어떤 결정을 의존하는지 (data-modeler가 region 컬럼 결정 → 나머지 영향)

## Phase 2: 통합 기획서 작성

4개 산출물을 메인이 직접 종합하여 `_workspace/01_plan/integrated-plan.md`를 생성한다.

포함 항목:
1. **요약**: 무엇을 왜 바꾸는가
2. **단계 정의**: 각 단계의 입력/출력/예상 변경 파일 (단계 1: 데이터 모델 → 단계 2: 시드 보완 → 단계 3: 필터/API → 단계 4: UI 적용)
3. **위험과 완화**: DB 마이그레이션 위험, 하위호환 위험, UX 회귀 위험
4. **수락 기준**: region=all/kr/global 각각 동작, 기존 URL 동작, 빌드/타입 통과
5. **충돌 해결 로그**: 4개 에이전트 간 결정 차이가 있었다면 어떻게 합의했는지

작성 후 사용자에게 통합 기획서를 보여주고 **명시적 승인**을 요청한다.

## Phase 3: 승인 게이트

사용자 승인 시 `_workspace/01_plan/APPROVED` 빈 파일을 생성한다.
승인 없이는 Phase 4로 진행하지 않는다.

수정 요청이 들어오면 해당 영역 에이전트만 재호출 (부분 재실행).

## Phase 4: 구현

**실행 모드: 단일 서브 에이전트**

`sk-implementer`를 호출하고 `_workspace/01_plan/integrated-plan.md`의 단계 순서를 따르도록 지시한다.
각 단계 종료 시 `sk-implementer`가 `_workspace/02_impl/progress.md`에 체크박스를 갱신한다.

## Phase 5: 검증

**실행 모드: 단일 서브 에이전트 (독립 레인)**

각 구현 단계 종료 후 또는 전체 완료 후 `sk-verifier`를 호출.
FAIL 시 `sk-implementer` 재호출 (수정 → 재검증 루프). 최대 3회 반복 후 사용자에게 에스컬레이션.

## 데이터 전달

- **파일 기반**: 모든 에이전트는 `_workspace/{phase}/...` 경로를 사용
- **반환값 기반**: 서브 에이전트의 짧은 요약은 메인이 즉시 종합

## 에러 핸들링

- 에이전트 1회 실패 → 1회 재시도
- 재시도 실패 → 누락 명시하고 다음 단계 진행 (단, 의존성이 끊기면 사용자에게 보고)
- 4개 기획 산출물 간 결정 충돌 → 통합 기획서에 충돌 항목과 권장 해결안을 명시 후 사용자에게 결정 위임

## 테스트 시나리오

**정상 흐름**: "전체/국내/해외 토글 추가하고 누락 티커 보완해줘"
→ Phase 1 병렬 4개 → Phase 2 통합 → 사용자 승인 → Phase 4 구현 → Phase 5 검증 PASS

**에러 흐름**: 통합 시 data-model의 region 컬럼 결정과 filter-chain의 가정이 다름
→ 충돌을 통합 기획서에 명시 → 사용자 결정 → 충돌난 에이전트 재호출 → 재통합

## 후속 작업

후속 요청 키워드: "다시 실행", "재실행", "수정해줘", "보완해줘", "이전 결과 기반으로", "{영역} 다시"
- Phase 0의 컨텍스트 확인으로 부분 재실행 / 새 실행 판별
- 부분 재실행 시 변경 영역 에이전트만 호출 + 통합 기획서 갱신 + APPROVED 마커 무효화 후 재승인
