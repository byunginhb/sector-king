# 주간 섹터 매치 구현 계약

사용자 승인: 우선순위 다음 단계 구현, 검증, main 커밋·푸시·운영 배포. 국내 단일 대진 MVP이며 공개 순위·닉네임·보상·공유 이미지는 후속이다.

## 범위와 영향

Supabase 신규 테이블·RPC, 공개 조회/본인 선택/운영 적재 API, `/weekly-match` 화면, 기존 메뉴 진입 링크, 종가 수집 및 운영 절차, SQL·단위·브라우저 검사를 추가한다. 기존 시장 DB·관심목록·인증 계약은 유지한다. 공개 응답은 종목명·구성·수익률만 포함하며 원화 가격은 반환하지 않는다. 개인 선택은 본인만 조회한다. 운영 DB 접근 없이는 실제 접수와 출시를 완료로 보고하지 않는다.

## 확정 규칙

- 한국 은행 `korea_banks` 대 조선 `korea_shipbuilding`, 라운드별 KR 종목 구성 고정. 동일 비중 **가격 변동률**이며 배당 포함 총수익률·순매수와 구분한다.
- 직전 주 마지막 거래일 종가 → 해당 주 마지막 거래일 종가. 모든 구성의 양수 종가·양수 거래량·출처·수집 시각을 보관한다. 기존 daily_snapshots로 정산하지 않는다.
- 거래소 세션은 검증된 달력을 사용한다. 첫 버전은 운영자가 검토한 단일 라운드를 게시한다. 다음 주 자동 생성은 검증 전 활성화하지 않는다.
- 접수는 기준 종가 검증 후, 다음 첫 거래일 09:00 KST 이전에 마감한다. 개장 지연일에도 이보다 늦게 받지 않는 보수적 마감이다. 실제 거래 일정·달력 근거를 라운드에 저장한다.
- 계정당 한 선택, 마감 전 수정 가능. DB `clock_timestamp()`와 잠금으로 최종 판정한다. 브라우저 시계·사용자 제공 ID·점수는 신뢰하지 않는다.
- 각 종목 `(끝종가/기준종가-1)*100`을 평균, 퍼센트포인트 소수 여섯 자리 반올림. 같은 값은 동률. 적중·실패만 유효 참여이며 동률·무효는 제외한다.
- 결측·거래정지·분할·병합이 발생하면 보류하고 종료 후 7일 이내 해결되지 않으면 무효 처리한다. 종목을 빼서 재가중하지 않는다. 종료 후 확정 전에는 승패를 표시하지 않는다.
- 라운드 구성·기준 가격은 게시 후 불변. 정산은 버전별 불변 기록이다. 같은 입력 재전송은 멱등, 입력 변경은 명시적 정정 사유와 새 버전이 필요하다. 정정 후 내 결과도 최신 버전을 따른다.
- SQL은 RLS, 최소 GRANT, SECURITY DEFINER의 빈 search_path와 실행 권한 제한을 갖춘다. 브라우저는 라운드/정산 원장 쓰기 불가. 사용자 선택은 auth.uid()를 쓰는 RPC만 허용한다.

## API 및 UI 계약

- `GET /api/weekly-match`: `{success:true,data:{rounds:WeeklyMatchRound[]}}`, 최근 12개, 공개 구성/시간/최신 결과만, 사용자 정보 없음. 장애는 503과 일반 오류문.
- `GET /api/me/weekly-match`: 인증 필수, `{success:true,data:{entries:WeeklyMatchEntry[]}}`, 본인만. `POST`는 strict `{roundId,side:'left'|'right'}`, 저장된 entry 반환. 잘못된 입력400, 마감409, 미인증401. private/no-store.
- `POST /api/cron/weekly-match-sync`: CRON_SECRET 인증, strict publish/settle 입력 검증, 운영 원장만 쓰기. 데이터 수집 스크립트가 사용하며 사용자 화면에서 호출하지 않는다.
- 공용 `lib/weekly-match/types.ts`는 구현자가 생성하고 완료 후 UI에 전달한다. 라운드 DTO 필드: id,title,baseDate,endDate,opensAt,closesAt,endsAt,left/right `{id,name,tickers:{ticker,name}[]}`, settlement nullable `{version,outcome:'left'|'right'|'tie'|'void',leftReturn:number|null,rightReturn:number|null,reason:string|null,settledAt}`. entry: roundId,side,updatedAt.
- 페이지는 서버 렌더링 설명·H1·규칙, 클라이언트 접수/결과. 빈 상태·DB 오류·로그인·선택 저장/실패·마감·집계 대기·동률·무효·정정 버전 표시. 진입은 기존 섹터 화면의 작은 링크로 연결한다. 접수 없는 동안 sitemap에는 추가하지 않는다.

## 검증 및 운영 완료 기준

1. 신뢰 가능한 달력·종가 확인과 실제 원천 응답을 기록한다. 확보 실패면 게시하지 않는다.
2. 격리 Docker Postgres에서 migration 재실행, 타인 읽기/쓰기 거부, 직접 원장 쓰기 거부, 마감/동시 upsert/재정산 멱등을 검증한다. 운영 사용자 데이터로 시험하지 않는다.
3. 단위 테스트로 입력·계산·결측·동률·보류/무효·정정·API 인증·비공개 캐시를 검증한다.
4. 타입·변경 파일 lint·전체 unit·Next production build, 독립 코드/보안 리뷰 및 데스크톱/모바일 Chrome QA. Hallmark 정적/렌더 검사를 구분한다.
5. 운영 migration 적용 확인 후 실제 배포 URL 확인. 계정 연결이나 실제 원천 종가가 없으면 준비된 코드와 미활성 운영을 구분한다. OAuth 사용자 테스트는 실제 수행 여부를 보고한다.

## 역할

메인: 계약, 데이터 수집/운영 절차, 통합·Git·배포. 데이터 조사: 읽기 전용 보고. backend 구현: 신규 weekly-match lib/API/migration/테스트. UI 구현: 신규 페이지·컴포넌트·브라우저 테스트·기존 진입 링크. 독립 리뷰·QA: 제품 수정 없이 검사한다.

참고: [Supabase 함수 보안](https://supabase.com/docs/guides/database/functions), [Data API 권한](https://supabase.com/docs/guides/api/securing-your-api), [기존 설계](../../wiki/features/user-engagement/weekly-match-design.md).
