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

// ── 표시 통화 토글 SoT ────────────────────────────────────────────────
// 사용자가 화면에서 선택하는 표시 통화. API 응답은 항상 USD 이며, 이 값은
// "어떤 단위로 표기할지"만 결정한다(toUsd 의 데이터 변환과는 별개의 표시 레이어).

/** 화면 표시 통화. 'KRW'=원화(₩), 'USD'=달러($). */
export type Currency = 'KRW' | 'USD'

/** 요구사항: 기본 표기는 원화(₩). */
export const DEFAULT_CURRENCY: Currency = 'KRW'

/**
 * localStorage / inline-script / data-attr 가 공유하는 상수(오타 방지·단일 진실).
 *
 * 주의: app/layout.tsx 의 <head> inline script 는 번들러가 이 상수를 자동
 *   치환하지 못하므로 키('sector-king-currency')·기본값('KRW')을 문자열로
 *   하드코딩한다. 값 변경 시 inline script 와 반드시 동시 수정할 것.
 */
export const CURRENCY_STORAGE_KEY = 'sector-king-currency'

/** <html data-currency="KRW|USD"> 속성명. inline script 와 동기화. */
export const CURRENCY_ATTRIBUTE = 'data-currency'

/** 임의 값이 유효한 Currency 인지 검증(런타임 가드). */
export function isCurrency(v: unknown): v is Currency {
  return v === 'KRW' || v === 'USD'
}
