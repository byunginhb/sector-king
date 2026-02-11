const CURRENCY_RATES: Record<string, number> = {
  KRW: Number(process.env.KRW_USD_RATE) || 1450,
  JPY: Number(process.env.JPY_USD_RATE) || 150,
  TWD: Number(process.env.TWD_USD_RATE) || 32,
  HKD: Number(process.env.HKD_USD_RATE) || 7.8,
}

const TICKER_SUFFIX_CURRENCY: Record<string, string> = {
  '.KS': 'KRW',
  '.KQ': 'KRW',
  '.T': 'JPY',
  '.TW': 'TWD',
  '.HK': 'HKD',
}

function getCurrencyRate(ticker: string): number {
  for (const [suffix, currency] of Object.entries(TICKER_SUFFIX_CURRENCY)) {
    if (ticker.endsWith(suffix)) {
      return CURRENCY_RATES[currency]
    }
  }
  return 1
}

export function toUsd(value: number, ticker: string): number {
  return value / getCurrencyRate(ticker)
}
