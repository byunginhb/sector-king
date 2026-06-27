# 09_accuracy_audit 라운드 코드 리뷰

대상: 미커밋 변경분(데이터 정합성 수정 + /guide 페이지). 리뷰 일자 2026-06-11.
범위: scoring.py / backfill_score_history.py / update_data.py / add_ticker.py / 마이그레이션 2종 / verify-accuracy.ts / lib(currency,format) / types / money-flow·dashboard·stock UI / app/guide·components/guide / glossary-data.

---

## CRITICAL

없음.

---

## HIGH

없음.

핵심 회귀 위험 항목을 추적했으나 모두 안전 확인:

- **scoring.py 함수 추출(compute_sector_company_scores)** 은 순수 추출 + USD 환산 적용만. diff 정독 결과 컴포넌트 산식(scale/growth/profitability/sentiment, raw_total 합산, 멀티섹터 max raw_total 채택, calculate_data_quality)이 기존과 1:1 동일. 변경점은 단 두 곳:
  - `sector_total_mc = sum((to_usd(row[1], row[0]) or 0) * (row[15] or 1.0) ...)`
  - `mc_usd = to_usd(...)` 후 `weighted_mc = mc_usd * rw`
  분자(weighted_mc)·분모(sector_total_mc) 둘 다 USD로 일관 환산되어 시총 비중(mc_score)이 통화 무관하게 정확. CLAUDE.md 통화 정규화 규칙 부합. 이전 native 합산 버그(X1) 정확히 해소.
- **EMA 이중평활 없음**: 일간 엔진(scoring.py:296)은 저장된 company_scores.smoothed_score를 seed로 사용하고, backfill은 체인을 처음부터 재구성한 뒤 마지막 날 값으로 company_scores를 동기화(backfill:163-175). backfill 후 다음 일간 실행이 그 값을 이어받으므로 점프·이중평활 발생하지 않음.
- **priceChangeAbs 개명**: PriceChangeItem.priceChange → priceChangeAbs. 실제 소비처(price-change-table.tsx:101-104, price-change-chart.tsx:42)는 percentChange만 사용하고 priceChange/priceChangeAbs 필드를 읽지 않음. grep으로 검출된 다른 `.priceChange` 참조는 전부 별개 타입(dailySnapshots % 컬럼, CompanySnapshot 등)이라 무관. 고아 소비처 0 — 회귀 없음.
- **formatKrw signed 옵션**: `options?: { signed?: boolean }` 신규, 기본 false → 기존 절댓값 표기 동작 불변. 기존 호출부(옵션 미전달)는 영향 0. 신규 `{ signed: true }`는 flow-summary/industry-money-flow-card의 netFlow 부호 보존용으로만 적용 — 의미상 올바름(순유출 음수를 -₩로 표시).

---

## MEDIUM

1. **update_data.py:97-110 — COALESCE(NULLIF(volume,0)) 가드가 "정상 0 거래량"을 영구히 막음.**
   미국 종목이 거래정지(halt)되거나 휴장 직후 실제 volume=0인 정당한 케이스에서, 가드가 이를 "off-session 노이즈"로 간주해 이전 유효값을 보존한다. 즉 진짜 0(거래정지)을 0으로 기록할 방법이 없다. 현재 시장 범위가 US/KR뿐이고 KR off-session 오염 방지가 우선순위라 합리적 트레이드오프지만, "거래정지=직전 거래일 volume 유지"라는 의미 왜곡이 잠재. 권고: 주석에 "정상 0(거래정지)도 보존되는 한계" 명시, 또는 향후 거래정지 플래그 분리.

2. **마이그레이션 실행 순서 의존성이 코드로 강제되지 않음.**
   clean-weekend-rows / clean-broken-tickers / backfill 은 각각 별도 pnpm 스크립트. backfill은 weekend 행이 남아 있으면 그 날짜도 EMA 체인에 포함해 재계산한다(주말 행이 carry-forward라 raw가 거의 동일해 큰 왜곡은 아니나 체인에 잡음 1틱 추가). 정확한 결과를 위해 `clean-weekend-rows → backfill → verify-accuracy` 순서가 필요. 권고: backfill docstring/오케스트레이터 runbook에 실행 순서를 명시(현재 backfill 헤더에 순서 언급 없음). verify-accuracy가 사후 weekend=0을 검사하므로 사후 방어는 존재.

3. **backfill_score_history.py:128-132 — 결측 폴백이 "옛(버그) scale 유지".**
   해당 날짜에 섹터/스냅샷 컨텍스트가 없으면 `new_scale = old_scale`(저장된 기존 값) 유지. 그 old_scale이 native-bug 시절 값이면 해당 일자만 부분적으로 미수정 상태로 남는다. coverage<0.5면 전체 폴백(exit 2)하지만, coverage가 임계 이상이어도 개별 결측 일자는 옛 값이 잔존할 수 있음. docstring에는 "구조적 부족은 scale 폴백으로 흡수"로 설명돼 의도된 동작이나, 부분 잔존 가능성은 verify의 hbm 스팟체크(최신일만)로는 못 잡는다. 권고: 결측 폴백 발생 건수를 stats로 집계·출력해 가시화.

4. **verify-accuracy.ts 환율 SoT — tsx CLI 실행 시 env 미주입.**
   lib/currency.ts가 NEXT_PUBLIC_KRW_USD_RATE → KRW_USD_RATE → 1450 순으로 읽는데, tsx CLI(`pnpm db:verify:accuracy`)는 Next 런타임이 아니라 .env 자동 로드가 없을 수 있다. 운영에서 KRW_USD_RATE를 .env로만 설정한다면 검증은 1450 기본값으로, Python 수집(currency.py도 동일 1450 기본)과 우연히 일치한다. 단 운영이 KRW_USD_RATE를 실제로 다른 값으로 설정·tsx가 그걸 못 읽으면 검증 환율 ≠ 저장 환율 불일치 가능. 권고: 검증 스크립트가 dotenv를 명시 로드하거나, 현재 1450 고정 전제를 주석화(/guide도 1450 하드코딩하므로 전제는 일관).

5. **/guide 하드코딩 수치가 SoT와 분리됨(드리프트 위험).**
   - 환율 "약 1,450원": honest-limits.tsx:17, number-glossary-data.ts:88. 실제 SoT는 lib/currency.ts getKrwRate(). env로 환율을 바꾸면 getKrwRate()는 따라가지만 /guide 문구는 1450에 고정 → 불일치.
   - 갱신 시각 "KST 16:30 / 익일 07:00": honest-limits.tsx:21, service-intro.tsx:61, footer.tsx:46 3곳 중복. cron 스케줄 변경 시 3곳 수동 동기화 필요.
   - 결측 "earnings_growth 25%", percentile "≥4개", 폴백 "중간값 50%": scoring.py 상수와 분리.
   권고: 최소한 환율은 `getKrwRate()`를 호출해 표기하거나, 갱신시각/임계값을 단일 상수 모듈로 추출. (현 라운드 범위 밖이면 별도 부채 트래킹.)

6. **add_ticker.py vs update_data.py volume NULL 처리 비대칭.**
   add_ticker.py:258 은 `info.get("volume") or None`(신규 행에 0→NULL). update_data.py도 write 시 동일 처리 + UPDATE 시 COALESCE 가드. 일관되나, `or None`은 volume이 정당한 0뿐 아니라 falsy(빈 문자열 등)도 NULL화 — yfinance가 0/None만 주므로 실무상 안전. 단 명시적으로 `is None or == 0` 비교가 더 의도 분명. 경미.

7. **TOC 라벨과 섹션 제목 불일치(경미).**
   guide-toc.tsx: "C. 화면 보는 법" vs screen-guide.tsx 제목 "C. 화면별 읽는 법". 앵커(#screens)는 일치해 동작엔 문제 없으나 라벨 통일 권장.

---

## LOW

1. **flow-summary.tsx — motion.div 직속 자식 들여쓰기 깨짐.** `<div className="grid...">`로 한 단계 감쌌으나 내부 카드 들여쓰기가 한 레벨 부족(76-101행 영역). prettier가 정리하므로 기능 영향 0, 가독성만.
2. **guide-section.tsx — h2 `id={id}` + 내부 span `id={id-heading}` 이중 id.** aria-labelledby가 span을 가리키는데 h2에 직접 텍스트를 두고 h2에 aria 불필요. 동작엔 무해하나 중복. 단순화 권장: span 제거하고 `<h2 id={id}>` 하나로.
3. **verify-accuracy.ts:147 expectedMcScore 계산만 하고 미사용(로그 출력에만 등장).** 실제 저장 scale_score와 대조하지 않고 sharePct>5%로만 1차 판정 — 주석에 "분리 어려움"으로 명시됨. 의도적이나 변수명이 "expected"라 검증하는 듯한 오해 소지.
4. **이모지 0 확인.** /guide·components/guide·glossary-data·money-flow 변경분 전부 lucide-react 아이콘만 사용. UI 이모지 리터럴 없음 — 정책 준수.
5. **보안.** 하드코딩 시크릿/API키 0. SQL은 전부 파라미터 바인딩(마이그레이션 placeholder, verify .get/.all 바인딩). 테이블명 보간(`${table}`)은 코드 내 고정 화이트리스트(TARGET_TABLES/DELETE_ORDER)라 인젝션 불가. JSON-LD는 정적 사전 데이터 직렬화라 XSS 위험 없음(dangerouslySetInnerHTML 입력이 사용자 비제어).
6. **불변성.** sortedChanges/allDates 등 전부 `[...arr].sort()` 스프레드 사용. Python dict는 새 dict 생성. 가드 통과.
7. **에러 처리.** 마이그레이션 try/finally + 트랜잭션 자동 롤백 + foreign_key_check. backfill RuntimeError→rollback+exit2(폴백), 그 외 Exception→rollback+exit1. 견고.

---

## 정합성·정확성 검증 요약 (중점 항목)

- toUsd 일관성(scoring): sector_total_mc / weighted_mc / 멀티섹터 타이브레이크(raw_total) 모두 USD 기준 — 일관. PASS.
- 함수 추출이 산식 불변: diff 정독 결과 추출만(USD 환산 외 로직 변경 0). PASS.
- backfill 산식 이중화 없음: scoring.compute_sector_company_scores / fetch_sector_companies / EMA_ALPHA 재사용. 별도 산식 정의 없음. PASS.
- ON CONFLICT DO UPDATE 컬럼 보존: INSERT OR REPLACE의 14컬럼 전부 UPDATE SET에 매핑(market_cap·price·price_change·52high/low·day high/low·volume·avg_volume·pe·peg·updated_at). 누락 컬럼 없음. volume/avg_volume만 COALESCE 가드 추가 — 의미 보존 + 개선. PASS.
- 주말 skip이 백필 경로를 막지 않음: update_data main()의 weekend guard는 update_data 단독 실행에만 작용. backfill은 독립 스크립트라 영향 없음. PASS.
- 마이그레이션 멱등·FK: WHERE 기반 DELETE(2회차 changes=0), DELETE_ORDER 자식→부모, foreign_key_check. PASS. 백업 안내 콘솔 출력 존재. PASS.
- glossary 사실 정확성: "자금흐름=기간 시총 변화액, 순매수 아님(매수=매도라 순유입 측정 불가)" — 정확. MFI 비표준(일중 위치 기반) 고지 정확. inflow/outflow 정의 정정 정확. PASS.

---

커밋 판정: OK (CRITICAL/HIGH 0건, MEDIUM 7·LOW 7은 머지 후 후속 정리 권장)
