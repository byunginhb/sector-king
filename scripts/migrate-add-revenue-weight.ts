import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

const REVENUE_WEIGHTS: { sectorId: string; ticker: string; weight: number }[] = [
  // Samsung (005930.KS) - 5 sectors
  { sectorId: 'memory', ticker: '005930.KS', weight: 0.30 },
  { sectorId: 'ddr', ticker: '005930.KS', weight: 0.20 },
  { sectorId: 'hbm', ticker: '005930.KS', weight: 0.08 },
  { sectorId: 'foundry', ticker: '005930.KS', weight: 0.12 },
  { sectorId: 'mobile_device', ticker: '005930.KS', weight: 0.25 },

  // TSMC (TSM) - 3 sectors
  { sectorId: 'foundry', ticker: 'TSM', weight: 1.0 },
  { sectorId: 'gpu', ticker: 'TSM', weight: 0.15 },
  { sectorId: 'asic', ticker: 'TSM', weight: 0.15 },

  // Google (GOOGL) - 10 sectors
  { sectorId: 'search', ticker: 'GOOGL', weight: 0.57 },
  { sectorId: 'online_ads', ticker: 'GOOGL', weight: 0.80 },
  { sectorId: 'online_video', ticker: 'GOOGL', weight: 0.10 },
  { sectorId: 'data_center', ticker: 'GOOGL', weight: 0.11 },
  { sectorId: 'iaas', ticker: 'GOOGL', weight: 0.11 },
  { sectorId: 'mobile_os', ticker: 'GOOGL', weight: 0.12 },
  { sectorId: 'ai_model', ticker: 'GOOGL', weight: 0.05 },
  { sectorId: 'asic', ticker: 'GOOGL', weight: 0.02 },
  { sectorId: 'autonomous', ticker: 'GOOGL', weight: 0.01 },
  { sectorId: 'quantum', ticker: 'GOOGL', weight: 0.01 },

  // Microsoft (MSFT) - 8 sectors
  { sectorId: 'iaas', ticker: 'MSFT', weight: 0.25 },
  { sectorId: 'data_center', ticker: 'MSFT', weight: 0.25 },
  { sectorId: 'os', ticker: 'MSFT', weight: 0.22 },
  { sectorId: 'ai_model', ticker: 'MSFT', weight: 0.10 },
  { sectorId: 'gaming', ticker: 'MSFT', weight: 0.10 },
  { sectorId: 'endpoint', ticker: 'MSFT', weight: 0.05 },
  { sectorId: 'identity', ticker: 'MSFT', weight: 0.03 },
  { sectorId: 'quantum', ticker: 'MSFT', weight: 0.01 },

  // Apple (AAPL) - 6 sectors
  { sectorId: 'mobile_device', ticker: 'AAPL', weight: 0.50 },
  { sectorId: 'mobile_os', ticker: 'AAPL', weight: 0.35 },
  { sectorId: 'os', ticker: 'AAPL', weight: 0.10 },
  { sectorId: 'cpu', ticker: 'AAPL', weight: 0.05 },
  { sectorId: 'ap', ticker: 'AAPL', weight: 0.05 },
  { sectorId: 'vr_ar', ticker: 'AAPL', weight: 0.01 },

  // Amazon (AMZN) - 5 sectors
  { sectorId: 'ecommerce', ticker: 'AMZN', weight: 0.40 },
  { sectorId: 'iaas', ticker: 'AMZN', weight: 0.17 },
  { sectorId: 'data_center', ticker: 'AMZN', weight: 0.17 },
  { sectorId: 'online_ads', ticker: 'AMZN', weight: 0.08 },
  { sectorId: 'space', ticker: 'AMZN', weight: 0.01 },

  // Tesla (TSLA) - 4 sectors (auto_legacy doesn't exist)
  { sectorId: 'ev', ticker: 'TSLA', weight: 0.80 },
  { sectorId: 'luxury_auto', ticker: 'TSLA', weight: 0.80 },
  { sectorId: 'autonomous', ticker: 'TSLA', weight: 0.10 },
  { sectorId: 'robot', ticker: 'TSLA', weight: 0.05 },

  // Meta (META) - 4 sectors
  { sectorId: 'social_media', ticker: 'META', weight: 0.97 },
  { sectorId: 'online_ads', ticker: 'META', weight: 0.97 },
  { sectorId: 'ai_model', ticker: 'META', weight: 0.02 },
  { sectorId: 'vr_ar', ticker: 'META', weight: 0.03 },

  // NVIDIA (NVDA) - 3 sectors
  { sectorId: 'gpu', ticker: 'NVDA', weight: 0.85 },
  { sectorId: 'autonomous', ticker: 'NVDA', weight: 0.10 },
  { sectorId: 'robot', ticker: 'NVDA', weight: 0.05 },

  // SK Hynix (000660.KS) - 3 sectors
  { sectorId: 'memory', ticker: '000660.KS', weight: 0.50 },
  { sectorId: 'ddr', ticker: '000660.KS', weight: 0.30 },
  { sectorId: 'hbm', ticker: '000660.KS', weight: 0.20 },

  // Micron (MU) - 3 sectors
  { sectorId: 'memory', ticker: 'MU', weight: 0.50 },
  { sectorId: 'ddr', ticker: 'MU', weight: 0.30 },
  { sectorId: 'hbm', ticker: 'MU', weight: 0.20 },

  // Intel (INTC) - 2 sectors
  { sectorId: 'cpu', ticker: 'INTC', weight: 0.80 },
  { sectorId: 'foundry', ticker: 'INTC', weight: 0.10 },
]

async function migrate() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  // Add revenue_weight column (idempotent)
  const columns = sqlite
    .prepare("PRAGMA table_info('sector_companies')")
    .all() as { name: string }[]

  const hasColumn = columns.some((c) => c.name === 'revenue_weight')

  if (!hasColumn) {
    sqlite.exec(`ALTER TABLE sector_companies ADD COLUMN revenue_weight REAL NOT NULL DEFAULT 1.0`)
    console.log('Added revenue_weight column to sector_companies')
  } else {
    console.log('revenue_weight column already exists, skipping ALTER')
  }

  // Update weights for multi-sector companies
  const updateStmt = sqlite.prepare(`
    UPDATE sector_companies SET revenue_weight = ?
    WHERE sector_id = ? AND ticker = ?
  `)

  let updated = 0
  for (const { sectorId, ticker, weight } of REVENUE_WEIGHTS) {
    const result = updateStmt.run(weight, sectorId, ticker)
    if (result.changes > 0) {
      updated++
    } else {
      console.warn(`  No match: sector=${sectorId}, ticker=${ticker}`)
    }
  }

  sqlite.close()
  console.log(`\nMigration completed! Updated ${updated}/${REVENUE_WEIGHTS.length} weights`)
}

migrate().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
