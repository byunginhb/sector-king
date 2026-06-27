# 07_market_scope — 공통 컨텍스트 (메인 오케스트레이터 작성)

## 사용자 요구사항 (원문)

1. 종목을 **미국장·한국장만** 유지하고, 그 외 시장(일본·홍콩·대만·유럽·호주 등) 종목은 **제거**한다.
2. 미국·한국 종목 데이터를 **어떤 기준으로 가져올지** 계획한다 (예: 시가총액 기준?).
3. 이런 서비스에 **꼭 필요한 새 페이지 1개**를 기획한다.

## 현재 DB 상태 (2026-06-10 조사)

DB: `data/hegemony.db` (SQLite, Drizzle). 테이블: categories, sectors, companies, sector_companies, daily_snapshots, company_profiles, company_scores, score_history, industries, industry_categories.

### 시장(접미사)별 sector_companies 티커 분포
| 시장 | 수 |
|------|----|
| US (접미사 없음) | 434 |
| .KS (KOSPI) | 98 |
| .KQ (KOSDAQ) | 5 |
| .T (일본) | 7 |
| .PA (프랑스) | 5 |
| .HK (홍콩) | 2 |
| .TW (대만) | 1 |
| 기타(.DE/.SW/.MC/.AX) | 7 |

`companies` 테이블 dedup 기준 region 분포: INTL=354, KR=83.

### 제거 대상 22개 티커 (비 US/KR)
```
1810.HK (샤오미)      2454.TW (TSMC)        4063.T (신에쓰화학)
6752.T (파나소닉)     6954.T (화낙)          8035.T (도쿄일렉트론)
8306.T (미쓰비시UFJ)  9618.HK (JD닷컴)       9697.T (캡콤?)
9983.T (패스트리테일링/유니클로)  AIR.PA (에어버스)   BMW.DE (BMW)
CFR.SW (리치몬트)     ITX.MC (인디텍스/자라)  KER.PA (케링)
LYC.AX (라이너스)     MBG.DE (메르세데스벤츠)  MC.PA (LVMH)
MUV2.DE (뮌헨재보험)  OR.PA (로레알)          P911.DE (포르쉐)
RMS.PA (에르메스)
```

**중요:** 위 다수가 각 섹터의 글로벌 패권 기업이다. 단순 삭제 시 해당 섹터가 비거나 대표 기업이 사라진다.
→ 가능한 경우 **미국 상장 ADR**로 대체 검토 필요 (예: TSMC→TSM, JD닷컴→JD, LVMH→LVMUY, TSM 등). ADR이 없거나 OTC만 있으면 갭으로 수용.

## region 모델 (이미 존재 — lib/region.ts)
- `companies.region`: `'KR' | 'INTL'` (DB 컬럼).
- URL/UI: `?region=` = `'all' | 'kr' | 'global'`.
- `getRegionFromTicker(ticker)`: `.KS`/`.KQ` → KR, 그 외 → INTL. (SoT 함수)
- Python 동등 함수: `scripts/add_ticker.py::get_region_from_ticker`.
- **비US/KR 제거 후 INTL = 순수 미국**이 되므로, "global" 토글 라벨/의미를 "미국"으로 재정의할지 검토.

## 데이터 수집 파이프라인 (현재)
- `scripts/update_data.py`: 일일 업데이트. yfinance `.info`에서 marketCap/price/52주/volume/PER/PEG + 펀더멘털(revenueGrowth, earningsGrowth, operatingMargins, ROE, targetMeanPrice, freeCashflow) 수집 → `daily_snapshots` + `company_scores`.
- `scripts/add_ticker.py`: 단일 티커 추가 CLI (섹터 지정, 자동 백필).
- `scripts/seed.ts`: 카테고리/섹터/시드 종목 수동 큐레이션. `sector_companies.rank` 1~10.
- `daily_snapshots.market_cap`(INTEGER) 존재 → 시총 랭킹 가능. **단 native 통화 저장** (toUsd 변환 필요).
- 커밋 로그상 `chore: daily data update`가 자동 반영됨 (cron 추정).

## 통화 정규화 규칙 (필수)
- `daily_snapshots`/`company_scores`의 가격성 필드는 **네이티브 통화 저장**. API 응답 직전 `toUsd(value, ticker)` 필수.
- 시총 비교/랭킹 시 반드시 USD 변환 후 비교.

## 페이지/라우트 현황
- `app/[industryId]/` (동적): money-flow, price-changes, statistics
- 메인 `/`: 산업 대시보드 (`IndustryDashboard`)
- hegemony-map, news, me(watchlist/notes/settings/onboarding), methodology, design-system, contact, login, admin/*
- **company 상세는 전용 라우트 없음** — `CompanyDetail` 모달 컴포넌트로만 존재 (`components/company-detail.tsx`). global-search, price-change-card, company-badge, company-statistics에서 `setSelectedTicker`로 모달 오픈.
- `app/api/company/[ticker]/route.ts`: profile + 최신 snapshot + 가격이력 + score 반환 (toUsd 적용).
- 새 페이지 후보: ① company 전용 라우트(딥링크/공유/SEO), ② 스크리너(종목 발굴), ③ 비교, ④ 실적 캘린더, ⑤ 랭킹/리더보드.

## 핵심 파일
- `lib/industry.ts` (getIndustryFilter), `lib/region.ts` (region SoT), `lib/currency.ts` (toUsd)
- `drizzle/schema.ts`
- `scripts/update_data.py`, `scripts/add_ticker.py`, `scripts/seed.ts`
- `app/[industryId]/`, `components/`

## 산출물 경로
- sk-data-modeler → `_workspace/07_market_scope/01_plan/data-model.md`
- sk-ticker-curator → `_workspace/07_market_scope/01_plan/ticker-curation.md`
- sk-filter-architect → `_workspace/07_market_scope/01_plan/filter-chain.md`
- sk-ui-planner → `_workspace/07_market_scope/01_plan/ui-plan.md`
