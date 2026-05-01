"""Admin-only routes for listing and running integration tests."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from time import perf_counter
import os
import re
import shutil
import subprocess
import sys

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from dependencies import get_current_admin_user
from models.user import User


router = APIRouter(prefix="/api/admin/integration-tests", tags=["Admin Integration Tests"])


@dataclass(frozen=True)
class IntegrationTestCase:
    id: str
    name: str
    description: str
    layer: str
    path: str


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
BACKEND_DIR = PROJECT_ROOT / "backend"

TEST_CASES: list[IntegrationTestCase] = [
    IntegrationTestCase(
        id="frontend-main-suggestion-flow",
        name="MainSuggestionFlow",
        description="Covers the end-to-end main suggestion journey from upload to rendered outfit.",
        layer="frontend",
        path="src/views/components/MainSuggestionFlow.integration.test.tsx",
    ),
    IntegrationTestCase(
        id="frontend-ai-instrumentation",
        name="AIInstrumentation",
        description="Verifies AI prompt/response instrumentation and metadata visibility behaviors.",
        layer="frontend",
        path="src/views/components/AIInstrumentation.integration.test.tsx",
    ),
    IntegrationTestCase(
        id="frontend-guide-footer",
        name="GuideAndFooter",
        description="Checks user guide and footer interactions across the integrated app shell.",
        layer="frontend",
        path="src/views/components/GuideAndFooter.integration.test.tsx",
    ),
    IntegrationTestCase(
        id="frontend-next-outfit-alternate",
        name="NextOutfitAlternate",
        description="Ensures alternate/regenerate flow requests a distinct next outfit suggestion.",
        layer="frontend",
        path="src/views/components/NextOutfitAlternate.integration.test.tsx",
    ),
    IntegrationTestCase(
        id="frontend-preferences-clear",
        name="PreferencesClear",
        description="Validates preference controls reset and state-clearing behavior in suggestion flow.",
        layer="frontend",
        path="src/views/components/PreferencesClear.integration.test.tsx",
    ),
    IntegrationTestCase(
        id="frontend-random-from-history",
        name="RandomFromHistory",
        description="Confirms random history retrieval and rendering back into the main preview.",
        layer="frontend",
        path="src/views/components/RandomFromHistory.integration.test.tsx",
    ),
    IntegrationTestCase(
        id="frontend-suggested-by-ai",
        name="SuggestedByAI",
        description="Checks AI suggestion attribution, labels, and related integrated UI signals.",
        layer="frontend",
        path="src/views/components/SuggestedByAI.integration.test.tsx",
    ),
    IntegrationTestCase(
        id="frontend-wardrobe",
        name="Wardrobe",
        description="Exercises wardrobe-integrated suggestion scenarios and key cross-view interactions.",
        layer="frontend",
        path="src/views/components/Wardrobe.integration.test.tsx",
    ),
    IntegrationTestCase(
        id="backend-auth-flow",
        name="Auth Flow",
        description="Tests integration of registration/login/authenticated access across backend APIs.",
        layer="backend",
        path="tests/test_integration_auth_flow.py",
    ),
    IntegrationTestCase(
        id="backend-complete-user-journey",
        name="Complete User Journey",
        description="Runs a full backend user lifecycle from auth through wardrobe and outfit usage.",
        layer="backend",
        path="tests/test_integration_complete_user_journey.py",
    ),
    IntegrationTestCase(
        id="backend-outfit-flow",
        name="Outfit Flow",
        description="Validates backend outfit suggestion flow with expected request/response behavior.",
        layer="backend",
        path="tests/test_integration_outfit_flow.py",
    ),
    IntegrationTestCase(
        id="backend-outfit-wardrobe",
        name="Outfit + Wardrobe",
        description="Covers interactions between wardrobe inventory and outfit generation endpoints.",
        layer="backend",
        path="tests/test_outfit_wardrobe_integration.py",
    ),
    IntegrationTestCase(
        id="backend-wardrobe-flow",
        name="Wardrobe Flow",
        description="Checks backend wardrobe CRUD and associated integration behavior end-to-end.",
        layer="backend",
        path="tests/test_integration_wardrobe_flow.py",
    ),
]

TEST_CASES_BY_ID = {case.id: case for case in TEST_CASES}
RUN_LOCK = Lock()
_PYTEST_BACKEND_COMMAND: list[str] | None = None


class RunTestRequest(BaseModel):
    test_id: str


def _can_import_pytest(python_cmd: str) -> bool:
    try:
        probe = subprocess.run(
            [python_cmd, "-c", "import pytest"],
            cwd=str(BACKEND_DIR),
            capture_output=True,
            text=True,
            timeout=10,
        )
        return probe.returncode == 0
    except Exception:
        return False


def _resolve_backend_pytest_command() -> list[str]:
    global _PYTEST_BACKEND_COMMAND
    if _PYTEST_BACKEND_COMMAND is not None:
        return _PYTEST_BACKEND_COMMAND

    python_candidates: list[str] = []
    for candidate in [sys.executable, "python3", "python"]:
        if candidate and candidate not in python_candidates:
            python_candidates.append(candidate)

    for python_cmd in python_candidates:
        if _can_import_pytest(python_cmd):
            _PYTEST_BACKEND_COMMAND = [python_cmd, "-m", "pytest"]
            return _PYTEST_BACKEND_COMMAND

    pytest_bin = shutil.which("pytest")
    if pytest_bin:
        _PYTEST_BACKEND_COMMAND = [pytest_bin]
        return _PYTEST_BACKEND_COMMAND

    # Final fallback preserves behavior but communicates the underlying issue in output.
    _PYTEST_BACKEND_COMMAND = ["python", "-m", "pytest"]
    return _PYTEST_BACKEND_COMMAND


def _build_command(test_case: IntegrationTestCase) -> tuple[list[str], Path, dict[str, str]]:
    env = os.environ.copy()
    if test_case.layer == "frontend":
        env["CI"] = "true"
        command = [
            "npm",
            "test",
            "--",
            "--watch=false",
            "--verbose",
            "--runTestsByPath",
            test_case.path,
        ]
        cwd = FRONTEND_DIR
    else:
        command = [*_resolve_backend_pytest_command(), test_case.path, "-q"]
        cwd = BACKEND_DIR
    return command, cwd, env


def _parse_counts(output: str) -> dict[str, int]:
    passed_match = re.search(r"(\d+)\s+passed", output)
    failed_match = re.search(r"(\d+)\s+failed", output)
    skipped_match = re.search(r"(\d+)\s+skipped", output)
    return {
        "passed": int(passed_match.group(1)) if passed_match else 0,
        "failed": int(failed_match.group(1)) if failed_match else 0,
        "skipped": int(skipped_match.group(1)) if skipped_match else 0,
    }


def _extract_jest_failure_causes(output: str) -> dict[str, str]:
    lines = output.splitlines()
    causes: dict[str, str] = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        match = re.match(r"^\s*●\s+(.+)$", line)
        if not match:
            i += 1
            continue

        full_name = match.group(1).strip()
        case_name = full_name.split("›")[-1].strip()
        block: list[str] = []
        i += 1
        while i < len(lines):
            current = lines[i]
            if re.match(r"^\s*●\s+.+$", current):
                break
            if current.startswith("Test Suites:") or current.startswith("Tests:"):
                break
            if current.strip():
                block.append(current.strip())
            i += 1

        if block:
            causes[case_name] = "\n".join(block[:18]).strip()
        else:
            causes.setdefault(case_name, "")
    return causes


def _extract_jest_test_cases(output: str) -> list[dict[str, str | None]]:
    passed_names = re.findall(r"^\s*[✓√]\s+(.+?)(?:\s+\(\d+\s*ms\))?\s*$", output, flags=re.MULTILINE)
    failed_names = re.findall(r"^\s*[✕xX]\s+(.+?)(?:\s+\(\d+\s*ms\))?\s*$", output, flags=re.MULTILINE)
    failure_causes = _extract_jest_failure_causes(output)

    results: list[dict[str, str | None]] = []
    for name in passed_names:
        results.append({"name": name.strip(), "status": "passed", "failure_cause": None})
    for name in failed_names:
        normalized = name.strip()
        results.append(
            {
                "name": normalized,
                "status": "failed",
                "failure_cause": failure_causes.get(normalized) or "See test output for stack trace.",
            }
        )
    return results


def _extract_pytest_failure_causes(output: str) -> dict[str, str]:
    pattern = re.compile(r"_{3,}\s*(.*?)\s*_{3,}\n(.*?)(?=\n_{3,}|\n=+|\Z)", flags=re.DOTALL)
    causes: dict[str, str] = {}
    for match in pattern.finditer(output):
        raw_name = match.group(1).strip()
        case_name = raw_name.split("::")[-1].strip()
        body_lines = [line.rstrip() for line in match.group(2).splitlines() if line.strip()]
        if body_lines:
            causes[case_name] = "\n".join(body_lines[:18]).strip()

    # Also parse pytest's "short test summary info" lines:
    # FAILED tests/file.py::test_name - AssertionError: ...
    summary_pattern = re.compile(r"^FAILED\s+([^\s]+)\s+-\s+(.+)$", flags=re.MULTILINE)
    for match in summary_pattern.finditer(output):
        full_name = match.group(1).strip()
        case_name = full_name.split("::")[-1]
        summary_cause = match.group(2).strip()
        if summary_cause and case_name not in causes:
            causes[case_name] = summary_cause

    return causes


def _extract_pytest_test_cases(output: str) -> list[dict[str, str | None]]:
    matches = re.findall(
        r"^([\w./-]+::[^\s]+)\s+(PASSED|FAILED|SKIPPED|ERROR)(?:\s+\[[^\]]+\])?$",
        output,
        flags=re.MULTILINE,
    )
    failure_causes = _extract_pytest_failure_causes(output)

    results: list[dict[str, str | None]] = []
    for full_name, status in matches:
        simple_name = full_name.split("::")[-1]
        status_normalized = "failed" if status in {"FAILED", "ERROR"} else status.lower()
        results.append(
            {
                "name": full_name,
                "status": status_normalized,
                "failure_cause": (
                    failure_causes.get(simple_name) or "See suite output excerpt for full traceback."
                    if status_normalized == "failed"
                    else None
                ),
            }
        )
    return results


def _extract_test_case_results(layer: str, output: str) -> list[dict[str, str | None]]:
    extracted = _extract_jest_test_cases(output) if layer == "frontend" else _extract_pytest_test_cases(output)
    normalized: list[dict[str, str | None]] = []
    for test_case in extracted:
        status = str(test_case.get("status") or "")
        failure_cause = test_case.get("failure_cause")
        if status == "failed" and (not failure_cause or not str(failure_cause).strip()):
            failure_cause = "See suite output excerpt for full traceback."
        normalized.append(
            {
                "name": str(test_case.get("name") or ""),
                "status": status or "failed",
                "failure_cause": str(failure_cause) if failure_cause is not None else None,
            }
        )
    return normalized


def _extract_suite_failure_cause(output: str) -> str:
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    if not lines:
        return "Unknown failure. No command output captured."

    priority_patterns = [
        r"^FAILED\s+.+\s+-\s+.+$",
        r"^E\s+.+$",
        r"^ERROR:\s+.+$",
        r".*ModuleNotFoundError.*",
        r".*ImportError.*",
        r".*AssertionError.*",
        r".*SyntaxError.*",
        r".*No tests found.*",
        r".*No tests ran.*",
    ]

    for pattern in priority_patterns:
        regex = re.compile(pattern)
        for line in lines:
            if regex.match(line):
                return line

    # Fallback to the last informative line
    for line in reversed(lines):
        if line and not line.startswith("="):
            return line
    return "Unknown failure."


def _run_single_test_case(test_case: IntegrationTestCase) -> dict:
    command, cwd, env = _build_command(test_case)
    started_at = datetime.now(timezone.utc)
    start_perf = perf_counter()
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd),
            env=env,
            capture_output=True,
            text=True,
            timeout=300,
        )
        timed_out = False
        exit_code = completed.returncode
        combined_output = (completed.stdout or "") + ("\n" + completed.stderr if completed.stderr else "")
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        exit_code = 124
        combined_output = ((exc.stdout or "") if isinstance(exc.stdout, str) else "") + "\n" + (
            (exc.stderr or "") if isinstance(exc.stderr, str) else ""
        )
        combined_output += "\nTest run timed out after 300 seconds."

    duration_ms = int((perf_counter() - start_perf) * 1000)
    counts = _parse_counts(combined_output)
    output_lines = [line for line in combined_output.splitlines() if line.strip()]
    output_excerpt = "\n".join(output_lines[-120:])
    test_case_results = _extract_test_case_results(test_case.layer, combined_output)
    suite_failure_cause = (
        _extract_suite_failure_cause(combined_output)
        if exit_code != 0
        else None
    )

    return {
        "test_id": test_case.id,
        "name": test_case.name,
        "description": test_case.description,
        "layer": test_case.layer,
        "path": test_case.path,
        "started_at": started_at.isoformat(),
        "duration_ms": duration_ms,
        "status": "passed" if exit_code == 0 else "failed",
        "timed_out": timed_out,
        "exit_code": exit_code,
        "command": " ".join(command),
        "passed": counts["passed"],
        "failed": counts["failed"],
        "skipped": counts["skipped"],
        "suite_failure_cause": suite_failure_cause,
        "test_cases": test_case_results,
        "output_excerpt": output_excerpt,
    }


@router.get("/")
async def list_integration_tests(
    current_user: User = Depends(get_current_admin_user),
):
    _ = current_user
    return {"tests": [case.__dict__ for case in TEST_CASES]}


@router.post("/run")
async def run_integration_test(
    payload: RunTestRequest,
    current_user: User = Depends(get_current_admin_user),
):
    _ = current_user
    test_case = TEST_CASES_BY_ID.get(payload.test_id)
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unknown integration test id",
        )

    acquired = RUN_LOCK.acquire(blocking=False)
    if not acquired:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another test run is in progress. Please wait and try again.",
        )

    try:
        return _run_single_test_case(test_case)
    finally:
        RUN_LOCK.release()


@router.post("/run-all")
async def run_all_integration_tests(
    current_user: User = Depends(get_current_admin_user),
):
    _ = current_user
    acquired = RUN_LOCK.acquire(blocking=False)
    if not acquired:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another test run is in progress. Please wait and try again.",
        )

    try:
        runs: list[dict] = []
        for test_case in TEST_CASES:
            runs.append(_run_single_test_case(test_case))

        summary = {
            "total_suites": len(runs),
            "passed_suites": len([r for r in runs if r["status"] == "passed"]),
            "failed_suites": len([r for r in runs if r["status"] == "failed"]),
            "total_test_cases": sum(len(r["test_cases"]) for r in runs),
            "failed_test_cases": sum(
                1
                for r in runs
                for t in r["test_cases"]
                if str(t.get("status")) == "failed"
            ),
        }
        return {"runs": runs, "summary": summary}
    finally:
        RUN_LOCK.release()
