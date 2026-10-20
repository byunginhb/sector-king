# 달력 날짜 표시 수정 제안

상태: 구현 제안. 파일 적용·검사·리뷰·QA·병합·배포는 이 응답에서 실행하지 않았다.
계획: sector-king-operation-readiness-r2
기준 revision: 62e079ee27f8551a37ca4d52290f8c2bc6f2dc1b

## 변경과 영향

기존 formatDate는 YYYY-MM-DD를 UTC 자정으로 파싱한 뒤 로컬 시간대로 표시하여 Toronto 등에서 전날을 표시할 수 있다. 엄격한 YYYY-MM-DD 형식과 파싱 결과의 UTC 연·월·일이 모두 일치하는 정상 날짜만 UTC로 표시하도록 제안한다. 타임스탬프, 비정규 형식, 자동 보정되는 2024-02-30 및 Invalid Date 입력은 기존 로컬 표시 경로를 유지한다.

금융 데이터·통화 함수·toUsd·DB·API·전략·의존성은 변경 대상이 아니다. formatRelativeTime의 미래 날짜 및 7일 이상 경과 시 formatDate 위임 결과에도 정상 달력 날짜 표시 수정이 적용된다. 상대 시간 계산 자체는 유지한다. 리뷰어는 이 간접 영향을 함께 검토해야 한다.

## 제안된 검증과 실행 경계

승인된 계획의 focused-tests, trusted-acceptance, typecheck, production-compile-only 명령을 실행기가 적용 산출물 revision에 묶어 실행하고 stdout·stderr·exit code를 보존해야 한다. 현재 실행 결과는 없다.

단위 회귀는 Toronto·UTC·Seoul에서 정상 날짜·윤일·연초·DST 전환일, UTC/offset/로컬 타임스탬프, 잘못된 날짜·비정규 형식·Invalid Date 및 formatRelativeTime 위임 경로를 확인한다. 각 테스트 종료 시 TZ와 fake timers를 복원한다. trusted-acceptance는 계획에 고정된 별도 9건을 확인한다.

이전 작업 68795410-e8b8-4516-8992-a4906731a8e8은 제공된 이력상 26개 단위 assertion이 통과했으나 Vitest 설치 탐색기의 회사 상위 package.json 접근 시도로 exit 1이 발생했다. 이를 성공으로 바꾸어 기록하지 않는다. 기존 workspace의 실패 기록과 제안 코드는 보존하고 같은 기준 SHA의 깨끗한 clone에서 재시도한다.

focused-tests는 workspace 내부 node_modules 아래 jsdom realpath와 JSDOM 실제 로드를 먼저 검증한 다음 VITEST_SKIP_INSTALL_CHECKS=1로 설치 확인만 생략한다. jsdom 환경·setup·assertion·exit 판정은 유지한다. 새 환경이나 설정 변경으로 우회하지 않는다.

production-compile-only 실행 전 실제 공개 원본 폰트 캐시 provenance.json의 SHA-256이 2d5692ae142689396fe505d6ba0413f18cdec3df7b4e3b64ed667da6f322a1f4인지 확인하고 각 자산을 기록된 해시와 재대조해야 한다. 캐시가 없거나 해시가 다르면 검사는 차단이며 대체 캐시·격리 완화로 우회하지 않는다. 네트워크가 차단된 실행 환경에서 Next --experimental-build-mode=compile --webpack만 실행한다. 명령 자체가 네트워크 차단을 제공하는 것은 아니므로 실행기가 격리를 확인해야 한다.

전체 로컬 build 실패 이력을 보존한다. compile-only는 전체 SSG·OG 정적 생성, production full build, 실제 DB·서비스 연결 또는 배포 검증이 아니다. 데이터·DB·nativeSQLite·서비스 코드·격리정책을 변경하여 이 한계를 우회하지 않는다. 데이터 fetch·수집·DB 쓰기는 금지한다. 실행 전후 data/hegemony.db 및 작업 트리 상태를 대조하고 의도치 않은 변경이 있으면 성공 처리하지 말고 증거와 함께 보고한다. 다른 작업자의 변경을 되돌리지 않는다.

## 후속 인계

실행기는 적용 전 preimage 해시와 기준 SHA·원격 main을 확인하고 승인된 세 파일만 적용해야 한다. 검증 결과와 고정 산출물 revision을 독립 리뷰 및 독립 QA에 전달한다. 새 변경 시 영향받는 검증은 다시 수행한다. 이후 저장소 정책에 따른 병합과 기존 Vercel CI의 전체 build 성공·실제 배포 결과 및 핵심 날짜 표시를 운영 담당자가 확인해야 최종 배포 완료로 보고할 수 있다. 현재 병합·배포 승인이나 완료를 주장하지 않는다.

## 실행기 후속 검증 기록

운영 담당자가 고정 검사 4개를 실행해 모두 통과했다. Vitest 25개, 고정 시간대 수락9건, 별도 TypeScript, 네트워크 차단 production compile-only다. 독립 리뷰 0c16ba29-e2eb-4f8e-86b8-fab1185e35a7와 QA a0f124cb-4cb7-48cd-872d-8796afb381d7가 diff d7456c6d1818a98f3c7695805dd3071752e6a6493b220996bc309cae22987650을 승인했다. formatDate 이외 모듈 내용과 DB blob은 기준 revision과 동일하다. 이 문단은 이후 문서 기록이며 검사한 구현/테스트는 바꾸지 않는다. 기존 Vercel의 전체 build·PR/병합·운영 확인은 별도 후속 단계다.
