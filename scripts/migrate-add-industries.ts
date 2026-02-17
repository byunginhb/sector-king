import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

const INDUSTRIES = [
  { id: 'tech', name: '테크', nameEn: 'Tech', icon: '💻', description: '기술 산업 전반', order: 1 },
]

const INDUSTRY_CATEGORIES = [
  { industryId: 'tech', categoryId: 'computing' },
  { industryId: 'tech', categoryId: 'internet' },
  { industryId: 'tech', categoryId: 'mobile' },
  { industryId: 'tech', categoryId: 'media' },
  { industryId: 'tech', categoryId: 'ai' },
  { industryId: 'tech', categoryId: 'future_tech' },
  { industryId: 'tech', categoryId: 'fintech' },
  { industryId: 'tech', categoryId: 'healthcare' },
  { industryId: 'tech', categoryId: 'entertainment' },
  { industryId: 'tech', categoryId: 'semiconductor' },
  { industryId: 'tech', categoryId: 'cloud' },
  { industryId: 'tech', categoryId: 'cybersecurity' },
  { industryId: 'tech', categoryId: 'ev_energy' },
]

async function migrate() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  // Create tables (idempotent)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS industries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT,
      icon TEXT,
      description TEXT,
      "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS industry_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      industry_id TEXT REFERENCES industries(id),
      category_id TEXT REFERENCES categories(id),
      UNIQUE(industry_id, category_id)
    );

    CREATE INDEX IF NOT EXISTS idx_ic_industry ON industry_categories(industry_id);
  `)

  // Insert industry data (idempotent)
  const insertIndustry = sqlite.prepare(`
    INSERT OR IGNORE INTO industries (id, name, name_en, icon, description, "order")
    VALUES (@id, @name, @nameEn, @icon, @description, @order)
  `)

  const insertIC = sqlite.prepare(`
    INSERT OR IGNORE INTO industry_categories (industry_id, category_id)
    VALUES (@industryId, @categoryId)
  `)

  const insertAll = sqlite.transaction(() => {
    for (const industry of INDUSTRIES) {
      insertIndustry.run(industry)
    }
    for (const ic of INDUSTRY_CATEGORIES) {
      insertIC.run(ic)
    }
  })

  insertAll()

  sqlite.close()
  console.log('Migration completed successfully!')
  console.log(`- Inserted ${INDUSTRIES.length} industries`)
  console.log(`- Inserted ${INDUSTRY_CATEGORIES.length} industry-category mappings`)
}

migrate().catch(console.error)
