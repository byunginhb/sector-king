#!/usr/bin/env python3
"""섹터 후보 추출 (읽기 전용) — 자동 랭킹 + 수동 큐레이션 하이브리드.

설계 근거: data-model.md §3.5. 이 스크립트는 **DB 를 변경하지 않는다.**
시총(USD 환산) 상위 후보를 정렬해 출력하면, 큐레이터가 섹터 적합성으로 최종 선택 후
`add_ticker.py` 로 수동 편입한다.

처리 순서(게이트):
    1) 시장 게이트(필수): 접미사 ∈ {없음=US, .KS, .KQ} 만 통과. 그 외 거부.
    2) 데이터 결측 게이트: yfinance .info 에 marketCap 존재.
    3) 최소 시총 임계: **USD 환산 후** 비교. 기본 US≥$2B / KR≥₩1조(≈$0.7B 상당, USD 기준 env).
    4) 유동성 게이트: averageVolume ≥ 임계(US 50만, KR 10만).
    5) 데이터 품질 게이트(경고만): 펀더멘털 결측이 과도하면 후순위 표시.
    → USD 시총 DESC 정렬 → 상위 N 출력.

통화: 시총 정렬·임계 비교는 반드시 currency.to_usd(marketCap, ticker) 후 수행(KR raw 정렬 금지).

사용법:
    .venv/bin/python scripts/suggest_candidates.py --tickers AAPL,005930.KS,JD --sector ecommerce
    .venv/bin/python scripts/suggest_candidates.py --tickers-file candidates.txt --sector materials --limit 10
    .venv/bin/python scripts/suggest_candidates.py --tickers LMT,RTX,GD --region us --min-mcap-us 2e9 --json

옵션:
    --tickers       쉼표구분 후보 티커(필수 또는 --tickers-file)
    --tickers-file  줄바꿈/쉼표 구분 후보 파일
    --sector        (선택) 해당 섹터에 이미 편입됐는지 표시용
    --region        us|kr|all (시장 게이트 후 추가 필터, 기본 all)
    --limit         출력 상위 N (기본 20)
    --min-mcap-us   US 최소 시총(USD, 기본 2e9)
    --min-mcap-kr   KR 최소 시총(USD 환산, 기본 7e8)
    --min-vol-us    US 최소 평균거래량(기본 500000)
    --min-vol-kr    KR 최소 평균거래량(기본 100000)
    --json          JSON 출력(기본 표)
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import yfinance as yf

from currency import to_usd

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

# 시장 게이트 — lib/region.ts 및 add_ticker.py 와 동일 로직(US=접미사 없음, KR=.KS/.KQ)
KR_TICKER_SUFFIXES = (".KS", ".KQ")


def is_us_or_kr(ticker: str) -> bool:
    """허용 시장(US=접미사 없음, KR=.KS/.KQ)인지. 그 외 접미사는 거부."""
    if ticker.endswith(KR_TICKER_SUFFIXES):
        return True
    return "." not in ticker  # 접미사 없음 → US (BRK.B 류 예외는 별도 화이트리스트 대상)


def region_of(ticker: str) -> str:
    return "kr" if ticker.endswith(KR_TICKER_SUFFIXES) else "us"


def already_in_sector(conn: sqlite3.Connection, sector_id: str, ticker: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sector_companies WHERE sector_id = ? AND ticker = ?",
        (sector_id, ticker),
    ).fetchone()
    return row is not None


FUNDAMENTAL_FIELDS = (
    "revenueGrowth",
    "earningsGrowth",
    "operatingMargins",
    "returnOnEquity",
    "targetMeanPrice",
    "freeCashflow",
    "beta",
)


def data_quality(info: dict) -> float:
    """펀더멘털 7필드 비결측 비율(0~1) — scoring 의 data_quality 근사."""
    present = sum(1 for f in FUNDAMENTAL_FIELDS if info.get(f) is not None)
    return present / len(FUNDAMENTAL_FIELDS)


def parse_ticker_list(args: argparse.Namespace) -> list[str]:
    raw: list[str] = []
    if args.tickers:
        raw.extend(args.tickers.split(","))
    if args.tickers_file:
        text = Path(args.tickers_file).read_text(encoding="utf-8")
        for line in text.replace(",", "\n").splitlines():
            raw.append(line)
    seen: set[str] = set()
    result: list[str] = []
    for t in raw:
        t = t.strip().upper()
        if t and t not in seen:
            seen.add(t)
            result.append(t)
    return result


def evaluate(
    ticker: str,
    args: argparse.Namespace,
    conn: sqlite3.Connection | None,
) -> dict | None:
    """단일 후보 평가. 게이트 통과 시 dict 반환, 탈락 시 None(+사유 출력)."""
    # 1) 시장 게이트
    if not is_us_or_kr(ticker):
        print(f"  [reject] {ticker}: 비 US/KR 시장(접미사) — 거부", file=sys.stderr)
        return None

    region = region_of(ticker)
    if args.region != "all" and region != args.region:
        return None

    # 2) 데이터 결측 게이트
    try:
        info = yf.Ticker(ticker).info
    except Exception as e:
        print(f"  [reject] {ticker}: yfinance 조회 실패 ({e})", file=sys.stderr)
        return None
    if not info or info.get("marketCap") is None:
        print(f"  [reject] {ticker}: marketCap 결측", file=sys.stderr)
        return None

    raw_mcap = info.get("marketCap")
    usd_mcap = to_usd(raw_mcap, ticker)

    # 3) 최소 시총 임계 (USD 환산 후 비교)
    min_mcap = args.min_mcap_us if region == "us" else args.min_mcap_kr
    if usd_mcap is None or usd_mcap < min_mcap:
        print(
            f"  [reject] {ticker}: USD 시총 ${usd_mcap:,.0f} < 임계 ${min_mcap:,.0f}",
            file=sys.stderr,
        )
        return None

    # 4) 유동성 게이트
    avg_vol = info.get("averageVolume")
    min_vol = args.min_vol_us if region == "us" else args.min_vol_kr
    if avg_vol is not None and avg_vol < min_vol:
        print(
            f"  [reject] {ticker}: 평균거래량 {avg_vol:,} < 임계 {min_vol:,}",
            file=sys.stderr,
        )
        return None

    dq = data_quality(info)

    return {
        "ticker": ticker,
        "name": info.get("shortName") or info.get("longName") or ticker,
        "region": region,
        "marketCapUsd": round(usd_mcap),
        "marketCapNative": raw_mcap,
        "avgVolume": avg_vol,
        "dataQuality": round(dq, 2),
        "alreadyInSector": (
            already_in_sector(conn, args.sector, ticker)
            if (conn is not None and args.sector)
            else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="섹터 후보 추출(읽기 전용, USD 시총 정렬)")
    parser.add_argument("--tickers", help="쉼표구분 후보 티커")
    parser.add_argument("--tickers-file", help="후보 티커 파일(줄/쉼표 구분)")
    parser.add_argument("--sector", help="편입 여부 표시용 섹터 id")
    parser.add_argument("--region", choices=["us", "kr", "all"], default="all")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--min-mcap-us", type=float, default=2e9)
    parser.add_argument("--min-mcap-kr", type=float, default=7e8)
    parser.add_argument("--min-vol-us", type=float, default=500000)
    parser.add_argument("--min-vol-kr", type=float, default=100000)
    parser.add_argument("--json", action="store_true", help="JSON 출력")

    args = parser.parse_args()

    tickers = parse_ticker_list(args)
    if not tickers:
        parser.error("--tickers 또는 --tickers-file 로 후보를 지정하세요.")

    conn = sqlite3.connect(DB_PATH) if DB_PATH.exists() else None

    results: list[dict] = []
    for ticker in tickers:
        row = evaluate(ticker, args, conn)
        if row is not None:
            results.append(row)

    if conn is not None:
        conn.close()

    # USD 시총 DESC 정렬 (불변 — 새 리스트)
    ranked = sorted(results, key=lambda r: r["marketCapUsd"], reverse=True)[: args.limit]

    if args.json:
        print(json.dumps(ranked, ensure_ascii=False, indent=2))
        return

    if not ranked:
        print("통과한 후보가 없습니다(게이트 사유는 stderr 참조).")
        return

    print(f"\n후보 {len(ranked)}개 (USD 시총 DESC, DB 변경 없음):")
    print("-" * 88)
    print(f"{'TICKER':<14}{'REGION':<8}{'USD 시총':>18}{'평균거래량':>14}{'DQ':>6}  편입여부")
    print("-" * 88)
    for r in ranked:
        in_sector = (
            "이미편입" if r["alreadyInSector"] else "신규"
        ) if r["alreadyInSector"] is not None else "-"
        print(
            f"{r['ticker']:<14}{r['region']:<8}"
            f"${r['marketCapUsd']:>17,}"
            f"{(r['avgVolume'] or 0):>14,}"
            f"{r['dataQuality']:>6}  {in_sector}  {r['name']}"
        )
    print("-" * 88)
    print("→ 큐레이터 검토 후 add_ticker.py 로 수동 편입하세요. (이 스크립트는 DB 미변경)")


if __name__ == "__main__":
    main()
