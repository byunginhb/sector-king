# 07_market_scope — 데이터/스크립트 레인 진행상황 (sk-implementer)

> 시작: 2026-06-10 · 기획 승인 확인됨(`01_plan/APPROVED`)
> 환경 probe: `.venv/bin/python` + yfinance 네트워크 **성공**(AAPL marketCap 반환) → 실행 단계 진행 가능

## 환경 메모
- 시스템 python3(3.14)에는 yfinance/pandas 없음. 프로젝트 `.venv/bin/python`에 설치됨.
- 모든 파이썬 스크립트는 `.venv/bin/python`으로 실행해야 함.
- `timeout` 명령 없음(macOS) — 파이썬 내부 처리.

## 1. 코드 작성 (네트워크 불요) — 완료
- [x] `scripts/migrate-remove-non-us-kr.ts` — 22개 화이트리스트, 자식→부모 삭제, 트랜잭션 + foreign_key_check, 멱등 (tsc 통과)
- [x] `scripts/migrate-add-us-kr-replacements.ts` — 확정 종목 INSERT OR IGNORE(companies + sector_companies, region 자동 주입, MAX(rank)+오프셋 임시 rank) (tsc 통과)
- [x] `scripts/currency.py` — lib/currency.ts 미러(to_usd) (단위검증: KR rate 1450, None-safe)
- [x] `scripts/suggest_candidates.py` — 읽기 전용 후보 추출(USD 정렬, 게이트) (compile OK)
- [x] `scripts/verify-market-scope.ts` — 비US/KR 잔존 0, 섹터당 ≥1, rank 연속성(읽기 전용) (tsc 통과)
- [x] `scripts/add_ticker.py` — 진입부 시장 게이트 추가 (게이트 단위검증: 4063.T/MC.PA 거부, AAPL/KS/BRK.B/MUFG 허용)
- [x] `scripts/seed.ts` — 1810.HK/2454.TW/4063.T 좀비 제거(ap/mobile_device rank 재정렬, materials 비움)
- [x] `package.json` — db:migrate:remove-non-us-kr, db:migrate:add-us-kr-replacements, db:verify:market-scope 추가

## 2. 실행 (probe 성공 → 진행)
- [x] 백업 `data/hegemony.db.bak.1781097802` 생성
- [x] remove 마이그레이션 실행 — 2127행 삭제(score_history 876, daily_snapshots 1185, scores 22, profiles 0, sector_companies 22, companies 22), FK check 통과, 잔존 0건. 재실행 멱등(0행).
- [x] add-replacements 실행 — companies +5(MUFG/JD/RL/ROST/BURL 신규; LMT/RTX/GD/047810.KS/EL/ALB는 기존 존재), sector_companies +11. 재실행 멱등(+0/+0).
- [x] update_data.py 1회(점수 + rank 재정렬) — 완료(exit 0). Updated 405, Failed 14(전부 기존 yfinance flakiness: 039030.KS/041510.KS/263750.KS/326030.KQ/950140.KS/ABB/BLUE/CFLT/CYBR/EXAS/JWN/PARA/PLL/SQ — 신규 5종은 전부 성공). 50% 임계 미만.
- [x] verify-market-scope.ts 검증 — **치명 0, 경고 1**. PASS: 비US/KR 잔존 0, sector_companies 잔존 0, 112섹터 모두 ≥1, rank 1..N 연속, MUFG/JD 존재, region 일치. WARN: 단일종목 섹터 2개(electrical_equip/logistics_reit — 기존부터 존재, 이번 라운드 무관).

### 최종 핵심 섹터 rank (update_data 재정렬 후)
- aircraft_mfg: 047810.KS#1, BA#2, RTX#3, LMT#4, GD#5 (BA 단독 → 5종 "항공·방산" 복구, 임시 rank10 캡 해제됨)
- luxury_fashion: TPR#1, RL#2, CPRI#3, EL#4 (4대장 제거 → 미국 럭셔리 4종)
- global_banks: MUFG#1, JPM#2, ... (ADR 대체 MUFG가 점수순 rank1)
- ecommerce: ... JD#8 (ADR 대체)
- materials: LIN#1, ALB#2, APD#3 / fast_fashion: 383220.KS#1, TJX#2, ROST#3, 105630.KS#4, BURL#5
- 신규 5종 스냅샷=1, score: MUFG 44.1 / JD 31.2 / RL 50.2 / ROST 41.3 / BURL 36.2

## 완료 상태: DB 실제 변경 완료 + 검증 통과

### 베이스라인 → 현재 수치
- companies: 437 → 420 (−22 +5)
- sector_companies: 559 → 548 (−22 +11)
- 신규 5종(MUFG/JD/RL/ROST/BURL)은 update_data 전까지 snapshots=0/scores=0 → update_data가 오늘 스냅샷+점수 생성.
- 047810.KS는 aircraft_mfg 임시 rank가 11>10이라 rank=10으로 캡(이후 update_sector_rankings가 1..N 재정렬).

## 블로커/충돌 (오케스트레이터 보고 필요)
- **좀비 부활 소스 2개 (내 소유 파일 아님 → 수정 보류):**
  - `scripts/migrate-fill-ticker-gaps.ts` — 제거 대상 19개(9618.HK/6954.T/8035.T/6752.T/9697.T/LYC.AX/CFR.SW/KER.PA/P911.DE/BMW.DE/MBG.DE/9983.T/ITX.MC/OR.PA/8306.T/MUV2.DE 등)를 companies + sector_companies 로 INSERT OR IGNORE. `pnpm db:fill-gaps` 재실행 시 전부 부활.
  - `scripts/migrate-add-new-industries.ts:166,167,260,261` — MC.PA, RMS.PA(luxury_fashion) 정의. 재실행 시 부활.
  - data-model.md §부록B 가 이미 fill-gaps 점검을 권고했음. 그러나 두 파일은 본 레인 소유권 목록 밖 → 지시("아래 파일만 건드린다")에 따라 **수정하지 않고 보고**.
  - 권고: 후속 작업으로 두 파일에서도 22개 정의/매핑 제거 또는 add_ticker.py 와 동일한 시장 게이트 적용 필요. 미조치 시 수락기준 "잔존 0건"이 재실행으로 깨질 수 있음(현재 DB 상태는 정상).

## 리스크/보류 메모
- scoring.py USD 합산 보정: 범위 밖 → 주석/메모만, 로직 변경 보류. `scripts/scoring.py` sector_total_mc 위에 RISK 주석 추가함.
- update_data.py는 오늘 스냅샷만 생성(신규 5종 과거 백필 없음). 과거 시계열이 필요하면 `.venv/bin/python scripts/add_ticker.py`로 개별 백필 가능하나 범위 밖.
- add_ticker.py 시장 게이트는 신규 유입만 차단. 위 두 마이그레이션은 게이트를 우회(직접 INSERT)하므로 별도 조치 필요.

## 후속: 좀비 소스 정리 (2026-06-10, sk-verifier CONDITIONAL PASS 블로커 해소)

sk-verifier 가 유일 블로커로 지목한 "레거시 마이그레이션 2개의 비US/KR 정의" 를 제거해 재실행 좀비 부활을 차단함. **이 두 스크립트만** 수정(DB 직접 변경 없음).

### `scripts/migrate-fill-ticker-gaps.ts` — 16개 티커 제거
- companies 정의 16줄 제거: 9618.HK, 6954.T, 8035.T, 6752.T, 9697.T, LYC.AX, CFR.SW, KER.PA, P911.DE, BMW.DE, MBG.DE, 9983.T, ITX.MC, OR.PA, 8306.T, MUV2.DE
- sector_companies 매핑 16줄 제거 + 같은 섹터 잔존 종목 rank 1..N 재정렬:
  - robot: 6954.T(5) 제거 → 042660.KS 6→5, 108860.KQ 7→6
  - gaming: 9697.T(6) 제거 → 036570.KS 7→6 … 263750.KS 10→9
  - equipment: 8035.T(6) 제거 → 042700.KS 7→6, 039030.KS 8→7
  - battery: 6752.T(5) 제거 → QS 6→5
  - rare_earth: LYC.AX(2) 제거 → USAR 3→2, TMC 4→3
  - luxury_fashion: CFR.SW(3)/KER.PA(4) 제거 → CPRI 5→3, TPR 6→4
  - luxury_auto: P911.DE(3)/BMW.DE(4)/MBG.DE(5) 제거 → 이 파일 잔존 없음
  - fast_fashion: 9983.T(2)/ITX.MC(3) 제거 → 383220.KS 4→2, 105630.KS 5→3
  - personal_care: OR.PA(4) 제거 → KVUE 5→4, 090430.KS 6→5, 051900.KS 7→6
  - global_banks: 8306.T(7) 제거 → RY 8→7
  - reinsurance: MUV2.DE(3) 제거 → 003690.KS 4→3
  - ecommerce: 9618.HK(8, 말단) 제거 → 구멍 없음
- 합계: 16 정의 + 16 매핑 = **32줄 제거**

### `scripts/migrate-add-new-industries.ts` — 2개 티커 제거
- companies 정의 2줄 제거(L166,167 부근): MC.PA(LVMH), RMS.PA(Hermès)
- luxury_fashion 매핑 2줄 제거(L260,261 부근): MC.PA(1), RMS.PA(2)
- 이 파일 luxury_fashion 잔존 없음(나머지 CPRI/TPR 은 fill-gaps 소관) → 파일 내 재정렬 불필요
- 합계: **4줄 제거**

### 검증 증거
1. **grep 0건**: `grep -cE '<18개 패턴>' <두 파일>` → fill-ticker-gaps.ts:0, migrate-add-new-industries.ts:0 (재확인 통과)
2. **tsc**: `pnpm exec tsc --noEmit` → exit 0 (오류 없음)
3. **DB 안전 재실행**:
   - 백업: `data/hegemony.db.bak.zombie.1781098804` (gitignore 확인됨)
   - 재실행 전 수치: companies=420, sector_companies=548
   - `pnpm db:fill-gaps` → companies 추가 0/시도 225(skip 225), sector_companies 추가 0/시도 265(skip 265) — 멱등 확인
   - `pnpm tsx scripts/migrate-add-new-industries.ts` → Companies: 420 불변 보고 (※ package.json 에 `db:migrate:add-new-industries` 별칭 없음 → tsx 직접 실행)
   - 재실행 후 수치: companies=420, sector_companies=548 (**불변**), 비US/KR 접미사 티커 0건
   - `pnpm tsx scripts/verify-market-scope.ts` → 치명 0/경고 1(기존 single-ticker 섹터 WARN, 무관), rank 1..N 연속 PASS
4. **DB 원복**: 재실행은 멱등이라 논리적 내용은 불변이나 SQLite 페이지 바이트가 변동 → 백업으로 원복(sha 일치 확인). 최종 DB 는 본 후속 작업 이전 상태 그대로(이 레인은 DB 직접 변경 없음). 원복 후 verify-market-scope 재검증 치명 0 유지.

### 결과: sk-verifier CONDITIONAL PASS 블로커 해소
- 재실행해도 22개(16+2 접미사 + 기 정리분) 비US/KR 티커가 DB 로 INSERT 되지 않음 → "잔존 0건" 수락기준이 재실행에 견고함.
