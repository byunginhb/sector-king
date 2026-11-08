#!/usr/bin/env python3
"""Collect an explicitly reviewed KR round; write an audit before optional ingestion."""

import argparse
import hashlib
import json
import math
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")
UTC = timezone.utc


def positive(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


def parse_chart(raw, ticker, wanted_dates):
    result = raw["chart"]["result"]
    if raw["chart"].get("error") or not result or len(result) != 1:
        raise ValueError(f"{ticker}: invalid chart")
    chart = result[0]
    meta = chart["meta"]
    if meta.get("symbol") != ticker or meta.get("currency") != "KRW" or meta.get("exchangeTimezoneName") != "Asia/Seoul":
        raise ValueError(f"{ticker}: wrong instrument/currency/timezone")
    quotes = chart["indicators"]["quote"][0]
    timestamps = chart.get("timestamp", [])
    if len(timestamps) != len(quotes["close"]) or len(timestamps) != len(quotes["volume"]):
        raise ValueError(f"{ticker}: inconsistent daily bars")
    found = {}
    for index, stamp in enumerate(timestamps):
        day = datetime.fromtimestamp(stamp, KST).date().isoformat()
        if day not in wanted_dates:
            continue
        if day in found:
            raise ValueError(f"{ticker}: duplicate daily bar")
        close, volume = quotes["close"][index], quotes["volume"][index]
        if positive(close) and positive(volume):
            found[day] = {"close": close, "volume": volume}
    # Yahoo quote.close is unadjusted; do not substitute adjclose or currentPrice.
    splits = [datetime.fromtimestamp(event["date"], KST).date().isoformat()
              for event in chart.get("events", {}).get("splits", {}).values()]
    return found, splits


def collect(ticker, base_date, end_date):
    if not re.fullmatch(r"[0-9]{6}\.(KS|KQ)", ticker):
        raise ValueError("Only Korean tickers are supported")
    start = int(datetime.combine(date.fromisoformat(base_date), time(), KST).timestamp())
    stop = int(datetime.combine(date.fromisoformat(end_date) + timedelta(days=1), time(), KST).timestamp())
    query = urllib.parse.urlencode({"period1": start, "period2": stop, "interval": "1d", "events": "splits,div", "includeAdjustedClose": "false"})
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?{query}"
    req = urllib.request.Request(url, headers={"User-Agent": "SectorKing/weekly-match"})
    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read(2_000_001)
    if len(body) > 2_000_000:
        raise ValueError("Chart response exceeds audit size limit")
    raw = json.loads(body)
    retrieved_at = datetime.now(UTC).isoformat()
    digest = hashlib.sha256(body).hexdigest()
    bars, splits = parse_chart(raw, ticker, {base_date, end_date})
    evidence = {"ticker": ticker, "url": url, "retrievedAt": retrieved_at, "sha256": digest, "response": raw}
    return bars, splits, url + "#sha256=" + digest, retrieved_at, evidence


def build_payload(operation, document, fetch=collect):
    round_data = document["round"]
    base, end = round_data["baseDate"], round_data["endDate"]
    date.fromisoformat(base)
    date.fromisoformat(end)
    if base >= end:
        raise ValueError("Invalid round date order")
    now = datetime.now(UTC)
    needed_day = base if operation == "publish" else end
    if now < datetime.combine(date.fromisoformat(needed_day), time(18), KST):
        raise ValueError("Wait until 18:00 KST on the price date before collecting a close")
    sides = [round_data[side] for side in ("left", "right")]
    all_tickers = [quote["ticker"] for side in sides for quote in side["tickers"]]
    if len(all_tickers) != len(set(all_tickers)) or not all_tickers or any(not side["tickers"] for side in sides):
        raise ValueError("Empty or overlapping frozen universe")
    audit, prices = [], []
    for side in sides:
        for quote in side["tickers"]:
            ticker = quote["ticker"]
            # Publication cannot see future week bars. Settlement fetches both endpoints.
            bars, splits, source, retrieved, evidence = fetch(ticker, base, base if operation == "publish" else end)
            audit.append(evidence)
            if operation == "publish":
                if base not in bars:
                    raise ValueError(f"{ticker}: missing traded base close; nothing will be published")
                quote.update(bars[base], priceDate=base, source=source, retrievedAt=retrieved)
            else:
                if not positive(quote.get("close")) or quote.get("priceDate") != base:
                    raise ValueError("Settlement requires the saved publication payload, including frozen base closes")
                base_changed = base not in bars or bars[base]["close"] != quote["close"]
                corporate_action = base_changed or any(base < split <= end for split in splits)
                prices.append({"ticker": ticker, "close": bars.get(end, {}).get("close"), "volume": bars.get(end, {}).get("volume"),
                               "priceDate": end, "source": source, "retrievedAt": retrieved, "corporateAction": corporate_action})
    if operation == "publish":
        # Collection completes before entry opens; preserve any later planned opening.
        planned_open = datetime.fromisoformat(round_data["opensAt"].replace("Z", "+00:00"))
        round_data["opensAt"] = max(planned_open, datetime.now(UTC)).isoformat()
    payload = {"operation": "publish", "round": round_data} if operation == "publish" else {"operation": "settle", "roundId": round_data["id"], "prices": prices}
    return payload, audit


def write_exclusive(path, value):
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")


def send(payload):
    target = os.environ.get("CRON_TARGET_URL", "https://sector-king.com").rstrip("/")
    if target not in ("https://sector-king.com", "https://www.sector-king.com"):
        raise ValueError("CRON_TARGET_URL must be the existing production domain")
    secret = os.environ.get("CRON_SECRET")
    if not secret:
        raise ValueError("CRON_SECRET must be set in the execution environment")
    req = urllib.request.Request(target + "/api/cron/weekly-match-sync", data=json.dumps(payload, allow_nan=False).encode(),
                                 headers={"Authorization": "Bearer " + secret, "Content-Type": "application/json"}, method="POST")
    # No automatic redirects: never forward the bearer token to another host.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    with urllib.request.build_opener(NoRedirect).open(req, timeout=60) as response:
        result = json.loads(response.read(100_000))
    if not result.get("success"):
        raise ValueError("Server did not accept ingestion")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("publish", "settle"))
    parser.add_argument("document", type=Path, help="Reviewed round manifest, or saved publication JSON for settlement")
    parser.add_argument("--output", type=Path, required=True, help="New audit payload file; existing files are never overwritten")
    parser.add_argument("--correction-reason", help="Required by the server when an existing result changes")
    parser.add_argument("--send", action="store_true", help="Ingest only after writing the local audit; default is dry run")
    args = parser.parse_args()
    if args.output.exists() or args.output.with_suffix(".sources.json").exists():
        parser.error("Choose a new output path; preserve prior evidence")
    try:
        document = json.loads(args.document.read_text())
        payload, evidence = build_payload(args.operation, document)
        if args.correction_reason:
            if args.operation != "settle":
                raise ValueError("Corrections apply only to settlement")
            payload["correctionReason"] = args.correction_reason
        write_exclusive(args.output.with_suffix(".sources.json"), evidence)
        write_exclusive(args.output, payload)
        print(f"Audit saved: {args.output}; {len(evidence)} instruments; not ingested yet")
        if args.send:
            result = send(payload)
            write_exclusive(args.output.with_suffix(".receipt.json"), result)
            print("Server accepted ingestion; receipt saved")
    except (ValueError, KeyError, TypeError, OSError, urllib.error.URLError) as exc:
        # Never print response bodies or request headers containing credentials.
        print(f"Weekly match stopped: {type(exc).__name__}: {str(exc)[:200]}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
