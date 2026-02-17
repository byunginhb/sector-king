import { sqliteTable, text, integer, real, unique, index } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  order: integer('order').notNull(),
})

export const sectors = sqliteTable('sectors', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  order: integer('order').notNull(),
  description: text('description'),
})

export const companies = sqliteTable('companies', {
  ticker: text('ticker').primaryKey(),
  name: text('name').notNull(),
  nameKo: text('name_ko'),
  logoUrl: text('logo_url'),
})

export const sectorCompanies = sqliteTable(
  'sector_companies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sectorId: text('sector_id').references(() => sectors.id),
    ticker: text('ticker').references(() => companies.ticker),
    rank: integer('rank').notNull(),
    notes: text('notes'),
  },
  (table) => [
    unique().on(table.sectorId, table.ticker),
    index('idx_sector_companies_sector').on(table.sectorId),
  ]
)

export const dailySnapshots = sqliteTable(
  'daily_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ticker: text('ticker').references(() => companies.ticker),
    date: text('date').notNull(),
    marketCap: integer('market_cap'),
    price: real('price'),
    priceChange: real('price_change'),
    week52High: real('week_52_high'),
    week52Low: real('week_52_low'),
    dayHigh: real('day_high'), // 일일 고가 (Money Flow Index 계산용)
    dayLow: real('day_low'), // 일일 저가 (Money Flow Index 계산용)
    volume: integer('volume'),
    avgVolume: integer('avg_volume'),
    peRatio: real('pe_ratio'),
    pegRatio: real('peg_ratio'),
    updatedAt: text('updated_at'),
  },
  (table) => [
    unique().on(table.ticker, table.date),
    index('idx_snapshots_ticker_date').on(table.ticker, table.date),
  ]
)

export const companyProfiles = sqliteTable('company_profiles', {
  ticker: text('ticker')
    .primaryKey()
    .references(() => companies.ticker),
  sector: text('sector'),
  industry: text('industry'),
  country: text('country'),
  employees: integer('employees'),
  revenue: integer('revenue'),
  netIncome: integer('net_income'),
  description: text('description'),
  website: text('website'),
  updatedAt: text('updated_at'),
})

export const industries = sqliteTable('industries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  icon: text('icon'),
  description: text('description'),
  order: integer('order').notNull(),
})

export const industryCategories = sqliteTable(
  'industry_categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    industryId: text('industry_id').references(() => industries.id),
    categoryId: text('category_id').references(() => categories.id),
  },
  (table) => [
    unique().on(table.industryId, table.categoryId),
    index('idx_ic_industry').on(table.industryId),
  ]
)

// Type exports
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Sector = typeof sectors.$inferSelect
export type NewSector = typeof sectors.$inferInsert
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
export type SectorCompany = typeof sectorCompanies.$inferSelect
export type NewSectorCompany = typeof sectorCompanies.$inferInsert
export type DailySnapshot = typeof dailySnapshots.$inferSelect
export type NewDailySnapshot = typeof dailySnapshots.$inferInsert
export type CompanyProfile = typeof companyProfiles.$inferSelect
export type NewCompanyProfile = typeof companyProfiles.$inferInsert
export type Industry = typeof industries.$inferSelect
export type NewIndustry = typeof industries.$inferInsert
export type IndustryCategory = typeof industryCategories.$inferSelect
export type NewIndustryCategory = typeof industryCategories.$inferInsert
