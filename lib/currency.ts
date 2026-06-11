// 환율 단일 SoT(Single Source of Truth).
// 운영 주석: 이 값은 TS(표시·toUsd)와 Python(scripts/currency.py, 수집·스코어링)이
//   동일한 env 키를 공유해야 일관된다. 두 곳의 env 키를 항상 동기화할 것.
//   클라이언트 번들에서도 동일 환율을 쓰려면 NEXT_PUBLIC_KRW_USD_RATE 가 필요하다
//   (서버 전용 KRW_USD_RATE 는 클라 번들에 주입되지 않으므로 NEXT_PUBLIC_ 을 우선 조회).
const CURRENCY_RATES: Record<string, number> = {
  KRW:
    Number(process.env.NEXT_PUBLIC_KRW_USD_RATE) ||
    Number(process.env.KRW_USD_RATE) ||
    1450,
  JPY: Number(process.env.JPY_USD_RATE) || 150,
  TWD: Number(process.env.TWD_USD_RATE) || 32,
  HKD: Number(process.env.HKD_USD_RATE) || 7.8,
  EUR: Number(process.env.EUR_USD_RATE) || 0.92,
}

const TICKER_SUFFIX_CURRENCY: Record<string, string> = {
  '.KS': 'KRW',
  '.KQ': 'KRW',
  '.T': 'JPY',
  '.TW': 'TWD',
  '.HK': 'HKD',
  '.PA': 'EUR',
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

/**
 * KRW→USD 표시 환율(SoT). lib/format.ts 의 formatKrw 등 USD→₩ 역환산 표기에서 사용.
 * toUsd 와 동일한 CURRENCY_RATES.KRW 를 참조하므로 $ 표시와 ₩ 병기가 항상 같은 환율을 쓴다.
 */
export function getKrwRate(): number {
  return CURRENCY_RATES.KRW
}
