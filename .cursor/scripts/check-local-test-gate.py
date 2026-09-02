#!/usr/bin/env python3
"""Exit 0 if publish can skip waiting on the local gate.

Skip when:
- local-pass.json fingerprint matches this worktree, or
- GitHub Actions test-local.yml already succeeded for this (clean) HEAD.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
STAMP = REPO / ".cursor" / "test-gates" / "local-pass.json"


def fingerprint() -> tuple[str, str]:
    import hashlib

    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
    porcelain = subprocess.check_output(
        ["git", "status", "--porcelain=v1"], cwd=REPO, text=True
    )
    diff = subprocess.check_output(["git", "diff", "HEAD"], cwd=REPO, text=True)
    h = hashlib.sha256()
    h.update(head.encode())
    h.update(b"\n")
    h.update(porcelain.encode())
    h.update(diff.encode())
    return head, h.hexdigest()


def stamp_matches() -> bool:
    if not STAMP.exists():
        return False
    try:
        data = json.loads(STAMP.read_text())
    except json.JSONDecodeError:
        return False
    if data.get("overall") != "PASS" or int(data.get("exit_code", 1)) != 0:
        return False
    _head, fp = fingerprint()
    if data.get("fingerprint") != fp:
        return False
    print("SKIP_LOCAL_GATE=1")
    print("SOURCE=local-stamp")
    print(f"HEAD={data.get('git_head')}")
    print(f"STAMP={STAMP}")
    print(f"WRITTEN_AT={data.get('written_at')}")
    return True


def try_ci_skip() -> int:
    script = Path(__file__).resolve().parent / "wait-ci-gate.py"
    return subprocess.run(
        [
            sys.executable,
            str(script),
            "--check-only",
            "--workflow",
            "test-local.yml",
        ],
        cwd=REPO,
    ).returncode


def main() -> int:
    if stamp_matches():
        return 0

    print("Checking GitHub Actions test-local.yml for this commit…")
    if try_ci_skip() == 0:
        print("SKIP_LOCAL_GATE=1")
        print("SOURCE=github-actions")
        return 0

    print("SKIP_LOCAL_GATE=0")
    print(
        "REASON=no matching local-pass stamp and no successful test-local.yml run for this commit"
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
