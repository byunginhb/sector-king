# 주간 매치 운영

구현 범위는 국내 단일 대진, 본인 선택·결과다. 공개 순위·현금성 보상·주간 대진 자동 생성은 포함하지 않는다. 실제 운영 DB 적용과 첫 접수 상태는 출시 기록에서 별도로 확인한다.

## 데이터와 첫 대진

은행 `korea_banks` 7개, 조선 `korea_shipbuilding` 5개를 첫 후보로 조사했다. 2026-11-06 일봉을 Yahoo에서 **12/12 직접 수집**했고 종목·KRW 통화·한국 거래일·양수 종가·거래량을 검사했다. 기존 SQLite는 구성 후보를 읽는 데만 사용했다. 수집 원문·SHA256·시각은 `.harness/weekly-base-20261106.sources.json`, 전송하지 않은 후보 입력은 `.harness/weekly-base-20261106.json`에 있다. 이 로컬 파일은 운영 접수 원장이 아니다.

[KRX 정규장·휴장 규정](https://global.krx.co.kr/contents/GLB/06/0602/0602020204/GLB0602020204T1.jsp)과 [우주항공청 2026 월력요항](https://www.kasa.go.kr/prog/bbsArticle/BBSMSTR_000000000010/view.do?bbsId=BBSMSTR_000000000010&nttId=B000000001860Pe2zT3)을 확인했다. 11/9~13은 정상 주간 후보지만 **게시 직전 해당 주의 임시휴장·특별시간 공지도 확인**한다. 원문 수집 성공을 달력 최종 확인이나 접수 개방으로 표현하지 않는다.

`exchange-calendars 4.13.2`의 XKRX 수능 목록은 2020년까지여서 2026-11-19 특별시간을 놓쳤다. Yahoo 거래시간 metadata도 15:00 종료를 반환하는 표본이 있었다. 어느 쪽도 운영 시각의 단독 기준으로 쓰지 않는다. [달력 구현 원문](https://github.com/gerrymanoim/exchange_calendars/blob/master/exchange_calendars/lunisolar_holidays.py), [2026 수능일 교육부 공지](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=100526&lev=0&m=020402).

## 게시와 정산

운영 책임자는 Sector King 운영자다. 저장소의 `supabase/migrations/0018_weekly_match.sql`을 격리 DB 검사·리뷰 후 **기존 프로젝트**에 적용한다. 새 DB·인증 서비스를 만들지 않는다. 운영 연결이 없으면 API의 503은 장애 상태로 표시되며 가짜 대진을 표시하지 않는다. 섹터 목록 진입 링크는 기본 숨김이다. 실제 접수 저장까지 검증한 뒤 Vercel 서버 환경변수 `WEEKLY_MATCH_ENABLED=true`와 재배포로 활성화한다. 현재 페이지는 noindex이며 sitemap에 넣지 않았다. 첫 공개 라운드와 운영 검증 후 색인 정책을 전환한다.

1. 검토한 단일 라운드 manifest를 만든다. 필드는 [구현 계약](../../../superpowers/plans/2026-11-07-weekly-match.md)의 publish 입력을 따른다. `round` 아래 고정 두 섹터와 `tickers:[{ticker,name}]`, 기준/종료 거래일, 접수/마감/종료 UTC, 달력 출처·확인 시각이 필요하다. 다음 주 날짜를 임의로 늘려 생성하지 않는다.
2. 마감은 첫 거래일 **09:00 KST 이전**, `endsAt`은 마지막 거래일 **18:00 KST**로 둔다. 수집은 가격 날짜 18:00 이후 실행한다. 개장 지연일에도 접수 마감을 늦추지 않는다. 임시휴장·시간 변경이 있으면 게시를 보류한다.
3. 다음 명령으로 원문과 전송 입력을 먼저 만든다. 네트워크 실패·한 종목 결측이면 게시를 중단한다. 기존 파일은 덮어쓰지 않는다.

```sh
python3 scripts/weekly_match.py publish /path/to/reviewed-round.json \
  --output .harness/round-base.json
```

4. 운영 환경에 프로젝트의 `CRON_SECRET`을 안전하게 설정한 뒤, 새 수집을 전송하려면 같은 명령에 `--send`를 붙이고 **새 출력 경로**를 쓴다. 기본 대상은 `https://sector-king.com`이다. CLI는 서버가 수락한 경우에만 receipt를 저장한다. 네트워크 응답이 불확실하면 새 기준을 게시하지 말고 아래처럼 저장한 입력을 **재수집 없이** 재전송한다. 게시된 라운드는 변경할 수 없다.

```sh
python3 - <<'PY'
import json
from pathlib import Path
from scripts.weekly_match import send, write_exclusive
payload = json.loads(Path('.harness/round-base.json').read_text())
receipt = send(payload)
write_exclusive(Path('.harness/round-base-retry.receipt.json'), receipt)
print('저장된 입력을 그대로 전송했고 수락 영수증을 보관했습니다')
PY
```
5. 종료 후 **실제로 게시한 입력 파일**을 기준으로 정산한다. 당시 구성·기준가를 다시 SQLite에서 만들지 않는다.

```sh
python3 scripts/weekly_match.py settle .harness/actually-published-base.json \
  --output .harness/round-end-v1.json --send
```

종료 수집은 기준·종료 일봉을 같은 응답에서 비교한다. 기준가 변경·기간 내 분할·결측이면 보류한다. 배당은 가격변동률에 더하지 않는다. 최초 정산 후 입력 변경에는 `--correction-reason '구체적인 원천 수정 사유'`와 새 출력 경로가 필요하다. 원장에는 이전 버전도 남고 내 결과는 최신 버전을 따른다.

## 실패·재시도·중지

- 첫 버전은 **수동 운영**이다. 자동 예약·반복 게시를 활성화하지 않았다. 게시 담당자는 종료일 18:00 KST 실행 및 종료+7일 시점의 재확인 일정을 별도로 확보해야 한다. 일정이 확보되지 않으면 접수를 열지 않는다.
- 한 번 실패하면 원인 확인 후 최대 한 번 재시도한다. 단순 HTTP 재시도로 기준가·시각·구성을 바꾸지 않는다. 복구 불가 시 운영자가 보류 상태를 확인하고 원인을 기록한다. 스크립트 비정상 종료는 실패이며 성공으로 간주하지 않는다.
- 종료 후 7일 이상 미확인 가격이 남아 있으면 **다시 정산 요청했을 때** 서버가 무효로 기록한다. 정산 요청 없이 시간이 지났다는 사실만으로 DB가 자동 갱신되지는 않는다. 결측 근거를 담은 요청 또는 인증된 운영 API의 `prices:[]` 입력으로 무효 전환을 실행·확인한다. 이미 정상 확정된 결과를 단순 수집 실패로 무효화하지 않는다.
- 운영 API는 `POST /api/cron/weekly-match-sync`, Bearer `CRON_SECRET` 인증이다. `voidReason`은 5~500자 실제 사유이며 기존 결과 변경에는 `correctionReason`도 필요하다. 키·사용자 ID·점수는 공개 화면에 노출하지 않는다.
- 멈추려면 새 라운드 게시와 수동 실행을 중단한다. 열린 라운드에 문제가 생기면 정상 마감 후 명시적 사유로 무효 정산한다. 이미 받은 선택을 삭제하거나 마감을 뒤로 늘리지 않는다.

## 확인 명령

```sh
python3 -m unittest discover -s scripts -p test_weekly_match.py -v
pnpm test:run __tests__/unit/weekly-match.test.ts __tests__/unit/weekly-match-api.test.ts __tests__/unit/weekly-match-ui.test.tsx
# 아래 URL은 임시 Docker 테스트 DB에만 지정한다.
WEEKLY_MATCH_TEST_DATABASE_URL=postgresql://postgres:weekly_isolated_test@127.0.0.1:54339/weekly_test \
  node scripts/test-weekly-match-db.mjs
```

실제 테스트 DB의 암호·DB 이름은 검증 실행 시 생성한 값과 맞춰야 한다. 테스트 스크립트는 운영 URL을 거부해야 한다. OAuth 실제 로그인, 첫 운영 선택 저장, 미래 종료일 실제 정산은 각각 실행 증거가 있어야 완료다.
