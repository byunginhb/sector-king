# Ticker Gaps — sector-king 시드 데이터 분석

작성: sk-ticker-curator
대상 파일: `scripts/seed.ts`, `scripts/migrate-add-industries.ts`, `scripts/migrate-add-new-industries.ts`

분류 규칙
- `KR` = 접미사 `.KS`(KOSPI) 또는 `.KQ`(KOSDAQ)
- `해외` = 그 외 모든 티커 (미국 NYSE/NASDAQ, `.HK`, `.T`, `.TW`, `.PA`, `.L`, ADR 포함)
- 권장 기준: 섹터당 KR ≥ 3, 해외 ≥ 5
  - 섹터 특성상 부재 가능 (예: 글로벌 결제 네트워크에는 한국 상장사 없음 — 국내 부재 정당)

---

## 1. 현황 매트릭스 (산업 × 섹터 × KR/해외 카운트)

각 셀의 형식: `KR / 해외` (예: `1 / 3`은 KR 1종, 해외 3종)

### Tech (산업: tech)

| Category | Sector | KR | 해외 | 기준 | 비고 |
|----------|--------|----|------|------|------|
| computing | os (컴퓨터 OS) | 0 | 2 | 미달 | KR 부재 정당, 해외 보완 필요 |
| computing | cpu (CPU) | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 필요 |
| computing | ddr (DDR) | 2 | 1 | 미달 | KR 충분, 해외 보완 |
| internet | search (검색) | 0 | 1 | 미달 | KR 보완(NAVER), 해외 보완 |
| internet | online_ads (온라인광고) | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 |
| internet | ecommerce (커머스) | 0 | 3 | 미달 | KR 보완(쿠팡 비상장이지만 NYSE 상장), 해외 보완 |
| mobile | mobile_os (모바일OS) | 0 | 2 | 미달 | 시장구조상 양강 — 정당 |
| mobile | mobile_device | 1 | 2 | 미달 | 해외 보완 |
| mobile | ap (AP) | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 |
| media | social_media | 0 | 2 | 미달 | KR 부재 정당, 해외 보완 |
| media | online_video | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 |
| ai | data_center | 0 | 3 | 미달 | 해외 보완 |
| ai | ai_model | 0 | 3 | 미달 | 해외 보완 |
| ai | gpu | 0 | 3 | 미달 | 해외 보완 |
| ai | asic | 0 | 3 | 미달 | 해외 보완 |
| ai | hbm | 2 | 1 | 미달 | 해외 보완 |
| ai | blockchain | 0 | 1 | 미달 | KR 보완, 해외 보완 |
| ai | robot | 1 | 2 | 미달 | 해외 보완 |
| future_tech | autonomous | 0 | 3 | 미달 | 해외 보완 |
| future_tech | quantum | 0 | 3 | 미달 | 해외 보완 |
| future_tech | space | 0 | 2 | 미달 | 해외 보완 |
| fintech | payments | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 |
| fintech | digital_banking | 0 | 3 | 미달 | KR 보완(카카오뱅크), 해외 보완 |
| fintech | crypto_exchange | 0 | 1 | 미달 | KR 부재(상장 없음), 해외 보완 |
| fintech | insurance_tech | 0 | 2 | 미달 | KR 부재, 해외 보완 |
| healthcare | pharma | 0 | 3 | 미달 | 해외 보완 |
| healthcare | biotech | 0 | 3 | 미달 | 해외 보완 |
| healthcare | medical_devices | 0 | 3 | 미달 | 해외 보완 |
| healthcare | digital_health | 0 | 2 | 미달 | 해외 보완 |
| entertainment | gaming | 0 | 3 | 미달 | KR 보완(엔씨/크래프톤/넷마블), 해외 보완 |
| entertainment | streaming | 0 | 3 | 미달 | 해외 보완 |
| entertainment | vr_ar | 0 | 3 | 미달 | 해외 보완 |
| entertainment | esports | 0 | 1 | 미달 | KR 부재, 해외 보완 |
| semiconductor | foundry | 1 | 2 | 미달 | 해외 보완 |
| semiconductor | memory | 2 | 1 | 미달 | 해외 보완 |
| semiconductor | equipment | 0 | 3 | 미달 | KR 보완, 해외 보완 |
| semiconductor | materials | 0 | 1 | 미달 | KR 보완(전구체/포토레지스트), 해외 보완 |
| cloud | iaas | 0 | 3 | 미달 | KR 보완(NAVER 클라우드), 해외 보완 |
| cloud | saas | 0 | 3 | 미달 | 해외 보완 |
| cloud | data_platform | 0 | 2 | 미달 | 해외 보완 |
| cybersecurity | endpoint | 0 | 3 | 미달 | 해외 보완 |
| cybersecurity | network_security | 0 | 3 | 미달 | KR 보완, 해외 보완 |
| cybersecurity | identity | 0 | 2 | 미달 | 해외 보완 |
| ev_energy | ev | 0 | 3 | 미달 | KR 보완(현대차 EV/기아), 해외 보완 |
| ev_energy | battery | 2 | 1 | 미달 | 해외 보완 |
| ev_energy | charging | 0 | 3 | 미달 | KR 부재, 해외 보완 |
| ev_energy | renewable | 0 | 3 | 미달 | KR 보완, 해외 보완 |

### Healthcare (산업: healthcare_industry)

| Category | Sector | KR | 해외 | 기준 | 비고 |
|----------|--------|----|------|------|------|
| pharma_global | obesity | 0 | 3 | 미달 | KR 부재(임상단계만), 해외 보완 |
| pharma_global | rare_disease | 0 | 3 | 미달 | KR 보완 가능(GC셀, 한미약품), 해외 보완 |
| pharma_global | oncology | 0 | 3 | 미달 | KR 보완(유한양행 등), 해외 보완 |
| diagnostics | ivd | 0 | 3 | 미달 | KR 보완(씨젠 등), 해외 보완 |
| diagnostics | genetic_testing | 0 | 2 | 미달 | KR 보완(마크로젠), 해외 보완 |
| healthcare_services | hospital_insurance | 0 | 3 | 미달 | KR 부재 정당(유나이티드헬스 모델 부재), 해외 보완 |
| healthcare_services | cro_cdmo | 0 | 3 | 미달 | KR 보완(삼성바이오 CDMO), 해외 보완 |
| korea_bio | biosimilar | 2 | 0 | 미달 | KR OK, 해외 비교군 보완 |
| korea_bio | cell_gene | 1 KR + 1 KQ | 0 | 미달 | 해외 보완(글로벌 비교군) |

### Energy (산업: energy)

| Category | Sector | KR | 해외 | 기준 | 비고 |
|----------|--------|----|------|------|------|
| traditional_energy | oil_gas | 0 | 3 | 미달 | KR 보완(S-Oil, GS), 해외 보완 |
| traditional_energy | energy_services | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 |
| clean_energy | solar | 0 | 2 | 미달 | KR 보완(한화솔루션, OCI), 해외 보완 |
| clean_energy | hydrogen | 0 | 2 | 미달 | KR 보완(두산퓨얼셀), 해외 보완 |
| mining_resources | lithium | 0 | 2 | 미달 | KR 보완(POSCO홀딩스), 해외 보완 |
| mining_resources | rare_earth | 0 | 1 | 미달 | KR 부재, 해외 보완 |
| utilities | power_gen | 0 | 3 | 미달 | KR 보완(한국전력), 해외 보완 |
| utilities | grid | 0 | 2 | 미달 | KR 보완, 해외 보완 |

### Consumer (산업: consumer)

| Category | Sector | KR | 해외 | 기준 | 비고 |
|----------|--------|----|------|------|------|
| luxury | luxury_fashion | 0 | 2 | 미달 | KR 부재 정당, 해외 보완 |
| luxury | luxury_auto | 0 | 2 | 미달 | KR 부재 정당, 해외 보완 |
| food_beverage | beverage | 0 | 3 | 미달 | KR 보완(롯데칠성), 해외 보완 |
| food_beverage | food | 0 | 3 | 미달 | KR 보완(CJ제일제당), 해외 보완 |
| apparel | sportswear | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 |
| apparel | fast_fashion | 0 | 1 | 미달 | KR 보완(한세실업, F&F), 해외 보완 |
| retail | department_store | 0 | 1 | 미달 | KR 보완(신세계, 현대백화점), 해외 보완 |
| retail | mart_convenience | 0 | 3 | 미달 | KR 보완(이마트, BGF리테일), 해외 보완 |
| consumer_staples | household | 0 | 2 | 미달 | KR 보완(LG생활건강), 해외 보완 |
| consumer_staples | personal_care | 0 | 2 | 미달 | KR 보완(아모레퍼시픽, LG생건), 해외 보완 |

### Finance (산업: finance)

| Category | Sector | KR | 해외 | 기준 | 비고 |
|----------|--------|----|------|------|------|
| banking | global_banks | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 |
| banking | korea_banks | 2 | 0 | 미달 | KR 보완(하나, 우리), 해외 부재 정당 |
| insurance | life_property | 0 | 3 | 미달 | KR 보완(삼성생명, DB손보), 해외 보완 |
| insurance | reinsurance | 0 | 1 | 미달 | KR 보완(코리안리), 해외 보완 |
| asset_management | etf_am | 0 | 2 | 미달 | KR 부재 정당, 해외 보완 |
| asset_management | alternative_am | 0 | 3 | 미달 | KR 부재 정당, 해외 보완 |
| capital_markets | exchanges | 0 | 3 | 미달 | KR 부재(KRX 비상장), 해외 보완 |
| capital_markets | securities | 0 | 3 | 미달 | KR 보완(미래에셋, 한국금융지주), 해외 보완 |

요약: 86 섹터 중 거의 전부 미달. 사유 — (a) 한국 종목 노출이 매우 낮음(메모리·배터리·바이오시밀러 외 거의 부재), (b) 해외 깊이가 5종 미만(평균 2~3종).

---

## 2. 누락 섹터별 권장 보충 종목

각 섹터별 권장 종목은 (티커, 회사명, region, 출처/사유) 순. 출처 약어: SP500=S&P 500, NQ100=NASDAQ-100, KOSPI200=KOSPI200, MSCI=MSCI World, MC=시가총액 상위, IDX=대표 인덱스 구성종목.

### Tech 산업

#### computing.os
- (`ORCL`, Oracle Corporation, 해외, SP500/MC 상위 — 엔터프라이즈 OS/DB)
- (`IBM`, International Business Machines, 해외, SP500/메인프레임 OS)
- (`RHT`/`IBM`, Red Hat, 해외, IBM 자회사 — 리눅스 대표; 별도 상장 없음, IBM으로 대체)

#### computing.cpu
- (`ARM`, Arm Holdings plc, 해외, NASDAQ/IPO 2023 — CPU IP)
- (`MRVL`, Marvell Technology, 해외, SP500 — 데이터센터 CPU/DPU)

#### computing.ddr
- 해외 보완: (`MU`는 이미 포함) → (`WDC`, Western Digital, 해외, SP500 — NAND/스토리지 인접)
- (`STX`, Seagate Technology, 해외, SP500 — 메모리 스토리지 인접)

#### internet.search
- (`035420.KS`, NAVER, KR, KOSPI200 — 한국 검색 1위)
- (`BIDU`, Baidu Inc., 해외, NASDAQ ADR — 중국 검색 1위)
- (`MSFT`, Microsoft (Bing), 해외, MC — 검색 2위, weight 낮게)

#### internet.online_ads
- (`TTD`, The Trade Desk, 해외, NQ100 — DSP 대표)
- (`PINS`, Pinterest Inc., 해외, SP500 — 비주얼 광고)
- (`035420.KS`, NAVER, KR, KOSPI — 한국 디스플레이 광고)
- (`035720.KS`, Kakao, KR, KOSPI200 — 한국 모바일 광고)

#### internet.ecommerce
- (`MELI`, MercadoLibre, 해외, NQ100 — 라틴 이커머스)
- (`SHOP`, Shopify Inc., 해외, NYSE/NQ100 — 이커머스 플랫폼)
- (`CPNG`, Coupang Inc., 해외(NYSE 상장, 한국 사업), NYSE — 한국 이커머스 1위 (region 분류 주의: 미국 상장이므로 해외로 분류)
- (`PDD`, PDD Holdings (Temu/Pinduoduo), 해외, NASDAQ — 중국 이커머스)
- (`9618.HK`, JD.com, 해외, HKEX — 중국)

#### mobile.mobile_device
- (`SONY`, Sony Group, 해외, NYSE ADR — Xperia)
- (`MSI`, Motorola Solutions, 해외, SP500 — 모바일 디바이스 인접)

#### mobile.ap
- (`MRVL`, Marvell Technology, 해외, SP500 — 5G/AP 칩)
- (`SWKS`, Skyworks Solutions, 해외, SP500 — 모바일 RF/AP 인접)

#### media.social_media
- (`PINS`, Pinterest, 해외, SP500)
- (`RDDT`, Reddit Inc., 해외, NYSE 2024 IPO)
- (`MTCH`, Match Group, 해외, SP500 — 소셜/데이팅)

#### media.online_video
- (`WBD`, Warner Bros. Discovery, 해외, SP500 — Max)
- (`PARA`, Paramount Global, 해외, SP500 — Paramount+)

#### ai.data_center
- (`EQIX`, Equinix Inc., 해외, SP500 — 데이터센터 REIT 1위)
- (`DLR`, Digital Realty Trust, 해외, SP500 — 데이터센터 REIT 2위)
- (`VRT`, Vertiv Holdings, 해외, SP500 — 데이터센터 인프라)

#### ai.ai_model
- (`PLTR`, Palantir Technologies, 해외, SP500 — AI/AIP)
- (`AI`, C3.ai, 해외, NYSE — 엔터프라이즈 AI)

#### ai.gpu
- (`INTC`, Intel — Arc GPU, 해외, SP500 (이미 등록))
- (`MRVL`, Marvell — DPU/AI 가속, 해외, SP500)

#### ai.asic
- (`MRVL`, Marvell, 해외, SP500 — 커스텀 ASIC)
- (`ALAB`, Astera Labs, 해외, NASDAQ 2024 IPO — AI 인터커넥트 ASIC)

#### ai.hbm
- (해외 보완) (`AMD`, 해외 — HBM 소비자) (`NVDA`, 해외 — HBM 소비자)
- 한국 외 HBM 직접 공급사 부재 — 이미 KR 2종(005930, 000660)으로 충분.

#### ai.blockchain
- (`MARA`, Marathon Digital, 해외, NASDAQ — 비트코인 채굴)
- (`RIOT`, Riot Platforms, 해외, NASDAQ — 채굴)
- (`HOOD`, Robinhood Markets, 해외, NASDAQ — 크립토 거래)
- KR: 직접 상장 부재 — 정당.

#### ai.robot
- (`ABB`, ABB Ltd, 해외, NYSE — 산업용 로봇)
- (`6954.T`, FANUC, 해외, TSE — 산업용 로봇 1위)
- (`ISRG`, Intuitive Surgical, 해외, SP500 — 의료 로봇 (medical_devices 중복))
- (`042660.KS`, Hanwha Aerospace, KR, KOSPI200 — 방산/로봇)
- (`108860.KQ`, Robotis, KR, KOSDAQ — 휴머노이드)

#### future_tech.autonomous
- (`MBLY`, Mobileye Global, 해외, NASDAQ — 자율주행 칩/SW)
- (`AUR`, Aurora Innovation, 해외, NASDAQ — 자율주행 트럭)
- (`UBER`, Uber Technologies, 해외, NYSE — 로보택시 플랫폼)

#### future_tech.quantum
- (`RGTI`, Rigetti Computing, 해외, NASDAQ — 양자 풀스택)
- (`QBTS`, D-Wave Quantum, 해외, NYSE — 어닐링)
- (`IBM`, IBM, 해외, SP500 — IBM Quantum)

#### future_tech.space
- (`LMT`, Lockheed Martin, 해외, SP500 — 우주/방산)
- (`BA`, Boeing, 해외, SP500 — 우주발사체)
- (`PL`, Planet Labs, 해외, NYSE — 위성)
- (`ASTS`, AST SpaceMobile, 해외, NASDAQ — 위성 통신)
- (`047810.KS`, Korea Aerospace Industries (KAI), KR, KOSPI — 한국 우주항공)

#### fintech.payments
- (`AXP`, American Express, 해외, SP500 — 결제 네트워크)
- (`FIS`, Fidelity National Info Services, 해외, SP500 — 결제 인프라)
- (`ADYEN.AS`, Adyen NV, 해외, Euronext — 글로벌 결제)
- KR: 직접 상장 부재 — 카카오페이/토스페이는 KQ 가능 → (`377300.KS`, Kakao Pay, KR, KOSPI200)

#### fintech.digital_banking
- (`HOOD`, Robinhood, 해외, NASDAQ — 디지털 증권/뱅킹)
- (`AFRM`, Affirm Holdings, 해외, NASDAQ — BNPL)
- (`NU`, Nu Holdings, 해외, NYSE — 라틴 디지털 은행)
- (`323410.KS`, Kakao Bank, KR, KOSPI200 — 한국 인터넷은행 1위)

#### fintech.crypto_exchange
- (`HOOD`, Robinhood Markets, 해외, NASDAQ — 크립토 비중 큼)
- (`MSTR`, MicroStrategy, 해외, NASDAQ — 비트코인 보유사 (간접))
- (`MARA`, Marathon Digital, 해외, NASDAQ)
- KR: 두나무/빗썸 비상장 — 정당.

#### fintech.insurance_tech
- (`HIG`, Hartford Financial — 디지털 손보, 해외, SP500)
- (`PGR`, Progressive Corporation, 해외, SP500 — 디지털 다이렉트)

#### healthcare.pharma
- (`MRK`, Merck & Co., 해외, SP500/MC — 키트루다)
- (`ABBV`, AbbVie, 해외, SP500/MC — 휴미라/스카이리지)
- (`NVS`, Novartis AG, 해외, NYSE ADR)
- (`GSK`, GSK plc, 해외, NYSE ADR)
- (`SNY`, Sanofi, 해외, NYSE ADR)
- (`000100.KS`, Yuhan Corporation, KR, KOSPI200 — 한국 제약 1위)
- (`128940.KS`, Hanmi Pharmaceutical, KR, KOSPI — 한국 신약)

#### healthcare.biotech
- (`GILD`, Gilead Sciences, 해외, SP500 — HIV/항암)
- (`BIIB`, Biogen Inc., 해외, SP500 — 신경계)
- (`AMGN`, Amgen — 이미 등록 (obesity 섹터에서))
- (`SGEN`/`PFE`, Seagen → Pfizer 인수 완료)

#### healthcare.medical_devices
- (`SYK`, Stryker Corporation, 해외, SP500 — 정형외과)
- (`BSX`, Boston Scientific, 해외, SP500 — 심혈관)
- (`EW`, Edwards Lifesciences, 해외, SP500 — 심장 판막)
- (`DXCM`, DexCom, 해외, SP500 — CGM)

#### healthcare.digital_health
- (`HIMS`, Hims & Hers Health, 해외, NYSE — 원격진료)
- (`DOCS`, Doximity, 해외, NYSE — 의료 SNS)
- (`PHR`, Phreesia, 해외, NYSE — 환자 인테이크)

#### entertainment.gaming
- (`TTWO`, Take-Two Interactive, 해외, NQ100 — GTA)
- (`SONY`, Sony Group (PlayStation), 해외, NYSE ADR)
- (`9697.T`, Capcom, 해외, TSE — 일본)
- (`036570.KS`, NCSoft, KR, KOSPI200 — 리니지)
- (`259960.KS`, Krafton, KR, KOSPI200 — 배그)
- (`251270.KS`, Netmarble, KR, KOSPI — 한국 모바일)
- (`263750.KS`, Pearl Abyss, KR, KOSPI — 검은사막)

#### entertainment.streaming
- (`WBD`, Warner Bros. Discovery, 해외, SP500 — Max)
- (`PARA`, Paramount Global, 해외, SP500 — Paramount+)
- (`041510.KS`, SM Entertainment, KR, KOSDAQ — K-콘텐츠)

#### entertainment.vr_ar
- (`SONY`, Sony — PSVR2, 해외, NYSE ADR)
- (`NVDA`, NVIDIA, 해외, NQ100 — Omniverse XR)
- (`SNAP`, Snap Inc., 해외, NYSE — Spectacles AR)

#### entertainment.esports
- (`EA`, Electronic Arts (이미 등록))
- (`TTWO`, Take-Two, 해외, NQ100 — NBA 2K League)
- (`ATVI`, Activision (현 MSFT 자회사) — MSFT로 대체)

#### semiconductor.foundry
- (`GFS`, GlobalFoundries, 해외, NASDAQ — 4위 파운드리)
- (`UMC`, United Microelectronics, 해외, NYSE ADR — 3위 파운드리)
- (`SMIC`/`0981.HK`, SMIC, 해외, HKEX — 중국 파운드리)

#### semiconductor.memory
- 글로벌 메모리는 사실상 3강(삼성/하이닉스/마이크론) — 이미 모두 포함.
- 보완: (`WDC`, Western Digital, 해외 — NAND), (`STX`, Seagate, 해외 — HDD/스토리지)

#### semiconductor.equipment
- (`KLAC`, KLA Corporation, 해외, NQ100 — 검사장비)
- (`TER`, Teradyne Inc., 해외, NQ100 — 테스트 장비)
- (`8035.T`, Tokyo Electron, 해외, TSE — 코터/디벨로퍼)
- (`042700.KS`, Hanmi Semiconductor, KR, KOSPI200 — TC본더 (HBM 장비))
- (`039030.KS`, Eo Technics, KR, KOSDAQ — 레이저 장비)

#### semiconductor.materials
- (`LIN`, Linde plc, 해외, SP500 — 산업가스(반도체))
- (`APD`, Air Products, 해외, SP500 — 산업가스)
- (`5713.T`, Sumitomo Metal Mining, 해외, TSE)
- (`002270.KS`, SK Materials/SK Inc — SK 머티리얼즈, KR — 통합)
- (`036490.KQ`, SK Materials Performance, KR, KOSDAQ — 전구체)
- (`058470.KQ`, Leeno Industrial, KR, KOSDAQ — 검사 소켓)

#### cloud.iaas
- (`ORCL`, Oracle Cloud, 해외, SP500 — OCI)
- (`IBM`, IBM Cloud, 해외, SP500)
- (`BABA`, Alibaba Cloud (이미 등록))
- (`035420.KS`, NAVER (NAVER Cloud), KR, KOSPI200)

#### cloud.saas
- (`ADBE`, Adobe Inc., 해외, NQ100 — 크리에이티브 클라우드)
- (`INTU`, Intuit, 해외, NQ100 — TurboTax/QuickBooks)
- (`TEAM`, Atlassian, 해외, NQ100 — Jira)
- (`DDOG`, Datadog, 해외, NQ100 — 옵저버빌리티)
- (`ZS`, Zscaler, 해외, NQ100 — SASE)

#### cloud.data_platform
- (`PLTR`, Palantir, 해외, SP500 — Foundry)
- (`CFLT`, Confluent, 해외, NASDAQ — Kafka)
- (`DDOG`, Datadog, 해외, NQ100)
- (`ESTC`, Elastic NV, 해외, NYSE)

#### cybersecurity.endpoint
- (`ZS`, Zscaler, 해외, NQ100 (네트워크 보안과 겹치나 endpoint 인접))
- (`NET`, Cloudflare, 해외, NYSE)
- (`CYBR`, CyberArk Software, 해외, NASDAQ — 권한관리)

#### cybersecurity.network_security
- (`NET`, Cloudflare, 해외, NYSE — Edge 보안)
- (`ZS`, Zscaler, 해외, NQ100 — SASE)
- (`CHKP`, Check Point Software, 해외, NASDAQ)
- (`053800.KQ`, AhnLab, KR, KOSDAQ — 한국 1위 보안업체)

#### cybersecurity.identity
- (`CYBR`, CyberArk, 해외, NASDAQ — PAM)
- (`SAIL`, SailPoint (재상장 검토) → 일단 제외)
- (`PING`, Ping Identity (Thoma Bravo 비상장) → 제외)

#### ev_energy.ev
- (`F`, Ford Motor, 해외, SP500 — Mach-E/F-150 Lightning)
- (`GM`, General Motors, 해외, SP500 — Ultium)
- (`LCID`, Lucid Group, 해외, NASDAQ — 럭셔리 EV)
- (`XPEV`, XPeng Inc., 해외, NYSE ADR — 중국 EV)
- (`NIO`, NIO Inc., 해외, NYSE ADR — 중국 EV)
- (`005380.KS`, Hyundai Motor (이미 등록))
- (`000270.KS`, Kia Corporation, KR, KOSPI200)

#### ev_energy.battery
- (`051910.KS`, LG Chem, KR, KOSPI200 — LG에너지솔루션 모회사 (별도 노출 가치))
- (`6752.T`, Panasonic Holdings, 해외, TSE — Tesla 배터리 공급)
- (`QS`, QuantumScape, 해외, NYSE — 전고체)

#### ev_energy.charging
- KR: 직접 상장 부재(SK시그넷 등 비상장) — 보완 어려움.
- 해외 추가: (`SHLS`, Shoals Technologies, 해외, NASDAQ — 충전 인프라 인접)

#### ev_energy.renewable
- (`BEP`, Brookfield Renewable Partners, 해외, NYSE)
- (`SEDG`, SolarEdge Technologies, 해외, NQ100)
- (`RUN`, Sunrun Inc., 해외, NASDAQ — 주택 태양광)
- (`009830.KS`, Hanwha Solutions, KR, KOSPI200 — 한국 태양광 1위)

### Healthcare 산업 (신규 카테고리)

#### pharma_global.obesity
- (`PFE`, Pfizer (이미 등록) — 비만 약물 파이프라인)
- (`AMGN`, Amgen (이미 등록))
- (`VKTX`, Viking Therapeutics, 해외, NASDAQ — 비만 신약 차세대)
- (`ALT`, Altimmune, 해외, NASDAQ)

#### pharma_global.rare_disease
- (`SRPT`, Sarepta Therapeutics, 해외, NASDAQ — 듀센)
- (`ULTRA`/`PTCT`, PTC Therapeutics, 해외, NASDAQ)

#### pharma_global.oncology
- (`MRK`, Merck — 키트루다, 해외, SP500)
- (`ABBV`, AbbVie, 해외, SP500 — Imbruvica)
- (`RHHBY`, Roche Holding ADR, 해외, OTC ADR — 항암 1위)
- (`128940.KS`, Hanmi Pharmaceutical, KR, KOSPI)
- (`000100.KS`, Yuhan Corporation, KR, KOSPI200 — 렉라자)

#### diagnostics.ivd
- (`A`, Agilent Technologies, 해외, SP500)
- (`BIO`, Bio-Rad Laboratories, 해외, NYSE)
- (`SYK`, Stryker (overlap with med devices))
- (`096530.KQ`, Seegene, KR, KOSDAQ — PCR 진단)

#### diagnostics.genetic_testing
- (`NTRA`, Natera, 해외, NASDAQ — NIPT/MRD)
- (`EXAS`, Exact Sciences, 해외, NASDAQ — Cologuard)
- (`TWST`, Twist Bioscience, 해외, NASDAQ — DNA 합성)
- (`038290.KQ`, Macrogen, KR, KOSDAQ)

#### healthcare_services.hospital_insurance
- (`ELV`, Elevance Health, 해외, SP500 — 보험)
- (`CVS`, CVS Health, 해외, SP500 — Aetna 보유)
- (`HUM`, Humana, 해외, SP500)

#### healthcare_services.cro_cdmo
- (`IQV`, IQVIA Holdings, 해외, SP500 — CRO 1위)
- (`ICLR`, ICON plc, 해외, NASDAQ — CRO)
- (`CRL`, Charles River Laboratories, 해외, SP500)
- (`207940.KS`, Samsung Biologics — 이미 등록 (biosimilar 섹터에 포함됨, CDMO에도 추가 매핑 필요))

#### korea_bio.biosimilar (해외 비교군 보강)
- (`AMGN`, Amgen — 바이오시밀러도 보유, 해외)
- (`PFE`, Pfizer (Hospira 인수)) — 비교군

#### korea_bio.cell_gene (해외 비교군 보강)
- (`CRSP`, CRISPR Therapeutics, 해외, NASDAQ)
- (`NTLA`, Intellia Therapeutics, 해외, NASDAQ)
- (`BLUE`, bluebird bio, 해외, NASDAQ)
- (`950140.KS`, GC Biopharma (녹십자), KR, KOSPI — 백신/혈액)

### Energy 산업

#### traditional_energy.oil_gas
- (`SHEL`, Shell plc, 해외, NYSE ADR)
- (`BP`, BP plc, 해외, NYSE ADR)
- (`TTE`, TotalEnergies SE, 해외, NYSE ADR)
- (`010950.KS`, S-Oil, KR, KOSPI200)
- (`078930.KS`, GS Holdings, KR, KOSPI200)
- (`096770.KS`, SK Innovation, KR, KOSPI200)

#### traditional_energy.energy_services
- (`TS`, Tenaris S.A., 해외, NYSE ADR — OCTG 강관)
- (`NOV`, NOV Inc., 해외, NYSE — 시추 장비)
- (`FTI`, TechnipFMC, 해외, NYSE)

#### clean_energy.solar
- (`SEDG`, SolarEdge, 해외, NQ100)
- (`RUN`, Sunrun, 해외, NASDAQ)
- (`009830.KS`, Hanwha Solutions, KR, KOSPI200)
- (`010060.KS`, OCI Holdings, KR, KOSPI — 폴리실리콘)

#### clean_energy.hydrogen
- (`BLDP`, Ballard Power Systems, 해외, NASDAQ — 수소연료전지)
- (`LIN`, Linde plc, 해외, SP500 — 수소가스)
- (`336260.KS`, Doosan Fuel Cell, KR, KOSPI — 한국 수소 1위)
- (`010120.KS`, LS Electric, KR, KOSPI — 수전해)

#### mining_resources.lithium
- (`LAC`, Lithium Americas, 해외, NYSE)
- (`PLL`, Piedmont Lithium, 해외, NASDAQ)
- (`005490.KS`, POSCO Holdings, KR, KOSPI200 — 리튬/이차전지 소재)
- (`003670.KS`, Posco Future M, KR, KOSPI200 — 양극재)

#### mining_resources.rare_earth
- (`MP`, MP Materials (이미 등록))
- (`LYC.AX`, Lynas Rare Earths, 해외, ASX (호주))
- (`USAR`, USA Rare Earth, 해외, NASDAQ)
- (`TMC`, TMC the metals company, 해외, NASDAQ — 심해 광물)

#### utilities.power_gen
- (`AEP`, American Electric Power, 해외, SP500)
- (`EXC`, Exelon Corporation, 해외, SP500)
- (`D`, Dominion Energy, 해외, SP500)
- (`015760.KS`, KEPCO (한국전력), KR, KOSPI200)

#### utilities.grid
- (`PCG`, PG&E Corporation, 해외, SP500 — 캘리포니아 송배전)
- (`AEE`, Ameren Corporation, 해외, SP500)
- (`PWR`, Quanta Services, 해외, SP500 — 송전선 건설)
- (`267260.KS`, Hyundai Electric, KR, KOSPI200 — 변압기)
- (`009150.KS`, Samsung Electro-Mechanics, KR — MLCC (간접))
- (`010120.KS`, LS Electric, KR — 변압기/배전)

### Consumer 산업

#### luxury.luxury_fashion
- (`CFR.SW`, Compagnie Financière Richemont, 해외, SIX (스위스) — 까르띠에)
- (`KER.PA`, Kering SA, 해외, Euronext — 구찌)
- (`PRX.AS`, Prosus / OTLY (LVMH 그룹사 외 비교군)) — 대안 (`CPRI`, Capri Holdings, 해외, NYSE — Versace)
- (`TPR`, Tapestry Inc., 해외, NYSE — Coach/Kate Spade)

#### luxury.luxury_auto
- (`POAHY`/`P911.DE`, Porsche AG, 해외, FRA ADR)
- (`BMW.DE`, BMW AG, 해외, FRA)
- (`MBG.DE`, Mercedes-Benz Group, 해외, FRA)

#### food_beverage.beverage
- (`MNST`, Monster Beverage, 해외, NQ100)
- (`KDP`, Keurig Dr Pepper, 해외, NQ100)
- (`BUD`, Anheuser-Busch InBev, 해외, NYSE ADR)
- (`005300.KS`, Lotte Chilsung Beverage, KR, KOSPI)
- (`006400.KS — 이미 다른 섹터)` 대신 (`033780.KS`, KT&G, KR, KOSPI200) — 음료 인접(인삼음료)
- (`097950.KS`, CJ CheilJedang, KR, KOSPI200 — 비비고/식품)

#### food_beverage.food
- (`MDLZ`, Mondelez International, 해외, NQ100)
- (`KHC`, Kraft Heinz, 해외, NQ100)
- (`GIS`, General Mills, 해외, SP500)
- (`HSY`, The Hershey Company, 해외, SP500)
- (`097950.KS`, CJ CheilJedang, KR, KOSPI200)
- (`004990.KS`, Lotte Corporation, KR, KOSPI200)
- (`280360.KS`, Lotte Wellfood, KR, KOSPI)

#### apparel.sportswear
- (`UAA`, Under Armour, 해외, SP500)
- (`DECK`, Deckers Outdoor, 해외, SP500 — Hoka/UGG)
- (`ONON`, On Holding AG, 해외, NYSE — 스위스 러닝화)

#### apparel.fast_fashion
- (`HM-B.ST`, H&M Hennes & Mauritz, 해외, Stockholm)
- (`9983.T`, Fast Retailing (Uniqlo), 해외, TSE)
- (`ITX.MC`, Inditex (Zara), 해외, BME)
- (`383220.KS`, F&F, KR, KOSPI200 — MLB/Discovery)
- (`105630.KS`, Hansae Co., KR, KOSPI — OEM)

#### retail.department_store
- (`M`, Macy's Inc., 해외, NYSE)
- (`JWN`, Nordstrom Inc., 해외, NYSE)
- (`004170.KS`, Shinsegae Inc., KR, KOSPI200)
- (`069960.KS`, Hyundai Department Store, KR, KOSPI200)
- (`023530.KS`, Lotte Shopping, KR, KOSPI200)

#### retail.mart_convenience
- (`DG`, Dollar General, 해외, SP500)
- (`DLTR`, Dollar Tree, 해외, NQ100)
- (`139480.KS`, E-Mart Inc., KR, KOSPI200)
- (`282330.KS`, BGF retail (CU), KR, KOSPI200)
- (`007070.KS`, GS Retail, KR, KOSPI — GS25)

#### consumer_staples.household
- (`KMB`, Kimberly-Clark, 해외, SP500 — 크리넥스)
- (`CHD`, Church & Dwight, 해외, SP500 — Arm & Hammer)
- (`CLX`, The Clorox Company, 해외, SP500)
- (`051900.KS`, LG H&H (LG생활건강), KR, KOSPI200)
- (`090430.KS`, Amorepacific Corporation, KR, KOSPI200)

#### consumer_staples.personal_care
- (`UL`, Unilever PLC, 해외, NYSE ADR — Dove)
- (`OR.PA`, L'Oréal SA, 해외, Euronext)
- (`KVUE`, Kenvue Inc., 해외, NYSE — J&J 소비자 부문 분사)
- (`090430.KS`, Amorepacific Corporation, KR, KOSPI200)
- (`051900.KS`, LG H&H, KR, KOSPI200)

### Finance 산업

#### banking.global_banks
- (`C`, Citigroup, 해외, SP500)
- (`HSBC`, HSBC Holdings, 해외, NYSE ADR)
- (`UBS`, UBS Group, 해외, NYSE ADR)
- (`8306.T`, Mitsubishi UFJ, 해외, TSE — 일본 1위 은행)
- (`RY`, Royal Bank of Canada, 해외, NYSE)

#### banking.korea_banks (KR 보완)
- (`086790.KS`, Hana Financial Group, KR, KOSPI200)
- (`316140.KS`, Woori Financial Group, KR, KOSPI200)
- (`138930.KS`, BNK Financial Group, KR, KOSPI — 지방은행)
- (`175330.KS`, JB Financial Group, KR, KOSPI — 지방은행)

#### insurance.life_property
- (`AIG`, American International Group, 해외, SP500)
- (`CB`, Chubb Limited, 해외, SP500)
- (`TRV`, The Travelers Companies, 해외, SP500)
- (`PGR`, Progressive, 해외, SP500)
- (`032830.KS`, Samsung Life Insurance, KR, KOSPI200)
- (`005830.KS`, DB Insurance, KR, KOSPI200)
- (`000810.KS`, Samsung Fire & Marine, KR, KOSPI200)

#### insurance.reinsurance
- (`RNR`, RenaissanceRe Holdings, 해외, NYSE)
- (`MUV2.DE`, Munich Re, 해외, FRA — 글로벌 1위)
- (`SREN.SW`, Swiss Re, 해외, SIX)
- (`003690.KS`, Korean Reinsurance, KR, KOSPI — 한국 유일)

#### asset_management.etf_am
- (`STT`, State Street Corporation, 해외, SP500 — SPDR ETF)
- (`AMP`, Ameriprise Financial, 해외, SP500)
- (`IVZ`, Invesco, 해외, SP500 — QQQ)
- (`BEN`, Franklin Resources, 해외, SP500)

#### asset_management.alternative_am
- (`ARES`, Ares Management, 해외, NYSE)
- (`CG`, The Carlyle Group, 해외, NASDAQ)
- (`OWL`, Blue Owl Capital, 해외, NYSE)

#### capital_markets.exchanges
- (`MKTX`, MarketAxess Holdings, 해외, NQ100 — 채권 거래소)
- (`TW`, Tradeweb Markets, 해외, NASDAQ)
- (`COIN`, Coinbase (이미 등록))
- (`CBOE`, Cboe Global Markets, 해외, BATS)

#### capital_markets.securities
- (`IBKR`, Interactive Brokers, 해외, NQ100)
- (`HOOD`, Robinhood Markets, 해외, NASDAQ)
- (`LPLA`, LPL Financial, 해외, NASDAQ)
- (`006800.KS`, Mirae Asset Securities, KR, KOSPI200)
- (`039490.KS`, Kiwoom Securities, KR, KOSPI200)
- (`016360.KS`, Samsung Securities, KR, KOSPI200)
- (`071050.KS`, Korea Investment Holdings, KR, KOSPI200)

---

## 3. 분류 충돌 / region 모호 케이스

원칙: **상장 거래소 기준으로 region을 분류**한다 (사업 본거지 무관). 이는 거래 시간·통화·`toUsd()` 변환 일관성을 위한 결정.

| 케이스 | 티커 예시 | 사업 본거지 | 상장 시장 | 권장 분류 | 사유 |
|--------|-----------|-------------|----------|-----------|------|
| 한국기업 NYSE 상장 | `CPNG` (쿠팡) | 한국 | NYSE | **해외** | `.KS/.KQ` 미부착, USD 거래 |
| 중국기업 미국 ADR | `BABA`, `BIDU`, `NIO`, `XPEV`, `PDD`, `JD` | 중국 | NYSE/NASDAQ | **해외** | ADR도 USD 거래 |
| 한국기업 듀얼리스팅 | (현 시드에는 없음) | — | — | KR 우선 | 만약 추가 시 `.KS` 우선 표기 |
| 중국기업 홍콩 상장 | `1810.HK` (Xiaomi), `9618.HK` | 중국 | HKEX | **해외** | `.HK` 접미사, HKD 거래 |
| 일본기업 | `4063.T`, `6754.T`, `9697.T`, `8306.T` | 일본 | TSE | **해외** | `.T`, JPY |
| 대만기업 ADR | `TSM` | 대만 | NYSE ADR | **해외** | USD 거래 |
| 대만기업 본토 | `2454.TW` | 대만 | TWSE | **해외** | TWD 거래 |
| 유럽기업 본토 | `MC.PA`, `RMS.PA`, `OR.PA`, `BMW.DE`, `ASML` | 유럽 | Euronext/Xetra/AEX | **해외** | EUR |
| 유럽기업 ADR | `NVO`, `AZN`, `SHEL`, `BP`, `UL`, `HSBC`, `NVS`, `SNY`, `GSK`, `RHHBY` | 유럽 | NYSE ADR | **해외** | USD 거래 |
| OTC 핑크 ADR | `BYDDY`, `ADDYY`, `RHHBY`, `POAHY` | 중/독 | OTC | **해외** + 주의 | OTC는 유동성·데이터 신뢰도 낮음. 가능하면 본토 티커(`1211.HK`, `ADS.DE`) 검토 |
| 홀딩 vs 자회사 듀얼 | `005930.KS`(삼성전자) vs 삼성전자우(`005935.KS`) | 한국 | KOSPI | **보통주만** 사용 (`005930.KS`) | 우선주는 별도 종목 — 시드 단순화 위해 보통주만 |
| ETF/펀드 | (현 시드에는 없음) | — | — | **제외** | 개별 종목만 다룸. 추후 ETF 트래커 추가 시 별도 테이블 권장 |
| 비상장 대표 종목 | OpenAI, SpaceX, ByteDance, 두나무, 빗썸 | — | 비상장 | **간접 노출 종목으로 대체** + `notes` 필드에 명시 | 시드에서 이미 사용 중인 패턴 (`notes: '오픈AI (비상장)'`) |
| 인수 완료 종목 | `ATVI`(MS 인수 완료), `SGEN`(Pfizer 인수) | — | 상장폐지 | **모회사로 대체** | ATVI → MSFT, SGEN → PFE |
| 한국기업 OTC ADR | (예: KT, 한국전력 ADR) | 한국 | OTC | **본토 KS 우선** | KR 분류는 `.KS` 기준이므로 본토 티커로 |

추가 권고:
- `region` 컬럼을 `companies` 테이블에 명시 추가 (`KR` | `US` | `CN` | `JP` | `EU` | `OTHER` 등) — 현재는 ticker 접미사로 추론 중. `sk-data-modeler`에 마이그레이션 의뢰.
- 기준이 모호한 경우 다음 규칙 우선순위:
  1. `.KS` / `.KQ` → KR
  2. 그 외 모든 접미사 또는 무접미사 → 해외 (필요시 세부 region 분류)
- 한국 사업 본거지지만 NYSE 상장(쿠팡)은 비즈니스 분석 목적상 `notes`에 "한국 사업"을 표기하되 region 분류는 **해외 유지**.

---

## 4. 시드 보완 패치 계획 (sk-implementer 인계)

### 패치 대상 파일
1. `scripts/migrate-add-new-industries.ts` — 가장 최근 마이그레이션. 해외/한국 종목 일괄 추가.
2. `scripts/seed.ts` — 기존 Tech 산업의 KR/해외 보강. 신규 회사는 COMPANIES에, 매핑은 SECTOR_COMPANIES에.
3. (신규 권장) `scripts/migrate-fill-ticker-gaps.ts` — 멱등 마이그레이션 신규 파일. 기존 시드를 건드리지 않고 `INSERT OR IGNORE`로 추가만 수행. 운영 DB 안전.

### 권장 접근
**옵션 A (권장)**: 별도 마이그레이션 스크립트 신설 (`scripts/migrate-fill-ticker-gaps.ts`)
- 장점: 기존 데이터 영향 없음, 멱등성 보장, 롤백 용이
- 형식: `migrate-add-new-industries.ts` 패턴 그대로 (INSERT OR IGNORE 트랜잭션)

**옵션 B**: `seed.ts` 직접 수정
- 장점: 단일 진실 원천(SSOT) 유지
- 단점: 기존 데이터 DELETE 후 재삽입하므로 운영 DB 데이터 손실 위험 → 운영 데이터 백업 필수

### 신규 스크립트 구조 (옵션 A)

```typescript
// scripts/migrate-fill-ticker-gaps.ts
const NEW_COMPANIES = [
  // Tech - KR 보강
  { ticker: '035420.KS', name: 'NAVER Corporation', nameKo: '네이버' },
  { ticker: '035720.KS', name: 'Kakao Corporation', nameKo: '카카오' },
  { ticker: '323410.KS', name: 'KakaoBank Corp.', nameKo: '카카오뱅크' },
  { ticker: '377300.KS', name: 'Kakao Pay Corp.', nameKo: '카카오페이' },
  { ticker: '036570.KS', name: 'NCSoft Corporation', nameKo: '엔씨소프트' },
  { ticker: '259960.KS', name: 'Krafton Inc.', nameKo: '크래프톤' },
  { ticker: '251270.KS', name: 'Netmarble Corp.', nameKo: '넷마블' },
  { ticker: '263750.KS', name: 'Pearl Abyss Corp.', nameKo: '펄어비스' },
  { ticker: '042660.KS', name: 'Hanwha Aerospace', nameKo: '한화에어로스페이스' },
  { ticker: '108860.KQ', name: 'Robotis Co. Ltd.', nameKo: '로보티즈' },
  { ticker: '042700.KS', name: 'Hanmi Semiconductor', nameKo: '한미반도체' },
  { ticker: '039030.KS', name: 'Eo Technics', nameKo: '이오테크닉스' },
  { ticker: '053800.KQ', name: 'AhnLab Inc.', nameKo: '안랩' },
  { ticker: '009830.KS', name: 'Hanwha Solutions', nameKo: '한화솔루션' },
  { ticker: '000270.KS', name: 'Kia Corporation', nameKo: '기아' },
  { ticker: '051910.KS', name: 'LG Chem Ltd.', nameKo: 'LG화학' },
  { ticker: '047810.KS', name: 'Korea Aerospace Industries', nameKo: 'KAI' },

  // Tech - 해외 보강
  { ticker: 'ORCL', name: 'Oracle Corporation', nameKo: '오라클' },
  { ticker: 'IBM', name: 'IBM Corporation', nameKo: 'IBM' },
  { ticker: 'ARM', name: 'Arm Holdings plc', nameKo: 'ARM' },
  { ticker: 'MRVL', name: 'Marvell Technology', nameKo: '마벨' },
  { ticker: 'WDC', name: 'Western Digital', nameKo: '웨스턴디지털' },
  { ticker: 'STX', name: 'Seagate Technology', nameKo: '시게이트' },
  { ticker: 'BIDU', name: 'Baidu Inc.', nameKo: '바이두' },
  { ticker: 'TTD', name: 'The Trade Desk', nameKo: '트레이드데스크' },
  { ticker: 'PINS', name: 'Pinterest Inc.', nameKo: '핀터레스트' },
  { ticker: 'MELI', name: 'MercadoLibre', nameKo: '메르카도리브레' },
  { ticker: 'SHOP', name: 'Shopify Inc.', nameKo: '쇼피파이' },
  { ticker: 'CPNG', name: 'Coupang Inc.', nameKo: '쿠팡' },
  { ticker: 'PDD', name: 'PDD Holdings', nameKo: 'PDD' },
  { ticker: '9618.HK', name: 'JD.com Inc.', nameKo: 'JD닷컴' },
  { ticker: 'SONY', name: 'Sony Group Corp.', nameKo: '소니' },
  { ticker: 'RDDT', name: 'Reddit Inc.', nameKo: '레딧' },
  { ticker: 'MTCH', name: 'Match Group', nameKo: '매치그룹' },
  { ticker: 'WBD', name: 'Warner Bros. Discovery', nameKo: '워너브라더스 디스커버리' },
  { ticker: 'PARA', name: 'Paramount Global', nameKo: '파라마운트' },
  { ticker: 'EQIX', name: 'Equinix Inc.', nameKo: '에퀴닉스' },
  { ticker: 'DLR', name: 'Digital Realty Trust', nameKo: '디지털리얼티' },
  { ticker: 'VRT', name: 'Vertiv Holdings', nameKo: '버티브' },
  { ticker: 'PLTR', name: 'Palantir Technologies', nameKo: '팔란티어' },
  { ticker: 'ALAB', name: 'Astera Labs', nameKo: '아스테라랩스' },
  { ticker: 'MARA', name: 'Marathon Digital', nameKo: '마라톤디지털' },
  { ticker: 'RIOT', name: 'Riot Platforms', nameKo: '라이엇' },
  { ticker: 'HOOD', name: 'Robinhood Markets', nameKo: '로빈후드' },
  { ticker: 'ABB', name: 'ABB Ltd', nameKo: 'ABB' },
  { ticker: '6954.T', name: 'FANUC Corporation', nameKo: '화낙' },
  { ticker: 'MBLY', name: 'Mobileye Global', nameKo: '모빌아이' },
  { ticker: 'AUR', name: 'Aurora Innovation', nameKo: '오로라' },
  { ticker: 'UBER', name: 'Uber Technologies', nameKo: '우버' },
  { ticker: 'RGTI', name: 'Rigetti Computing', nameKo: '리게티' },
  { ticker: 'QBTS', name: 'D-Wave Quantum', nameKo: '디웨이브' },
  { ticker: 'LMT', name: 'Lockheed Martin', nameKo: '록히드마틴' },
  { ticker: 'PL', name: 'Planet Labs', nameKo: '플래닛랩스' },
  { ticker: 'ASTS', name: 'AST SpaceMobile', nameKo: 'AST' },
  { ticker: 'AXP', name: 'American Express', nameKo: '아메리칸익스프레스' },
  { ticker: 'FIS', name: 'Fidelity National Info Services', nameKo: 'FIS' },
  { ticker: 'AFRM', name: 'Affirm Holdings', nameKo: '어펌' },
  { ticker: 'NU', name: 'Nu Holdings', nameKo: '누홀딩스' },
  { ticker: 'GFS', name: 'GlobalFoundries', nameKo: '글로벌파운드리' },
  { ticker: 'UMC', name: 'United Microelectronics', nameKo: 'UMC' },
  { ticker: 'KLAC', name: 'KLA Corporation', nameKo: 'KLA' },
  { ticker: 'TER', name: 'Teradyne Inc.', nameKo: '테러다인' },
  { ticker: '8035.T', name: 'Tokyo Electron', nameKo: '도쿄일렉트론' },
  { ticker: 'LIN', name: 'Linde plc', nameKo: '린데' },
  { ticker: 'APD', name: 'Air Products', nameKo: '에어프로덕츠' },
  { ticker: 'ADBE', name: 'Adobe Inc.', nameKo: '어도비' },
  { ticker: 'INTU', name: 'Intuit Inc.', nameKo: '인튜이트' },
  { ticker: 'TEAM', name: 'Atlassian Corporation', nameKo: '아틀라시안' },
  { ticker: 'DDOG', name: 'Datadog Inc.', nameKo: '데이터독' },
  { ticker: 'ZS', name: 'Zscaler Inc.', nameKo: 'Zscaler' },
  { ticker: 'CFLT', name: 'Confluent Inc.', nameKo: '컨플루언트' },
  { ticker: 'ESTC', name: 'Elastic NV', nameKo: '엘라스틱' },
  { ticker: 'NET', name: 'Cloudflare Inc.', nameKo: '클라우드플레어' },
  { ticker: 'CYBR', name: 'CyberArk Software', nameKo: '사이버아크' },
  { ticker: 'CHKP', name: 'Check Point Software', nameKo: '체크포인트' },
  { ticker: 'F', name: 'Ford Motor Company', nameKo: '포드' },
  { ticker: 'GM', name: 'General Motors', nameKo: 'GM' },
  { ticker: 'LCID', name: 'Lucid Group', nameKo: '루시드' },
  { ticker: 'XPEV', name: 'XPeng Inc.', nameKo: '샤오펑' },
  { ticker: 'NIO', name: 'NIO Inc.', nameKo: '니오' },
  { ticker: '6752.T', name: 'Panasonic Holdings', nameKo: '파나소닉' },
  { ticker: 'QS', name: 'QuantumScape', nameKo: '퀀텀스케이프' },
  { ticker: 'BEP', name: 'Brookfield Renewable', nameKo: '브룩필드재생' },
  { ticker: 'SEDG', name: 'SolarEdge Technologies', nameKo: '솔라엣지' },
  { ticker: 'RUN', name: 'Sunrun Inc.', nameKo: '선런' },

  // Healthcare 보강
  { ticker: 'MRK', name: 'Merck & Co.', nameKo: '머크' },
  { ticker: 'ABBV', name: 'AbbVie Inc.', nameKo: '애브비' },
  { ticker: 'NVS', name: 'Novartis AG', nameKo: '노바티스' },
  { ticker: 'GSK', name: 'GSK plc', nameKo: 'GSK' },
  { ticker: 'SNY', name: 'Sanofi', nameKo: '사노피' },
  { ticker: 'RHHBY', name: 'Roche Holding ADR', nameKo: '로슈' },
  { ticker: 'GILD', name: 'Gilead Sciences', nameKo: '길리어드' },
  { ticker: 'BIIB', name: 'Biogen Inc.', nameKo: '바이오젠' },
  { ticker: 'SYK', name: 'Stryker Corporation', nameKo: '스트라이커' },
  { ticker: 'BSX', name: 'Boston Scientific', nameKo: '보스턴사이언티픽' },
  { ticker: 'EW', name: 'Edwards Lifesciences', nameKo: '에드워즈' },
  { ticker: 'DXCM', name: 'DexCom Inc.', nameKo: '덱스컴' },
  { ticker: 'HIMS', name: 'Hims & Hers Health', nameKo: '힘스' },
  { ticker: 'DOCS', name: 'Doximity Inc.', nameKo: '독시미티' },
  { ticker: 'A', name: 'Agilent Technologies', nameKo: '애질런트' },
  { ticker: 'BIO', name: 'Bio-Rad Laboratories', nameKo: '바이오라드' },
  { ticker: 'NTRA', name: 'Natera Inc.', nameKo: '네이테라' },
  { ticker: 'EXAS', name: 'Exact Sciences', nameKo: '이그젝트사이언스' },
  { ticker: 'TWST', name: 'Twist Bioscience', nameKo: '트위스트' },
  { ticker: 'ELV', name: 'Elevance Health', nameKo: '엘레반스' },
  { ticker: 'CVS', name: 'CVS Health', nameKo: 'CVS헬스' },
  { ticker: 'HUM', name: 'Humana Inc.', nameKo: '휴매나' },
  { ticker: 'IQV', name: 'IQVIA Holdings', nameKo: 'IQVIA' },
  { ticker: 'ICLR', name: 'ICON plc', nameKo: '아이콘' },
  { ticker: 'CRL', name: 'Charles River Laboratories', nameKo: '찰스리버' },
  { ticker: 'CRSP', name: 'CRISPR Therapeutics', nameKo: '크리스퍼' },
  { ticker: 'NTLA', name: 'Intellia Therapeutics', nameKo: '인텔리아' },
  { ticker: 'VKTX', name: 'Viking Therapeutics', nameKo: '바이킹' },
  { ticker: 'SRPT', name: 'Sarepta Therapeutics', nameKo: '사렙타' },
  { ticker: '000100.KS', name: 'Yuhan Corporation', nameKo: '유한양행' },
  { ticker: '128940.KS', name: 'Hanmi Pharmaceutical', nameKo: '한미약품' },
  { ticker: '096530.KQ', name: 'Seegene Inc.', nameKo: '씨젠' },
  { ticker: '038290.KQ', name: 'Macrogen Inc.', nameKo: '마크로젠' },
  { ticker: '950140.KS', name: 'GC Biopharma', nameKo: '녹십자' },

  // Energy 보강
  { ticker: 'SHEL', name: 'Shell plc', nameKo: '쉘' },
  { ticker: 'BP', name: 'BP plc', nameKo: 'BP' },
  { ticker: 'TTE', name: 'TotalEnergies SE', nameKo: '토탈에너지스' },
  { ticker: 'NOV', name: 'NOV Inc.', nameKo: 'NOV' },
  { ticker: 'FTI', name: 'TechnipFMC plc', nameKo: '테크닙FMC' },
  { ticker: 'BLDP', name: 'Ballard Power Systems', nameKo: '발라드' },
  { ticker: 'LAC', name: 'Lithium Americas', nameKo: '리튬아메리카' },
  { ticker: 'LYC.AX', name: 'Lynas Rare Earths', nameKo: '리나스' },
  { ticker: 'AEP', name: 'American Electric Power', nameKo: 'AEP' },
  { ticker: 'EXC', name: 'Exelon Corporation', nameKo: '엑셀론' },
  { ticker: 'D', name: 'Dominion Energy', nameKo: '도미니언' },
  { ticker: 'PCG', name: 'PG&E Corporation', nameKo: 'PG&E' },
  { ticker: 'PWR', name: 'Quanta Services', nameKo: '퀀타서비스' },
  { ticker: '010950.KS', name: 'S-Oil Corporation', nameKo: 'S-Oil' },
  { ticker: '096770.KS', name: 'SK Innovation', nameKo: 'SK이노베이션' },
  { ticker: '009830.KS', name: 'Hanwha Solutions', nameKo: '한화솔루션' },
  { ticker: '010060.KS', name: 'OCI Holdings', nameKo: 'OCI' },
  { ticker: '336260.KS', name: 'Doosan Fuel Cell', nameKo: '두산퓨얼셀' },
  { ticker: '010120.KS', name: 'LS Electric', nameKo: 'LS일렉트릭' },
  { ticker: '005490.KS', name: 'POSCO Holdings', nameKo: 'POSCO홀딩스' },
  { ticker: '003670.KS', name: 'Posco Future M', nameKo: '포스코퓨처엠' },
  { ticker: '015760.KS', name: 'KEPCO', nameKo: '한국전력' },
  { ticker: '267260.KS', name: 'Hyundai Electric', nameKo: '현대일렉트릭' },

  // Consumer 보강
  { ticker: 'CFR.SW', name: 'Compagnie Financière Richemont', nameKo: '리치몬트' },
  { ticker: 'KER.PA', name: 'Kering SA', nameKo: '케링' },
  { ticker: 'CPRI', name: 'Capri Holdings', nameKo: '카프리' },
  { ticker: 'TPR', name: 'Tapestry Inc.', nameKo: '태피스트리' },
  { ticker: 'P911.DE', name: 'Porsche AG', nameKo: '포르쉐' },
  { ticker: 'BMW.DE', name: 'BMW AG', nameKo: 'BMW' },
  { ticker: 'MBG.DE', name: 'Mercedes-Benz Group', nameKo: '메르세데스' },
  { ticker: 'MNST', name: 'Monster Beverage', nameKo: '몬스터' },
  { ticker: 'KDP', name: 'Keurig Dr Pepper', nameKo: '큐릭' },
  { ticker: 'BUD', name: 'Anheuser-Busch InBev', nameKo: 'AB인베브' },
  { ticker: 'MDLZ', name: 'Mondelez International', nameKo: '몬델리즈' },
  { ticker: 'KHC', name: 'Kraft Heinz', nameKo: '크래프트하인즈' },
  { ticker: 'GIS', name: 'General Mills', nameKo: '제너럴밀스' },
  { ticker: 'HSY', name: 'The Hershey Company', nameKo: '허쉬' },
  { ticker: 'UAA', name: 'Under Armour', nameKo: '언더아머' },
  { ticker: 'DECK', name: 'Deckers Outdoor', nameKo: '데커스' },
  { ticker: 'ONON', name: 'On Holding AG', nameKo: 'On' },
  { ticker: '9983.T', name: 'Fast Retailing', nameKo: '패스트리테일링' },
  { ticker: 'ITX.MC', name: 'Inditex', nameKo: '인디텍스' },
  { ticker: 'M', name: "Macy's Inc.", nameKo: '메이시스' },
  { ticker: 'JWN', name: 'Nordstrom Inc.', nameKo: '노드스트롬' },
  { ticker: 'DG', name: 'Dollar General', nameKo: '달러제너럴' },
  { ticker: 'DLTR', name: 'Dollar Tree', nameKo: '달러트리' },
  { ticker: 'KMB', name: 'Kimberly-Clark', nameKo: '킴벌리클락' },
  { ticker: 'CHD', name: 'Church & Dwight', nameKo: '처치&드와이트' },
  { ticker: 'CLX', name: 'The Clorox Company', nameKo: '클로락스' },
  { ticker: 'UL', name: 'Unilever PLC', nameKo: '유니레버' },
  { ticker: 'OR.PA', name: "L'Oréal SA", nameKo: '로레알' },
  { ticker: 'KVUE', name: 'Kenvue Inc.', nameKo: '켄뷰' },
  { ticker: '035420.KS', name: 'NAVER Corporation', nameKo: '네이버' },
  { ticker: '035720.KS', name: 'Kakao Corporation', nameKo: '카카오' },
  { ticker: '097950.KS', name: 'CJ CheilJedang', nameKo: 'CJ제일제당' },
  { ticker: '005300.KS', name: 'Lotte Chilsung Beverage', nameKo: '롯데칠성음료' },
  { ticker: '383220.KS', name: 'F&F', nameKo: 'F&F' },
  { ticker: '004170.KS', name: 'Shinsegae Inc.', nameKo: '신세계' },
  { ticker: '069960.KS', name: 'Hyundai Department Store', nameKo: '현대백화점' },
  { ticker: '023530.KS', name: 'Lotte Shopping', nameKo: '롯데쇼핑' },
  { ticker: '139480.KS', name: 'E-Mart Inc.', nameKo: '이마트' },
  { ticker: '282330.KS', name: 'BGF retail', nameKo: 'BGF리테일' },
  { ticker: '007070.KS', name: 'GS Retail', nameKo: 'GS리테일' },
  { ticker: '051900.KS', name: 'LG H&H', nameKo: 'LG생활건강' },
  { ticker: '090430.KS', name: 'Amorepacific Corporation', nameKo: '아모레퍼시픽' },

  // Finance 보강
  { ticker: 'C', name: 'Citigroup Inc.', nameKo: '씨티그룹' },
  { ticker: 'HSBC', name: 'HSBC Holdings', nameKo: 'HSBC' },
  { ticker: 'UBS', name: 'UBS Group AG', nameKo: 'UBS' },
  { ticker: '8306.T', name: 'Mitsubishi UFJ', nameKo: '미쓰비시UFJ' },
  { ticker: 'RY', name: 'Royal Bank of Canada', nameKo: 'RBC' },
  { ticker: 'AIG', name: 'AIG Inc.', nameKo: 'AIG' },
  { ticker: 'CB', name: 'Chubb Limited', nameKo: '처브' },
  { ticker: 'TRV', name: 'The Travelers Companies', nameKo: '트래블러스' },
  { ticker: 'PGR', name: 'Progressive Corporation', nameKo: '프로그레시브' },
  { ticker: 'RNR', name: 'RenaissanceRe Holdings', nameKo: '리네상스' },
  { ticker: 'MUV2.DE', name: 'Munich Re', nameKo: '뮤니히재' },
  { ticker: 'STT', name: 'State Street Corporation', nameKo: '스테이트스트리트' },
  { ticker: 'IVZ', name: 'Invesco Ltd.', nameKo: '인베스코' },
  { ticker: 'BEN', name: 'Franklin Resources', nameKo: '프랭클린' },
  { ticker: 'ARES', name: 'Ares Management', nameKo: '아레스' },
  { ticker: 'CG', name: 'The Carlyle Group', nameKo: '칼라일' },
  { ticker: 'OWL', name: 'Blue Owl Capital', nameKo: '블루아울' },
  { ticker: 'MKTX', name: 'MarketAxess Holdings', nameKo: '마켓액세스' },
  { ticker: 'TW', name: 'Tradeweb Markets', nameKo: '트레이드웹' },
  { ticker: 'CBOE', name: 'Cboe Global Markets', nameKo: 'Cboe' },
  { ticker: 'IBKR', name: 'Interactive Brokers', nameKo: '인터랙티브브로커스' },
  { ticker: 'LPLA', name: 'LPL Financial', nameKo: 'LPL' },
  { ticker: '086790.KS', name: 'Hana Financial Group', nameKo: '하나금융지주' },
  { ticker: '316140.KS', name: 'Woori Financial Group', nameKo: '우리금융지주' },
  { ticker: '032830.KS', name: 'Samsung Life Insurance', nameKo: '삼성생명' },
  { ticker: '005830.KS', name: 'DB Insurance', nameKo: 'DB손해보험' },
  { ticker: '000810.KS', name: 'Samsung Fire & Marine', nameKo: '삼성화재' },
  { ticker: '003690.KS', name: 'Korean Reinsurance', nameKo: '코리안리' },
  { ticker: '006800.KS', name: 'Mirae Asset Securities', nameKo: '미래에셋증권' },
  { ticker: '039490.KS', name: 'Kiwoom Securities', nameKo: '키움증권' },
  { ticker: '016360.KS', name: 'Samsung Securities', nameKo: '삼성증권' },
  { ticker: '071050.KS', name: 'Korea Investment Holdings', nameKo: '한국금융지주' },
];
```

### 매핑 패치 (sector_companies)

**중복 방지 규칙**: 한 섹터에 같은 티커가 이미 있으면 건너뜀 (`UNIQUE(sector_id, ticker)` 제약). rank는 신규 추가 시 4 또는 5로 부여 (기존 1~3은 유지).

대표 매핑 예시 (전체는 보충 종목 리스트 §2 참조):
- `os` ← ORCL (rank 3), IBM (rank 4)
- `cpu` ← ARM (rank 4), MRVL (rank 5)
- `search` ← 035420.KS (rank 2), BIDU (rank 3)
- `gaming` ← TTWO (rank 4), 036570.KS (rank 5), 259960.KS (rank 6 — rank 제약 ≤5 검토 필요)
- `oil_gas` ← SHEL (rank 4), BP (rank 5), 010950.KS (rank 6)
- ...

**중요 발견**: 현 스키마에는 `CHECK (rank >= 1 AND rank <= 5)` 제약이 있다(`scripts/seed.ts:477`). 섹터당 6개 이상 종목이 필요한 경우 이 제약을 완화하거나 (`rank ≤ 10`) — 또는 rank 의미를 재정의해야 함.
→ `sk-data-modeler`에 의뢰: rank 제약 완화 마이그레이션(`migrate-relax-rank-check.ts`).

### 협업 인계 사항
- **sk-data-modeler**:
  1. `companies` 테이블에 `region` 컬럼 추가 권장 (`KR | US | CN | JP | EU | OTHER`)
  2. `sector_companies.rank` CHECK 제약 완화 (현 ≤5 → ≤10 권장)
  3. (선택) `is_adr`, `is_dual_listed` 플래그 추가
- **sk-filter-architect**: region 컬럼 추가 시 `lib/industry.ts`의 필터 함수에 region 인자 반영 (`?region=KR` 등). 현 접미사 추론 로직(`.KS|.KQ` 검사)을 컬럼 기반으로 전환.
- **sk-implementer**: 위 신규 스크립트 작성 + 매핑 데이터 채우기 + `package.json`에 `db:fill-gaps` 스크립트 추가 (`tsx scripts/migrate-fill-ticker-gaps.ts`).

### 실행 순서 권장
1. (data-modeler) rank 제약 완화 마이그레이션 → 적용
2. (data-modeler) region 컬럼 추가 → 적용
3. (implementer) `migrate-fill-ticker-gaps.ts` 작성 → 적용
4. (implementer) `scripts/backfill_data.py` 또는 `update_data.py`로 신규 티커들의 가격/마켓캡 데이터 백필
5. (filter-architect) region 필터 반영
6. UI 테스트 — 산업별 페이지에서 신규 종목 노출 확인

---

## 메타

- 분석 일자: 2026-05-09
- 분석 범위: `scripts/seed.ts` (60종 회사) + `scripts/migrate-add-new-industries.ts` (62종 회사). 중복 제외 약 122종.
- 신규 권장 종목 수: 약 200+ 종 (KR 약 50종, 해외 약 150종)
- 후속 호출 시 본 문서를 SSOT로 두고 차이만 갱신.
