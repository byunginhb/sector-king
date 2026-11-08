# Sector King 위키

LLM·사람이 함께 읽는 프로젝트 지식 베이스. 코드에서 바로 읽히지 않는 **정의·결정·기획 의도**를 남긴다.

## 읽는 법 (LLM 용)

- 작업 전에 이 인덱스에서 관련 문서를 찾아 먼저 읽는다.
- 문서 상단의 `상태`가 `기획`이면 아직 코드에 없다 — 코드에 있다고 가정하지 말 것. `운영 중`이면 구현 지도부터 읽는다.
- 결정은 각 문서의 **결정 로그** 표가 SoT 다. 바꾸려면 표에 행을 추가한다(덮어쓰지 않음).
- 새 문서를 만들면 이 인덱스에 한 줄을 추가한다.

## 개념 (Concepts)

| 문서 | 요약 |
|------|------|
| [자금 흐름의 세 가지 뜻](concepts/money-flow-definitions.md) | "돈이 흘렀다"는 말이 가리킬 수 있는 세 가지(유동성·가치 변화·실제 유출입)와 우리가 각각을 어떻게 측정하는지 |

## 기능 (Features)

| 문서 | 상태 | 요약 |
|------|------|------|
| [사용자 참여·검색 노출 — 기능 후보](features/user-engagement/candidates.md) | 기획·일부 적용 | 참여 12개·검색 노출 8개 후보, 키워드 12개 묶음과 실행 우선순위 |
| [검색 진입·참여 전환 — 1차 구현 기록](features/user-engagement/release-2026-11-07.md) | 구현·검증 | 가이드·관심 목록 진입·FAQ·제목 정합성 개선, 검사 근거와 기존 부채·배포 기준 |
| [주간 섹터 매치 — 최소 설계](features/user-engagement/weekly-match-design.md) | 기획·데이터 확인 | 국내 대진·접수·정산 계약과 로컬 가격 조회. 거래일·기업행동 검증 전 미출시 |
| [주간 섹터 매치 — 운영](features/user-engagement/weekly-match-operations.md) | 구현·활성화 대기 | 본인 선택·마감 잠금·정산 원장·일봉 수집·재전송 절차. 운영 DB 연결·실제 접수 검증 후 공개 |
| [주간 섹터 매치 — 구현 검증](features/user-engagement/weekly-match-release-2026-11-07.md) | 검증·운영 미활성 | 단위·DB·브라우저·코드/보안 검증과 실제 접수 전 남은 확인 |
| [사용자 참여·경쟁·자랑 — 검토 의견](features/user-engagement/review.md) | 검토 | 후보 문서 전제의 코드 대조 결과. 미국 보드 정산 불가, 한국 한정 E01 권장, 공통 기반 선행 작업 |
| [글로벌 자금 지도 — 기획](features/global-flow/plan.md) | 운영 중 | 주식 밖(달러·금·채권·비트코인·현금)까지 포함한 자산군 간 자금 흐름 페이지 `/global-flow`. 설계 원칙·로드맵·결정 로그 |
| [글로벌 자금 지도 — 구현 지도](features/global-flow/implementation.md) | 운영 중 | 파일 위치·데이터 흐름·바꿀 때 같이 바꿀 것·운영 주의점 |
| [글로벌 자금 지도 — 데이터 소스](features/global-flow/data-sources.md) | 운영 중 | 자산별 심볼·FRED·DefiLlama·네이버 API 파라미터·규모 상수와 실측 함정 |

## 지침 변경 이력

| 문서 | 상태 | 요약 |
|------|------|------|
| [CLAUDE 변경 이력 원문](history/claude-changelog-through-2026-10-13.md) | 이력 보관 | 2026-05~10월 변경 표 원문. 현재 실행 지침은 루트 CLAUDE·AGENTS, 기능별 현재 계약은 위키·코드와 대조한다. |
