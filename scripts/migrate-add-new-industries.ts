import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

// ─── New Industries ──────────────────────────────────────────────────────────

const INDUSTRIES = [
  { id: 'healthcare_industry', name: '헬스케어', nameEn: 'Healthcare', icon: '💊', description: '헬스케어 산업 전반', order: 2 },
  { id: 'energy', name: '에너지/자원', nameEn: 'Energy', icon: '⚡', description: '에너지/자원 산업 전반', order: 3 },
  { id: 'consumer', name: '소비재', nameEn: 'Consumer', icon: '🛒', description: '소비재 산업 전반', order: 4 },
  { id: 'finance', name: '금융', nameEn: 'Finance', icon: '🏦', description: '금융 산업 전반', order: 5 },
]

// ─── New Categories ──────────────────────────────────────────────────────────

const CATEGORIES = [
  // Healthcare
  { id: 'pharma_global', name: '글로벌 제약', nameEn: 'Global Pharma', order: 14 },
  { id: 'diagnostics', name: '진단', nameEn: 'Diagnostics', order: 15 },
  { id: 'healthcare_services', name: '의료서비스', nameEn: 'Healthcare Services', order: 16 },
  { id: 'korea_bio', name: '한국 바이오', nameEn: 'Korea Bio', order: 17 },
  // Energy
  { id: 'traditional_energy', name: '전통 에너지', nameEn: 'Traditional Energy', order: 18 },
  { id: 'clean_energy', name: '클린 에너지', nameEn: 'Clean Energy', order: 19 },
  { id: 'mining_resources', name: '광물자원', nameEn: 'Mining & Resources', order: 20 },
  { id: 'utilities', name: '유틸리티', nameEn: 'Utilities', order: 21 },
  // Consumer
  { id: 'luxury', name: '럭셔리', nameEn: 'Luxury', order: 22 },
  { id: 'food_beverage', name: '식음료', nameEn: 'Food & Beverage', order: 23 },
  { id: 'apparel', name: '의류', nameEn: 'Apparel', order: 24 },
  { id: 'retail', name: '유통', nameEn: 'Retail', order: 25 },
  { id: 'consumer_staples', name: '생활필수품', nameEn: 'Consumer Staples', order: 26 },
  // Finance
  { id: 'banking', name: '은행', nameEn: 'Banking', order: 27 },
  { id: 'insurance', name: '보험', nameEn: 'Insurance', order: 28 },
  { id: 'asset_management', name: '자산운용', nameEn: 'Asset Management', order: 29 },
  { id: 'capital_markets', name: '자본시장', nameEn: 'Capital Markets', order: 30 },
]

// ─── Industry-Category Mappings ──────────────────────────────────────────────

const INDUSTRY_CATEGORIES = [
  // Healthcare (shared: healthcare)
  { industryId: 'healthcare_industry', categoryId: 'healthcare' },
  { industryId: 'healthcare_industry', categoryId: 'pharma_global' },
  { industryId: 'healthcare_industry', categoryId: 'diagnostics' },
  { industryId: 'healthcare_industry', categoryId: 'healthcare_services' },
  { industryId: 'healthcare_industry', categoryId: 'korea_bio' },
  // Energy (shared: ev_energy)
  { industryId: 'energy', categoryId: 'ev_energy' },
  { industryId: 'energy', categoryId: 'traditional_energy' },
  { industryId: 'energy', categoryId: 'clean_energy' },
  { industryId: 'energy', categoryId: 'mining_resources' },
  { industryId: 'energy', categoryId: 'utilities' },
  // Consumer (shared: entertainment, internet)
  { industryId: 'consumer', categoryId: 'entertainment' },
  { industryId: 'consumer', categoryId: 'internet' },
  { industryId: 'consumer', categoryId: 'luxury' },
  { industryId: 'consumer', categoryId: 'food_beverage' },
  { industryId: 'consumer', categoryId: 'apparel' },
  { industryId: 'consumer', categoryId: 'retail' },
  { industryId: 'consumer', categoryId: 'consumer_staples' },
  // Finance (shared: fintech)
  { industryId: 'finance', categoryId: 'fintech' },
  { industryId: 'finance', categoryId: 'banking' },
  { industryId: 'finance', categoryId: 'insurance' },
  { industryId: 'finance', categoryId: 'asset_management' },
  { industryId: 'finance', categoryId: 'capital_markets' },
]

// ─── New Sectors ─────────────────────────────────────────────────────────────

const SECTORS = [
  // Healthcare - pharma_global
  { id: 'obesity', categoryId: 'pharma_global', name: '비만 치료제', nameEn: 'Obesity', order: 1 },
  { id: 'rare_disease', categoryId: 'pharma_global', name: '희귀질환', nameEn: 'Rare Disease', order: 2 },
  { id: 'oncology', categoryId: 'pharma_global', name: '항암제', nameEn: 'Oncology', order: 3 },
  // Healthcare - diagnostics
  { id: 'ivd', categoryId: 'diagnostics', name: '체외진단', nameEn: 'IVD', order: 1 },
  { id: 'genetic_testing', categoryId: 'diagnostics', name: '유전자 검사', nameEn: 'Genetic Testing', order: 2 },
  // Healthcare - healthcare_services
  { id: 'hospital_insurance', categoryId: 'healthcare_services', name: '병원/보험', nameEn: 'Hospital & Insurance', order: 1 },
  { id: 'cro_cdmo', categoryId: 'healthcare_services', name: 'CRO/CDMO', nameEn: 'CRO/CDMO', order: 2 },
  // Healthcare - korea_bio
  { id: 'biosimilar', categoryId: 'korea_bio', name: '바이오시밀러', nameEn: 'Biosimilar', order: 1 },
  { id: 'cell_gene', categoryId: 'korea_bio', name: '세포/유전자 치료', nameEn: 'Cell & Gene Therapy', order: 2 },
  // Energy - traditional_energy
  { id: 'oil_gas', categoryId: 'traditional_energy', name: '석유/가스', nameEn: 'Oil & Gas', order: 1 },
  { id: 'energy_services', categoryId: 'traditional_energy', name: '에너지 서비스', nameEn: 'Energy Services', order: 2 },
  // Energy - clean_energy
  { id: 'solar', categoryId: 'clean_energy', name: '태양광', nameEn: 'Solar', order: 1 },
  { id: 'hydrogen', categoryId: 'clean_energy', name: '수소', nameEn: 'Hydrogen', order: 2 },
  // Energy - mining_resources
  { id: 'lithium', categoryId: 'mining_resources', name: '리튬', nameEn: 'Lithium', order: 1 },
  { id: 'rare_earth', categoryId: 'mining_resources', name: '희토류', nameEn: 'Rare Earth', order: 2 },
  // Energy - utilities
  { id: 'power_gen', categoryId: 'utilities', name: '발전', nameEn: 'Power Generation', order: 1 },
  { id: 'grid', categoryId: 'utilities', name: '송배전', nameEn: 'Grid', order: 2 },
  // Consumer - luxury
  { id: 'luxury_fashion', categoryId: 'luxury', name: '럭셔리 패션', nameEn: 'Luxury Fashion', order: 1 },
  { id: 'luxury_auto', categoryId: 'luxury', name: '럭셔리 자동차', nameEn: 'Luxury Auto', order: 2 },
  // Consumer - food_beverage
  { id: 'beverage', categoryId: 'food_beverage', name: '음료', nameEn: 'Beverage', order: 1 },
  { id: 'food', categoryId: 'food_beverage', name: '가공식품/외식', nameEn: 'Food & Dining', order: 2 },
  // Consumer - apparel
  { id: 'sportswear', categoryId: 'apparel', name: '스포츠웨어', nameEn: 'Sportswear', order: 1 },
  { id: 'fast_fashion', categoryId: 'apparel', name: '패스트패션', nameEn: 'Fast Fashion', order: 2 },
  // Consumer - retail
  { id: 'department_store', categoryId: 'retail', name: '백화점/할인점', nameEn: 'Department Store', order: 1 },
  { id: 'mart_convenience', categoryId: 'retail', name: '마트/편의점', nameEn: 'Mart & Convenience', order: 2 },
  // Consumer - consumer_staples
  { id: 'household', categoryId: 'consumer_staples', name: '가정용품', nameEn: 'Household', order: 1 },
  { id: 'personal_care', categoryId: 'consumer_staples', name: '퍼스널케어', nameEn: 'Personal Care', order: 2 },
  // Finance - banking
  { id: 'global_banks', categoryId: 'banking', name: '글로벌 은행', nameEn: 'Global Banks', order: 1 },
  { id: 'korea_banks', categoryId: 'banking', name: '한국 은행', nameEn: 'Korea Banks', order: 2 },
  // Finance - insurance
  { id: 'life_property', categoryId: 'insurance', name: '생명/손해보험', nameEn: 'Life & Property', order: 1 },
  { id: 'reinsurance', categoryId: 'insurance', name: '재보험', nameEn: 'Reinsurance', order: 2 },
  // Finance - asset_management
  { id: 'etf_am', categoryId: 'asset_management', name: 'ETF/자산운용', nameEn: 'ETF & AM', order: 1 },
  { id: 'alternative_am', categoryId: 'asset_management', name: '대체자산', nameEn: 'Alternative AM', order: 2 },
  // Finance - capital_markets
  { id: 'exchanges', categoryId: 'capital_markets', name: '거래소', nameEn: 'Exchanges', order: 1 },
  { id: 'securities', categoryId: 'capital_markets', name: '증권사', nameEn: 'Securities', order: 2 },
]

// ─── New Companies (only those not already in DB) ────────────────────────────

const COMPANIES = [
  // Healthcare
  { ticker: 'NVO', name: 'Novo Nordisk A/S', nameKo: '노보노디스크' },
  { ticker: 'AMGN', name: 'Amgen Inc.', nameKo: '암젠' },
  { ticker: 'BMRN', name: 'BioMarin Pharmaceutical Inc.', nameKo: '바이오마린' },
  { ticker: 'ALNY', name: 'Alnylam Pharmaceuticals Inc.', nameKo: '앨나일람' },
  { ticker: 'BMY', name: 'Bristol-Myers Squibb Company', nameKo: '브리스톨마이어스' },
  { ticker: 'AZN', name: 'AstraZeneca PLC', nameKo: '아스트라제네카' },
  { ticker: 'DHR', name: 'Danaher Corporation', nameKo: '다나허' },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific Inc.', nameKo: '써모피셔' },
  { ticker: 'ILMN', name: 'Illumina Inc.', nameKo: '일루미나' },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc.', nameKo: '유나이티드헬스' },
  { ticker: 'HCA', name: 'HCA Healthcare Inc.', nameKo: 'HCA' },
  { ticker: 'CI', name: 'The Cigna Group', nameKo: '시그나' },
  { ticker: 'WST', name: 'West Pharmaceutical Services Inc.', nameKo: '웨스트파마' },
  { ticker: '207940.KS', name: 'Samsung Biologics Co. Ltd.', nameKo: '삼성바이오로직스' },
  { ticker: '068270.KS', name: 'Celltrion Inc.', nameKo: '셀트리온' },
  { ticker: '326030.KQ', name: 'SK Biopharmaceuticals Co. Ltd.', nameKo: 'SK바이오팜' },
  // Energy
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', nameKo: '엑슨모빌' },
  { ticker: 'CVX', name: 'Chevron Corporation', nameKo: '셰브론' },
  { ticker: 'COP', name: 'ConocoPhillips', nameKo: '코노코필립스' },
  { ticker: 'SLB', name: 'Schlumberger Limited', nameKo: '슐럼버거' },
  { ticker: 'HAL', name: 'Halliburton Company', nameKo: '할리버튼' },
  { ticker: 'BKR', name: 'Baker Hughes Company', nameKo: '베이커휴즈' },
  { ticker: 'PLUG', name: 'Plug Power Inc.', nameKo: '플러그파워' },
  { ticker: 'BE', name: 'Bloom Energy Corporation', nameKo: '블룸에너지' },
  { ticker: 'ALB', name: 'Albemarle Corporation', nameKo: '앨버말' },
  { ticker: 'SQM', name: 'Sociedad Quimica y Minera de Chile', nameKo: 'SQM' },
  { ticker: 'MP', name: 'MP Materials Corp.', nameKo: 'MP머티리얼즈' },
  { ticker: 'DUK', name: 'Duke Energy Corporation', nameKo: '듀크에너지' },
  { ticker: 'SO', name: 'The Southern Company', nameKo: '서던컴퍼니' },
  { ticker: 'ETN', name: 'Eaton Corporation plc', nameKo: '이튼' },
  { ticker: 'EMR', name: 'Emerson Electric Co.', nameKo: '에머슨' },
  // Consumer
  { ticker: 'MC.PA', name: 'LVMH Moët Hennessy Louis Vuitton SE', nameKo: 'LVMH' },
  { ticker: 'RMS.PA', name: 'Hermès International SCA', nameKo: '에르메스' },
  { ticker: 'RACE', name: 'Ferrari N.V.', nameKo: '페라리' },
  { ticker: 'KO', name: 'The Coca-Cola Company', nameKo: '코카콜라' },
  { ticker: 'PEP', name: 'PepsiCo Inc.', nameKo: '펩시코' },
  { ticker: 'SBUX', name: 'Starbucks Corporation', nameKo: '스타벅스' },
  { ticker: 'MCD', name: "McDonald's Corporation", nameKo: '맥도날드' },
  { ticker: 'YUM', name: 'Yum! Brands Inc.', nameKo: '얌브랜즈' },
  { ticker: 'CMG', name: 'Chipotle Mexican Grill Inc.', nameKo: '치폴레' },
  { ticker: 'NKE', name: 'Nike Inc.', nameKo: '나이키' },
  { ticker: 'LULU', name: 'Lululemon Athletica Inc.', nameKo: '룰루레몬' },
  { ticker: 'ADDYY', name: 'Adidas AG', nameKo: '아디다스' },
  { ticker: 'TJX', name: 'The TJX Companies Inc.', nameKo: 'TJX' },
  { ticker: 'COST', name: 'Costco Wholesale Corporation', nameKo: '코스트코' },
  { ticker: 'TGT', name: 'Target Corporation', nameKo: '타겟' },
  { ticker: 'PG', name: 'The Procter & Gamble Company', nameKo: 'P&G' },
  { ticker: 'CL', name: 'Colgate-Palmolive Company', nameKo: '콜게이트' },
  { ticker: 'EL', name: 'The Estée Lauder Companies Inc.', nameKo: '에스티로더' },
  // Finance
  { ticker: 'BAC', name: 'Bank of America Corporation', nameKo: '뱅크오브아메리카' },
  { ticker: 'GS', name: 'The Goldman Sachs Group Inc.', nameKo: '골드만삭스' },
  { ticker: 'WFC', name: 'Wells Fargo & Company', nameKo: '웰스파고' },
  { ticker: 'MS', name: 'Morgan Stanley', nameKo: '모건스탠리' },
  { ticker: '105560.KS', name: 'KB Financial Group Inc.', nameKo: 'KB금융' },
  { ticker: '055550.KS', name: 'Shinhan Financial Group Co. Ltd.', nameKo: '신한지주' },
  { ticker: 'MET', name: 'MetLife Inc.', nameKo: '메트라이프' },
  { ticker: 'PRU', name: 'Prudential Financial Inc.', nameKo: '프루덴셜' },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway Inc.', nameKo: '버크셔해서웨이' },
  { ticker: 'ALL', name: 'The Allstate Corporation', nameKo: '올스테이트' },
  { ticker: 'BLK', name: 'BlackRock Inc.', nameKo: '블랙록' },
  { ticker: 'TROW', name: 'T. Rowe Price Group Inc.', nameKo: 'T.로우프라이스' },
  { ticker: 'BX', name: 'Blackstone Inc.', nameKo: '블랙스톤' },
  { ticker: 'KKR', name: 'KKR & Co. Inc.', nameKo: 'KKR' },
  { ticker: 'APO', name: 'Apollo Global Management Inc.', nameKo: '아폴로' },
  { ticker: 'CME', name: 'CME Group Inc.', nameKo: 'CME' },
  { ticker: 'ICE', name: 'Intercontinental Exchange Inc.', nameKo: 'ICE' },
  { ticker: 'NDAQ', name: 'Nasdaq Inc.', nameKo: '나스닥' },
  { ticker: 'SCHW', name: 'The Charles Schwab Corporation', nameKo: '찰스슈왑' },
]

// ─── Sector-Company Mappings ─────────────────────────────────────────────────

const SECTOR_COMPANIES = [
  // Healthcare - pharma_global
  { sectorId: 'obesity', ticker: 'NVO', rank: 1 },
  { sectorId: 'obesity', ticker: 'LLY', rank: 2 },
  { sectorId: 'obesity', ticker: 'AMGN', rank: 3 },
  { sectorId: 'rare_disease', ticker: 'BMRN', rank: 1 },
  { sectorId: 'rare_disease', ticker: 'ALNY', rank: 2 },
  { sectorId: 'rare_disease', ticker: 'VRTX', rank: 3 },
  { sectorId: 'oncology', ticker: 'BMY', rank: 1 },
  { sectorId: 'oncology', ticker: 'AZN', rank: 2 },
  { sectorId: 'oncology', ticker: 'REGN', rank: 3 },
  // Healthcare - diagnostics
  { sectorId: 'ivd', ticker: 'DHR', rank: 1 },
  { sectorId: 'ivd', ticker: 'ABT', rank: 2 },
  { sectorId: 'ivd', ticker: 'TMO', rank: 3 },
  { sectorId: 'genetic_testing', ticker: 'ILMN', rank: 1 },
  { sectorId: 'genetic_testing', ticker: 'TMO', rank: 2 },
  // Healthcare - healthcare_services
  { sectorId: 'hospital_insurance', ticker: 'UNH', rank: 1 },
  { sectorId: 'hospital_insurance', ticker: 'HCA', rank: 2 },
  { sectorId: 'hospital_insurance', ticker: 'CI', rank: 3 },
  { sectorId: 'cro_cdmo', ticker: 'TMO', rank: 1 },
  { sectorId: 'cro_cdmo', ticker: 'DHR', rank: 2 },
  { sectorId: 'cro_cdmo', ticker: 'WST', rank: 3 },
  // Healthcare - korea_bio
  { sectorId: 'biosimilar', ticker: '207940.KS', rank: 1 },
  { sectorId: 'biosimilar', ticker: '068270.KS', rank: 2 },
  { sectorId: 'cell_gene', ticker: '068270.KS', rank: 1 },
  { sectorId: 'cell_gene', ticker: '326030.KQ', rank: 2 },
  // Energy - traditional_energy
  { sectorId: 'oil_gas', ticker: 'XOM', rank: 1 },
  { sectorId: 'oil_gas', ticker: 'CVX', rank: 2 },
  { sectorId: 'oil_gas', ticker: 'COP', rank: 3 },
  { sectorId: 'energy_services', ticker: 'SLB', rank: 1 },
  { sectorId: 'energy_services', ticker: 'HAL', rank: 2 },
  { sectorId: 'energy_services', ticker: 'BKR', rank: 3 },
  // Energy - clean_energy
  { sectorId: 'solar', ticker: 'FSLR', rank: 1 },
  { sectorId: 'solar', ticker: 'ENPH', rank: 2 },
  { sectorId: 'hydrogen', ticker: 'PLUG', rank: 1 },
  { sectorId: 'hydrogen', ticker: 'BE', rank: 2 },
  // Energy - mining_resources
  { sectorId: 'lithium', ticker: 'ALB', rank: 1 },
  { sectorId: 'lithium', ticker: 'SQM', rank: 2 },
  { sectorId: 'rare_earth', ticker: 'MP', rank: 1 },
  // Energy - utilities
  { sectorId: 'power_gen', ticker: 'NEE', rank: 1 },
  { sectorId: 'power_gen', ticker: 'DUK', rank: 2 },
  { sectorId: 'power_gen', ticker: 'SO', rank: 3 },
  { sectorId: 'grid', ticker: 'ETN', rank: 1 },
  { sectorId: 'grid', ticker: 'EMR', rank: 2 },
  // Consumer - luxury
  { sectorId: 'luxury_fashion', ticker: 'MC.PA', rank: 1 },
  { sectorId: 'luxury_fashion', ticker: 'RMS.PA', rank: 2 },
  { sectorId: 'luxury_auto', ticker: 'RACE', rank: 1 },
  { sectorId: 'luxury_auto', ticker: 'TSLA', rank: 2 },
  // Consumer - food_beverage
  { sectorId: 'beverage', ticker: 'KO', rank: 1 },
  { sectorId: 'beverage', ticker: 'PEP', rank: 2 },
  { sectorId: 'beverage', ticker: 'SBUX', rank: 3 },
  { sectorId: 'food', ticker: 'MCD', rank: 1 },
  { sectorId: 'food', ticker: 'YUM', rank: 2 },
  { sectorId: 'food', ticker: 'CMG', rank: 3 },
  // Consumer - apparel
  { sectorId: 'sportswear', ticker: 'NKE', rank: 1 },
  { sectorId: 'sportswear', ticker: 'LULU', rank: 2 },
  { sectorId: 'sportswear', ticker: 'ADDYY', rank: 3 },
  { sectorId: 'fast_fashion', ticker: 'TJX', rank: 1 },
  // Consumer - retail
  { sectorId: 'department_store', ticker: 'TJX', rank: 1 },
  { sectorId: 'mart_convenience', ticker: 'COST', rank: 1 },
  { sectorId: 'mart_convenience', ticker: 'WMT', rank: 2 },
  { sectorId: 'mart_convenience', ticker: 'TGT', rank: 3 },
  // Consumer - consumer_staples
  { sectorId: 'household', ticker: 'PG', rank: 1 },
  { sectorId: 'household', ticker: 'CL', rank: 2 },
  { sectorId: 'personal_care', ticker: 'EL', rank: 1 },
  { sectorId: 'personal_care', ticker: 'PG', rank: 2 },
  // Finance - banking
  { sectorId: 'global_banks', ticker: 'JPM', rank: 1 },
  { sectorId: 'global_banks', ticker: 'BAC', rank: 2 },
  { sectorId: 'global_banks', ticker: 'GS', rank: 3 },
  { sectorId: 'korea_banks', ticker: '105560.KS', rank: 1 },
  { sectorId: 'korea_banks', ticker: '055550.KS', rank: 2 },
  // Finance - insurance
  { sectorId: 'life_property', ticker: 'MET', rank: 1 },
  { sectorId: 'life_property', ticker: 'PRU', rank: 2 },
  { sectorId: 'life_property', ticker: 'ALL', rank: 3 },
  { sectorId: 'reinsurance', ticker: 'BRK-B', rank: 1 },
  // Finance - asset_management
  { sectorId: 'etf_am', ticker: 'BLK', rank: 1 },
  { sectorId: 'etf_am', ticker: 'TROW', rank: 2 },
  { sectorId: 'alternative_am', ticker: 'BX', rank: 1 },
  { sectorId: 'alternative_am', ticker: 'KKR', rank: 2 },
  { sectorId: 'alternative_am', ticker: 'APO', rank: 3 },
  // Finance - capital_markets
  { sectorId: 'exchanges', ticker: 'CME', rank: 1 },
  { sectorId: 'exchanges', ticker: 'ICE', rank: 2 },
  { sectorId: 'exchanges', ticker: 'NDAQ', rank: 3 },
  { sectorId: 'securities', ticker: 'MS', rank: 1 },
  { sectorId: 'securities', ticker: 'WFC', rank: 2 },
  { sectorId: 'securities', ticker: 'SCHW', rank: 3 },
]

// ─── Migration ───────────────────────────────────────────────────────────────

async function migrate() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  const insertIndustry = sqlite.prepare(`
    INSERT OR IGNORE INTO industries (id, name, name_en, icon, description, "order")
    VALUES (@id, @name, @nameEn, @icon, @description, @order)
  `)

  const insertCategory = sqlite.prepare(`
    INSERT OR IGNORE INTO categories (id, name, name_en, "order")
    VALUES (@id, @name, @nameEn, @order)
  `)

  const insertIC = sqlite.prepare(`
    INSERT OR IGNORE INTO industry_categories (industry_id, category_id)
    VALUES (@industryId, @categoryId)
  `)

  const insertSector = sqlite.prepare(`
    INSERT OR IGNORE INTO sectors (id, category_id, name, name_en, "order")
    VALUES (@id, @categoryId, @name, @nameEn, @order)
  `)

  const insertCompany = sqlite.prepare(`
    INSERT OR IGNORE INTO companies (ticker, name, name_ko)
    VALUES (@ticker, @name, @nameKo)
  `)

  const insertSC = sqlite.prepare(`
    INSERT OR IGNORE INTO sector_companies (sector_id, ticker, rank)
    VALUES (@sectorId, @ticker, @rank)
  `)

  const insertAll = sqlite.transaction(() => {
    for (const industry of INDUSTRIES) {
      insertIndustry.run(industry)
    }
    for (const category of CATEGORIES) {
      insertCategory.run(category)
    }
    for (const ic of INDUSTRY_CATEGORIES) {
      insertIC.run(ic)
    }
    for (const sector of SECTORS) {
      insertSector.run(sector)
    }
    for (const company of COMPANIES) {
      insertCompany.run(company)
    }
    for (const sc of SECTOR_COMPANIES) {
      insertSC.run(sc)
    }
  })

  insertAll()

  // Verify
  const industryCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM industries').get() as { cnt: number }
  const categoryCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number }
  const sectorCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM sectors').get() as { cnt: number }
  const companyCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM companies').get() as { cnt: number }
  const scCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM sector_companies').get() as { cnt: number }

  sqlite.close()

  console.log('Migration completed successfully!')
  console.log(`- Industries: ${industryCount.cnt}`)
  console.log(`- Categories: ${categoryCount.cnt}`)
  console.log(`- Sectors: ${sectorCount.cnt}`)
  console.log(`- Companies: ${companyCount.cnt}`)
  console.log(`- Sector-Company mappings: ${scCount.cnt}`)
  console.log(`\nNew data added:`)
  console.log(`- ${INDUSTRIES.length} industries`)
  console.log(`- ${CATEGORIES.length} categories`)
  console.log(`- ${SECTORS.length} sectors`)
  console.log(`- ${COMPANIES.length} companies`)
  console.log(`- ${SECTOR_COMPANIES.length} sector-company mappings`)
  console.log(`- ${INDUSTRY_CATEGORIES.length} industry-category mappings`)
}

migrate().catch(console.error)
