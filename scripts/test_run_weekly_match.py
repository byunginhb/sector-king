import copy
import json
import os
import tempfile
import unittest
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

from run_weekly_match import apply, baseline, prepare, probe, restore


def at(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def document():
    return {"enabled": True, "round": {
        "id": "kr-2025-11-10", "title": "은행 vs 조선", "baseDate": "2025-11-07", "endDate": "2025-11-14",
        "opensAt": "2025-11-07T09:00:00Z", "closesAt": "2025-11-10T00:00:00Z", "endsAt": "2025-11-14T09:00:00Z",
        "calendarSource": "https://global.krx.co.kr/", "calendarVerifiedAt": "2025-11-07T08:00:00Z",
        "left": {"id": "banks", "name": "은행", "tickers": [{"ticker": "105560.KS", "name": "KB"}]},
        "right": {"id": "ships", "name": "조선", "tickers": [{"ticker": "009540.KS", "name": "HD"}]}}}


def frozen_payload(doc):
    payload = {"operation": "publish", "round": copy.deepcopy(doc["round"])}
    for side in ("left", "right"):
        for quote in payload["round"][side]["tickers"]:
            quote.update(close=100, volume=1, priceDate=payload["round"]["baseDate"],
                         source="https://query1.finance.yahoo.com/", retrievedAt="2025-11-07T09:00:00Z")
    return payload


def public_payload(payload, outcome=None):
    result = copy.deepcopy(payload["round"])
    for field in ("calendarSource", "calendarVerifiedAt"):
        result.pop(field)
    for side in ("left", "right"):
        result[side]["tickers"] = [{"ticker": quote["ticker"], "name": quote["name"]} for quote in result[side]["tickers"]]
    result["settlement"] = {"outcome": outcome} if outcome else None
    return result


class WeeklyMatchRunnerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.doc = document()
        self.check = Mock()

    def persist(self):
        payload = frozen_payload(self.doc)
        (self.directory / "publication.json").write_text(json.dumps(payload))
        (self.directory / "publication.sources.json").write_text("[]")
        return payload

    def test_waits_before_base_without_future_price_calls_but_probes(self):
        build = Mock()
        plan = prepare(self.doc, self.directory, at("2025-11-06T09:00:00Z"), read=lambda: [], check=self.check, build=build)
        self.assertEqual(plan["action"], "waiting-base")
        self.check.assert_called_once()
        build.assert_not_called()
        self.assertFalse((self.directory / "publication.json").exists())

    def test_disabled_manifest_stops_all_calls(self):
        read, build = Mock(), Mock()
        self.doc["enabled"] = False
        self.assertEqual(prepare(self.doc, self.directory, read=read, check=self.check, build=build)["action"], "disabled")
        read.assert_not_called()
        self.check.assert_not_called()
        build.assert_not_called()

    def test_closed_unpublished_round_fails_without_date_bump(self):
        build = Mock()
        with self.assertRaisesRegex(ValueError, "cutoff passed"):
            prepare(self.doc, self.directory, at("2025-11-10T00:00:00Z"), read=lambda: [], check=self.check, build=build)
        build.assert_not_called()

    def test_persists_baseline_before_post_and_replays_exactly_after_timeout(self):
        payload = frozen_payload(self.doc)
        build = Mock(return_value=(payload, [{"response": "raw source"}]))
        plan = prepare(self.doc, self.directory, at("2025-11-08T00:00:00Z"), read=lambda: [], check=self.check, build=build)
        self.assertTrue(plan["upload_baseline"])
        original = (self.directory / "publication.json").read_bytes()
        failure = Mock(side_effect=urllib.error.URLError("timeout"))
        with self.assertRaises(urllib.error.URLError):
            apply(self.doc, self.directory, plan, at("2025-11-08T00:00:00Z"), read=lambda: [], ingest=failure)
        later_build = Mock()
        replay = prepare(self.doc, self.directory, at("2025-11-09T00:00:00Z"), read=lambda: [], check=self.check, build=later_build)
        later_build.assert_not_called()
        ingest = Mock(return_value={"success": True})
        self.assertEqual(apply(self.doc, self.directory, replay, at("2025-11-09T00:00:00Z"), read=lambda: [], ingest=ingest), "accepted-publish")
        self.assertEqual(ingest.call_args.args[0], payload)
        self.assertEqual((self.directory / "publication.json").read_bytes(), original)

    def test_published_round_without_artifact_fails_closed(self):
        public = public_payload(frozen_payload(self.doc))
        with self.assertRaisesRegex(ValueError, "no trusted saved baseline"):
            prepare(self.doc, self.directory, at("2025-11-11T00:00:00Z"), read=lambda: [public], check=self.check)

    def test_manifest_roster_change_and_partial_artifact_are_rejected(self):
        self.persist()
        changed = copy.deepcopy(self.doc)
        changed["round"]["left"]["tickers"][0]["ticker"] = "999999.KS"
        with self.assertRaisesRegex(ValueError, "manifest changed"):
            baseline(changed, self.directory)
        (self.directory / "publication.sources.json").unlink()
        with self.assertRaisesRegex(ValueError, "source evidence"):
            baseline(self.doc, self.directory)

    def test_final_winners_and_void_skip_all_collection_and_ingestion(self):
        payload = self.persist()
        for outcome in ("left", "right", "tie", "void"):
            build, ingest = Mock(), Mock()
            read = lambda: [public_payload(payload, outcome)]
            plan = prepare(self.doc, self.directory, at("2025-11-22T09:00:00Z"), read=read, check=self.check, build=build)
            self.assertEqual(plan["action"], "final-skip")
            build.assert_not_called()
            self.assertEqual(apply(self.doc, self.directory, {"action": "settle"}, read=read, ingest=ingest), "final-skip")
            ingest.assert_not_called()

    def test_pending_expiry_keeps_each_missing_constituent_and_uses_frozen_base(self):
        payload = self.persist()
        read = lambda: [public_payload(payload)]
        with patch("run_weekly_match.collect", side_effect=urllib.error.URLError("provider down")) as fetch:
            plan = prepare(self.doc, self.directory, datetime.now(timezone.utc), read=read, check=self.check)
        self.assertEqual(plan["action"], "settle")
        self.assertEqual(fetch.call_count, 2)
        settlement = json.loads((self.directory / "settlement" / "settlement.json").read_text())
        self.assertEqual(len(settlement["prices"]), 2)
        self.assertTrue(all(quote["close"] is None and quote["corporateAction"] for quote in settlement["prices"]))
        self.assertTrue(settlement["automatic"])
        self.assertNotIn("correctionReason", settlement)
        ingest = Mock(return_value={"success": True, "data": {"outcome": "void"}})
        self.assertEqual(apply(self.doc, self.directory, plan, read=read, ingest=ingest), "accepted-settle")
        self.assertEqual(ingest.call_args.args[0], settlement)

    def test_deadline_rechecked_after_baseline_upload(self):
        self.persist()
        ingest = Mock()
        with self.assertRaisesRegex(ValueError, "Cutoff passed"):
            apply(self.doc, self.directory, {"action": "publish"}, at("2025-11-10T00:00:00Z"), read=lambda: [], ingest=ingest)
        ingest.assert_not_called()

    def test_socket_errors_preserve_all_twelve_frozen_constituents(self):
        self.doc["round"]["left"]["tickers"] = [{"ticker": f"{index:06d}.KS", "name": f"Bank {index}"} for index in range(1, 8)]
        self.doc["round"]["right"]["tickers"] = [{"ticker": f"{index:06d}.KS", "name": f"Ship {index}"} for index in range(8, 13)]
        payload = frozen_payload(self.doc)
        for failure in (TimeoutError("socket read timed out"), OSError("socket disconnected")):
            with self.subTest(error=type(failure).__name__):
                directory = self.directory / type(failure).__name__
                directory.mkdir()
                original = json.dumps(payload)
                (directory / "publication.json").write_text(original)
                (directory / "publication.sources.json").write_text("[]")
                read = lambda: [public_payload(payload)]
                with patch("run_weekly_match.collect", side_effect=failure) as fetch:
                    plan = prepare(self.doc, directory, read=read, check=self.check)
                self.assertEqual(plan["action"], "settle")
                self.assertEqual(fetch.call_count, 12)
                settlement = json.loads((directory / "settlement" / "settlement.json").read_text())
                self.assertEqual({quote["ticker"] for quote in settlement["prices"]}, {f"{index:06d}.KS" for index in range(1, 13)})
                self.assertTrue(all(quote["close"] is None and quote["volume"] is None and quote["corporateAction"] for quote in settlement["prices"]))
                self.assertTrue(settlement["automatic"])
                self.assertNotIn("correctionReason", settlement)
                self.assertNotIn("voidReason", settlement)
                self.assertEqual((directory / "publication.json").read_text(), original)
                sources = json.loads((directory / "settlement" / "settlement.sources.json").read_text())
                self.assertEqual(len(sources), 12)
                self.assertTrue(all(source["error"] == type(failure).__name__ for source in sources))

    def test_probe_accepts_only_authenticated_invalid_body_http400(self):
        with patch("run_weekly_match.send", side_effect=urllib.error.HTTPError("url", 400, "bad", {}, None)) as sender:
            probe()
            sender.assert_called_once_with({})
        with patch("run_weekly_match.send", side_effect=urllib.error.HTTPError("url", 401, "no", {}, None)):
            with self.assertRaisesRegex(ValueError, "HTTP 400"):
                probe()

    def test_restore_checks_workflow_main_repository_sha_and_event(self):
        name = "weekly-match-baseline-" + self.doc["round"]["id"]
        artifact = {"id": 10, "name": name, "expired": False, "workflow_run": {
            "id": 20, "repository_id": 1, "head_repository_id": 1, "head_branch": "main", "head_sha": "abc"}}
        run = {"workflow_id": 30, "head_branch": "main", "head_sha": "abc", "event": "workflow_dispatch"}
        def api(path):
            if path.endswith("/sector-king"):
                return {"id": 1}
            if path.endswith("weekly-match.yml"):
                return {"id": 30}
            if "actions/artifacts?" in path:
                return {"total_count": 1, "artifacts": [artifact]}
            return run
        def download(*args, **kwargs):
            self.persist()
        downloader = Mock(side_effect=download)
        with patch.dict(os.environ, {"GITHUB_REPOSITORY": "byunginhb/sector-king"}):
            self.assertEqual(restore(self.doc, self.directory, api=api, download=downloader), "restored")
            downloader.assert_called_once()
            for location, key, invalid in [(run, "workflow_id", 99), (run, "event", "pull_request"), (run, "head_sha", "other"),
                                          (artifact["workflow_run"], "head_branch", "feature"), (artifact["workflow_run"], "head_repository_id", 2)]:
                original = location[key]
                location[key] = invalid
                downloader.reset_mock()
                self.assertEqual(restore(self.doc, self.directory, api=api, download=downloader), "no-baseline")
                downloader.assert_not_called()
                location[key] = original


if __name__ == "__main__":
    unittest.main()
