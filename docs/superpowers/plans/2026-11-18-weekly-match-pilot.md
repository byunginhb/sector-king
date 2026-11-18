# Weekly Match Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [x]`) syntax for tracking. 프로젝트 sk-orchestrator의 독립 조사·최종 검증 절차를 함께 적용한다.

**Goal:** 기존 정산을 보존하면서 가장 빠른 정상 거래 구간의 단기 베타 접수와 자동 정산을 준비·공개한다.

**Architecture:** 기존 단일 라운드 runner는 그대로 재사용한다. 하나의 workflow에서 고정된 두 manifest를 독립 job으로 처리하고 감사 자료를 분리한다. 기존 UI에 베타 안내와 전역 진입만 추가한다.

**Tech Stack:** Next.js 16, React 19, pnpm, Supabase, Python stdlib, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-18-weekly-match-pilot-design.md`

## Global Constraints

- 기존 `config/weekly-match.json`과 운영 원본·마감·정산일을 변경하지 않는다.
- pnpm만 사용하고 의존성·인증·스키마를 추가하지 않는다.
- 공식 일정/기업행사 검토와 실제 기준 종가 확보 전 베타 게시 완료를 주장하지 않는다.
- 새 가격 응답 필드는 추가하지 않는다. 개인 기록은 본인만 접근한다.
- 사용자의 main 저장·배포·조기 베타 승인을 재사용한다.

## Review Focus

- matrix 한쪽 실패가 다른 쪽 정산을 취소하지 않는가?
- 같은 Actions 실행에서 operation/settlement artifact가 충돌하지 않는가?
- 기준일 전·게시 마감 후에 가짜 개시나 자동 날짜 이동이 없는가?
- 모바일·중간 너비에서 추가 메뉴가 오버플로를 만들지 않는가?
- 단기 베타를 주간 성과나 이미 완료된 정산으로 오해하게 하지 않는가?

## Task 1: 공식 일정과 실제 가격 재현

**Files:** 읽기 전용 원천·기존 collector; 보고서는 `.harness/weekly-pilot-20261118/`.
**Interfaces:** 입력 기존 manifest/collector, 출력 게시 가능 조건·공식 근거·격리 재현 결과.

- [x] 11/18~19 거래시간과 12종목 행사·정지 공시를 공식 자료로 확인한다. 각 경로 최대 2회 실패 후 근거와 미확인 범위를 남긴다.
- [x] 보존된 11/13 원본과 과거 실제 종료 일봉을 사용해 격리 산식·보류·무효를 재현한다. 운영 쓰기는 없다.

## Task 2: 두 라운드 운영·베타 화면

**Files:** `.github/workflows/weekly-match.yml`, `config/weekly-match-pilot.json`, `scripts/test_run_weekly_match.py`, `components/layout/global-top-bar.tsx`, `app/sectors/page.tsx`, `app/weekly-match/page.tsx` 및 해당 기존 테스트.
**Interfaces:** 기존 `--manifest`/`--audit-dir`, `/weekly-match`, 기존 본인 선택 API를 재사용한다.

- [x] 각 manifest·원본·API round ID를 구분하는 회귀 검사를 작성·실행한다.
- [x] matrix 두 항목, fail-fast false, 라운드별 audit/artifact 이름과 기존 artifact 호환을 적용한다.
- [x] 날짜 검토 결과로 새 manifest를 작성한다. 기존 runner의 모든 안전 제한을 유지한다.
- [x] 전역·섹터 진입과 단기 베타/준비 상태·실제 비교 기간 설명을 추가한다. 메뉴의 모바일/중간 너비를 확인한다.

## Task 3: 검증·저장·실제 자동 작업 확인

- [ ] 관련 단위·Python·격리 DB, 타입·lint·production build를 실행하고 독립 리뷰·QA로 결함을 확인한다.
- [ ] main 커밋·푸시와 Vercel 완료를 확인한다. 실제 공개 URL에서 진입·noindex·API를 확인한다.
- [ ] workflow를 수동 실행해 두 대진의 실제 실행·기준 원본 복구·베타 대기/게시 상태를 확인한다.
- [ ] 미래 게시와 정산은 예약·실행·영수증·공개 상태를 구분해 보고하고, 남은 실제 사용자 참여 검증을 인계한다.

## 11/18 검증 체크포인트

공식 일정·공시 조사와 과거 재현은 수행했다. 원천 간 가격의 세션 정의가 미확인이라 베타는 비활성으로 배포한다. 후보 일정을 자동 이동하거나 기존 원장을 변경하지 않는다. 이 계획의 준비·배포 완료와 접수 개시 완료를 구분한다.
