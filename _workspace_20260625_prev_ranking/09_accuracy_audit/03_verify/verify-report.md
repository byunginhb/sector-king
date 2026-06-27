# 09_accuracy_audit — 증거 기반 독립 검증 보고서

> 검증자: sk-verifier · 2026-06-11 · 방식: DB 직접 조회 + 코드 정독 + 빌드 직접 실행
> 대상: `_workspace/09_accuracy_audit/01_plan/integrated-plan.md` §3 수락기준 (+§1 충돌 판정)
> 진행 로그 주장은 신뢰하지 않고 전부 직접 재현·실측함.

## 전체 판정: **PASS** (12/12 항목, 신규 FAIL 0)

---

## 데이터 (DB 직접 조회: data/hegemony.db, .venv/bin/python)

### 1. 주말행 0 — **PASS**
```
daily_snapshots: weekend rows (strftime %w IN 0,6) = 0
score_history  : weekend rows = 0
```

### 2. EMA 정합 — **PASS**
- 표본 5티커(US: MU/MSFT/NVDA, KR: 005930.KS/000660.KS) 수식 `smoothed[t]=0.3*raw[t]+0.7*smoothed[t-1]`, seed=raw[0] 재현:
  전부 `maxerr=0.000000, bad(>0.01)=0` (각 n=59일).
- 전 티커 EMA 체인 연속성: **407/407 불일치 0행** (직접 재현).
- 최신 score_history == company_scores: 407티커 중 no_history=0, smoothed mismatch=0, raw mismatch=0.

### 3. 혼합통화 수정 실증 — **PASS**
- hbm USD 시총 비중(toUsd 재계산): **MU 29.77%**, 005930.KS 40.55%, 000660.KS 29.68% (총 $3,378B).
  → 계획 §A1 "MU 0.03%→29.77%" 실증 일치.
- **결정적 증거(미환산 buggy 재현 대조)**: MU mc_score 미환산=0.02 vs USD환산=15.74.
  MSFT 0.61→20.00, EA 0.11→3.70. 반대로 KR 종목은 미환산 시 과대(259960.KS 20.00, 005930.KS 14.13)→USD 후 정상화.
  US 종목이 더 이상 0점대로 짓눌리지 않고 KR 종목 과대수혜 해소됨.
- **전수 scale_score 재현 대조**(다중섹터 best-raw 채택 로직 포함): 407티커 불일치(>0.5) **0건**.
  (단순 단일섹터 비교 시 보이던 RBLX/TTWO/SONY 불일치는 해당 티커가 타 섹터에서 더 높은 raw_total을 받아 그 섹터 scale이 저장된 정상 동작 — best-score 로직 재현 시 전부 일치.)

### 4. 깨진 카드 0 + 단일종목 섹터 신규 발생 없음 — **PASS**
- 매핑티커(sector_companies) 중 최신일(2026-06-11) 스냅샷 결손=0, company_scores 결손=0.
- 단일종목(≤1) 섹터: electrical_equip, logistics_reit 2개뿐. audit 백업 DB 대조 결과 **작업 전후 동일** → 삭제로 인한 신규 발생 0.
- 매핑 0 섹터 0. 종목 감소 섹터들도 최소 2개 이상 유지(최소 identity 3→2).

### 5. 삭제 15종 + 비US/KR 잔존 0 — **PASS**
- 삭제 15종(CATL/ABB/SQ/PARA/JWN/CYBR/BLUE/PLL/EXAS/CFLT/263750.KS/039030.KS/041510.KS/950140.KS/326030.KQ):
  companies/daily_snapshots/company_scores/score_history/sector_companies 전 테이블 잔존 **각 0건**.
- 비US/KR 접미사 티커: 0건 (.KS/.KQ만 존재).
- XYZ/PSKY 추가: 각 companies=1, company_scores=1, 최신 스냅샷=1 정상.

### 6. update_data 가드 (코드 정독) — **PASS**
- 주말 skip: `update_data.py:241-243` `if is_weekend(target_date): print(...); sys.exit(0)` — 전체 run 중단.
- volume 미덮어쓰기: `update_data.py:114` `volume = COALESCE(NULLIF(excluded.volume, 0), daily_snapshots.volume)` — 0 fetch가 기존 유효값 보존.
- 신규행 0→NULL: `update_data.py:132` `data["volume"] if data["volume"] else None`.

---

## 코드/UI (정독 + grep 전수)

### 7. 환율 SoT — **PASS**
- `grep -rn "1450" lib/ components/ app/` → **단 1건**: `lib/currency.ts:10` (getKrwRate 폴백 기본값).
- `lib/format.ts:1`이 `getKrwRate` import, `:146` 사용. 하드코딩 제거됨.
- getKrwRate()가 toUsd와 동일 `CURRENCY_RATES.KRW` 참조 → $ 표시·₩ 병기 동일 환율 보장 (단일 경로).

### 8. /guide 내용 정확성 — **PASS** (틀린 산식 0줄)
- `number-glossary-data.ts:137-149` 자금흐름: "선택 기간 섹터 시총 변화액", "실제로 돈이 순수하게 들어온 것 아님", caution "주가 상승 평가액 증가 포함, 실제 순매수 자금 아님". ✓ §1 정확.
- `:148` MFI: "당일 종가의 일중 위치 기준, 표준 Wilder MFI와 다름". ✓ 비표준 명시.
- `service-intro.tsx:60-61` / `honest-limits.tsx:21` 갱신: "하루 2회(KST 16:30/익일 07:00)". ✓ §1 "1일 2회".
- `honest-limits.tsx` 한계 8항목(환율 고정/수집시점/자금흐름/MFI/결측/yfinance/폴백/소표본 percentile) 모두 실재.
- FAQPage JSON-LD: `app/guide/page.tsx:18-32` `@type:FAQPage → Question → acceptedAnswer/Answer` 유효 구조.
- 이모지: guide 전 디렉토리 그림문자(U+1F000~,2600~,2B00~) **0건** (매칭된 것은 텍스트 화살표 `→`로 이모지 아님).

### 9. money-flow 라벨/기준일/formatKrw/개명 — **PASS**
- 부제/툴팁 실재: flow-summary.tsx:24, flow-card.tsx:174(title), money-flow-page-content.tsx:91,129,156.
- 기준일 3페이지: money-flow-page-content.tsx:91, price-changes-page-content.tsx:82, statistics-page.tsx:108 (`{dateRange.end} 기준`).
- formatKrw signed: format.ts:142-152 `Math.abs(usdAmount)` + `signed && usdAmount<0 ? '-'` — 음수 부호 보존 정확.
- priceChangeAbs 개명: route.ts:162,179 + types/index.ts:332. 클라 소비처(`components/price-changes/`) priceChange 잔존 **0건**.

### 10. 진입점 — **PASS**
- GlobalTopBar NAV_ITEMS: global-top-bar.tsx:52 `{ '/guide', '이용 안내', BookOpen }`.
- 푸터: footer.tsx:18-21 /guide 링크 + :46 갱신주기 "1일 2회(KST 16:30/익일 07:00)".
- sitemap: app/sitemap.ts:22 /guide 등록.

---

## 빌드 (직접 실행)

### 11. tsc / build / lint — **PASS**
- `pnpm exec tsc --noEmit`: **exit 0**.
- `pnpm build`: **exit 0** (✓ Compiled successfully, `○ /guide` 정적 라우트 등록).
  searchParams "Dynamic server usage" 로그는 MEMORY 기록 정상 동작(API 라우트는 의도적 동적).
- `pnpm lint`: exit 1 (49 errors/10 warnings) **그러나 신규 회귀 0**.
  - 결정적 증거: HEAD(변경 전, 신규 파일 제외) `git stash -u` 후 lint = **59 problems(49 errors,10 warnings)**,
    현재(변경+신규) = **동일 59 problems(49 errors,10 warnings)**. 증가분 0.
  - 49개 에러는 전부 기존 기술부채(particle Math.random impure call, use-share/global-top-bar setState-in-effect,
    industry-icon/category-icon static-components 등) — 본 작업 신규 라인 무관.

### 12. 멱등성 — **PASS**
- `pnpm tsx scripts/migrate-clean-weekend-rows.ts` 재실행: **총 0행 삭제, exit 0**, 사후 점검 daily/score_history 잔존 0.

---

## FAIL 목록
없음.

## exit codes
- tsc: 0
- build: 0
- lint: 1 (기존 기술부채 — HEAD 대비 신규 회귀 0건, 증가분 0)
- migrate(재실행): 0
- migrate 삭제행: 0 (멱등)
