/**
 * 마이그레이션 — US 시총 상위 250 보완 작업의 구조 재현 (12_us_top250)
 *
 * 배경:
 *   미국 시총 상위 250 중 미보유 운영기업(주로 비테크 대형주: 철도·미드스트림·정유·지역은행·담배·
 *   아날로그반도체·산업재유통 등)을 add_ticker.py 로 적재하면서 신규 섹터 17개를 신설했다. 종목
 *   데이터는 _workspace/research/us_all.csv + run_batch.sh 로 재현하고(yfinance), 이 스크립트는 그
 *   섹터 구조만 재현한다. 신규 섹터는 전부 기존 카테고리에 들어가므로 카테고리/industry 연결은 불필요
 *   (해당 카테고리들은 이미 industry_categories 로 산업에 연결돼 있어 노출이 자동 상속됨).
 *
 * 멱등성: INSERT OR IGNORE.
 * 실행: pnpm tsx scripts/migrate-add-us-top250-sectors.ts
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

// [id, categoryId, name, nameEn, order, description]
const SECTORS: [string, string, string, string, number, string][] = [
  ['analog_semi', 'semiconductor', '아날로그 반도체', 'Analog Semiconductors', 20, '아날로그·전력·MCU 반도체'],
  ['eda', 'semiconductor', '반도체 EDA', 'EDA Software', 21, '반도체 설계 자동화 SW'],
  ['network_optical', 'semiconductor', '네트워크/광부품', 'Network & Optical', 22, '데이터센터 스위치·광부품'],
  ['enterprise_hardware', 'computing', '엔터프라이즈 하드웨어', 'Enterprise Hardware', 20, '서버·스토리지·PC'],
  ['railroad', 'logistics_transport', '철도', 'Railroads', 20, '화물 철도·철도장비'],
  ['midstream', 'traditional_energy', '미드스트림', 'Midstream', 20, '파이프라인·LNG·가스처리'],
  ['refining', 'traditional_energy', '정유', 'Refining', 21, '정유·석유제품'],
  ['regional_banks', 'banking', '지역은행', 'Regional Banks', 20, '미국 지역은행'],
  ['insurance_brokers', 'insurance', '보험중개', 'Insurance Brokers', 20, '보험중개·컨설팅'],
  ['drug_distribution', 'healthcare_services', '의약품 유통', 'Drug Distribution', 20, '의약품 도매유통'],
  ['home_improvement', 'retail', '홈임프루브먼트', 'Home Improvement', 20, '건자재·주택용품 유통'],
  ['auto_retail', 'retail', '자동차부품 소매', 'Auto Parts Retail', 21, '자동차부품 소매'],
  ['industrial_distribution', 'industrial_conglomerate', '산업재 유통', 'Industrial Distribution', 20, '산업재 유통·렌탈'],
  ['financial_data', 'capital_markets', '금융정보/평가', 'Financial Data & Ratings', 20, '신용평가·금융데이터'],
  ['hotels', 'airline_travel', '호텔/크루즈', 'Hotels & Cruise', 20, '호텔·리조트·크루즈'],
  ['tobacco', 'consumer_staples', '담배', 'Tobacco', 20, '담배·니코틴'],
  ['homebuilder', 'industrial_conglomerate', '주택건설', 'Homebuilders', 21, '미국 주택건설'],
]

function migrate(): void {
  const sqlite = new Database(DB_PATH)
  try {
    const ins = sqlite.prepare(
      'INSERT OR IGNORE INTO sectors (id, category_id, name, name_en, "order", description) VALUES (?, ?, ?, ?, ?, ?)'
    )
    let n = 0
    const tx = sqlite.transaction(() => {
      for (const r of SECTORS) n += ins.run(...r).changes
    })
    tx()

    const orphan = sqlite
      .prepare('SELECT s.id FROM sectors s LEFT JOIN categories c ON c.id = s.category_id WHERE c.id IS NULL')
      .all()
    if (orphan.length > 0) throw new Error(`orphan 섹터 발견: ${JSON.stringify(orphan)}`)

    // 카테고리가 industry 에 연결돼 있는지(노출 상속) 사후 점검
    const unwired = sqlite
      .prepare(
        `SELECT DISTINCT s.category_id FROM sectors s
         WHERE s.id IN (${SECTORS.map(() => '?').join(',')})
           AND s.category_id NOT IN (SELECT category_id FROM industry_categories)`
      )
      .all(...SECTORS.map((s) => s[0]))
    if (unwired.length > 0) {
      console.warn(`경고: industry 미연결 카테고리(노출 안 됨): ${JSON.stringify(unwired)}`)
    }

    console.log(`삽입: 섹터 ${n} (이미 있으면 0). orphan 0, 미연결 카테고리 ${unwired.length}`)
    console.log('마이그레이션 완료.')
  } finally {
    sqlite.close()
  }
}

migrate()
