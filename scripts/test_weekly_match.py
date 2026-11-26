import copy
import json
import unittest
from unittest.mock import MagicMock, patch
from weekly_match import build_payload, collect, parse_chart, parse_regular_closes


class WeeklyMatchTests(unittest.TestCase):
    def chart(self):
        return {"chart": {"error": None, "result": [{"meta": {"symbol": "105560.KS", "currency": "KRW", "exchangeTimezoneName": "Asia/Seoul"},
            "timestamp": [1793923200], "indicators": {"quote": [{"close": [151000], "volume": [1614963]}], "adjclose": [{"adjclose": [1]}]}}]}}

    def test_raw_close_and_exact_date(self):
        bars, splits = parse_chart(self.chart(), "105560.KS", {"2026-11-06"})
        self.assertEqual(bars["2026-11-06"]["close"], 151000)
        self.assertEqual(splits, [])
        self.assertEqual(parse_chart(self.chart(), "105560.KS", {"2026-11-05"})[0], {})

    def test_verifies_regular_close_not_aftermarket_last_price(self):
        raw = {"isSuccess": True, "result": {"items": [{
            "tradingDateKst": "2026-11-16", "regularMarketClosingPrice": "90700",
            "closingPrice": "90900", "tradingVolume": "870897",
        }]}}
        self.assertEqual(parse_regular_closes(raw, {"2026-11-16"}), {"2026-11-16": 90700})
        for price in (None, "", "NaN", "0", "-1", True):
            with self.subTest(price=price), self.assertRaises(ValueError):
                invalid = copy.deepcopy(raw)
                invalid["result"]["items"][0]["regularMarketClosingPrice"] = price
                parse_regular_closes(invalid, {"2026-11-16"})

    def test_regular_close_rejects_failed_missing_duplicate_and_nontraded_days(self):
        row = {"tradingDateKst": "2026-11-16", "regularMarketClosingPrice": "90700", "tradingVolume": "1"}
        for raw in (
            None,
            [],
            {"isSuccess": True, "result": None},
            {"isSuccess": True, "result": {"items": [None]}},
            {"isSuccess": False, "result": {"items": [row]}},
            {"isSuccess": True, "result": {"items": []}},
            {"isSuccess": True, "result": {"items": [row, row]}},
            {"isSuccess": True, "result": {"items": [{**row, "tradingVolume": "0"}]}},
        ):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_regular_closes(raw, {"2026-11-16"})

    def test_collect_cross_checks_and_preserves_both_sources(self):
        for regular_close in (151000, 150000):
            with self.subTest(regular_close=regular_close):
                verification = {"isSuccess": True, "result": {"items": [{
                    "tradingDateKst": "2026-11-06", "regularMarketClosingPrice": str(regular_close),
                    "closingPrice": "152000", "tradingVolume": "1700000",
                }]}}
                responses = []
                for body in (self.chart(), verification):
                    response = MagicMock()
                    response.__enter__.return_value.read.return_value = json.dumps(body).encode()
                    responses.append(response)
                with patch("weekly_match.urllib.request.urlopen", side_effect=responses) as fetch:
                    if regular_close != 151000:
                        with self.assertRaisesRegex(ValueError, "regular-session close mismatch"):
                            collect("105560.KS", "2026-11-06", "2026-11-06")
                    else:
                        bars, _, _, _, evidence = collect("105560.KS", "2026-11-06", "2026-11-06")
                        self.assertEqual(bars["2026-11-06"], {"close": 151000, "volume": 1614963})
                        self.assertEqual(evidence["verification"]["response"], verification)
                        self.assertEqual(evidence["verification"]["field"], "regularMarketClosingPrice")
                    self.assertEqual(fetch.call_count, 2)

    def test_wrong_currency_and_nontraded_bar(self):
        raw = self.chart()
        raw["chart"]["result"][0]["meta"]["currency"] = "USD"
        with self.assertRaises(ValueError):
            parse_chart(raw, "105560.KS", {"2026-11-06"})
        raw = self.chart()
        raw["chart"]["result"][0]["indicators"]["quote"][0]["volume"] = [0]
        self.assertEqual(parse_chart(raw, "105560.KS", {"2026-11-06"})[0], {})

    def test_publish_never_fetches_future_week(self):
        document = {"round": {"id": "test", "baseDate": "2025-11-07", "endDate": "2025-11-14", "opensAt": "2025-11-08T00:00:00Z",
                    "left": {"tickers": [{"ticker": "105560.KS"}]}, "right": {"tickers": [{"ticker": "009540.KS"}]}}}
        calls = []
        def fetch(ticker, base, end):
            calls.append((base, end))
            return {base: {"close": 100, "volume": 1}}, [], "https://example.com", "2025-11-08T00:00:00Z", {}
        payload, audit = build_payload("publish", copy.deepcopy(document), fetch)
        self.assertEqual(calls, [("2025-11-07", "2025-11-07")] * 2)
        self.assertEqual(len(audit), 2)
        self.assertEqual(payload["round"]["left"]["tickers"][0]["priceDate"], "2025-11-07")

    def test_missing_base_stops_publication(self):
        document = {"round": {"baseDate": "2025-11-07", "endDate": "2025-11-14", "left": {"tickers": [{"ticker": "105560.KS"}]}, "right": {"tickers": [{"ticker": "009540.KS"}]}}}
        with self.assertRaises(ValueError):
            build_payload("publish", document, lambda *args: ({}, [], "url", "time", {}))

    def test_changed_base_and_split_are_not_silently_scored(self):
        document = {"round": {"id": "test", "baseDate": "2025-11-07", "endDate": "2025-11-14",
            "left": {"tickers": [{"ticker": "105560.KS", "close": 100, "priceDate": "2025-11-07"}]},
            "right": {"tickers": [{"ticker": "009540.KS", "close": 100, "priceDate": "2025-11-07"}]}}}
        def fetch(ticker, base, end):
            return {base: {"close": 50, "volume": 1}, end: {"close": 51, "volume": 1}}, ["2025-11-10"], "url", "time", {}
        payload, _ = build_payload("settle", document, fetch)
        self.assertTrue(all(price["corporateAction"] for price in payload["prices"]))


if __name__ == "__main__":
    unittest.main()
