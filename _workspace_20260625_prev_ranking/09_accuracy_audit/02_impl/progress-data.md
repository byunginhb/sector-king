# Lane A (데이터/스크립트) 구현 진행 — 09_accuracy_audit

> 담당: sk-implementer · 시작: 2026-06-11
> 파일 소유권: `scripts/*.py`, `scripts/*.ts`(마이그레이션·검증), `package.json`(스크립트), `data/hegemony.db`, workflow cron

## 백업
- [x] `data/hegemony.db.bak.audit.1781134631` (8.73MB) 생성

## 시작 DB 상태 (실측)
| 테이블 | 행수 |
|---|---|
| companies | 420 |
| daily_snapshots | 29,943 |
| company_scores | 407 |
| score_history | 20,610 |
| sector_companies | 548 |
| company_profiles | 0 |
- 최신 스냅샷일: 2026-06-10
- 주말행: daily_snapshots 6,362 / score_history 4,060
- score_history 범위: 2026-03-23 ~ 2026-06-10 (74일)
- daily 범위: 2026-01-27 ~ 2026-06-10 (129일)

## 작업 단계
- [x] A1. scoring.py 혼합통화 USD 환산 수정 — `compute_sector_company_scores()` 추출(backfill 재사용용), `sector_total_mc`·`weighted_mc` 모두 `to_usd` 적용. RISK 주석 제거.
- [x] A3+A4. update_data.py 가드 + 주말행 정리 마이그레이션
  - update_data.py: 주말 target_date면 전체 run skip(`is_weekend`), upsert 를 INSERT OR REPLACE→ON CONFLICT DO UPDATE 로 변경, volume `COALESCE(NULLIF(excluded.volume,0), 기존값)`, 신규행 0→NULL. add_ticker.py 도 volume 0→NULL.
  - `migrate-clean-weekend-rows.ts`: daily_snapshots 6,362행 + score_history 4,060행 = **10,422행 삭제**. 2회차 0행(멱등).
  - 정리 후: daily 23,581행(97 거래일), score_history 16,550행(58 거래일)
- [x] A2. score_history backfill — `backfill_score_history.py`. 58일(2026-03-23~06-10), 16,550행 갱신, scale 변동 5,645행, 커버리지 97.4%, company_scores 407 동기화. forward-only 폴백 **미발생**.
  - 혼합통화 수정 실증(scale_score 변화): MU 5.40→**21.12**, 005930.KS 27.5→**16.79**, 000660.KS 27.5→**23.19**, MSFT 24.40(무변동, 단일통화섹터 영향 적음)
  - hbm 섹터 USD mc 비중 실측: MU 39.34%(감사 0.03%→정정), 000660.KS 39.22%, 005930.KS 21.44%
  - EMA 체인 연속성 검증(MU 58일 수식 일치), 최신 score_history==company_scores(0 불일치), 주말행 0
- [x] A5. 깨진/stale 티커 프로브 + 정리 — `migrate-clean-broken-tickers.ts`(15종 삭제, FK순, 멱등). XYZ·PSKY add_ticker 복구.

### 티커 조치표 (프로브 2026-06-11, 대조군 AAPL/NVDA/MSFT·005930.KS·000660.KS 정상)
| 티커 | 프로브(.info marketCap / history) | 조치 |
|---|---|---|
| CATL | None / 없음 | 삭제(중국 좀비, 범위 위반) |
| ABB | None / 없음 | 삭제(스위스 좀비, 범위 위반) |
| SQ | None(개명) | 삭제 → **XYZ**(Block, $39.7B) add_ticker 대체 |
| PARA | None(개명) | 삭제 → **PSKY**(Paramount Skydance, $11.5B) add_ticker 대체(online_video+streaming) |
| JWN | None / 없음 | 삭제(상폐/인수) |
| CYBR | None / 없음 | 삭제(상폐/인수) |
| BLUE | None / 없음 | 삭제(상폐/인수) |
| PLL | None / 없음 | 삭제(상폐/인수) |
| EXAS | None / 없음 | 삭제(상폐/인수) |
| CFLT | None / 없음 | 삭제(상폐/인수) |
| 263750.KS | None / 가격있음·거래량 비정상(81) | 삭제(Yahoo symbol 결함, 스코어링 불가) |
| 039030.KS | None / 가격있음·거래량 비정상(1) | 삭제(동일) |
| 041510.KS | None / 가격있음·거래량 비정상(11) | 삭제(동일) |
| 950140.KS | None / 가격있음 | 삭제(동일) |
| 326030.KQ | None / 4개월 stale | 삭제(동일) |

- KR5는 상폐는 아니나 Yahoo 가 symbol 단위로 marketCap 미제공(.info None) + history 거래량 비정상이라 스코어링 입력 부족 → 억지 복구 대신 삭제(빈 카드 품질 결함 제거). KR 대조군은 mc 정상이므로 off-session 일시장애 아님.
- 정리 후: companies 407, sector_companies 534, company_scores 407. **데이터 없는 종목 0** (companies==company_scores==daily_snapshot 보유).
- [x] A6. 재실행 + 검증
  - 순서: 백업 → 주말행 정리 → backfill → 깨진티커 정리 → XYZ/PSKY add_ticker → update_data(2026-06-11, 407종목 전체 성공·0 실패) → **backfill 재실행**(신규 06-11 행·신규 티커 포함 EMA 체인 재구축) → 검증
  - 신규 `verify-accuracy.ts` 작성(`pnpm db:verify:accuracy`).

#### 검증 결과 (db:verify:accuracy — 치명 0, 경고 1)
| 점검 | 결과 |
|---|---|
| 주말행 0건(daily_snapshots) | PASS |
| 주말행 0건(score_history) | PASS |
| 최신 score_history==company_scores | PASS (0 불일치) |
| 모든 매핑 티커 최신일(2026-06-11) 스냅샷 보유 | PASS |
| 모든 매핑 티커 company_scores 보유 | PASS |
| hbm MU USD 시총 비중 39.34%(mc_score≈15.74) USD 기준 | PASS |
| KR 최신일 volume=0/NULL | WARN 78/78 (off-session; 가드로 신규행 NULL 저장·기존 유효값 미덮어씀) |

- 전 티커 EMA 연속성: **407/407 불일치 0행** (수식 재현 일치)
- 볼륨 가드 실증(controlled test): 0-fetch는 기존 99999 보존, 유효 fetch(42424242)는 정상 덮어쓰기
- 기존 `db:verify:market-scope`: 치명 0(단일종목섹터 2개 WARN — 기존 상태, 본 작업 무관)
- tsc(scripts/): 0 errors. Python py_compile/import: OK

## 최종 DB 상태
| 테이블 | 시작 | 종료 |
|---|---|---|
| companies | 420 | **407** (-13) |
| sector_companies | 548 | **534** (-14) |
| company_scores | 407 | 407 |
| daily_snapshots | 29,943 | **23,957** (주말 6,362 + 깨진티커 + 신규 정리) |
| score_history | 20,610 | **16,507** |
| 주말행(daily/score) | 6,362 / 4,060 | **0 / 0** |
| 최신 스냅샷일 | 2026-06-10 | **2026-06-11** |

## cron 워크플로우
- `.github/workflows/update-data.yml` 은 이미 `* * 1-5`(월~금)만 실행 → 주말 미실행. is_weekend 가드는 수동/backfill 방어용. **변경 불요**(audit §1 "1일 2회" 유지).

## 폴백/블로커
- backfill forward-only 폴백 **미발생**(커버리지 97.4%→100%).
- KR5(263750/039030/041510/950140/326030)는 Yahoo symbol 결함으로 복구 불가 판단→삭제(상폐 아님이나 servable 아님). 향후 yfinance 복구 시 add_ticker 로 재추가 가능.
