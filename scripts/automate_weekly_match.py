#!/usr/bin/env python3
"""Plan future weekly rounds and unfinished work; never ingest or invent prices."""

import argparse
import copy
import json
import re
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

from run_weekly_match import FINAL, emit, public_rounds
from weekly_match import KST, write_exclusive

AUTO_ID = re.compile(r"kr-auto-(\d{4}-\d{2}-\d{2})")
PUBLIC_FIELDS = ("id", "title", "baseDate", "endDate", "opensAt", "closesAt", "endsAt", "left", "right")


def next_round(settings, template, now):
    first = date.fromisoformat(settings["firstMonday"])
    if first.weekday() != 0:
        raise ValueError("First automatic round must start on a Monday")
    today = now.astimezone(KST).date()
    monday = today + timedelta(days=(-today.weekday()) % 7)
    if now >= datetime.combine(monday, time(9), KST):
        monday += timedelta(days=7)
    monday = max(first, monday)
    base, end = monday - timedelta(days=3), monday + timedelta(days=4)
    document = {"enabled": True, "automatic": True, "round": copy.deepcopy(template["round"])}
    document["round"].update(
        id="kr-auto-" + monday.isoformat(), baseDate=base.isoformat(), endDate=end.isoformat(),
        opensAt=datetime.combine(base, time(18), KST).astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        closesAt=datetime.combine(monday, time(9), KST).astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        endsAt=datetime.combine(end, time(18), KST).astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        calendarVerifiedAt=now.isoformat(),
    )
    for side in ("left", "right"):
        document["round"][side]["tickers"] = [{"ticker": item["ticker"], "name": item["name"]}
                                                   for item in document["round"][side]["tickers"]]
    return document


def discover(settings, template, manual, directory, now=None, read=public_rounds):
    now = now or datetime.now(timezone.utc)
    if not isinstance(settings.get("enabled"), bool):
        raise ValueError("Automation requires an explicit enabled boolean")
    rows = read()
    public = {}
    for row in rows:
        identifier = row["id"]
        if identifier in public:
            raise ValueError("Duplicate public round")
        if identifier.startswith("kr-auto-"):
            match = AUTO_ID.fullmatch(identifier)
            if not match or date.fromisoformat(match[1]).weekday() != 0:
                raise ValueError("Invalid automatic round identifier")
        outcome = (row.get("settlement") or {}).get("outcome")
        if outcome is not None and outcome not in FINAL | {"pending"}:
            raise ValueError("Unknown settlement state")
        public[identifier] = row

    documents = {}
    for document in manual:
        identifier = document["round"]["id"]
        if document["enabled"] and (public.get(identifier, {}).get("settlement") or {}).get("outcome") not in FINAL:
            documents[identifier] = copy.deepcopy(document)
    if settings["enabled"]:
        for identifier, row in public.items():
            if not AUTO_ID.fullmatch(identifier) or (row.get("settlement") or {}).get("outcome") in FINAL:
                continue
            documents[identifier] = {"enabled": True, "automatic": True, "round": {
                **{field: copy.deepcopy(row[field]) for field in PUBLIC_FIELDS},
                "calendarSource": template["round"]["calendarSource"], "calendarVerifiedAt": now.isoformat(),
            }}
        candidate = next_round(settings, template, now)
        identifier = candidate["round"]["id"]
        if identifier not in public:
            documents[identifier] = candidate
    if len(documents) > 16:
        raise ValueError("Too many unfinished rounds; stop for investigation")
    directory.mkdir(parents=True, exist_ok=True)
    entries = []
    for identifier, document in sorted(documents.items()):
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,79}", identifier):
            raise ValueError("Unsafe round identifier")
        path = directory / (identifier + ".json")
        write_exclusive(path, document)
        entries.append({"key": identifier, "manifest": str(path)})
    return entries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=Path("config/weekly-match-automation.json"))
    parser.add_argument("--output", type=Path, default=Path(".weekly-match-plan"))
    args = parser.parse_args()
    try:
        settings = json.loads(args.config.read_text())
        template = json.loads(Path(settings["template"]).read_text())
        manual = [json.loads(Path(path).read_text()) for path in ("config/weekly-match.json", "config/weekly-match-pilot.json")]
        entries = discover(settings, template, manual, args.output)
        emit(matrix=json.dumps({"include": entries}), has_work=str(bool(entries)).lower())
        write_exclusive(args.output / "plan.json", {"entries": entries, "plannedAt": datetime.now(timezone.utc).isoformat()})
        print(f"Weekly match: {len(entries)} round(s) planned; no ingestion")
        return 0
    except (OSError, ValueError, KeyError, TypeError) as error:
        print("Weekly match planning stopped: " + type(error).__name__)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
