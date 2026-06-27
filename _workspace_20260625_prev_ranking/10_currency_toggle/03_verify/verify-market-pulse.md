# 검증: market-pulse-strip "전체 시가총액" 수정

- 검증일: 2026-06-14
- 검증자: sk-verifier (증거 기반 독립 검증)
- 대상 변경 파일 (git status, HEAD 대비 4개):
  - `app/api/industries/route.ts` (+32)
  - `components/dashboard/market-pulse-strip.tsx` (+97 변경)
  - `lib/format.ts` (+14)
  - `types/index.ts` (+18)
- DB: `data/hegemony.db` (SQLite, better-sqlite3 readonly), 최신일 2026-06-12 / 전일 2026-06-11

## 전체 판정: PASS (검증 항목 7개 중 7 PASS)

---

## 1. 중복 제거 정확성 (핵심) — PASS

`.venv/bin/python` 으로 라우트 로직을 1:1 재현(toUsd 적용 snapshotIndex, distinct ticker 집계 vs 산업별 합산):

```
=== region=all ===
  distinctTickers: 407
  market.marketCapTotal (USD):       67,232,339,735,368
  market.marketCapChange:            0.60%
  industry-summed total (DUP, USD): 116,675,661,486,798
  DUP / dedup ratio:                 1.735x
```

- 라우트 `distinctTickers` 집계가 `snapshotIndex`(toUsd 적용, L92 `toUsd(snap.marketCap||0, snap.ticker)`)를 사용함을 코드+재현으로 확인. (route.ts L239-260)
- dedup 합(67.2T USD) < 산업 합산(중복포함, 116.7T USD). **산업 합산이 dedup 대비 1.735배 큼** → 멀티산업 종목 중복 계산이 실제로 제거됨.
- 주의(증거상 정정): 배경 설명의 "3.38배 중복"은 현재 DB(2026-06-12) 기준으로는 **1.735배**임. 비율 수치는 시점/데이터에 따라 변동하나, 핵심 주장(산업 합산이 dedup보다 크게 부풀려진다)은 성립. 옛 버그 문자열 `169179.7조원` 은 현재 DB의 region=global 산업합산(163,102.6조)·all(169,179.7조 — 정확 일치) 으로 재현 확인됨.

## 2. region 필터 정합성 — PASS

market 집계가 `allSC`(region 적용된 sector_companies INNER JOIN companies WHERE region=?)의 distinct ticker만 사용함을 코드(L66-75, L239-242)+재현으로 확인:

```
all distinct=407, kr=78, global=329, kr+global=407
overlap kr&global (should be 0): 0
union kr|global == all: True
total all=67,232,339,735,368; kr+global=67,232,339,735,368; diff=0.0000
```

- kr + global = all (종목 수·시총 합 모두 정확히 일치, diff=0).
- kr/global 중복 0. region별 marketCapChange도 독립 계산(kr 5.21%, global 0.34%, all 0.60%) — 정합.

## 3. 폴백 안전 — PASS

`components/dashboard/market-pulse-strip.tsx` 코드 검토:
- L43-45: `market?.marketCapTotal ?? industries.reduce((sum,i)=>sum+(i.totalMarketCap??0),0)` — market 부재(구버전 캐시) 시 산업 합산 폴백, 크래시 없음.
- L46: `tickerCount = market?.tickerCount ?? null` — null 안전.
- L50-67: `if (market)` 로 dayChange 분기, 폴백은 산업 시총 가중평균.
- L99-111: `market?.marketCapHistory?.length` 체크 후 폴백 시계열 합산.
- L134, L154: `aggregates.tickerCount ? ... : ...` — null 시 종목 수 없는 hint/캡션으로 분기 (`toLocaleString()` null 호출 회피). 크래시 없음.

## 4. 포맷 (formatKrw) — PASS

`lib/format.ts` formatKrw 로직 독립 재현 경계값 검증:

```
dedup all (현재)   => 9.7경원       (1e16↑ 경원 분기)
dedup kr           => 5,333조원     (100조↑ 콤마)
dedup global       => 9.2경원
100조 경계         => 100.0조원     (콤마 분기 경계)
99조               => 99.0조원      (미만 소수1)
1조 경계           => 1.0조원
1억 경계           => 10,000만원
```

- 무콤마 장수(`169179.7조원` 같은 4자리+ 무콤마 조원) 출력 **0건** — 정규식 회귀 체크 전 케이스 `ok`. 옛 버그값(현재DB)도 `16.9경원`으로 압축.
- USD/통화 무관 경로(formatMarketCap의 USD 분기 T/B/M)는 미변경 — 무영향.

## 5. 라벨/스코프 — PASS

```
"전체 시가총액" 잔존(app/components/lib/hooks/types): market-pulse 관련 0건.
  (검출된 2건은 number-glossary-data.ts "섹터 전체 시가총액" — 섹터 점유율 용어집, 무관)
"추적 종목 시총": label(L132) + 주석 + 전일대비 sub(L187) 존재.
캡션 "· 전체 시장 아님"(L157), hint "...전체 시장 시가총액이 아닙니다"(L135-136) 존재.
전일대비 sub "추적 종목 시총 기준"(L187) 확인.
```

## 6. 회귀 — PASS

- `industries.reduce` 중복합산은 `market-pulse-strip.tsx`(L45 폴백 경로)에만 존재 — 이 컴포넌트가 유일 소비처.
- `indData.market` 소비처도 market-pulse-strip 1곳. 다른 페이지/훅 미사용.
- `types/index.ts` 변경은 가산적(옵셔널): `MarketAggregate` 신규 + `IndustriesResponse.market?` 옵셔널 → 기존 소비처 무손상 (tsc PASS가 입증).

## 7. 빌드/타입체크/lint — PASS

```
pnpm exec tsc --noEmit : exit 0, 출력 0줄 (타입 에러 0)
pnpm build             : exit 0 (/api/industries 포함 전 라우트 생성)
pnpm lint              : exit 1 — 58 problems (49 errors, 9 warnings)
   └ 신규 회귀 여부: HEAD(변경 stash) 동일 58 problems(49 errors) → 회귀 0건.
     에러 파일: use-share.ts, use-onboarding.ts, coverage/block-navigation.js
                (모두 변경 4파일과 무관한 사전 존재 부채)
     변경 4파일 단독 eslint: 0 errors, 1 warning(route.ts inArray 미사용 — HEAD에도 존재, 기존)
```

## Exit codes
- tsc --noEmit: 0
- build: 0
- lint(전체): 1 (사전 존재 부채, 변경 무관 — HEAD 동일)
- lint(변경 4파일 단독): 0 errors

## FAIL 목록
- 없음

## 비고 (참고용, 판정 무영향)
- 배경의 "3.38배"는 현재 DB 기준 1.735배(all)/1.770배(global). 데이터 시점 차이. 핵심 주장(중복 부풀림 제거)은 유효.
- 기존 lint 부채(use-share.ts set-state-in-effect 등 49 errors)는 이번 작업 범위 외 — 별도 정리 권장.
