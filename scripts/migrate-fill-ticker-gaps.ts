/**
 * 마이그레이션 — 티커 보완 (S2)
 *
 * - 통합 기획서 §3 단계 S2 / ticker-gaps.md §4 NEW_COMPANIES + §2 매핑
 * - 멱등성: 두 번 실행해도 두 번째 실행은 변경 0건이어야 한다.
 *
 * 절차:
 *   1) companies INSERT OR IGNORE — region은 lib/region.ts의 getRegionFromTicker로 자동 주입
 *   2) sector_companies INSERT OR IGNORE — UNIQUE(sector_id, ticker)로 중복 차단
 *      rank는 명시적으로 부여하되 ≤10 범위 (S1에서 CHECK 완화 적용됨)
 *
 * 실행: pnpm db:fill-gaps
 *
 * 안전 권고: 실행 전 DB 백업.
 *   cp data/hegemony.db data/hegemony.db.bak.$(date +%s)
 */

import Database from 'better-sqlite3'
import path from 'path'
import { getRegionFromTicker } from '../lib/region'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

interface NewCompany {
  ticker: string
  name: string
  nameKo: string
}

interface SectorMapping {
  sectorId: string
  ticker: string
  rank: number
  revenueWeight?: number
  notes?: string
}

/**
 * 신규 회사 목록 (ticker-gaps.md §4 NEW_COMPANIES)
 * region은 자동 도출 — 거래소 기준 (결정 #5)
 */
const NEW_COMPANIES: readonly NewCompany[] = [
  // ── Tech KR ────────────────────────────────────────────────────────────
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
  { ticker: '041510.KS', name: 'SM Entertainment', nameKo: 'SM엔터' },

  // ── Tech 해외 ──────────────────────────────────────────────────────────
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
  { ticker: 'MSI', name: 'Motorola Solutions', nameKo: '모토로라' },
  { ticker: 'SWKS', name: 'Skyworks Solutions', nameKo: '스카이웍스' },
  { ticker: 'RDDT', name: 'Reddit Inc.', nameKo: '레딧' },
  { ticker: 'MTCH', name: 'Match Group', nameKo: '매치그룹' },
  { ticker: 'WBD', name: 'Warner Bros. Discovery', nameKo: '워너브라더스' },
  { ticker: 'PARA', name: 'Paramount Global', nameKo: '파라마운트' },
  { ticker: 'EQIX', name: 'Equinix Inc.', nameKo: '에퀴닉스' },
  { ticker: 'DLR', name: 'Digital Realty Trust', nameKo: '디지털리얼티' },
  { ticker: 'VRT', name: 'Vertiv Holdings', nameKo: '버티브' },
  { ticker: 'PLTR', name: 'Palantir Technologies', nameKo: '팔란티어' },
  { ticker: 'AI', name: 'C3.ai Inc.', nameKo: 'C3.ai' },
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
  { ticker: 'BA', name: 'Boeing Company', nameKo: '보잉' },
  { ticker: 'PL', name: 'Planet Labs', nameKo: '플래닛랩스' },
  { ticker: 'ASTS', name: 'AST SpaceMobile', nameKo: 'AST' },
  { ticker: 'AXP', name: 'American Express', nameKo: '아메리칸익스프레스' },
  { ticker: 'FIS', name: 'Fidelity National Info Services', nameKo: 'FIS' },
  { ticker: 'AFRM', name: 'Affirm Holdings', nameKo: '어펌' },
  { ticker: 'NU', name: 'Nu Holdings', nameKo: '누홀딩스' },
  { ticker: 'MSTR', name: 'MicroStrategy', nameKo: '마이크로스트래티지' },
  { ticker: 'HIG', name: 'Hartford Financial', nameKo: '하트포드' },
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
  { ticker: 'SHLS', name: 'Shoals Technologies', nameKo: '쇼올스' },
  { ticker: 'BEP', name: 'Brookfield Renewable', nameKo: '브룩필드재생' },
  { ticker: 'SEDG', name: 'SolarEdge Technologies', nameKo: '솔라엣지' },
  { ticker: 'RUN', name: 'Sunrun Inc.', nameKo: '선런' },
  { ticker: 'TTWO', name: 'Take-Two Interactive', nameKo: '테이크투' },
  { ticker: '9697.T', name: 'Capcom Co. Ltd.', nameKo: '캡콤' },
  { ticker: 'SNAP', name: 'Snap Inc.', nameKo: '스냅' },

  // ── Healthcare ─────────────────────────────────────────────────────────
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
  { ticker: 'PHR', name: 'Phreesia Inc.', nameKo: '프리지아' },
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
  { ticker: 'BLUE', name: 'bluebird bio', nameKo: '블루버드' },
  { ticker: 'VKTX', name: 'Viking Therapeutics', nameKo: '바이킹' },
  { ticker: 'ALT', name: 'Altimmune', nameKo: '알티뮨' },
  { ticker: 'SRPT', name: 'Sarepta Therapeutics', nameKo: '사렙타' },
  { ticker: 'PTCT', name: 'PTC Therapeutics', nameKo: 'PTC' },
  { ticker: '000100.KS', name: 'Yuhan Corporation', nameKo: '유한양행' },
  { ticker: '128940.KS', name: 'Hanmi Pharmaceutical', nameKo: '한미약품' },
  { ticker: '096530.KQ', name: 'Seegene Inc.', nameKo: '씨젠' },
  { ticker: '038290.KQ', name: 'Macrogen Inc.', nameKo: '마크로젠' },
  { ticker: '950140.KS', name: 'GC Biopharma', nameKo: '녹십자' },

  // ── Energy ─────────────────────────────────────────────────────────────
  { ticker: 'SHEL', name: 'Shell plc', nameKo: '쉘' },
  { ticker: 'BP', name: 'BP plc', nameKo: 'BP' },
  { ticker: 'TTE', name: 'TotalEnergies SE', nameKo: '토탈에너지스' },
  { ticker: 'TS', name: 'Tenaris S.A.', nameKo: '테나리스' },
  { ticker: 'NOV', name: 'NOV Inc.', nameKo: 'NOV' },
  { ticker: 'FTI', name: 'TechnipFMC plc', nameKo: '테크닙FMC' },
  { ticker: 'BLDP', name: 'Ballard Power Systems', nameKo: '발라드' },
  { ticker: 'LAC', name: 'Lithium Americas', nameKo: '리튬아메리카' },
  { ticker: 'PLL', name: 'Piedmont Lithium', nameKo: '피드몬트리튬' },
  { ticker: 'LYC.AX', name: 'Lynas Rare Earths', nameKo: '리나스' },
  { ticker: 'USAR', name: 'USA Rare Earth', nameKo: 'USA희토류' },
  { ticker: 'TMC', name: 'TMC the metals company', nameKo: 'TMC' },
  { ticker: 'AEP', name: 'American Electric Power', nameKo: 'AEP' },
  { ticker: 'EXC', name: 'Exelon Corporation', nameKo: '엑셀론' },
  { ticker: 'D', name: 'Dominion Energy', nameKo: '도미니언' },
  { ticker: 'PCG', name: 'PG&E Corporation', nameKo: 'PG&E' },
  { ticker: 'AEE', name: 'Ameren Corporation', nameKo: '아메렌' },
  { ticker: 'PWR', name: 'Quanta Services', nameKo: '퀀타서비스' },
  { ticker: '010950.KS', name: 'S-Oil Corporation', nameKo: 'S-Oil' },
  { ticker: '078930.KS', name: 'GS Holdings', nameKo: 'GS' },
  { ticker: '096770.KS', name: 'SK Innovation', nameKo: 'SK이노베이션' },
  { ticker: '010060.KS', name: 'OCI Holdings', nameKo: 'OCI' },
  { ticker: '336260.KS', name: 'Doosan Fuel Cell', nameKo: '두산퓨얼셀' },
  { ticker: '010120.KS', name: 'LS Electric', nameKo: 'LS일렉트릭' },
  { ticker: '005490.KS', name: 'POSCO Holdings', nameKo: 'POSCO홀딩스' },
  { ticker: '003670.KS', name: 'Posco Future M', nameKo: '포스코퓨처엠' },
  { ticker: '015760.KS', name: 'KEPCO', nameKo: '한국전력' },
  { ticker: '267260.KS', name: 'Hyundai Electric', nameKo: '현대일렉트릭' },

  // ── Consumer ───────────────────────────────────────────────────────────
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
  { ticker: 'CHD', name: 'Church & Dwight', nameKo: '처치드와이트' },
  { ticker: 'CLX', name: 'The Clorox Company', nameKo: '클로락스' },
  { ticker: 'UL', name: 'Unilever PLC', nameKo: '유니레버' },
  { ticker: 'OR.PA', name: "L'Oréal SA", nameKo: '로레알' },
  { ticker: 'KVUE', name: 'Kenvue Inc.', nameKo: '켄뷰' },
  { ticker: '097950.KS', name: 'CJ CheilJedang', nameKo: 'CJ제일제당' },
  { ticker: '005300.KS', name: 'Lotte Chilsung Beverage', nameKo: '롯데칠성음료' },
  { ticker: '033780.KS', name: 'KT&G', nameKo: 'KT&G' },
  { ticker: '004990.KS', name: 'Lotte Corporation', nameKo: '롯데지주' },
  { ticker: '280360.KS', name: 'Lotte Wellfood', nameKo: '롯데웰푸드' },
  { ticker: '383220.KS', name: 'F&F', nameKo: 'F&F' },
  { ticker: '105630.KS', name: 'Hansae Co.', nameKo: '한세실업' },
  { ticker: '004170.KS', name: 'Shinsegae Inc.', nameKo: '신세계' },
  { ticker: '069960.KS', name: 'Hyundai Department Store', nameKo: '현대백화점' },
  { ticker: '023530.KS', name: 'Lotte Shopping', nameKo: '롯데쇼핑' },
  { ticker: '139480.KS', name: 'E-Mart Inc.', nameKo: '이마트' },
  { ticker: '282330.KS', name: 'BGF retail', nameKo: 'BGF리테일' },
  { ticker: '007070.KS', name: 'GS Retail', nameKo: 'GS리테일' },
  { ticker: '051900.KS', name: 'LG H&H', nameKo: 'LG생활건강' },
  { ticker: '090430.KS', name: 'Amorepacific Corporation', nameKo: '아모레퍼시픽' },

  // ── Finance ────────────────────────────────────────────────────────────
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
  { ticker: 'AMP', name: 'Ameriprise Financial', nameKo: '아메리프라이즈' },
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
  { ticker: '138930.KS', name: 'BNK Financial Group', nameKo: 'BNK금융지주' },
  { ticker: '175330.KS', name: 'JB Financial Group', nameKo: 'JB금융지주' },
  { ticker: '032830.KS', name: 'Samsung Life Insurance', nameKo: '삼성생명' },
  { ticker: '005830.KS', name: 'DB Insurance', nameKo: 'DB손해보험' },
  { ticker: '000810.KS', name: 'Samsung Fire & Marine', nameKo: '삼성화재' },
  { ticker: '003690.KS', name: 'Korean Reinsurance', nameKo: '코리안리' },
  { ticker: '006800.KS', name: 'Mirae Asset Securities', nameKo: '미래에셋증권' },
  { ticker: '039490.KS', name: 'Kiwoom Securities', nameKo: '키움증권' },
  { ticker: '016360.KS', name: 'Samsung Securities', nameKo: '삼성증권' },
  { ticker: '071050.KS', name: 'Korea Investment Holdings', nameKo: '한국금융지주' },
] as const

/**
 * 섹터별 매핑 (ticker-gaps.md §2)
 *
 * - rank는 기존 1~3 다음에 4 이상 부여 (S1에서 CHECK ≤10 완화 적용됨)
 * - UNIQUE(sector_id, ticker)로 중복 자동 차단
 * - sector_id는 DB의 sectors 테이블에 존재하는 ID와 일치해야 함
 */
const SECTOR_COMPANY_MAPPINGS: readonly SectorMapping[] = [
  // ── computing ──────────────────────────────────────────────────────────
  { sectorId: 'os', ticker: 'ORCL', rank: 3 },
  { sectorId: 'os', ticker: 'IBM', rank: 4 },
  { sectorId: 'cpu', ticker: 'ARM', rank: 4 },
  { sectorId: 'cpu', ticker: 'MRVL', rank: 5 },
  { sectorId: 'ddr', ticker: 'WDC', rank: 4 },
  { sectorId: 'ddr', ticker: 'STX', rank: 5 },

  // ── internet ───────────────────────────────────────────────────────────
  { sectorId: 'search', ticker: '035420.KS', rank: 2 },
  { sectorId: 'search', ticker: 'BIDU', rank: 3 },
  { sectorId: 'online_ads', ticker: 'TTD', rank: 4 },
  { sectorId: 'online_ads', ticker: 'PINS', rank: 5 },
  { sectorId: 'online_ads', ticker: '035420.KS', rank: 6 },
  { sectorId: 'online_ads', ticker: '035720.KS', rank: 7 },
  { sectorId: 'ecommerce', ticker: 'MELI', rank: 4 },
  { sectorId: 'ecommerce', ticker: 'SHOP', rank: 5 },
  { sectorId: 'ecommerce', ticker: 'CPNG', rank: 6, notes: '한국 사업, NYSE 상장' },
  { sectorId: 'ecommerce', ticker: 'PDD', rank: 7 },
  { sectorId: 'ecommerce', ticker: '9618.HK', rank: 8 },

  // ── mobile ─────────────────────────────────────────────────────────────
  { sectorId: 'mobile_device', ticker: 'SONY', rank: 4 },
  { sectorId: 'mobile_device', ticker: 'MSI', rank: 5 },
  { sectorId: 'ap', ticker: 'MRVL', rank: 4 },
  { sectorId: 'ap', ticker: 'SWKS', rank: 5 },

  // ── media ──────────────────────────────────────────────────────────────
  { sectorId: 'social_media', ticker: 'PINS', rank: 3 },
  { sectorId: 'social_media', ticker: 'RDDT', rank: 4 },
  { sectorId: 'social_media', ticker: 'MTCH', rank: 5 },
  { sectorId: 'online_video', ticker: 'WBD', rank: 4 },
  { sectorId: 'online_video', ticker: 'PARA', rank: 5 },

  // ── ai ─────────────────────────────────────────────────────────────────
  { sectorId: 'data_center', ticker: 'EQIX', rank: 4 },
  { sectorId: 'data_center', ticker: 'DLR', rank: 5 },
  { sectorId: 'data_center', ticker: 'VRT', rank: 6 },
  { sectorId: 'ai_model', ticker: 'PLTR', rank: 4 },
  { sectorId: 'ai_model', ticker: 'AI', rank: 5 },
  { sectorId: 'gpu', ticker: 'MRVL', rank: 4 },
  { sectorId: 'asic', ticker: 'MRVL', rank: 4 },
  { sectorId: 'asic', ticker: 'ALAB', rank: 5 },
  { sectorId: 'blockchain', ticker: 'MARA', rank: 2 },
  { sectorId: 'blockchain', ticker: 'RIOT', rank: 3 },
  { sectorId: 'blockchain', ticker: 'HOOD', rank: 4 },
  { sectorId: 'robot', ticker: 'ABB', rank: 4 },
  { sectorId: 'robot', ticker: '6954.T', rank: 5 },
  { sectorId: 'robot', ticker: '042660.KS', rank: 6 },
  { sectorId: 'robot', ticker: '108860.KQ', rank: 7 },

  // ── future_tech ────────────────────────────────────────────────────────
  { sectorId: 'autonomous', ticker: 'MBLY', rank: 4 },
  { sectorId: 'autonomous', ticker: 'AUR', rank: 5 },
  { sectorId: 'autonomous', ticker: 'UBER', rank: 6 },
  { sectorId: 'quantum', ticker: 'RGTI', rank: 4 },
  { sectorId: 'quantum', ticker: 'QBTS', rank: 5 },
  { sectorId: 'quantum', ticker: 'IBM', rank: 6 },
  { sectorId: 'space', ticker: 'LMT', rank: 3 },
  { sectorId: 'space', ticker: 'BA', rank: 4 },
  { sectorId: 'space', ticker: 'PL', rank: 5 },
  { sectorId: 'space', ticker: 'ASTS', rank: 6 },
  { sectorId: 'space', ticker: '047810.KS', rank: 7 },

  // ── fintech ────────────────────────────────────────────────────────────
  { sectorId: 'payments', ticker: 'AXP', rank: 4 },
  { sectorId: 'payments', ticker: 'FIS', rank: 5 },
  { sectorId: 'payments', ticker: '377300.KS', rank: 6 },
  { sectorId: 'digital_banking', ticker: 'HOOD', rank: 4 },
  { sectorId: 'digital_banking', ticker: 'AFRM', rank: 5 },
  { sectorId: 'digital_banking', ticker: 'NU', rank: 6 },
  { sectorId: 'digital_banking', ticker: '323410.KS', rank: 7 },
  { sectorId: 'crypto_exchange', ticker: 'HOOD', rank: 2 },
  { sectorId: 'crypto_exchange', ticker: 'MSTR', rank: 3 },
  { sectorId: 'crypto_exchange', ticker: 'MARA', rank: 4 },
  { sectorId: 'insurance_tech', ticker: 'HIG', rank: 3 },
  { sectorId: 'insurance_tech', ticker: 'PGR', rank: 4 },

  // ── healthcare (tech 산업) ─────────────────────────────────────────────
  { sectorId: 'pharma', ticker: 'MRK', rank: 4 },
  { sectorId: 'pharma', ticker: 'ABBV', rank: 5 },
  { sectorId: 'pharma', ticker: 'NVS', rank: 6 },
  { sectorId: 'pharma', ticker: 'GSK', rank: 7 },
  { sectorId: 'pharma', ticker: 'SNY', rank: 8 },
  { sectorId: 'pharma', ticker: '000100.KS', rank: 9 },
  { sectorId: 'pharma', ticker: '128940.KS', rank: 10 },
  { sectorId: 'biotech', ticker: 'GILD', rank: 4 },
  { sectorId: 'biotech', ticker: 'BIIB', rank: 5 },
  { sectorId: 'medical_devices', ticker: 'SYK', rank: 4 },
  { sectorId: 'medical_devices', ticker: 'BSX', rank: 5 },
  { sectorId: 'medical_devices', ticker: 'EW', rank: 6 },
  { sectorId: 'medical_devices', ticker: 'DXCM', rank: 7 },
  { sectorId: 'digital_health', ticker: 'HIMS', rank: 3 },
  { sectorId: 'digital_health', ticker: 'DOCS', rank: 4 },
  { sectorId: 'digital_health', ticker: 'PHR', rank: 5 },

  // ── entertainment ──────────────────────────────────────────────────────
  { sectorId: 'gaming', ticker: 'TTWO', rank: 4 },
  { sectorId: 'gaming', ticker: 'SONY', rank: 5 },
  { sectorId: 'gaming', ticker: '9697.T', rank: 6 },
  { sectorId: 'gaming', ticker: '036570.KS', rank: 7 },
  { sectorId: 'gaming', ticker: '259960.KS', rank: 8 },
  { sectorId: 'gaming', ticker: '251270.KS', rank: 9 },
  { sectorId: 'gaming', ticker: '263750.KS', rank: 10 },
  { sectorId: 'streaming', ticker: 'WBD', rank: 4 },
  { sectorId: 'streaming', ticker: 'PARA', rank: 5 },
  { sectorId: 'streaming', ticker: '041510.KS', rank: 6 },
  { sectorId: 'vr_ar', ticker: 'SONY', rank: 4 },
  { sectorId: 'vr_ar', ticker: 'SNAP', rank: 5 },
  { sectorId: 'esports', ticker: 'TTWO', rank: 2 },

  // ── semiconductor ──────────────────────────────────────────────────────
  { sectorId: 'foundry', ticker: 'GFS', rank: 4 },
  { sectorId: 'foundry', ticker: 'UMC', rank: 5 },
  { sectorId: 'memory', ticker: 'WDC', rank: 4 },
  { sectorId: 'memory', ticker: 'STX', rank: 5 },
  { sectorId: 'equipment', ticker: 'KLAC', rank: 4 },
  { sectorId: 'equipment', ticker: 'TER', rank: 5 },
  { sectorId: 'equipment', ticker: '8035.T', rank: 6 },
  { sectorId: 'equipment', ticker: '042700.KS', rank: 7 },
  { sectorId: 'equipment', ticker: '039030.KS', rank: 8 },
  { sectorId: 'materials', ticker: 'LIN', rank: 2 },
  { sectorId: 'materials', ticker: 'APD', rank: 3 },

  // ── cloud ──────────────────────────────────────────────────────────────
  { sectorId: 'iaas', ticker: 'ORCL', rank: 4 },
  { sectorId: 'iaas', ticker: 'IBM', rank: 5 },
  { sectorId: 'iaas', ticker: '035420.KS', rank: 6 },
  { sectorId: 'saas', ticker: 'ADBE', rank: 4 },
  { sectorId: 'saas', ticker: 'INTU', rank: 5 },
  { sectorId: 'saas', ticker: 'TEAM', rank: 6 },
  { sectorId: 'saas', ticker: 'DDOG', rank: 7 },
  { sectorId: 'saas', ticker: 'ZS', rank: 8 },
  { sectorId: 'data_platform', ticker: 'PLTR', rank: 3 },
  { sectorId: 'data_platform', ticker: 'CFLT', rank: 4 },
  { sectorId: 'data_platform', ticker: 'DDOG', rank: 5 },
  { sectorId: 'data_platform', ticker: 'ESTC', rank: 6 },

  // ── cybersecurity ──────────────────────────────────────────────────────
  { sectorId: 'endpoint', ticker: 'ZS', rank: 4 },
  { sectorId: 'endpoint', ticker: 'NET', rank: 5 },
  { sectorId: 'endpoint', ticker: 'CYBR', rank: 6 },
  { sectorId: 'network_security', ticker: 'NET', rank: 4 },
  { sectorId: 'network_security', ticker: 'ZS', rank: 5 },
  { sectorId: 'network_security', ticker: 'CHKP', rank: 6 },
  { sectorId: 'network_security', ticker: '053800.KQ', rank: 7 },
  { sectorId: 'identity', ticker: 'CYBR', rank: 3 },

  // ── ev_energy ──────────────────────────────────────────────────────────
  { sectorId: 'ev', ticker: 'F', rank: 4 },
  { sectorId: 'ev', ticker: 'GM', rank: 5 },
  { sectorId: 'ev', ticker: 'LCID', rank: 6 },
  { sectorId: 'ev', ticker: 'XPEV', rank: 7 },
  { sectorId: 'ev', ticker: 'NIO', rank: 8 },
  { sectorId: 'ev', ticker: '000270.KS', rank: 9 },
  { sectorId: 'battery', ticker: '051910.KS', rank: 4 },
  { sectorId: 'battery', ticker: '6752.T', rank: 5 },
  { sectorId: 'battery', ticker: 'QS', rank: 6 },
  { sectorId: 'charging', ticker: 'SHLS', rank: 4 },
  { sectorId: 'renewable', ticker: 'BEP', rank: 4 },
  { sectorId: 'renewable', ticker: 'SEDG', rank: 5 },
  { sectorId: 'renewable', ticker: 'RUN', rank: 6 },
  { sectorId: 'renewable', ticker: '009830.KS', rank: 7 },

  // ── pharma_global ──────────────────────────────────────────────────────
  { sectorId: 'obesity', ticker: 'VKTX', rank: 4 },
  { sectorId: 'obesity', ticker: 'ALT', rank: 5 },
  { sectorId: 'rare_disease', ticker: 'SRPT', rank: 4 },
  { sectorId: 'rare_disease', ticker: 'PTCT', rank: 5 },
  { sectorId: 'oncology', ticker: 'MRK', rank: 4 },
  { sectorId: 'oncology', ticker: 'ABBV', rank: 5 },
  { sectorId: 'oncology', ticker: 'RHHBY', rank: 6 },
  { sectorId: 'oncology', ticker: '128940.KS', rank: 7 },
  { sectorId: 'oncology', ticker: '000100.KS', rank: 8 },

  // ── diagnostics ────────────────────────────────────────────────────────
  { sectorId: 'ivd', ticker: 'A', rank: 4 },
  { sectorId: 'ivd', ticker: 'BIO', rank: 5 },
  { sectorId: 'ivd', ticker: '096530.KQ', rank: 6 },
  { sectorId: 'genetic_testing', ticker: 'NTRA', rank: 3 },
  { sectorId: 'genetic_testing', ticker: 'EXAS', rank: 4 },
  { sectorId: 'genetic_testing', ticker: 'TWST', rank: 5 },
  { sectorId: 'genetic_testing', ticker: '038290.KQ', rank: 6 },

  // ── healthcare_services ────────────────────────────────────────────────
  { sectorId: 'hospital_insurance', ticker: 'ELV', rank: 4 },
  { sectorId: 'hospital_insurance', ticker: 'CVS', rank: 5 },
  { sectorId: 'hospital_insurance', ticker: 'HUM', rank: 6 },
  { sectorId: 'cro_cdmo', ticker: 'IQV', rank: 4 },
  { sectorId: 'cro_cdmo', ticker: 'ICLR', rank: 5 },
  { sectorId: 'cro_cdmo', ticker: 'CRL', rank: 6 },
  { sectorId: 'cro_cdmo', ticker: '207940.KS', rank: 7, notes: '삼성바이오 CDMO' },

  // ── korea_bio ──────────────────────────────────────────────────────────
  { sectorId: 'cell_gene', ticker: 'CRSP', rank: 3 },
  { sectorId: 'cell_gene', ticker: 'NTLA', rank: 4 },
  { sectorId: 'cell_gene', ticker: 'BLUE', rank: 5 },
  { sectorId: 'cell_gene', ticker: '950140.KS', rank: 6 },

  // ── traditional_energy ─────────────────────────────────────────────────
  { sectorId: 'oil_gas', ticker: 'SHEL', rank: 4 },
  { sectorId: 'oil_gas', ticker: 'BP', rank: 5 },
  { sectorId: 'oil_gas', ticker: 'TTE', rank: 6 },
  { sectorId: 'oil_gas', ticker: '010950.KS', rank: 7 },
  { sectorId: 'oil_gas', ticker: '078930.KS', rank: 8 },
  { sectorId: 'oil_gas', ticker: '096770.KS', rank: 9 },
  { sectorId: 'energy_services', ticker: 'TS', rank: 4 },
  { sectorId: 'energy_services', ticker: 'NOV', rank: 5 },
  { sectorId: 'energy_services', ticker: 'FTI', rank: 6 },

  // ── clean_energy ───────────────────────────────────────────────────────
  { sectorId: 'solar', ticker: 'SEDG', rank: 3 },
  { sectorId: 'solar', ticker: 'RUN', rank: 4 },
  { sectorId: 'solar', ticker: '009830.KS', rank: 5 },
  { sectorId: 'solar', ticker: '010060.KS', rank: 6 },
  { sectorId: 'hydrogen', ticker: 'BLDP', rank: 3 },
  { sectorId: 'hydrogen', ticker: 'LIN', rank: 4 },
  { sectorId: 'hydrogen', ticker: '336260.KS', rank: 5 },
  { sectorId: 'hydrogen', ticker: '010120.KS', rank: 6 },

  // ── mining_resources ───────────────────────────────────────────────────
  { sectorId: 'lithium', ticker: 'LAC', rank: 3 },
  { sectorId: 'lithium', ticker: 'PLL', rank: 4 },
  { sectorId: 'lithium', ticker: '005490.KS', rank: 5 },
  { sectorId: 'lithium', ticker: '003670.KS', rank: 6 },
  { sectorId: 'rare_earth', ticker: 'LYC.AX', rank: 2 },
  { sectorId: 'rare_earth', ticker: 'USAR', rank: 3 },
  { sectorId: 'rare_earth', ticker: 'TMC', rank: 4 },

  // ── utilities ──────────────────────────────────────────────────────────
  { sectorId: 'power_gen', ticker: 'AEP', rank: 4 },
  { sectorId: 'power_gen', ticker: 'EXC', rank: 5 },
  { sectorId: 'power_gen', ticker: 'D', rank: 6 },
  { sectorId: 'power_gen', ticker: '015760.KS', rank: 7 },
  { sectorId: 'grid', ticker: 'PCG', rank: 3 },
  { sectorId: 'grid', ticker: 'AEE', rank: 4 },
  { sectorId: 'grid', ticker: 'PWR', rank: 5 },
  { sectorId: 'grid', ticker: '267260.KS', rank: 6 },
  { sectorId: 'grid', ticker: '010120.KS', rank: 7 },

  // ── luxury ─────────────────────────────────────────────────────────────
  { sectorId: 'luxury_fashion', ticker: 'CFR.SW', rank: 3 },
  { sectorId: 'luxury_fashion', ticker: 'KER.PA', rank: 4 },
  { sectorId: 'luxury_fashion', ticker: 'CPRI', rank: 5 },
  { sectorId: 'luxury_fashion', ticker: 'TPR', rank: 6 },
  { sectorId: 'luxury_auto', ticker: 'P911.DE', rank: 3 },
  { sectorId: 'luxury_auto', ticker: 'BMW.DE', rank: 4 },
  { sectorId: 'luxury_auto', ticker: 'MBG.DE', rank: 5 },

  // ── food_beverage ──────────────────────────────────────────────────────
  { sectorId: 'beverage', ticker: 'MNST', rank: 4 },
  { sectorId: 'beverage', ticker: 'KDP', rank: 5 },
  { sectorId: 'beverage', ticker: 'BUD', rank: 6 },
  { sectorId: 'beverage', ticker: '005300.KS', rank: 7 },
  { sectorId: 'beverage', ticker: '033780.KS', rank: 8 },
  { sectorId: 'beverage', ticker: '097950.KS', rank: 9 },
  { sectorId: 'food', ticker: 'MDLZ', rank: 4 },
  { sectorId: 'food', ticker: 'KHC', rank: 5 },
  { sectorId: 'food', ticker: 'GIS', rank: 6 },
  { sectorId: 'food', ticker: 'HSY', rank: 7 },
  { sectorId: 'food', ticker: '097950.KS', rank: 8 },
  { sectorId: 'food', ticker: '004990.KS', rank: 9 },
  { sectorId: 'food', ticker: '280360.KS', rank: 10 },

  // ── apparel ────────────────────────────────────────────────────────────
  { sectorId: 'sportswear', ticker: 'UAA', rank: 4 },
  { sectorId: 'sportswear', ticker: 'DECK', rank: 5 },
  { sectorId: 'sportswear', ticker: 'ONON', rank: 6 },
  { sectorId: 'fast_fashion', ticker: '9983.T', rank: 2 },
  { sectorId: 'fast_fashion', ticker: 'ITX.MC', rank: 3 },
  { sectorId: 'fast_fashion', ticker: '383220.KS', rank: 4 },
  { sectorId: 'fast_fashion', ticker: '105630.KS', rank: 5 },

  // ── retail ─────────────────────────────────────────────────────────────
  { sectorId: 'department_store', ticker: 'M', rank: 2 },
  { sectorId: 'department_store', ticker: 'JWN', rank: 3 },
  { sectorId: 'department_store', ticker: '004170.KS', rank: 4 },
  { sectorId: 'department_store', ticker: '069960.KS', rank: 5 },
  { sectorId: 'department_store', ticker: '023530.KS', rank: 6 },
  { sectorId: 'mart_convenience', ticker: 'DG', rank: 4 },
  { sectorId: 'mart_convenience', ticker: 'DLTR', rank: 5 },
  { sectorId: 'mart_convenience', ticker: '139480.KS', rank: 6 },
  { sectorId: 'mart_convenience', ticker: '282330.KS', rank: 7 },
  { sectorId: 'mart_convenience', ticker: '007070.KS', rank: 8 },

  // ── consumer_staples ───────────────────────────────────────────────────
  { sectorId: 'household', ticker: 'KMB', rank: 3 },
  { sectorId: 'household', ticker: 'CHD', rank: 4 },
  { sectorId: 'household', ticker: 'CLX', rank: 5 },
  { sectorId: 'household', ticker: '051900.KS', rank: 6 },
  { sectorId: 'household', ticker: '090430.KS', rank: 7 },
  { sectorId: 'personal_care', ticker: 'UL', rank: 3 },
  { sectorId: 'personal_care', ticker: 'OR.PA', rank: 4 },
  { sectorId: 'personal_care', ticker: 'KVUE', rank: 5 },
  { sectorId: 'personal_care', ticker: '090430.KS', rank: 6 },
  { sectorId: 'personal_care', ticker: '051900.KS', rank: 7 },

  // ── banking ────────────────────────────────────────────────────────────
  { sectorId: 'global_banks', ticker: 'C', rank: 4 },
  { sectorId: 'global_banks', ticker: 'HSBC', rank: 5 },
  { sectorId: 'global_banks', ticker: 'UBS', rank: 6 },
  { sectorId: 'global_banks', ticker: '8306.T', rank: 7 },
  { sectorId: 'global_banks', ticker: 'RY', rank: 8 },
  { sectorId: 'korea_banks', ticker: '086790.KS', rank: 3 },
  { sectorId: 'korea_banks', ticker: '316140.KS', rank: 4 },
  { sectorId: 'korea_banks', ticker: '138930.KS', rank: 5 },
  { sectorId: 'korea_banks', ticker: '175330.KS', rank: 6 },

  // ── insurance ──────────────────────────────────────────────────────────
  { sectorId: 'life_property', ticker: 'AIG', rank: 4 },
  { sectorId: 'life_property', ticker: 'CB', rank: 5 },
  { sectorId: 'life_property', ticker: 'TRV', rank: 6 },
  { sectorId: 'life_property', ticker: 'PGR', rank: 7 },
  { sectorId: 'life_property', ticker: '032830.KS', rank: 8 },
  { sectorId: 'life_property', ticker: '005830.KS', rank: 9 },
  { sectorId: 'life_property', ticker: '000810.KS', rank: 10 },
  { sectorId: 'reinsurance', ticker: 'RNR', rank: 2 },
  { sectorId: 'reinsurance', ticker: 'MUV2.DE', rank: 3 },
  { sectorId: 'reinsurance', ticker: '003690.KS', rank: 4 },

  // ── asset_management ───────────────────────────────────────────────────
  { sectorId: 'etf_am', ticker: 'STT', rank: 3 },
  { sectorId: 'etf_am', ticker: 'AMP', rank: 4 },
  { sectorId: 'etf_am', ticker: 'IVZ', rank: 5 },
  { sectorId: 'etf_am', ticker: 'BEN', rank: 6 },
  { sectorId: 'alternative_am', ticker: 'ARES', rank: 4 },
  { sectorId: 'alternative_am', ticker: 'CG', rank: 5 },
  { sectorId: 'alternative_am', ticker: 'OWL', rank: 6 },

  // ── capital_markets ────────────────────────────────────────────────────
  { sectorId: 'exchanges', ticker: 'MKTX', rank: 4 },
  { sectorId: 'exchanges', ticker: 'TW', rank: 5 },
  { sectorId: 'exchanges', ticker: 'CBOE', rank: 6 },
  { sectorId: 'securities', ticker: 'IBKR', rank: 4 },
  { sectorId: 'securities', ticker: 'HOOD', rank: 5 },
  { sectorId: 'securities', ticker: 'LPLA', rank: 6 },
  { sectorId: 'securities', ticker: '006800.KS', rank: 7 },
  { sectorId: 'securities', ticker: '039490.KS', rank: 8 },
  { sectorId: 'securities', ticker: '016360.KS', rank: 9 },
  { sectorId: 'securities', ticker: '071050.KS', rank: 10 },
] as const

interface InsertResult {
  attempted: number
  inserted: number
  skipped: number
}

async function migrate(): Promise<void> {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  try {
    // ── Step 1: companies INSERT OR IGNORE ────────────────────────────────
    const companyResult: InsertResult = { attempted: 0, inserted: 0, skipped: 0 }

    const insertCompany = sqlite.prepare(
      `INSERT OR IGNORE INTO companies (ticker, name, name_ko, region) VALUES (?, ?, ?, ?)`
    )

    const tx1 = sqlite.transaction((rows: readonly NewCompany[]) => {
      for (const row of rows) {
        const region = getRegionFromTicker(row.ticker)
        const info = insertCompany.run(row.ticker, row.name, row.nameKo, region)
        companyResult.attempted += 1
        if (info.changes === 1) {
          companyResult.inserted += 1
        } else {
          companyResult.skipped += 1
        }
      }
    })

    tx1(NEW_COMPANIES)

    console.log(
      `[1/2] companies INSERT OR IGNORE — 추가 ${companyResult.inserted}건 / 시도 ${companyResult.attempted}건 (skip ${companyResult.skipped})`
    )

    // ── Step 2: sector_companies INSERT OR IGNORE ─────────────────────────
    const mappingResult: InsertResult = { attempted: 0, inserted: 0, skipped: 0 }

    const insertMapping = sqlite.prepare(
      `INSERT OR IGNORE INTO sector_companies (sector_id, ticker, rank, revenue_weight, notes) VALUES (?, ?, ?, ?, ?)`
    )

    // sector_id 무결성 사전 확인 (FK 위반 회피)
    const validSectorIds = new Set(
      (sqlite.prepare('SELECT id FROM sectors').all() as { id: string }[]).map((r) => r.id)
    )
    const validTickers = new Set(
      (sqlite.prepare('SELECT ticker FROM companies').all() as { ticker: string }[]).map(
        (r) => r.ticker
      )
    )

    const skippedDetails: string[] = []

    const tx2 = sqlite.transaction((rows: readonly SectorMapping[]) => {
      for (const row of rows) {
        mappingResult.attempted += 1

        if (!validSectorIds.has(row.sectorId)) {
          mappingResult.skipped += 1
          skippedDetails.push(`unknown sector_id: ${row.sectorId} (ticker=${row.ticker})`)
          continue
        }
        if (!validTickers.has(row.ticker)) {
          mappingResult.skipped += 1
          skippedDetails.push(`unknown ticker: ${row.ticker} (sector=${row.sectorId})`)
          continue
        }

        const info = insertMapping.run(
          row.sectorId,
          row.ticker,
          row.rank,
          row.revenueWeight ?? 1.0,
          row.notes ?? null
        )

        if (info.changes === 1) {
          mappingResult.inserted += 1
        } else {
          mappingResult.skipped += 1
        }
      }
    })

    tx2(SECTOR_COMPANY_MAPPINGS)

    console.log(
      `[2/2] sector_companies INSERT OR IGNORE — 추가 ${mappingResult.inserted}건 / 시도 ${mappingResult.attempted}건 (skip ${mappingResult.skipped})`
    )

    if (skippedDetails.length > 0) {
      console.log(`     [경고] 무결성 위반 ${skippedDetails.length}건:`)
      for (const msg of skippedDetails.slice(0, 10)) {
        console.log(`       - ${msg}`)
      }
      if (skippedDetails.length > 10) {
        console.log(`       ... 외 ${skippedDetails.length - 10}건`)
      }
    }

    // ── 사후 점검: region 분포 ────────────────────────────────────────────
    const regionStats = sqlite
      .prepare('SELECT region, COUNT(*) AS cnt FROM companies GROUP BY region')
      .all() as { region: string; cnt: number }[]
    console.log('[stats] region 분포:')
    for (const r of regionStats) {
      console.log(`  ${r.region}: ${r.cnt}`)
    }

    console.log('[done] 마이그레이션 완료')
  } finally {
    sqlite.close()
  }
}

migrate().catch((err) => {
  console.error('[fail] 마이그레이션 실패:', err)
  process.exit(1)
})
