# 11_add_tickers — 삼성전기 · SpaceX 종목 추가

작성일: 2026-06-24

## 요약
사용자 요청으로 2개 종목을 기존 파이프라인(`scripts/add_ticker.py`)으로 추가한다.
스키마/필터/UI 변경 없음 — 순수 데이터 추가. 통화 정규화는 기존 `toUsd`/`scoring.py` USD 합산이 자동 커버.

## 사전 검증 (완료)
- DB 일별 스냅샷 범위: 2026-01-27 ~ 2026-06-23 (106 거래일)
- yfinance 유효성:
  - `009150.KS` = Samsung Electro-Mechanics, 통화 KRW, 시총 ~150조원 → `.KS` 라 toUsd 커버
  - `SPCX` = Space Exploration Technologies, 통화 USD, 시총 ~$2.08T → 변환 불요 (2026-06-12 Nasdaq IPO)
- score_history 는 ~65일 롤링 윈도우. 신규 티커는 추가일부터 전진 누적 (PSKY/XYZ 와 동일 표준 온보딩)

## Plan A — 삼성전기 (009150.KS)
- 섹터: `mobile_device` (모바일 디바이스) — 사용자 확정. 전용 전자부품 섹터 부재로 삼성/애플/소니 디바이스 생태계의 핵심 부품(MLCC·카메라모듈) 공급사로 배치.
- 명령: `.venv/bin/python scripts/add_ticker.py 009150.KS mobile_device --name-ko "삼성전기"`
- 결과: companies(region=KR) UPSERT → sector_companies(rank 다음 순번) → company_scores/profile → 오늘 스냅샷 → **2026-01-27~06-23 일별 백필** → 점수/랭킹 재계산
- 기대: 1/27부터 일별 가격/시총/거래량 이력 = 다른 종목과 동일

## Plan B — 스페이스X (SPCX)
- 섹터: `space` (우주) — 보잉·록히드마틴·로켓랩·KAI·ASTS·플래닛랩스와 동일 섹터
- 명령: `.venv/bin/python scripts/add_ticker.py SPCX space --name-ko "스페이스X"`
- 결과: companies(region=INTL) UPSERT → sector_companies → company_scores/profile → 오늘 스냅샷 → 백필(yfinance 가 IPO 2026-06-12 이후만 보유 → **상장일부터** 채워짐) → 점수/랭킹 재계산
- 기대: 상장일(6/12)부터 일별 이력

## 위험 / 주의
- `add_ticker.py` 종료 시 `calculate_hegemony_scores(max_date)` 를 호출 → 전 티커에 EMA 1틱 추가 적용(기존 도구 표준 동작, PSKY/XYZ 추가 시와 동일). 2회 실행 = 2틱. 영향 미미.
- 실행 전 DB 백업 완료: `data/hegemony.db.bak.add-tickers.*`
- 롤백: 실패 시 백업 복원 또는 `add_ticker.py --remove TICKER SECTOR`

## 검증 기준
- [ ] 두 티커 sector_companies 등록
- [ ] 009150.KS daily_snapshots 2026-01-27 시작
- [ ] SPCX daily_snapshots IPO일(2026-06-12) 시작, 그 이전 없음
- [ ] company_scores 행 생성(smoothed_score 산출)
- [ ] `pnpm build` / API 응답에서 가격이 USD로 표시(이중환산 없음)
