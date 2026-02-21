import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

async function migrate() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS company_scores (
      ticker TEXT PRIMARY KEY REFERENCES companies(ticker),
      revenue_growth REAL,
      earnings_growth REAL,
      operating_margin REAL,
      return_on_equity REAL,
      recommendation_key TEXT,
      analyst_count INTEGER,
      target_mean_price REAL,
      free_cashflow INTEGER,
      beta REAL,
      debt_to_equity REAL,
      scale_score REAL DEFAULT 0,
      growth_score REAL DEFAULT 0,
      profitability_score REAL DEFAULT 0,
      sentiment_score REAL DEFAULT 0,
      raw_total_score REAL DEFAULT 0,
      smoothed_score REAL DEFAULT 0,
      data_quality REAL DEFAULT 0,
      metrics_updated_at TEXT,
      score_updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS score_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL REFERENCES companies(ticker),
      date TEXT NOT NULL,
      raw_total_score REAL,
      smoothed_score REAL,
      scale_score REAL,
      growth_score REAL,
      profitability_score REAL,
      sentiment_score REAL,
      UNIQUE(ticker, date)
    );

    CREATE INDEX IF NOT EXISTS idx_score_history_ticker ON score_history(ticker);
    CREATE INDEX IF NOT EXISTS idx_score_history_date ON score_history(date);
  `)

  sqlite.close()
  console.log('Migration completed successfully!')
  console.log('- Created company_scores table')
  console.log('- Created score_history table')
}

migrate().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
