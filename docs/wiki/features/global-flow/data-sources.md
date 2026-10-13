# 글로벌 자금 지도 — 데이터 소스

> 상태: 운영 중 · 실측 2026-10-12~13 · 수집 스크립트 `scripts/update_global_flow.py` (아래 "실측" 표시는 이 날짜에 실제 호출로 값을 받아본 것)
> 기획: [plan.md](plan.md) · 개념: [자금 흐름의 세 가지 뜻](../../concepts/money-flow-definitions.md)

원칙: **추가 비용 0, 새 인프라 최소.** 전부 무료·무키 또는 이미 쓰는 소스다.

## 1. 가격 이력 — yfinance (기존 `update_indices.py` 편승)

| 자산 | 심볼 | 용도 | 실측 종가 (2026-10-12) |
|------|------|------|------------------------|
| 미국 주식 | `^GSPC` | 수익률·RRG | 7,807.24 |
| 한국 주식 | `^KS11` | 수익률·RRG (USD 환산 필수) | 6,384.24 |
| 미국 외 세계 주식 | `ACWX` | 수익률·RRG | 75.15 |
| 미국 장기국채 | `TLT` | 수익률·RRG·ETF 순설정 | 78.05 |
| 미국 중기국채 | `IEF` | 보조 | 89.43 |
| 투자등급 회사채 | `LQD` | 수익률·RRG | 102.58 |
| 하이일드 | `HYG` | 수익률·RRG | 77.29 |
| 금 | `GC=F` (선물), `GLD` (ETF) | 가격·ETF 순설정 | 4,203.80 / 382.15 |
| 원유 | `CL=F` | RRG 전용 | 92.40 |
| 구리 | `HG=F` | RRG 전용 | 6.72 |
| 비트코인 | `BTC-USD` | 가격·유통량·시총 | 82,870 (10-13 행) |
| 이더리움 | `ETH-USD` | 가격 | 2,492 (10-13 행) |
| 현금(T-bill) | `BIL` | 수익률(현금 기준선) | 91.50 |
| 달러 인덱스 | `DX-Y.NYB` | 잣대 띠 | 102.41 |
| 원/달러 | `KRW=X` | 잣대 띠·KOSPI USD 환산 | 1,343.48 |

### 함정 (실측으로 확인)

- **크립토는 주말·휴일에도 행이 있다.** 같은 다운로드에서 BTC 는 10-13 행이 있고 주식은 없었다. → 주식 거래일 캘린더에 맞춰 직전 영업일 종가로 정렬(주말 행 버림). 기존 주말 행 정리 규칙(`migrate-clean-weekend-rows`)과 같은 정책.
- **당일 장중 값이 섞인다.** `^KS11` 이 10-13 에 장중 값(5,942)으로 한 행을 더 줬다. → 확정 종가만 쓰도록 "오늘 날짜 행은 장 마감 후에만" 가드 필요. 기존 `update_indices.py` 가 이걸 어떻게 처리하는지 착수 시 확인.
- **KOSPI 는 원화 포인트.** 다른 자산과 비교하려면 `KOSPI수익률_USD = (1+KOSPI수익률) × (시작 환율/끝 환율) − 1`.

## 2. 규모(가치) 산출

| 자산군 | 방식 | 소스 | 갱신 | 실측/비고 |
|--------|------|------|------|-----------|
| 비트코인 | 유통량 × 가격 | yfinance `BTC-USD.info` `circulatingSupply`·`marketCap` | 수집마다 | 실측: 유통 20,097,406 BTC, 시총 $1.66T |
| 금 | 지상 재고(톤) × 32,150.75 oz/t × 금값 | World Gold Council 연간 "above-ground stocks" | 연 1회 상수 | 재고 약 21.6만~22만 t(최신 공표치로 확정). 21.6만 t × $4,204 ≈ **$29T** |
| 주식(미국·한국·세계) | 기준 시총 × 지수 누적 수익률 | 기준 시총: WFE / 각 거래소 연말 공표치 | 연 1회 기준점 + 일별 수익률 | 기준점 이후는 지수 수익률로 굴림 |
| 채권(국채·IG·HY) | 시장 규모 × ETF 누적 수익률 | SIFMA Capital Markets Fact Book | 연 1회 | 가격 수익률만 반영(쿠폰·신규발행 제외 — 한계 명시) |
| 현금(MMF) | 잔고 그 자체 | FRED (아래) | 주간/분기 | ③ 실제 유출입 층 |

규모 상수는 `lib/global-flow/assets.ts` 의 `ASSETS[].size`(anchor·units·level 3종, 각각 source 포함) 한 곳에 두고, 화면 설명 패널에 출처·기준일을 그대로 노출한다.

## 3. 매크로 시계열 — FRED (키 불요 CSV)

**발견:** `https://fred.stlouisfed.org/graph/fredgraph.csv?id=<ID>&cosd=<YYYY-MM-DD>` 는 **API 키 없이** CSV 를 준다(실측 200).

**함정:** 브라우저 User-Agent(Chrome 문자열)를 달고 파이썬에서 부르면 Akamai 가 응답 없이 붙잡아 **타임아웃**된다(curl·기본 UA 는 0.1~2초). 그래서 수집 스크립트는 FRED 에 기본 UA 를 쓰고, 브라우저 UA 는 네이버에만 보낸다.

`id=A,B,C` 처럼 여러 개를 주면 CSV 가 아니라 **ZIP** 이 온다 → 시리즈당 1회 호출. 이 경로를 쓰면 `update-data.yml` 에 `FRED_API_KEY` 시크릿을 추가할 필요가 없다. (정식 API 가 필요해지면 기존 경제 캘린더의 `FRED_API_KEY` 재사용.)

| 시리즈 | 의미 | 주기 | 단위 | 최신 실측 |
|--------|------|------|------|-----------|
| `WALCL` | 연준 총자산 | 주간(수) | **백만$** | 2026-10-07: 6,747,560 ($6.75T) |
| `WTREGEN` | 재무부 일반계정(TGA) | 주간(수) | **백만$** | 2026-10-07: 880,253 ($0.88T) |
| `RRPONTSYD` | 익일물 역레포 | 일간 | **십억$** | 2026-10-09: 0.300 (사실상 소진) |
| `M2SL` | 미국 M2 | 월간 | 십억$ | 200 확인 |
| `WRMFNS` | 리테일 MMF 잔고 | 주간 | 십억$ | 2026-08-31: 3,034.0 — **약 6주 지연** |
| `MMMFFAQ027S` | MMF 총자산(Z.1) | 분기 | 백만$ | 2026-04-01: 8,441,374 ($8.44T) — 분기·지연 |
| `DTWEXBGS` | 광의 달러지수 | 일간 | 지수 | 보조(잣대 대안) |
| `BAMLH0A0HYM2` | 하이일드 스프레드 | 일간 | % | 보조(위험 선호 교차검증) |
| `DGS10` | 미 10년물 금리 | 일간 | % | 보조 |

- **순유동성 = WALCL − WTREGEN − RRPONTSYD×1,000** (단위를 백만$ 로 맞춤). 단위 혼동이 이 계산의 1순위 버그 후보 → 유닛 테스트로 고정.
- 역레포가 사실상 0 이라 현재 순유동성 변화는 대부분 연준 자산과 TGA 가 좌우한다.
- `WIMFNS`(기관 MMF)는 2021-02 에서 끊긴 시리즈다 — 쓰지 말 것.
- MMF 는 FRED 만으로는 신선도가 부족하다(리테일 6주 지연, 총액 분기). 업그레이드 경로: ICI 주간 MMF 자산 발표(약 1주 지연) 수집.

## 4. 크립토 유입 통로 — DefiLlama

| 엔드포인트 | 키 | 용도 | 실측 |
|------------|----|------|------|
| `https://stablecoins.llama.fi/stablecoincharts/all` | 불요 | 스테이블코인 총발행량 일별 이력 | 3,241일치, 최신 $311.0B (`totalCirculatingUSD.peggedUSD`) |

## 5. ETF 순설정 — yfinance `.info` (P2, forward-only)

| 필드 | GLD | TLT | BIL |
|------|-----|-----|-----|
| `sharesOutstanding` | 260,300,000 | 109,700,000 | **없음** |
| `totalAssets` | $141.7B | $46.2B | $49.8B |

- 실측 2026-10-13: 11종 중 `sharesOutstanding` 이 있는 건 SPY·IAU·GLD·TLT 뿐. 나머지(IEF·LQD·HYG·IBIT·EWY·ACWX·BIL)는 **좌수 ≈ AUM ÷ (navPrice 또는 전일 종가)** 로 추정한다.

- `순설정액 ≈ (좌수_t − 좌수_{t−1}) × 가격_t`. `totalAssets` 변화는 가격 효과가 섞이므로 쓰지 않는다.
- 이력이 없다 — 오늘 수집을 시작해야 내일부터 값이 생긴다. **P0 단계부터 좌수 수집만 먼저 켜두는 걸 권장.**
- 열린 질문: 좌수가 매일 갱신되는지(며칠씩 같은 값이면 발행사 일별 CSV 로 대체). BIL 처럼 필드가 없는 ETF 는 제외.

## 6. 한국 축 — 네이버 증권 (키 불요, 운영 중)

옛 `finance.naver.com/sise/*` 페이지는 `stock.naver.com` 으로 이전돼 "더 이상 제공되지 않습니다"만 나온다. 새 앱이 쓰는 JSON API 를 직접 부른다(브라우저 UA + Referer 필요).

| 지표 | 엔드포인트 | 파라미터 | 단위 | 깊이(실측) |
|------|-----------|----------|------|-----------|
| 고객예탁금 | `stock.naver.com/api/domestic/market/trendDeposit` | `startIdx`=**페이지 번호**(0,1…), `pageSize`≤200 | `customerDeposit` = **억원** | 2페이지 = 약 400영업일 |
| 외국인 순매수 | `stock.naver.com/api/domestic/market/trend/daily` | `tradeType=KRX`, `marketType=KOSPI\|KOSDAQ`, `bizdate=YYYYMMDD`, `startIdx`, `pageSize`≤200 | `diffValue` = **원** | 3페이지 이상(2024-04 까지 확인) |

- 외국인 = `investorGubun` **9000(외국인) + 9001(기타외국인)** 합. 8000=개인. `page` 파라미터는 무시되고 `startIdx` 가 페이지 번호다(pageSize 를 넘기면 `too_big` 오류).
- 저장: `KR_CUSTOMER_DEPOSIT`(억원×1e8 → 원), `KR_FOREIGN_NET`(KOSPI+KOSDAQ 합, 원).
- 비공식 API 라 응답 형태가 바뀌면 이 두 시리즈만 멈춘다(소스별 격리). 대안: KOFIA FreeSIS·KRX 정보데이터시스템(OTP), 한국은행 ECOS(키).

## 7. 쓰지 않는 소스

| 소스 | 이유 |
|------|------|
| FRED `GOLDAMGBD228NLBM` (LBMA 금값) | 2022 년 FRED 에서 제거됨 |
| CoinGecko | 공개 API 도 데모 키 필요. BTC/ETH 는 yfinance 로 충분 |
| EPFR·Morningstar 펀드 플로우 | 유료 |
| Farside 등 비트코인 현물 ETF 플로우 표 | 스크래핑 이용 조건 불명확 — ETF 좌수 방식으로 대체 |
