# Weekly Match Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 참여 숫자와 공개동의 기반 월별 순위 제공, 검증·운영DB·main·배포 확인.
**Architecture:** 기존 원장 기반 제한 집계 RPC, 새 별명/공개동의표만 추가. 기존페이지순위section과 본인설정API를 연결.
**Tech Stack:** Next.js16/React19/TypeScript/pnpm/Supabase/Postgres.
**Spec:** `docs/superpowers/specs/2026-11-18-weekly-match-ranking-design.md`

## Global Constraints

- 실제49명 조작 금지, 가상연습 분리, 기존 grants/원장/가격 gate 유지.
- 순위 비공개 기본값, 별명 명시동의, auth UID/실명/email/개인선택 공개 금지.
- 월=endDate/KST, 적중1점, 같은점수공동순위, 유효1회 이상, 최대50행.

## Review Focus

- SECURITYDEFINER가 raw개인선택/UID를 노출하거나 anon실행가능하지 않은가.
- 최신pending/정정/void가 기존개인점수와 다른 순위를 만들지 않는가.
- 철회/별명변경/로그아웃 뒤 이전 정보가 잘못 공개되지 않는가.
- 초기0명·장애·집계로딩을 가짜49명/0점으로 위장하지 않는가.
- 기존 테스트fixture·API호출자가 새 count field로 깨지지 않는가.

## Tasks

- [ ] DB/집계: 공식CLI migration 생성, 공개profiles RLS와 제한RPC, 별도 isolatedPG검증.
- [ ] 서버: 실제count를공개대진DTO에추가, 순위GET와본인profileGET/PUT, 입력·권한·오류테스트.
- [ ] UI: 기존순위section/공개설정, 메인·플로팅·보상 링크, 실제N명 표시. 관련UI/E2E.
- [ ] 통합: unit·SQL·타입·lint·build·브라우저·독립리뷰QA, 실제DBmigration, main커밋푸시/운영URL 확인.
