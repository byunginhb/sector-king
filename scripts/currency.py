#!/usr/bin/env python3
"""통화 정규화 — lib/currency.ts 의 Python 미러.

SoT 일치 (중요):
    이 모듈의 CURRENCY_RATES / TICKER_SUFFIX_CURRENCY 는 `lib/currency.ts` 와 **반드시 동일**해야 한다.
    환율/접미사 추가·변경 시 두 파일을 함께 수정한다(TS 가 1차 SoT, 여기는 Python 미러).
    env 키도 동일하게 사용: KRW_USD_RATE / JPY_USD_RATE / TWD_USD_RATE / HKD_USD_RATE / EUR_USD_RATE.

용도:
    시총·가격성 값을 native 통화 → USD 로 환산해 "정렬·임계 비교" 를 USD 기준으로 강제한다.
    (예: KR 종목 marketCap 은 KRW raw 라 toUsd 누락 시 1450배 큰 값이 항상 위로 올라가 KR 편중 오정렬.)

참고:
    07_market_scope 이후 KRW 외 통화 종목은 제거되지만, SoT 일치를 위해 lib/currency.ts 의
    전체 테이블을 그대로 미러한다(새 거래소 접미사가 다시 추가될 때도 안전).
"""

import os

# lib/currency.ts::CURRENCY_RATES 와 동일 (env fallback 기본값 동일)
CURRENCY_RATES: dict[str, float] = {
    "KRW": float(os.environ.get("KRW_USD_RATE") or 1450),
    "JPY": float(os.environ.get("JPY_USD_RATE") or 150),
    "TWD": float(os.environ.get("TWD_USD_RATE") or 32),
    "HKD": float(os.environ.get("HKD_USD_RATE") or 7.8),
    "EUR": float(os.environ.get("EUR_USD_RATE") or 0.92),
}

# lib/currency.ts::TICKER_SUFFIX_CURRENCY 와 동일
TICKER_SUFFIX_CURRENCY: dict[str, str] = {
    ".KS": "KRW",
    ".KQ": "KRW",
    ".T": "JPY",
    ".TW": "TWD",
    ".HK": "HKD",
    ".PA": "EUR",
}


def get_currency_rate(ticker: str) -> float:
    """티커 접미사로부터 USD 환산 분모(rate)를 반환. 접미사 없으면 1(USD)."""
    for suffix, currency in TICKER_SUFFIX_CURRENCY.items():
        if ticker.endswith(suffix):
            return CURRENCY_RATES[currency]
    return 1.0


def to_usd(value: float | None, ticker: str) -> float | None:
    """native 통화 값을 USD 로 환산. value 가 None 이면 None 반환(불변·안전)."""
    if value is None:
        return None
    return value / get_currency_rate(ticker)
