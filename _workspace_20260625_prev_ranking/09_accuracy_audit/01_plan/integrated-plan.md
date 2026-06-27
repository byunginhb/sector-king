# 통합 기획서 — 09_accuracy_audit (데이터 정합성·이론 점검 + /guide)

> 작성: 메인 오케스트레이터 · 2026-06-11 · 입력: audit-data-integrity / audit-theory / audit-display / guide-page-design
> 사용자 지시: "문제가 있다면 수정" — 권장안 자동 진행(메모리: 권장안 디폴트)

## 1. 충돌 해결 로그 (메인 직접 코드 검증)

| 항목 | 충돌 | 판정 (lib/money-flow-helpers.ts 직접 정독) |
|---|---|---|
| 자금흐름 정의 | theory·display="시총 변화액" vs guide="거래대금 누적" | **시총 변화액이 맞음**(flowAmount=endCap−startCap, L206-208). guide의 "glossary 정정" 주장은 MFI(거래대금 기반, L176-197)와 혼동 → **기각**. glossary 기존 정의(시총 증감)는 옳음 — "주가 상승 평가액 포함, 실제 순매수 아님" 보강만 |
| KR volume=0 심각도 | data 감사 CRITICAL("KR money-flow 전면 0") | flowAmount는 시총 기반이라 **무영향**. 실영향=MFI 왜곡·거래량 표시 0·scoring vol_ratio → **HIGH로 조정**, 수집 수정은 유지 |
| 갱신주기 문구 | guide "매일 00:00" vs theory 실측 | **1일 2회(KST 16:30 / 익일 07:00)** 채택 |

## 2. 수정 목록 (확정)

### Lane A — 데이터/스크립트 (Python·마이그레이션)
| # | 심각도 | 수정 |
|---|---|---|
| A1 | **CRITICAL** | `scoring.py` 혼합통화: `sector_total_mc`·`weighted_mc`에 `scripts/currency.py::to_usd` 적용 (43개 혼합섹터 mc_score 역전 해소 — MU 0.03%→29.77% 등) |
| A2 | **CRITICAL 연계** | score_history **backfill**: 주말행 제거 후, 일별 scale_score를 당시 snapshots(market_cap/volume USD)로 재계산 + 저장된 growth/profit/sentiment와 합산해 raw_total 재구성 + EMA(α=0.3) 체인 재실행. 입력 부족 시 폴백=forward-only+공지. **DB 백업 필수** |
| A3 | **HIGH** | `update_data.py`: KR volume 0/None일 때 기존값 덮어쓰기 방지(skip 또는 직전 유효값) + 토/일 target_date 저장 skip |
| A4 | **MEDIUM** | 주말(토/일) 행 삭제 마이그레이션: daily_snapshots+score_history (carry-forward 노이즈 6,362행; A2와 같은 마이그레이션에서 처리) |
| A5 | **HIGH** | 데이터 없는 13종목+stale 3종: CATL·ABB 삭제(범위 위반 좀비), SQ(→XYZ 개명)·PARA·JWN·CYBR·BLUE·PLL·EXAS·CFLT·KR4종(263750/039030/041510/950140/326030) yfinance 프로브 후 교체/삭제/복구 |
| A6 | — | 전체 재수집·재스코어링 1회 + verify-market-scope 확장 검증 |

### Lane B — TS/UI/페이지
| # | 심각도 | 수정 |
|---|---|---|
| B1 | **CRITICAL(조건부)** | 환율 SoT 일원화: `lib/currency.ts`에 `getKrwRate()` export(NEXT_PUBLIC_KRW_USD_RATE→KRW_USD_RATE→1450), `lib/format.ts:135` 하드코딩 제거·import (₩ 병기 9개 컴포넌트 일관화) |
| B2 | **HIGH** | money-flow 라벨 정직화: 페이지·flow-summary·카드에 "기간 시가총액 변화 기준" 부제/툴팁(industry-dashboard:136 패턴), glossary inflow/outflow 보강 |
| B3 | **HIGH** | 데이터 기준일 표기: money-flow/price-changes/statistics 헤더 "YYYY-MM-DD 기준"(dashboard/hegemony-map 패턴) |
| B4 | MEDIUM | `priceChange`(USD 절댓값 차) → `priceChangeAbs` 개명(price-changes route+types+클라) |
| B5 | MEDIUM | `formatKrw` 음수 부호 처리(+호출부 flow-summary:99, industry-money-flow-card:241) |
| B6 | MEDIUM | sector-position 점유율에 `(섹터 N개 종목 기준)` 인라인 |
| B7 | MEDIUM | "74일" 하드코딩 라벨 동적화(주말행 삭제로 일수 변동 — score-trend-chart "N/74일" 등) |
| B8 | **신규 페이지** | `/guide` 구현(guide-page-design.md 구조) + GlobalTopBar/푸터/sitemap + FAQ JSON-LD. **단 §1 판정 반영**: 자금흐름="기간 시총 변화액(평가액 증가 포함, 순매수 아님)" / MFI="거래대금 기반 매수압력(비표준 구현)" / 갱신 "1일 2회". 한계고지 8항목=audit-theory 확정 문구 |

### 백로그 (이번 범위 외, 기록만)
자릿수 통일·`Usd` 접미사 컨벤션·company_profiles 공백 정리·실시간 환율 일일 수집(KRW=X)·산업 집계 ticker DISTINCT 재확인(verifier 체크에 포함)

## 3. 수락 기준
- [ ] 혼합섹터(gaming/hbm/battery)에서 US 종목 mc_score가 USD 비중과 일치(스팟 재계산 대조)
- [ ] score_history에 주말 날짜 0건, EMA 체인 연속(최신 smoothed == company_scores)
- [ ] KR volume=0 행이 update 재실행 시 더 이상 생성/덮어쓰기 안 됨
- [ ] 데이터 없는 종목 0(모든 sector_companies 티커가 최신 스냅샷+스코어 보유) 또는 명시적 제거
- [ ] env 환율 변경 시 $·₩ 표기가 같은 환율 사용(코드 경로 검증)
- [ ] money-flow/price-changes/statistics에 기준일 표기
- [ ] `/guide` 렌더·내용이 §1 판정과 일치(자금흐름·MFI·갱신주기 문구), 이모지 0, FAQ JSON-LD
- [ ] tsc·build exit 0, 신규 lint 회귀 0
