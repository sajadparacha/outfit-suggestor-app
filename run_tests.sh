#!/usr/bin/env bash
# Run all tests locally (no API keys, no Cursor AI usage).
set -u
set -o pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="${REPORT_DIR:-"$ROOT_DIR/.test-reports/$(date +%Y%m%d-%H%M%S)"}"
mkdir -p "$REPORT_DIR"

BACKEND_LOG="$REPORT_DIR/backend.log"
FRONTEND_LOG="$REPORT_DIR/frontend.log"
PYTEST_JUNIT_XML="$REPORT_DIR/pytest-junit.xml"
JEST_JSON="$REPORT_DIR/jest-results.json"

backend_status=0
frontend_status=0

echo "=== Backend tests (pytest) ==="
(
  cd "$ROOT_DIR/backend" \
    && pip install -q -r requirements.txt \
    && pytest tests/ -v --tb=short --junitxml "$PYTEST_JUNIT_XML"
) 2>&1 | tee "$BACKEND_LOG"
backend_status=${PIPESTATUS[0]}

echo ""
echo "=== Frontend tests (Jest) ==="
(
  cd "$ROOT_DIR/frontend" \
    && npm install \
    && npm test -- --watchAll=false --json --outputFile "$JEST_JSON"
) 2>&1 | tee "$FRONTEND_LOG"
frontend_status=${PIPESTATUS[0]}

echo ""
echo "=== Test Summary ==="

export REPORT_DIR
export BACKEND_LOG
export FRONTEND_LOG
export PYTEST_JUNIT_XML
export JEST_JSON

python - <<'PY'
from __future__ import annotations

import json
import os
import textwrap
import xml.etree.ElementTree as ET

report_dir = os.environ.get("REPORT_DIR")
pytest_xml = os.environ.get("PYTEST_JUNIT_XML")
jest_json = os.environ.get("JEST_JSON")
backend_log = os.environ.get("BACKEND_LOG")
frontend_log = os.environ.get("FRONTEND_LOG")

def find_path(name: str) -> str | None:
    # The bash script uses absolute paths; try to locate them via env, then fallback.
    return os.environ.get(name)

def table(headers, rows):
    widths = [len(h) for h in headers]
    rows_s = [[str(c) for c in r] for r in rows]
    for r in rows_s:
        for i, c in enumerate(r):
            widths[i] = max(widths[i], len(c))

    def fmt_row(r):
        return "| " + " | ".join(r[i].ljust(widths[i]) for i in range(len(headers))) + " |"

    print(fmt_row(headers))
    print("|-" + "-|-".join("-" * w for w in widths) + "-|")
    for r in rows_s:
        print(fmt_row(r))

def truncate(s: str, n: int = 120) -> str:
    s = " ".join(s.strip().split())
    return s if len(s) <= n else s[: n - 1] + "…"

def parse_pytest_junit(path: str | None):
    res = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "errors": 0,
        "skipped": 0,
        "failures": [],  # list[{id, message}]
    }
    if not path or not os.path.exists(path):
        return res

    tree = ET.parse(path)
    root = tree.getroot()

    # Root may be <testsuites> or <testsuite>
    suites = []
    if root.tag == "testsuite":
        suites = [root]
    else:
        suites = list(root.findall("testsuite"))

    for suite in suites:
        res["total"] += int(suite.attrib.get("tests", 0))
        res["failed"] += int(suite.attrib.get("failures", 0))
        res["errors"] += int(suite.attrib.get("errors", 0))
        res["skipped"] += int(suite.attrib.get("skipped", 0))

        for tc in suite.iter("testcase"):
            classname = tc.attrib.get("classname") or ""
            name = tc.attrib.get("name") or ""
            test_id = f"{classname}::{name}" if classname else name

            failure = tc.find("failure")
            error = tc.find("error")
            skipped = tc.find("skipped")

            if skipped is not None:
                continue
            if failure is not None or error is not None:
                node = failure if failure is not None else error
                msg = node.attrib.get("message") or (node.text or "")
                res["failures"].append({"id": test_id, "message": truncate(msg)})

    res["passed"] = max(res["total"] - res["failed"] - res["errors"] - res["skipped"], 0)
    return res

def parse_jest_json(path: str | None):
    res = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "failures": [],  # list[{id, message}]
    }
    if not path or not os.path.exists(path):
        return res

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    res["total"] = int(data.get("numTotalTests", 0))
    res["passed"] = int(data.get("numPassedTests", 0))
    res["failed"] = int(data.get("numFailedTests", 0))
    res["skipped"] = int(data.get("numPendingTests", 0))

    for file_result in data.get("testResults", []) or []:
        for ar in file_result.get("assertionResults", []) or []:
            if ar.get("status") != "failed":
                continue
            full = ar.get("fullName")
            if not full:
                parts = (ar.get("ancestorTitles") or []) + [ar.get("title") or ""]
                full = " > ".join([p for p in parts if p])

            failure_messages = ar.get("failureMessages") or file_result.get("message") or ""
            if isinstance(failure_messages, list):
                failure_messages = "\n".join(failure_messages)

            first_line = failure_messages.strip().splitlines()[0] if str(failure_messages).strip() else ""
            res["failures"].append({"id": full, "message": truncate(first_line or failure_messages)})

    return res

backend = parse_pytest_junit(pytest_xml)
frontend = parse_jest_json(jest_json)

summary_rows = [
    ["backend (pytest)", backend["total"], backend["passed"], backend["failed"], backend["errors"], backend["skipped"]],
    ["frontend (jest)", frontend["total"], frontend["passed"], frontend["failed"], 0, frontend["skipped"]],
]

table(
    ["suite", "total", "passed", "failed", "errors", "skipped"],
    summary_rows,
)

all_failures = (
    [{"suite": "backend", **f} for f in backend["failures"]]
    + [{"suite": "frontend", **f} for f in frontend["failures"]]
)

if all_failures:
    print("\n=== Failure Details ===")
    detail_rows = [[f["suite"], f["id"], f["message"]] for f in all_failures]
    table(["suite", "test", "error (first line)"], detail_rows)
    print("\nLogs:")
    if backend_log:
        print(f"- backend: {backend_log}")
    if frontend_log:
        print(f"- frontend: {frontend_log}")
    if pytest_xml:
        print(f"- pytest junit: {pytest_xml}")
    if jest_json:
        print(f"- jest json: {jest_json}")
else:
    print("\nAll tests passed.")
PY

echo ""
echo "Reports saved to: $REPORT_DIR"

exit_code=0
if [[ $backend_status -ne 0 || $frontend_status -ne 0 ]]; then
  exit_code=1
fi

exit "$exit_code"
