# 글로벌 자금 지도 — 구현 지도

> 상태: 운영 중 · 2026-10-13 · 라우트 `/global-flow`
> 기획: [plan.md](plan.md) · 데이터: [data-sources.md](data-sources.md) · 개념: [자금 흐름의 세 가지 뜻](../../concepts/money-flow-definitions.md)

이 기능을 고치거나 확장하기 전에 읽는 문서. "어디에 무엇이 있고, 무엇을 건드리면 무엇이 같이 움직이는가".

## 데이터 흐름

```
GitHub Actions update-data.yml (평일 4회)
  └ scripts/update_global_flow.py ──► SQLite data/hegemony.db (db-snapshot 브랜치가 SoT)
        global_asset_history(symbol,date,close)   yfinance 5년, 배당 조정 종가
        macro_series(series_id,date,value)        FRED·DefiLlama·네이버·ETF 좌수/AUM·크립토 유통량

lib/global-flow/server.ts  getGlobalFlow()      두 테이블 전량 읽기(~20k행) → 테이블 없으면 null
  └ lib/global-flow/compute.ts buildGlobalFlow() 순수 함수. 4개 기간을 한 번에 계산
        ├ assets.ts   자산 정의·규모 기준점·ETF→자산 매핑·기간 (SoT)
        ├ series.ts   as-of 조회·주간 샘플링·KRW→USD
        └ rrg.ts      상대 회전 그래프

app/global-flow/page.tsx (ISR 3600, SSR initialData) ─► components/global-flow/*
app/api/global-flow/route.ts ─► hooks/use-global-flow.ts ─► 홈 띠 components/dashboard/global-flow-strip.tsx
```

## 파일

| 파일 | 역할 |
|------|------|
| `scripts/update_global_flow.py` | 수집. 소스별 try/except 격리, 테이블은 `ensure_tables` 가 생성(별도 마이그레이션 없음) |
| `lib/global-flow/assets.ts` | **추적 자산·규모 상수의 SoT.** 심볼은 수집 스크립트 `ASSET_SYMBOLS` 와 일치해야 함 |
| `lib/global-flow/compute.ts` | 가치 변화·판정·순유동성·통로(③)·조립. 판정 임계값 상수 + 보정 근거 주석 |
| `lib/global-flow/rrg.ts` | RRG 계산(`RRG_PARAMS` n=10, k=4, tail=8) |
| `lib/global-flow/series.ts` | 시계열 헬퍼 |
| `lib/global-flow/server.ts` | DB 읽기 (`server-only`, react `cache`) |
| `components/global-flow/global-flow-page.tsx` | 페이지 본체(기간 토글·선택 자산 상태) |
| `components/global-flow/{verdict-header,liquidity-panel,value-change-bars,rotation-chart,flow-channels,global-flow-explainer,format}.tsx` | 섹션별 컴포넌트 |
| `components/market-size/market-size-industry-map.tsx` | 트리맵(시장 규모 페이지와 공유) — `tileNoun`·`tileActionLabel` prop 추가 |
| `app/guide/cross-asset-flow/page.tsx` | 개념 가이드(비브랜드 검색 착지면) |
| `__tests__/unit/global-flow.test.ts` | 계산 로직 유닛 19개 |

연결된 곳: 상단바 `NAV_ITEMS`, `app/sitemap.ts`(페이지·가이드), `app/guide/page.tsx`(심화 문서), `app/data-sources/page.tsx`(출처 표), `lib/permissions/features.ts`(페이지 2·기능 8, 전부 기본 open), `.github/workflows/update-data.yml`.

## 바꿀 때 같이 바꿔야 하는 것

- **자산 추가/삭제**: `assets.ts` `ASSETS` + 수집 스크립트 `ASSET_SYMBOLS`. 규모가 정의되지 않는 자산은 `size: null`(회전 궤적·수익률에만 나온다). `risk` 분류가 판정에 들어가므로 임계값 재보정 고려.
- **ETF 추가**: 수집 스크립트 `ETF_SYMBOLS` + `assets.ts` `ETF_ASSET`.
- **판정 임계값**: `compute.ts` 상단 상수 + 주석의 원측정치 + plan.md 결정 로그.
- **규모 기준점 갱신(연 1회 권장)**: `size.value/date/source` 세 값을 함께. 기준일은 가격 이력(5년) 안에 있어야 한다 — 밖이면 `sizeAtEnd` 가 null 을 돌려 그 자산이 가치 집계에서 조용히 빠진다.
- **기능 게이팅**: `features.ts` 의 `global-flow.*` 는 아직 미배선(Phase B). 잠그려면 화면 배선 + API 마스킹이 먼저.

## 운영 주의점

- **배포 직후 ~ CI 첫 수집 전**에는 테이블이 없다 → API 503, 페이지는 "모으는 중" 안내, 홈 띠는 숨김. 정상이다.
- **ETF 순설정은 forward-only.** 첫 수집일부터 하루 1행씩 쌓이고, 2회 이상 관측돼야 숫자가 나온다. 1년 기간은 1년 뒤에야 온전해진다.
- **통화**: 자산 가격은 USD(코스피만 원/달러로 나눔). 원화 통로 지표(고객예탁금·외국인 순매수)는 `getKrwRate()`(서비스 표시 환율)로 환산 — ₩ 표시에서 원값이 그대로 돌아오게. 이 규칙을 시장 환율로 바꾸면 100.1조원이 108조원으로 보인다.
- **주기가 다른 시계열**: 연준 총자산·TGA 주간(수), 역레포 일간, M2 월간, 개인 MMF 주간(약 6주 지연), MMF 총자산 분기. 화면은 각 기준일을 같이 표기한다.
- **네이버 API 는 비공식.** 형태가 바뀌면 두 한국 시리즈만 멈춘다. 수집 로그의 `ERR kr ...` 를 볼 것.
- **로컬 렌더 검증**: `.env.local` 이 없으면 dev 가 미들웨어 500. 더미 Supabase 값을 환경변수로 주고 `pnpm exec next dev`. `pnpm build` 는 DB 를 db-snapshot 것으로 덮어써 새 테이블이 사라지므로, 로컬 수집 결과로 보려면 `pnpm exec next build`.
- **브라우저 자동화로 확인할 때**: 백그라운드 탭에서는 ResizeObserver 가 돌지 않아 트리맵·회전 궤적 라벨이 기본 크기로 판정된다. 스크린샷을 한 번 찍어 렌더링을 일으킨 뒤 확인할 것.
