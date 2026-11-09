# 주간 매치 — 운영 연결 검증 기록

기준일: 2026-11-09 UTC. [운영·중지 절차](weekly-match-live-operations.md).

## 구현과 로컬 검증

- 기존 Supabase 운영 프로젝트 연결을 복구하고 검토된 `0018_weekly_match.sql`을 적용했다. 적용 이력 `20261109013718`.
- 일일 Actions 작업과 단일 라운드 설정을 추가했다. 원본 artifact 저장 후 게시, 같은 원본 재전송, 마감·미래 가격 수집 차단, 최종 정산의 자동 덮어쓰기 차단을 구현했다.
- 자동 플래그 검증·RPC 전달 테스트는 변경 전 실패를 확인한 후 통과했다. 새 DB 시그니처가 없으면 격리 DB 검사가 실패하고 새 마이그레이션 적용 뒤 통과하는 것도 확인했다.
- 전체 Vitest: 47개 파일, **523개 통과 / 기존 연동 검사 11개 건너뜀**. Python: **17개 통과**. 격리 PostgreSQL: **36개 검사 통과**, 구·신 마이그레이션 반복 적용과 예전 8인자 호출 호환 포함.
- `pnpm exec next build`, `pnpm exec tsc --noEmit` 통과. 로컬 빌드는 기존 SQLite를 보존하기 위해 DB 다운로드 단계를 생략했다. 원격 배포의 전체 빌드는 별도 확인한다.

- 독립 QA가 직접 소켓 `TimeoutError`/`OSError`의 결측 처리 누락을 재현했다. 실패 증거를 남긴 뒤 수집 오류를 결측 증거로 보존하도록 수정했고, 12개 구성 종목·고정 기준 원본·자동 정산 플래그를 보존하는 회귀 검사가 통과했다.

- 독립 코드·보안 리뷰와 수정 후 QA가 모두 승인됐다. 원천 `TimeoutError`·`OSError` 각각에 대해 실제 Python 출력 12종목을 TypeScript 운영 입력 검증·정산 함수에 연결해, 만료 전 `pending` / 만료 후 `void`를 확인했다. 입력 지문이 동일한 SQL·유닛 근거는 재사용했다.
- 변경 TypeScript 파일 lint는 오류 0건이다. 기존 전체 제품 lint의 50개 오류·7개 경고는 이전 검증에서 변경 전과 동일함을 확인했으며, 이번 범위에서 전체 lint가 통과했다고 주장하지 않는다.

## 운영 DB와 익명 경계

- 자동 정산 보호 migration도 운영 DB에 적용했다(이력 `20261109015512`). 실제 DB의 롤백 검사에서 이미 확정된 승리 결과 보존, 7일 전 자동 무효 거부, 미확정 결과의 정상 확정을 확인했다. 9인자 함수는 false 기본값 1개와 빈 search_path를 가지며 service_role만 실행할 수 있다. 기존 8인자 호출도 호환된다.
- 실제 운영 PostgreSQL에서 합성 사용자 2명과 라운드 2개로 본인 선택 생성·변경, 타인 기록 비노출, 직접 쓰기 거부, 마감 거부를 확인하고 전체 트랜잭션을 롤백했다. 기존 사용자는 사용하지 않았다.
- 공개 anon 키로 실제 Supabase PostgREST 세 테이블 조회와 선택 RPC 호출이 HTTP 401/42501로 거부됨을 확인했다. 익명 가입은 비활성 상태를 유지했다.
- 실제 서비스 공개 API `GET /api/weekly-match`가 HTTP 200 빈 목록을 반환한다. 스키마 적용 전의 503과 구분한다.
- 보안 advisor 기준선: 기존 search_path 1건, anon security-definer 4개 함수, authenticated security-definer 7개 함수, 비밀번호 보호 설정 알림. 이번 선택 RPC 추가 후 authenticated 목록은 8개다. 운영 전용 두 테이블은 의도적으로 클라이언트 정책이 없는 RLS다.
- 기존 advisor 후속 점검 참고: [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [anon 실행 권한](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated 실행 권한](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [비밀번호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). 이번 작업에서 기존 인증 동작을 변경하지 않았다.

## 아직 검증할 수 없는 범위

- 11월 13일 기준 종가는 미래 데이터다. 최초 수집·게시와 11월 20일 최초 정산의 실제 성공을 미리 주장하지 않는다.
- 브라우저 연결이 없어 실제 OAuth 로그인 → 선택 저장 검사는 미실행이다. 합성 claims를 사용하는 DB 검사와 브라우저 fixture 검사는 OAuth 검증을 대신하지 않는다.
- GitHub 실패 상태·요약은 제공하지만 실제 사용자 알림 수신, 검색 색인·검색 노출 증가·참여 전환 성과는 미확인이다.
