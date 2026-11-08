import copy
import unittest
from weekly_match import build_payload, parse_chart


class WeeklyMatchTests(unittest.TestCase):
    def chart(self):
        return {"chart": {"error": None, "result": [{"meta": {"symbol": "105560.KS", "currency": "KRW", "exchangeTimezoneName": "Asia/Seoul"},
            "timestamp": [1793923200], "indicators": {"quote": [{"close": [151000], "volume": [1614963]}], "adjclose": [{"adjclose": [1]}]}}]}}

    def test_raw_close_and_exact_date(self):
        bars, splits = parse_chart(self.chart(), "105560.KS", {"2026-11-06"})
        self.assertEqual(bars["2026-11-06"]["close"], 151000)
        self.assertEqual(splits, [])
        self.assertEqual(parse_chart(self.chart(), "105560.KS", {"2026-11-05"})[0], {})

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
