#!/usr/bin/env python3
"""Operate only the reviewed round; persist its baseline before any publication."""

import argparse
import copy
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, time, timezone
from pathlib import Path

from weekly_match import KST, build_payload, collect, send, write_exclusive

FINAL = {"left", "right", "tie", "void"}
WORKFLOW = "weekly-match.yml"


def instant(value):
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("Timezone required")
    return result


def target():
    value = os.environ.get("CRON_TARGET_URL", "https://sector-king.com").rstrip("/")
    if value not in {"https://sector-king.com", "https://www.sector-king.com"}:
        raise ValueError("Unexpected production target")
    return value


def public_rounds():
    with urllib.request.urlopen(target() + "/api/weekly-match", timeout=30) as response:
        body = json.loads(response.read(200_000))
    if body.get("success") is not True or not isinstance(body.get("data", {}).get("rounds"), list):
        raise ValueError("Public match API unavailable")
    return body["data"]["rounds"]


def probe():
    # The authenticated route validates this empty body without mutating the DB.
    try:
        send({})
    except urllib.error.HTTPError as error:
        error.close()
        if error.code == 400:
            return
        raise ValueError("Authenticated cron probe did not return HTTP 400") from None
    raise ValueError("Invalid probe body was unexpectedly accepted")


def manifest(path):
    document = json.loads(path.read_text())
    if not isinstance(document.get("enabled"), bool):
        raise ValueError("Manifest needs an explicit enabled boolean")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,79}", document["round"]["id"]):
        raise ValueError("Invalid reviewed round ID")
    return document


def emit(**values):
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as stream:
            for key, value in values.items():
                stream.write(f"{key}={value}\n")


def gh_json(path):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True, stderr=subprocess.DEVNULL))


def restore(document, directory, api=gh_json, download=subprocess.run):
    """Accept artifacts only from this repository's main-branch operational workflow."""
    name = "weekly-match-baseline-" + document["round"]["id"]
    emit(artifact_name=name)
    if not document["enabled"]:
        return "disabled"
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    if repository != "byunginhb/sector-king":
        raise ValueError("Unexpected artifact repository")
    metadata = api(f"repos/{repository}")
    workflow = api(f"repos/{repository}/actions/workflows/{WORKFLOW}")
    response = api(f"repos/{repository}/actions/artifacts?name={name}&per_page=100")
    if response.get("total_count", 0) > 100:
        raise ValueError("Ambiguous baseline artifact history")
    for artifact in sorted(response.get("artifacts", []), key=lambda item: item["id"]):
        provenance = artifact.get("workflow_run", {})
        if artifact["name"] != name or artifact.get("expired") or provenance.get("head_branch") != "main":
            continue
        if provenance.get("repository_id") != metadata["id"] or provenance.get("head_repository_id") != metadata["id"]:
            continue
        run = api(f"repos/{repository}/actions/runs/{provenance['id']}")
        if (run.get("workflow_id") != workflow["id"] or run.get("head_branch") != "main"
                or run.get("head_sha") != provenance.get("head_sha") or run.get("event") not in {"schedule", "workflow_dispatch"}):
            continue
        directory.mkdir(parents=True, exist_ok=True)
        download(["gh", "run", "download", str(provenance["id"]), "--repo", repository,
                  "--name", name, "--dir", str(directory)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not (directory / "publication.json").is_file() or not (directory / "publication.sources.json").is_file():
            raise ValueError("Trusted artifact lacks complete publication evidence")
        return "restored"
    return "no-baseline"


def baseline(document, directory):
    path = directory / "publication.json"
    if not path.exists():
        return None
    if not (directory / "publication.sources.json").is_file():
        raise ValueError("Baseline source evidence is missing")
    payload = json.loads(path.read_text())
    frozen = copy.deepcopy(payload["round"])
    approved = copy.deepcopy(document["round"])
    if payload.get("operation") != "publish" or instant(frozen["opensAt"]) < instant(approved["opensAt"]):
        raise ValueError("Invalid frozen publication")
    frozen.pop("opensAt")
    approved.pop("opensAt")
    for side in ("left", "right"):
        frozen[side]["tickers"] = [{"ticker": quote["ticker"], "name": quote["name"]} for quote in frozen[side]["tickers"]]
    if frozen != approved:
        raise ValueError("Reviewed manifest changed after baseline persistence")
    return payload


def verify_published(public, frozen):
    round_data = frozen["round"]
    for field in ("id", "title", "baseDate", "endDate"):
        if public[field] != round_data[field]:
            raise ValueError("Published round differs from saved baseline")
    for field in ("opensAt", "closesAt", "endsAt"):
        if instant(public[field]) != instant(round_data[field]):
            raise ValueError("Published round times differ from saved baseline")
    for side in ("left", "right"):
        expected = {**round_data[side], "tickers": [{"ticker": quote["ticker"], "name": quote["name"]} for quote in round_data[side]["tickers"]]}
        if public[side] != expected:
            raise ValueError("Published roster differs from saved baseline")


def prepare(document, directory, now=None, read=public_rounds, check=probe, build=build_payload):
    now = now or datetime.now(timezone.utc)
    if not document["enabled"]:
        return {"action": "disabled"}
    check()
    rounds = read()
    public = next((item for item in rounds if item["id"] == document["round"]["id"]), None)
    frozen = baseline(document, directory)
    if public:
        if not frozen:
            raise ValueError("Published round has no trusted saved baseline; manual recovery required")
        verify_published(public, frozen)
        outcome = (public.get("settlement") or {}).get("outcome")
        if outcome in FINAL:
            return {"action": "final-skip", "outcome": outcome}
        if now < instant(frozen["round"]["endsAt"]):
            return {"action": "waiting-end"}
        # A failed source cannot produce a winning score; preserve all constituent slots.
        def fetch(ticker, base, end):
            try:
                return collect(ticker, base, end)
            except (OSError, ValueError, KeyError, TypeError) as error:
                retrieved = datetime.now(timezone.utc).isoformat()
                source = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker
                return {}, [], source, retrieved, {"ticker": ticker, "source": source, "retrievedAt": retrieved, "error": type(error).__name__}
        payload, sources = build("settle", copy.deepcopy(frozen), fetch=fetch)
        payload["automatic"] = True
        settlement_dir = directory / "settlement"
        settlement_dir.mkdir(parents=True, exist_ok=True)
        write_exclusive(settlement_dir / "settlement.sources.json", sources)
        write_exclusive(settlement_dir / "settlement.json", payload)
        return {"action": "settle"}
    close = instant(document["round"]["closesAt"])
    if now >= close:
        raise ValueError("Unpublished round cutoff passed; dates will not be advanced")
    base_ready = datetime.combine(datetime.fromisoformat(document["round"]["baseDate"]).date(), time(18), KST)
    if now < base_ready:
        return {"action": "waiting-base"}
    if frozen:
        return {"action": "publish", "upload_baseline": False}
    payload, sources = build("publish", copy.deepcopy(document))
    directory.mkdir(parents=True, exist_ok=True)
    write_exclusive(directory / "publication.sources.json", sources)
    write_exclusive(directory / "publication.json", payload)
    return {"action": "publish", "upload_baseline": True}


def apply(document, directory, plan, now=None, read=public_rounds, ingest=send):
    if not document["enabled"] or plan["action"] not in {"publish", "settle"}:
        return "no-write"
    now = now or datetime.now(timezone.utc)
    frozen = baseline(document, directory)
    if not frozen:
        raise ValueError("Stored baseline required")
    public = next((item for item in read() if item["id"] == frozen["round"]["id"]), None)
    if public:
        verify_published(public, frozen)
    if plan["action"] == "publish":
        if public:
            return "publication-already-confirmed"
        if now >= instant(frozen["round"]["closesAt"]):
            raise ValueError("Cutoff passed while persisting baseline; no publication")
        payload = frozen
    else:
        if not public:
            raise ValueError("Cannot settle an unpublished round")
        if (public.get("settlement") or {}).get("outcome") in FINAL:
            return "final-skip"
        if now < instant(frozen["round"]["endsAt"]):
            raise ValueError("Round has not ended")
        payload = json.loads((directory / "settlement" / "settlement.json").read_text())
    receipt = ingest(payload)
    write_exclusive(directory / "receipt.json", receipt)
    return "accepted-" + plan["action"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("restore", "prepare", "apply"))
    parser.add_argument("--manifest", type=Path, default=Path("config/weekly-match.json"))
    parser.add_argument("--audit-dir", type=Path, default=Path(".weekly-match-audit"))
    args = parser.parse_args()
    try:
        document = manifest(args.manifest)
        plan_file = args.audit_dir / "plan.json"
        if args.phase == "restore":
            status = restore(document, args.audit_dir)
        elif args.phase == "prepare":
            plan = prepare(document, args.audit_dir)
            args.audit_dir.mkdir(parents=True, exist_ok=True)
            write_exclusive(plan_file, plan)
            emit(action=plan["action"], upload_baseline=str(plan.get("upload_baseline", False)).lower())
            status = plan["action"]
        else:
            status = apply(document, args.audit_dir, json.loads(plan_file.read_text()))
        print("Weekly match: " + status)
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
                summary.write(f"Weekly match {args.phase}: **{status}**. Only the reviewed round is eligible.\n")
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        # Provider errors and subprocess output must never print request credentials.
        print("Weekly match stopped: " + type(error).__name__, file=sys.stderr)
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
                summary.write(f"Weekly match {args.phase}: **failed** ({type(error).__name__}). No automatic retry or date change.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
