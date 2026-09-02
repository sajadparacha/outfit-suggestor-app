#!/usr/bin/env python3
"""Write .cursor/test-gates/*.json after ./run_all_tests (local or production)."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def git_fingerprint(repo: Path) -> tuple[str, str, bool]:
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=repo, text=True
    ).strip()
    porcelain = subprocess.check_output(
        ["git", "status", "--porcelain=v1"], cwd=repo, text=True
    )
    diff = subprocess.check_output(["git", "diff", "HEAD"], cwd=repo, text=True)
    dirty = bool(porcelain.strip() or diff.strip())
    import hashlib

    h = hashlib.sha256()
    h.update(head.encode())
    h.update(b"\n")
    h.update(porcelain.encode())
    h.update(diff.encode())
    return head, h.hexdigest(), dirty


def parse_categories(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < 5:
            continue
        name, passed, failed, total, status = parts[:5]
        rows.append(
            {
                "name": name,
                "passed": int(passed),
                "failed": int(failed),
                "total": int(total),
                "status": status,
            }
        )
    return rows


def parse_failing(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    for line in path.read_text().splitlines():
        if not line.strip() or "\t" not in line:
            continue
        category, name = line.split("\t", 1)
        rows.append({"category": category, "name": name})
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--mode", required=True, choices=("local", "production", "production-full"))
    parser.add_argument("--exit-code", type=int, required=True)
    parser.add_argument("--categories-tsv", required=True)
    parser.add_argument("--failing-tsv", required=True)
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    gates = repo / ".cursor" / "test-gates"
    gates.mkdir(parents=True, exist_ok=True)

    head, fingerprint, dirty = git_fingerprint(repo)
    overall = "PASS" if args.exit_code == 0 else "FAIL"
    payload = {
        "schema": 1,
        "mode": args.mode,
        "overall": overall,
        "exit_code": args.exit_code,
        "git_head": head,
        "git_dirty": dirty,
        "fingerprint": fingerprint,
        "written_at": datetime.now(timezone.utc).isoformat(),
        "categories": parse_categories(Path(args.categories_tsv)),
        "failing_tests": parse_failing(Path(args.failing_tsv)),
    }

    last = gates / "last-report.json"
    last.write_text(json.dumps(payload, indent=2) + "\n")

    if args.mode == "local" and args.exit_code == 0:
        (gates / "local-pass.json").write_text(json.dumps(payload, indent=2) + "\n")

    print(f"TEST_REPORT_PATH={last}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
