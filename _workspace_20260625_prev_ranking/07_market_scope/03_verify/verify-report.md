# 07_market_scope 검증 리포트 (sk-verifier · 증거 기반 독립 검증)

> 검증: 2026-06-10 · 방식: DB 직접조회 + 코드확인 + 명령 직접실행 (구현 progress 주장 미신뢰, 자기승인 방지)
> 대상 DB: `data/hegemony.db` · 빌드/타입/린트 직접 실행

## 전체 판정: CONDITIONAL PASS

수락 기준 8개 전부 PASS, 단 **좀비 부활 소스 2개(블로커)가 미해결**로 잔존 → 조건부 합격.
현재 DB 상태와 빌드는 정상이나, `pnpm db:fill-gaps` 또는 `db:migrate:add-new-industries` 재실행 시 수락기준1(잔존 0건)이 즉시 깨진다.

### 명령 exit code 요약
| 명령 | exit | 판정 |
|------|:----:|------|
| `pnpm exec tsc --noEmit` | **0** | PASS (타입 에러 0, 출력 없음) |
| `pnpm build` | **0** | PASS ("Compiled successfully in 14.6s", /stock 라우트 ƒ 등록) |
| `pnpm lint` | **1** | 49 errors / 10 warnings — **전부 pre-existing**, 이번 라운드 변경/신규 파일은 0건 |
| `pnpm db:migrate:remove-non-us-kr` (재실행) | 0 | PASS (멱등 — 0행 삭제) |

---

## 기준별 PASS/FAIL + 증거

### [PASS] 기준1 — 비US/KR 접미사 잔존 0건
```
companies   비US/KR(.T/.HK/.TW/.PA/.DE/.SW/.MC/.AX): (빈 결과)
sector_companies 비US/KR: (빈 결과)
DISTINCT 접미사(companies): (US)337, .KQ 5, .KS 78
DISTINCT 접미사(sector_companies): (US)444, .KQ 5, .KS 99
```
현재 DB에 한국(.KS/.KQ)·미국(접미사 없음)만 존재. **PASS** (단 기준 아래 위험항목 참조).

### [PASS] 기준2 — 모든 섹터 ≥1, 신규 단일종목 섹터 0
```
sectors_with_companies=112, companies=420, sector_companies=548
0종목 섹터: (없음)
단일종목 섹터: electrical_equip(1), logistics_reit(1)  ← 둘 다 기존부터 존재, 이번 라운드 무관(제외 인정)
```
이번 라운드로 신규 발생한 단일종목 섹터 0. **PASS**

### [PASS] 기준3 — 대체(MUFG/JD) + 보충 종목 편입 + 스냅샷/스코어 존재
```
ticker      sectors                                    snaps  scores  region
MUFG        global_banks                                 1      1     INTL
JD          ecommerce                                    1      1     INTL
LMT         aircraft_mfg,prime_defense,space           122      1     INTL
RTX         aero_engines,aircraft_mfg,prime_defense    122      1     INTL
GD          aircraft_mfg,prime_defense                 122      1     INTL
047810.KS   aircraft_mfg,korea_defense_major,space     120      1     KR
RL          luxury_fashion                               1      1     INTL
EL          luxury_fashion,personal_care               122      1     INTL
ROST        fast_fashion                                 1      1     INTL
BURL        fast_fashion                                 1      1     INTL
```
핵심 섹터 복구 확인:
- aircraft_mfg: 047810.KS#1, BA#2, RTX#3, LMT#4, GD#5 (BA 단독 → 5종 "항공·방산")
- luxury_fashion: TPR#1, RL#2, CPRI#3, EL#4 (4대장 제거 → 미국 럭셔리 4종)
- global_banks: MUFG#1, JPM#2... / ecommerce: ...JD#8 / luxury_auto: TSLA#1, RACE#2
신규 5종(MUFG/JD/RL/ROST/BURL) 스냅샷=1(오늘분), 스코어=1 생성됨. **PASS**

### [PASS] 기준4 — region=all|kr|global 정상, global=미국/kr=한국
DB 일관성(sector_companies 기준):
```
all=548, kr(.KS/.KQ)=104, global(그 외)=444  →  104 + 444 = 548  ✓
```
라우트 로직(`app/api/map/route.ts:14,35,136-137`): `applyRegionFilter`/`matchesRegion` 분기 사용.
- `region='all'` → 전체 / `'kr'` → isKrTicker / `'global'` → !isKrTicker (`lib/region.ts:77-84,112-116`)
dev 서버 없이 DB + lib/region.ts SoT 일관성으로 판정. **PASS**

### [PASS] 기준5 — 하위호환(식별자 불변) + region 백필 일관성
식별자 불변 (`lib/region.ts`):
```
REGION_FILTERS = ['all','kr','global']           (L49, 불변)
regionFilterToValue: global→'INTL', kr→'KR', all→null  (L154-158, 불변)
```
백필 일관성 (SQL `companies.region` vs `getRegionFromTicker`):
```
SQL region='INTL': 337  |  접미사 없음(=INTL 판정): 337   ✓ 일치
SQL region='KR'  :  83  |  .KS/.KQ(=KR 판정)      :  83   ✓ 일치
NULL/빈 region: (없음) / INTL인데 .KS·.KQ: (없음) / KR인데 접미사없음: (없음)
```
불일치 0건. 두 경로(SQL JOIN ↔ 메모리 마스크) 동등성 보장. **PASS**

### [PASS] 기준6 — /stock/[ticker] 라우트 검증·notFound·메타데이터·API재사용
`app/stock/[ticker]/page.tsx`:
- 티커 검증: `isValidTicker` (정규식 `TICKER_PATTERN = /^[A-Za-z0-9.\-]{1,12}$/`, `lib/stock-server.ts:8`)
- `notFound()`: 검증 실패 시(L62) + 미존재 시(L67) 두 분기
- `generateMetadata` 존재(L15), `StockJsonLd`(L72), Suspense(L78)
- 신규 API 미생성: `app/api/stock` 없음, `/api/company/[ticker]/route.ts` 재사용
- `not-found.tsx`: 제거된 비US/KR 티커 안내 분기 존재(L37-44), robots noindex, lucide 아이콘
**PASS**

### [PASS] 기준7 — /stock 시총 toUsd 경유, raw KRW 노출 없음
- `lib/stock-server.ts:51` — `marketCapUsd: toUsd(rawMarketCap, ticker)`
- `app/api/company/[ticker]/route.ts` — marketCap/price/week52High/week52Low/history.price/targetMeanPrice 전부 `toUsd(..., ticker)` 변환(L96-143)
- `components/json-ld.tsx:122,140` — StockJsonLd가 `marketCapUsd`(toUsd 값)만 수신
- `scripts/currency.py` to_usd 미러 == `lib/currency.ts` (KRW=1450, .KS/.KQ→KRW 동일)
raw KRW 노출 경로 없음. **PASS**

### [PASS] 기준8 — 빌드/타입/린트 + 멱등성
- tsc: exit 0, 출력 없음(에러 0)
- build: exit 0, "Compiled successfully in 14.6s", `/stock/[ticker]`·opengraph-image 동적(ƒ) 등록.
  ※ build 로그의 "Dynamic server usage(/api/...searchParams)" 메시지는 정상(searchParams 라우트는 동적 — MEMORY.md 기록된 expected warning, 빌드 실패 아님)
- lint: exit **1** — 49 errors/10 warnings. **그러나 git diff 교차검증 결과 모든 error 파일은 working tree 미변경(pre-existing baseline)**. 이번 라운드 신규/변경 파일(app/stock/**, components/stock/**, stock-server, region, currency, json-ld, sitemap, scoring, seed, add_ticker)에 lint 문제 **0건**.
- 멱등성: remove 마이그레이션 재실행 → 사전점검 0행, 전 테이블 0행 삭제, 잔존 0건. **멱등 확인.**
**PASS** (lint error는 회귀 아님 — 본 라운드 무관)

---

## 위험 항목 (조건부 합격 사유 — 후속 조치 필요)

### [위험-1 · 블로커] 좀비 부활 소스 2개 미해결 — 수락기준1 재실행 시 깨짐
구현 progress-data.md §블로커에서 보고된 그대로 잔존 확인(검증 시점 미수정):

**`scripts/migrate-fill-ticker-gaps.ts`** — 비US/KR 16개 티커 정의 + 16개 sector_companies 매핑 (총 32개 매치):
- 티커 정의(L77~270): 9618.HK, 6954.T, 8035.T, 6752.T, 9697.T, LYC.AX, CFR.SW, KER.PA, P911.DE, BMW.DE, MBG.DE, 9983.T, ITX.MC, OR.PA, 8306.T, MUV2.DE
- 섹터 매핑(L324~622): 위 티커들의 INSERT OR IGNORE 매핑
- `package.json:30`에 `db:fill-gaps` 스크립트 살아있음 → **재실행 시 16종 전부 부활**

**`scripts/migrate-add-new-industries.ts`** — MC.PA(LVMH), RMS.PA(Hermès):
- 티커 정의 L166,167 + luxury_fashion 매핑 L260,261 → 재실행 시 2종 부활

영향 평가: `scripts/add_ticker.py` 시장 게이트(L36,60,108-112 확인됨, 정상 동작)는 신규 유입만 차단하며, 위 두 마이그레이션은 게이트를 우회(직접 INSERT)한다. 현재 DB는 정상이나 두 스크립트가 살아있는 한 수락기준1은 "재실행 멱등/안정"을 보장하지 못함.
권고: 두 파일에서 22개 정의·매핑 제거, 또는 마이그레이션 진입부에 동일 시장 게이트 추가. (구현 progress가 "소유권 밖"이라 미수정 보고한 항목 — sk-implementer 후속 작업으로 반환 권장.)

### [경미 · 권고] lint pre-existing error 49건 (회귀 아님)
이번 라운드와 무관하나 레포 전반 품질 부채. 대표: `industry-money-flow-card.tsx`/`flow-card.tsx`/`flow-river.tsx` Math.random 렌더 중 호출(react-hooks/purity), `category-icon.tsx`/`industry-icon.tsx` 등. `pnpm lint`가 exit 1을 반환하므로 CI에 lint 게이트가 있으면 파이프라인 적신호. 본 라운드 책임 아님 — 별도 정리 트랙 권장. (MEMORY.md "Known Technical Debt"에 Math.random useMemo 고정 항목 이미 기록됨.)

### [정보] stock-score-analysis.tsx:173 "방법론 상세 보기 →"
화살표 글리프(U+2192)는 이모지 리터럴 아님 — 이모지 금지 정책 위반 아님. (lucide-react ArrowRight 권장이나 경미.)

---

## 권고
1. (필수) 좀비 부활 소스 2개 정리 → sk-implementer 반환. 정리 후 `pnpm db:fill-gaps` 재실행해도 비US/KR 0건 유지 확인.
2. (선택) pre-existing lint 49건은 별도 품질 트랙. CI lint 게이트 존재 시 우선순위 상향.
