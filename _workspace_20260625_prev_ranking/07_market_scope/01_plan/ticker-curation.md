# 티커 큐레이션 — 시장 범위 미국·한국 한정 (07_market_scope)

작성: sk-ticker-curator · 근거: `data/hegemony.db` 실측 조회(2026-06-10) + `scripts/seed.ts` / `migrate-fill-ticker-gaps.ts`

> **분류 정책 재확인**: region 판정은 **거래소(접미사) 기준**이다. `.KS`/`.KQ` → KR, 그 외 → INTL.
> 본사가 미국이 아니어도 **미국 주상장(NYSE/NASDAQ) 또는 ADR**이면 접미사가 없으므로 INTL로 수용 가능.
> 따라서 "제거"는 본질적으로 **비(非)미국·비한국 거래소 상장 라인을 미국 거래소 라인으로 갈아끼우는 작업**이다.

---

## 0. 핵심 발견 (먼저 읽을 것)

1. **seed.ts는 더 이상 SoT가 아니다.** 22개 제거 대상 중 seed.ts에 존재하는 건 단 3개(`1810.HK`, `2454.TW`, `4063.T`)뿐. 나머지 19개는 `add_ticker.py` / 마이그레이션으로 DB에 직접 추가됨. **삭제·대체 패치는 DB(마이그레이션 스크립트) 기준으로 설계해야 하며, seed.ts는 보조 정리 대상**이다.
2. **TSM·BABA·PDD·SONY는 이미 DB에 미국 라인으로 존재한다.** 즉 일부 "글로벌 대장주"는 별도 ADR 추가 없이 비미국 라인만 제거하면 된다.
   - `TSM` → `foundry`/`asic`/`gpu` 3개 섹터에 이미 존재 (TSMC 대만 라인 `2454.TW`는 사실 **MediaTek**으로, TSMC와 무관함에 주의 — context.md의 "2454.TW=TSMC"는 **오기**. 실제 `2454.TW`는 MediaTek).
   - `BABA`(rank3), `PDD`(rank7)가 ecommerce에 이미 존재 → `9618.HK`(JD) 제거 시 중국 이커머스 대표성은 BABA/PDD가 유지.
   - `SONY`가 gaming·mobile_device·vr_ar에 이미 존재.
3. **`JD`(JD닷컴 NASDAQ ADR)는 DB에 없음** → ecommerce에 추가 후 `9618.HK` 삭제하면 무손실 대체 가능.
4. 데이터 안정성: `2454.TW`(126), `4063.T`(126), `TSM`(129) 모두 yfinance 스냅샷 보유 → 제거해도 미국 라인은 정상 수집 중.

---

## 1. 제거 22개 티커별 처리표

패권도 = 해당 섹터·글로벌 시장에서의 대표성(상/중/하). ADR 티커 중 "확인 필요"는 추측치로, 실제 yfinance 데이터 존재·거래량은 구현 전 검증 요망.

| 티커 | 회사명 | 소속 섹터 | rank | 글로벌 패권도 | 미국 ADR 대체 가능? | 대체 티커 | 조치 |
|------|--------|-----------|------|--------------|---------------------|-----------|------|
| 2454.TW | MediaTek (※TSMC 아님) | ap | 2 | 중 | △ OTC만 (MDTKF, 거래량 낮음) | — | **단순삭제** (ap에 AAPL/QCOM/MRVL/SWKS 잔존, 갭 없음) |
| 1810.HK | Xiaomi | mobile_device | 5 | 중 | △ OTC (XIACY, 거래량 보통) | XIACY *(확인 필요)* | **단순삭제** 권장 (mobile_device에 AAPL·005930.KS·SONY·MSI 잔존). OTC 안정성 미확보 시 채택 보류 |
| 4063.T | Shin-Etsu Chemical | materials | 1 | 상 | △ OTC (SHECY, 거래량 낮음) | SHECY *(확인 필요)* | **삭제후 US보완** — materials는 LIN·APD만 남아 rank1 공백. SHECY OTC 불안정 시 US 화학소재로 갭 보충(아래 §2) |
| 6752.T | Panasonic | battery | 4 | 중 | △ OTC (PCRFY, 거래량 보통) | PCRFY *(확인 필요)* | **단순삭제** (battery에 LGES·삼성SDI·LG화학·QS·CATL 잔존). CATL도 비미국이나 별도 검토 대상 아님(현 작업 범위 외) |
| 6954.T | FANUC | robot | 5 | 상 | △ OTC (FANUY, 거래량 보통) | FANUY *(확인 필요)* | **삭제후 US보완** — robot은 NVDA·TSLA·ABB·한화에어로·현대차·로보티즈 잔존으로 갭은 작음. FANUY OTC 채택은 선택 |
| 8035.T | Tokyo Electron | equipment | 1 | 상 | △ OTC (TOELY, 거래량 보통) | TOELY *(확인 필요)* | **단순삭제** — equipment에 ASML·AMAT·LRCX·KLAC·TER·한미반도체·이오테크닉스 잔존(미국 비중 충분). rank1만 ASML로 승계 |
| 8306.T | Mitsubishi UFJ | global_banks | 1 | 상 | ○ NYSE ADR (MUFG, 거래량 충분) | **MUFG** | **ADR대체** (MUFG는 NYSE 정식 상장, 무접미사=INTL 수용). 무손실 |
| 9618.HK | JD.com | ecommerce | 8 | 중 | ○ NASDAQ ADR (JD, 거래량 충분) | **JD** | **ADR대체** (JD는 NASDAQ 정식). DB 미존재 → 추가. 단 BABA·PDD 존재로 중복 우려 시 단순삭제도 허용 |
| 9697.T | Capcom | gaming | 8 | 중 | △ OTC (CCOEY, 거래량 낮음) | — | **단순삭제** (gaming 10종 중 MSFT·TTWO·RBLX·EA·SONY 등 잔존, 갭 없음) |
| 9983.T | Fast Retailing (유니클로) | fast_fashion | 1 | 상 | △ OTC (FRCOY, 거래량 보통) | FRCOY *(확인 필요)* | **삭제후 US보완** — rank1 공백. fast_fashion에 TJX·F&F·한세 잔존. US fast-fashion 대표는 빈약 → §2 보충 |
| AIR.PA | Airbus | aircraft_mfg | 2 | 상 | △ OTC (EADSY, 거래량 보통) | EADSY *(확인 필요)* | **삭제후 US보완** — aircraft_mfg는 **BA(Boeing) 1종만 남음 → 섹터 거의 붕괴**. §2 필수 보충 |
| BMW.DE | BMW | luxury_auto | 3 | 상 | △ OTC (BMWYY, 거래량 보통) | BMWYY *(확인 필요)* | **삭제후 US보완** — 독일 3사 동시 제거로 섹터 붕괴(§2 참조) |
| CFR.SW | Richemont | luxury_fashion | 4 | 상 | △ OTC (CFRUY, 거래량 낮음) | CFRUY *(확인 필요)* | **삭제후 US보완** — 럭셔리 4대장 동시 제거(§2 참조) |
| ITX.MC | Inditex (자라) | fast_fashion | 5 | 상 | △ OTC (IDEXY, 거래량 낮음) | IDEXY *(확인 필요)* | **단순삭제** (9983.T 처리와 함께 §2에서 fast_fashion 재구성) |
| KER.PA | Kering (구찌) | luxury_fashion | 6 | 상 | △ OTC (PPRUY, 거래량 낮음) | PPRUY *(확인 필요)* | **삭제후 US보완** (§2) |
| LYC.AX | Lynas Rare Earths | rare_earth | 1 | 상 | △ OTC (LYSDY/LYSCF, 거래량 낮음) | — | **단순삭제** — rare_earth는 MP·TMC·USAR(전부 미국) 잔존, rank1만 MP로 승계. 갭 없음 |
| MBG.DE | Mercedes-Benz | luxury_auto | 4 | 상 | △ OTC (MBGYY, 거래량 보통) | MBGYY *(확인 필요)* | **삭제후 US보완** (§2 섹터 재정의) |
| MC.PA | LVMH | luxury_fashion | 2 | 상(세계1위 럭셔리) | △ OTC (LVMUY/LVMHF, 거래량 보통) | LVMUY *(확인 필요)* | **삭제후 US보완** — 섹터 핵심. OTC 거래량 검증 후 채택 권장(§2) |
| MUV2.DE | Munich Re | reinsurance | 4 | 상 | △ OTC (MURGY, 거래량 낮음) | MURGY *(확인 필요)* | **단순삭제** — reinsurance에 BRK-B·RNR·한국재보험 잔존(rank2 BRK-B가 사실상 대장). 갭 없음 |
| OR.PA | L'Oréal | personal_care | 6 | 상 | △ OTC (LRLCY, 거래량 보통) | LRLCY *(확인 필요)* | **단순삭제** — personal_care에 PG·UL·EL·KVUE·아모레·LG생건 잔존. 갭 없음 |
| P911.DE | Porsche AG | luxury_auto | 5 | 중 | ✕ 미국 라인 없음 | — | **단순삭제** (§2 섹터 재정의) |
| RMS.PA | Hermès | luxury_fashion | 1 | 상 | △ OTC (HESAY/HESAF, 거래량 낮음) | HESAY *(확인 필요)* | **삭제후 US보완** — rank1. 섹터 핵심(§2) |

**조치 요약**
- ADR대체(무손실, 정식 미국 상장): **MUFG(8306.T), JD(9618.HK)** — 2종.
- 단순삭제(섹터 미국·한국 잔존 충분): 2454.TW, 1810.HK, 6752.T, 8035.T, 9697.T, LYC.AX, MUV2.DE, OR.PA, P911.DE, ITX.MC — 10종.
- 삭제후 US보완(섹터 대표성 손실, §2에서 보충): 4063.T, 6954.T, 9983.T, AIR.PA, BMW.DE, CFR.SW, KER.PA, MBG.DE, MC.PA, RMS.PA — 10종.

> **OTC ADR 일괄 비채택 권고**: 위 △(OTC) 후보 대부분은 yfinance에서 거래량·펀더멘털(`.info`)이 결측·지연되는 경우가 많아 `update_data.py`의 시총·52주·PER 수집이 불안정하다. **정식 미국 거래소 상장(MUFG, JD)만 채택**하고, OTC ADR은 원칙적으로 채택하지 않으며 미국·한국 직상장 종목으로 갭을 메우는 편을 권장. 단 LVMUY·MBGYY처럼 거래량이 의미 있는 일부는 구현 전 개별 검증.

---

## 2. 섹터별 갭 분석 — 대표 기업이 사라지는 섹터

### 2-1. 섹터 붕괴 (긴급 — 유지/폐지/재정의 판단 필요)

| 섹터 | 제거 후 잔존 | 진단 | 권고 |
|------|-------------|------|------|
| **luxury_fashion** (럭셔리 패션) | TPR(Tapestry), CPRI(Capri) — 미국 중저가 럭셔리 2종만 | RMS/MC/CFR/KER 4대장 전멸 → **세계 럭셔리 패권을 미국 종목으로 표현 불가**. 남은 2종은 "어포더블 럭셔리"라 섹터 정체성 왜곡 | **(A) 섹터 재정의**: "글로벌 럭셔리"→"미국 럭셔리/액세서리"로 좁히고 EL(에스티로더), NKE, RL(Ralph Lauren), CPRI, TPR로 재구성. **또는 (B) LVMUY·HESAY OTC 채택**(거래량 검증 전제)으로 명목 유지. **권장: (A)** — OTC 불안정 회피 |
| **luxury_auto** (럭셔리 자동차) | TSLA, RACE(Ferrari NYSE) | 독일 3사(BMW/MBG/P911) 전멸. RACE는 NYSE 정식이라 잔존. TSLA+RACE 2종으로 "럭셔리 오토" 명목 성립은 하나 독일 프리미엄 부재 | **섹터 유지 가능**(TSLA·RACE). 보강: **GM·F는 럭셔리 아님 → 부적합**. 정식 미국 라인은 RACE뿐 → 2종 유지 또는 mass auto와 통합 검토. **권장: 2종 유지 + 안내 문구**("미국 상장 한정") |
| **aircraft_mfg** (항공기 제조) | BA(Boeing) 1종 | AIR.PA(Airbus) 제거 시 **단일 종목 섹터** → 비교·머니플로우 무의미 | **보충 필수**: 미국 방산·항공 LMT(록히드마틴), RTX(레이시온), GD(제너럴다이내믹스), 한국 KAI(047810.KS, 이미 fill-gaps 등록)·한화에어로(042660.KS). **권장: 섹터를 "항공·방산"으로 확장 재정의** 후 BA·LMT·RTX·GD + 047810.KS 추가 |

### 2-2. rank1 공백 (대표성 손실 — 잔존 종목으로 승계 + 선택적 보충)

| 섹터 | 제거 | 잔존 | 권고 |
|------|------|------|------|
| **materials** (소재) | 4063.T (Shin-Etsu rank1) | LIN, APD (미국 산업가스 2종) | rank1→LIN 승계. 반도체 소재 대표 추가 권장: **미국** ALB(Albemarle), 한국 동진쎄미켐(005290.KQ)·솔브레인(357780.KQ). 갭 보통 |
| **fast_fashion** (패스트패션) | 9983.T(유니클로 rank1), ITX.MC(자라) | TJX, F&F(383220.KS), 한세(105630.KS) | US 순수 fast-fashion 대장 빈약. rank1→TJX 승계. 한국 풀 강함(F&F·한세·영원무역 111770.KS). **권장: 한국 비중 확대 + US는 TJX·ROST(Ross)·BURL(Burlington) 보충** |
| **rare_earth** (희토류) | LYC.AX rank1 | MP, TMC, USAR (전부 미국) | rank1→MP 승계. 갭 없음(미국 종목 충분). 보충 불요 |
| **robot** (로봇) | 6954.T(FANUC) | NVDA, TSLA, ABB, 한화에어로, 현대차, 로보티즈 | 갭 작음. ABB가 산업로봇 승계. 보충 불요(선택: 미국 ISRG-수술로봇, ROK-로크웰) |

### 2-3. 갭 없음 (단순삭제로 충분)

`ap`(AAPL 외 4종), `mobile_device`(AAPL/삼성/SONY/MSI), `battery`(LGES 외 4종), `equipment`(ASML 외 6종), `gaming`(10종 중 8 잔존), `ecommerce`(AMZN/WMT/BABA/PDD/SHOP/MELI/CPNG), `global_banks`(JPM/BAC/C 외, MUFG 대체), `reinsurance`(BRK-B/RNR), `personal_care`(PG/UL/EL 외).

---

## 3. 수집 기준(시총) 큐레이션 룰 — 큐레이터 관점

### 3-1. 섹터 편입 선정 룰 (US/KR 한정)
1. **1차 필터 — 거래소**: NYSE/NASDAQ(무접미사) 또는 `.KS`/`.KQ`만. OTC(접미사 없으나 핑크시트)는 yfinance 데이터 신뢰도 낮음 → **원칙 배제**.
2. **2차 정렬 — USD 시총**: `daily_snapshots.market_cap`을 `toUsd(value, ticker)`로 정규화 후 내림차순. (네이티브 통화 비교 금지 — 통화 정규화 규칙)
3. **3차 — 섹터 대표성 게이트**: 시총만으로 줄세우지 않고 "해당 섹터 매출 비중이 유의미한가"를 큐레이터가 판정. 예: AAPL은 시총 최상위지만 `materials`엔 부적합.
4. **인덱스 출처 우선순위**: 미국 = S&P 500 → NASDAQ 100 → 러셀1000. 한국 = KOSPI200 → KOSDAQ150 대장주.

### 3-2. US/KR 균형 권장치
- 섹터당 **총 5~10종**, 그 중 **KR ≥ 2~3종(가능한 섹터), US ≥ 3~5종**.
- 한국 대표성이 구조적으로 없는 섹터(rare_earth, aircraft·방산 일부, global_banks)는 **KR 부재를 명시**하고 강제 편입하지 않음.
- 럭셔리/패션처럼 한국 대장이 글로벌 비중 낮은 섹터는 **KR은 1~2종 토큰 대표만** 두고 US 중심 구성.

### 3-3. 섹터별 KR 후보 풀 (KOSPI/KOSDAQ 대장주, 보충용)
| 섹터 | KR 후보 (티커 / 회사) | 비고 |
|------|----------------------|------|
| aircraft_mfg(→항공·방산) | 047810.KS 한국항공우주, 042660.KS 한화에어로스페이스 | 한화에어로는 robot에 이미 존재 |
| materials | 005290.KQ 동진쎄미켐, 357780.KQ 솔브레인, 005070.KS 코스모신소재 | 반도체 소재 |
| fast_fashion | 111770.KS 영원무역, 020000.KS 한섬 | F&F·한세 외 보강 |
| luxury_fashion | 020000.KS 한섬, 161890.KS 한국콜마(뷰티) | 글로벌 비중 낮음 — 토큰 대표만 |
| robot | 056190.KS 에스에프에이, 117730.KQ 티로보틱스 | 로보티즈 외 |
| rare_earth | (KR 대표 부재 — 명시) | 강제 편입 금지 |
| reinsurance | 003690.KS 한국재보험(이미 존재) | — |
| global_banks | (글로벌 은행은 KR 부재 — KB/신한은 KR 전용 섹터에) | 강제 편입 금지 |

> 모든 신규 후보는 **구현 단계에서 yfinance 데이터 존재·USD 시총 실측 후 확정**. 본 문서의 KR 후보는 "검토 풀"이며 임의 확정 아님.

---

## 4. 다른 영역 의존

- **sk-data-modeler** (data-model.md):
  - 삭제 마이그레이션 신규 스크립트 `scripts/migrate-remove-non-us-kr.ts` 권고 — 22개 티커를 `sector_companies`에서 DELETE, 다른 섹터에 미참조 시 `companies`·`daily_snapshots`·`company_scores`·`company_profiles`에서도 정리(고아 레코드 방지). idempotent + 트랜잭션.
  - rank 재정렬: 제거로 rank에 구멍 생긴 섹터(예: luxury_fashion rank1·2·4·6 제거 → 3·5만 잔존)에서 **rank 1부터 재채번**. `migrate-relax-rank-check.ts` 존재로 rank 제약이 느슨하니 충돌 위험은 낮으나 UI 정렬 위해 재채번 권장.
  - ADR 추가(MUFG, JD)는 `migrate-fill-ticker-gaps.ts` 동일 패턴(companies INSERT OR IGNORE + region 자동 주입 + sector_companies INSERT OR IGNORE)으로.
  - region 컬럼 동기화: 신규 ADR은 무접미사 → `getRegionFromTicker`가 자동 INTL. 별도 수정 불요.
- **sk-filter-architect** (filter-chain.md):
  - 제거 후 INTL = 순수 미국이므로 region 토글 "global" 라벨을 **"미국(US)"으로 재정의** 합의 필요(context.md §42 연동).
  - `getRegionFromTicker`는 변경 불요(거래소 기준 유지). 단 OTC ADR을 향후 채택할 경우에도 무접미사라 INTL로 정상 분류됨 — 규칙 안정.
- **sk-ui-planner** (ui-plan.md):
  - **섹터 폐지/재정의 UI 영향**: luxury_fashion·luxury_auto·aircraft_mfg 재구성 시 hegemony-map·money-flow·statistics에서 종목 수 급감 → 단일/2종 섹터의 차트(머니플로우 입자, 비교) 빈약 처리.
  - 섹터를 폐지하지 않고 "미국 상장 한정" 안내 배지/문구 노출 검토.
  - 럭셔리 섹터 재정의 시 카테고리 `luxury` 자체 존속 여부 ui-planner와 협의.

---

## 5. 시드/마이그레이션 보완 패치 계획 (실제 패치는 sk-implementer)

1. **신규 `scripts/migrate-remove-non-us-kr.ts`** (주 작업):
   - DELETE 22개 from `sector_companies`.
   - 고아 정리: 어느 섹터에도 안 남은 티커를 `companies`/`daily_snapshots`/`company_scores`/`company_profiles`/`score_history`에서 삭제.
   - 영향 섹터 rank 1부터 재채번.
2. **신규 `scripts/migrate-add-us-kr-replacements.ts`** (보충):
   - ADR대체 2종(MUFG→global_banks, JD→ecommerce) + §2 보충 종목(LMT/RTX/GD/047810.KS→aircraft_mfg, ROST/BURL→fast_fashion 등) INSERT OR IGNORE.
   - 백필 트리거: 신규 티커는 `update_data.py` 다음 사이클 또는 즉시 `add_ticker.py`로 스냅샷 백필.
3. **`scripts/seed.ts` 정리**(보조): line 131(`1810.HK`)·132(`2454.TW`)·167(`4063.T`) 회사 정의 및 line 253·256·386 sector_companies 항목 제거 → seed 재실행 시 좀비 부활 방지. (seed.ts엔 3개만 있으므로 영향 작음.)
4. **검증 쿼리**(sk-verifier 인계): `SELECT DISTINCT` 접미사로 비 US/KR 잔존 0건 확인, 섹터당 종목 수 ≥ 2 확인(단일종목 섹터 없음), MUFG/JD 스냅샷 존재 확인.
