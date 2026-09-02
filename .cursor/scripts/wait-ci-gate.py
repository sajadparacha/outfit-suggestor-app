#!/usr/bin/env python3
"""Wait for (or check) a GitHub Actions workflow; write last-report.json.

Does not print job logs. Agent should wait for process exit, then read the JSON.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
GATES = REPO / ".cursor" / "test-gates"
LAST_REPORT = GATES / "last-report.json"

WORKFLOW_LOCAL = "test-local.yml"
WORKFLOW_PRODUCTION = "test-production.yml"


def git_head() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=REPO, text=True
    ).strip()


def git_dirty() -> bool:
    porcelain = subprocess.check_output(
        ["git", "status", "--porcelain=v1"], cwd=REPO, text=True
    )
    diff = subprocess.check_output(["git", "diff", "HEAD"], cwd=REPO, text=True)
    return bool(porcelain.strip() or diff.strip())


def gh_json(args: list[str]) -> object:
    cmd = ["gh", *args]
    try:
        out = subprocess.check_output(cmd, cwd=REPO, text=True, stderr=subprocess.PIPE)
    except FileNotFoundError:
        raise SystemExit("gh CLI not found. Install GitHub CLI and run gh auth login.")
    except subprocess.CalledProcessError as exc:
        err = (exc.stderr or "").strip()
        print(f"GH_ERROR={err or exc}", file=sys.stderr)
        raise
    return json.loads(out) if out.strip() else None


def list_runs(workflow: str, limit: int = 30) -> list[dict]:
    data = gh_json(
        [
            "run",
            "list",
            "--workflow",
            workflow,
            "--json",
            "databaseId,headSha,status,conclusion,url,createdAt,displayTitle,event,workflowName",
            "--limit",
            str(limit),
        ]
    )
    return data or []


def wait_until_sha_has_run(workflow: str, sha: str, timeout: int = 120) -> list[dict]:
    deadline = time.time() + timeout
    while time.time() < deadline:
        found = matching_runs(workflow, sha)
        if found:
            return found
        print("CI_STATUS=waiting_for_run", flush=True)
        time.sleep(5)
    return []
    sha = sha.lower()
    return [r for r in list_runs(workflow) if (r.get("headSha") or "").lower() == sha]


def write_report(
    *,
    mode: str,
    overall: str,
    exit_code: int,
    sha: str,
    run: dict | None,
    jobs: list[dict] | None,
    extra_failing: list[dict] | None = None,
) -> None:
    GATES.mkdir(parents=True, exist_ok=True)
    categories = []
    failing = list(extra_failing or [])
    for job in jobs or []:
        name = job.get("name") or "job"
        conclusion = (job.get("conclusion") or "").lower()
        status = "PASS" if conclusion == "success" else (
            "SKIP" if conclusion in ("skipped", "cancelled") else "FAIL"
        )
        categories.append(
            {
                "name": name,
                "passed": 1 if status == "PASS" else 0,
                "failed": 1 if status == "FAIL" else 0,
                "total": 1,
                "status": status if status != "SKIP" else "PASS",
            }
        )
        if status == "FAIL":
            failing.append({"category": name, "name": f"CI job failed ({conclusion or 'unknown'})"})
    payload = {
        "schema": 1,
        "mode": mode,
        "overall": overall,
        "exit_code": exit_code,
        "git_head": sha,
        "git_dirty": git_dirty(),
        "source": "github-actions",
        "workflow": (run or {}).get("workflowName") or "",
        "run_url": (run or {}).get("url") or "",
        "run_id": (run or {}).get("databaseId"),
        "written_at": datetime.now(timezone.utc).isoformat(),
        "categories": categories,
        "failing_tests": failing,
    }
    LAST_REPORT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"TEST_REPORT_PATH={LAST_REPORT}")


def successful_run(workflow: str, sha: str) -> dict | None:
    for run in matching_runs(workflow, sha):
        if (run.get("status") or "").lower() == "completed" and (
            run.get("conclusion") or ""
        ).lower() == "success":
            return run
    return None


def wait_for_run(run_id: int, timeout: int) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        data = gh_json(
            [
                "run",
                "view",
                str(run_id),
                "--json",
                "databaseId,headSha,status,conclusion,url,jobs,workflowName,event",
            ]
        )
        status = (data.get("status") or "").lower()
        print(f"CI_STATUS={status} RUN_ID={run_id}", flush=True)
        if status == "completed":
            return data
        time.sleep(15)
    raise SystemExit(f"Timed out waiting for GitHub Actions run {run_id}")


def dispatch_and_find(workflow: str, sha: str, ref: str, timeout: int) -> dict:
    existing = matching_runs(workflow, sha)
    max_id = max((int(r.get("databaseId") or 0) for r in existing), default=0)
    subprocess.check_call(
        ["gh", "workflow", "run", workflow, "--ref", ref],
        cwd=REPO,
    )
    deadline = time.time() + min(timeout, 180)
    while time.time() < deadline:
        found = matching_runs(workflow, sha)
        newer = [r for r in found if int(r.get("databaseId") or 0) > max_id]
        if newer:
            return max(newer, key=lambda r: int(r.get("databaseId") or 0))
        print("CI_STATUS=waiting_for_dispatch", flush=True)
        time.sleep(5)
    raise SystemExit(
        f"No Actions run found for {workflow} at {sha[:12]}. "
        "Confirm the workflow file is on the remote branch."
    )


def jobs_from_run(run: dict) -> list[dict]:
    jobs = run.get("jobs") or []
    if jobs:
        return jobs
    rid = run.get("databaseId")
    if not rid:
        return []
    data = gh_json(
        ["run", "view", str(rid), "--json", "jobs"]
    )
    return (data or {}).get("jobs") or []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--workflow",
        required=True,
        help=f"Workflow file (e.g. {WORKFLOW_LOCAL} or {WORKFLOW_PRODUCTION})",
    )
    parser.add_argument("--sha", default="", help="Commit SHA (default: HEAD)")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Exit 0 if a successful completed run exists for this SHA; do not wait",
    )
    parser.add_argument(
        "--dispatch",
        action="store_true",
        help="gh workflow run, then wait (production gate)",
    )
    parser.add_argument("--ref", default="", help="Branch for --dispatch (default: current)")
    parser.add_argument("--timeout-seconds", type=int, default=0)
    args = parser.parse_args()

    sha = args.sha.strip() or git_head()
    timeout = args.timeout_seconds or (900 if args.dispatch else 2400)
    mode = "ci-production" if "production" in args.workflow else "ci-local"

    if args.check_only:
        if git_dirty() and not args.sha:
            print("SKIP_CI=0")
            print("REASON=worktree dirty; CI for HEAD does not cover uncommitted changes")
            return 1
        run = successful_run(args.workflow, sha)
        if not run:
            print("SKIP_CI=0")
            print("REASON=no successful Actions run for this commit")
            return 1
        print("SKIP_CI=1")
        print(f"HEAD={sha}")
        print(f"RUN_URL={run.get('url')}")
        jobs = jobs_from_run(run)
        write_report(
            mode=mode,
            overall="PASS",
            exit_code=0,
            sha=sha,
            run=run,
            jobs=jobs,
        )
        return 0

    run = None
    if args.dispatch:
        ref = args.ref.strip() or subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=REPO, text=True
        ).strip()
        if not ref:
            raise SystemExit("Detached HEAD: pass --ref <branch> for --dispatch")
        run = dispatch_and_find(args.workflow, sha, ref, timeout)
    else:
        existing = successful_run(args.workflow, sha)
        if existing:
            print(f"CI already passed: {existing.get('url')}", flush=True)
            jobs = jobs_from_run(existing)
            write_report(
                mode=mode, overall="PASS", exit_code=0, sha=sha, run=existing, jobs=jobs
            )
            return 0
        sha_runs = wait_until_sha_has_run(args.workflow, sha, timeout=120)
        in_flight = [
            r
            for r in sha_runs
            if (r.get("status") or "").lower() not in ("completed",)
        ]
        completed_fail = [
            r
            for r in sha_runs
            if (r.get("status") or "").lower() == "completed"
            and (r.get("conclusion") or "").lower() != "success"
        ]
        completed_ok = [
            r
            for r in sha_runs
            if (r.get("status") or "").lower() == "completed"
            and (r.get("conclusion") or "").lower() == "success"
        ]
        if completed_ok:
            run = completed_ok[0]
        elif in_flight:
            run = in_flight[0]
        elif completed_fail:
            run = completed_fail[0]
        else:
            print(
                "No Actions run for this SHA yet. Push the branch, then re-run wait-ci-gate.",
                file=sys.stderr,
            )
            write_report(
                mode=mode,
                overall="FAIL",
                exit_code=1,
                sha=sha,
                run=None,
                jobs=None,
                extra_failing=[
                    {
                        "category": args.workflow,
                        "name": "No GitHub Actions run for this commit (push the branch first)",
                    }
                ],
            )
            return 1

    viewed = wait_for_run(int(run["databaseId"]), timeout)
    conclusion = (viewed.get("conclusion") or "").lower()
    ok = conclusion == "success"
    jobs = viewed.get("jobs") or jobs_from_run(viewed)
    write_report(
        mode=mode,
        overall="PASS" if ok else "FAIL",
        exit_code=0 if ok else 1,
        sha=sha,
        run=viewed,
        jobs=jobs,
    )
    print(f"CI_CONCLUSION={conclusion}")
    print(f"RUN_URL={viewed.get('url')}")
    return 0 if ok else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError:
        sys.exit(1)
