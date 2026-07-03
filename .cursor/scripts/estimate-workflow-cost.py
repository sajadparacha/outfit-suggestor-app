#!/usr/bin/env python3
"""Estimate, track, and report Cursor token spend for Twin UI / Publish workflows."""

from __future__ import annotations

import argparse
import json
import sqlite3
import ssl
import sys
import time
import urllib.error
import urllib.request
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BASELINES_PATH = REPO_ROOT / ".cursor/workflow-cost-baselines.json"
ACTIVE_PATH = REPO_ROOT / ".cursor/workflow-cost-active.json"
HISTORY_PATH = REPO_ROOT / ".cursor/workflow-cost-history.jsonl"
DB_PATH = Path.home() / "Library/Application Support/Cursor/User/globalStorage/state.vscdb"
USAGE_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage"
EVENTS_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetFilteredUsageEvents"


def load_baselines() -> dict:
    return json.loads(BASELINES_PATH.read_text())


def load_token() -> str:
    if not DB_PATH.exists():
        raise RuntimeError(f"Cursor state database not found: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT value FROM ItemTable WHERE key='cursorAuth/accessToken'"
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise RuntimeError("Cursor access token not found; sign in to Cursor first.")
    raw = row[0]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw.strip('"')


def api_post(url: str, token: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload or {}).encode()
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Connect-Protocol-Version": "1",
            "User-Agent": "estimate-workflow-cost/1.1",
        },
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=60, context=context) as response:
        return json.loads(response.read().decode())


def fetch_usage(token: str) -> dict:
    return api_post(USAGE_URL, token)


def fetch_all_events(token: str) -> list[dict]:
    events: list[dict] = []
    page = 1
    total = None
    while True:
        data = api_post(EVENTS_URL, token, {"page": page, "pageSize": 500})
        if total is None:
            total = int(data.get("totalUsageEventsCount") or 0)
        batch = data.get("usageEventsDisplay") or []
        if not batch:
            break
        events.extend(batch)
        if len(events) >= total or len(batch) < 500:
            break
        page += 1
        time.sleep(0.15)
    return events


def detect_workflow(text: str, explicit: str | None) -> str:
    if explicit:
        return explicit
    lower = text.lower()
    if "cost twin ui" in lower:
        return "cost-twin-ui"
    if "twin ui" in lower or "parallel ui" in lower or "spawn both web and ios" in lower:
        return "twin-ui"
    if "publish on web" in lower:
        return "publish-on-web"
    raise ValueError(
        "Could not detect workflow. Pass --workflow twin-ui|cost-twin-ui|publish-on-web"
    )


def prompt_bump(prompt: str, multipliers: dict, flags: argparse.Namespace) -> float:
    bump = min(
        len(prompt) / multipliers["chars_per_dollar_bump"],
        multipliers["max_bump_usd"],
    )
    if flags.images:
        bump += multipliers["image_attachment_bump_usd"]
    if flags.backend:
        bump += multipliers["backend_bump_usd"]
    if flags.about_guide:
        bump += multipliers["about_guide_bump_usd"]
    return bump


def fmt_usd(value: float) -> str:
    return f"${value:.2f}"


def fmt_ts(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def billing_snapshot(usage: dict | None) -> dict | None:
    if not usage:
        return None
    plan = usage.get("planUsage") or {}
    spend = usage.get("spendLimitUsage") or {}
    return {
        "plan_total_spend_cents": plan.get("totalSpend"),
        "plan_included_spend_cents": plan.get("includedSpend"),
        "on_demand_used_cents": spend.get("individualUsed"),
        "on_demand_limit_cents": spend.get("individualLimit"),
    }


def compute_estimate(
    workflow_key: str, prompt: str, flags: argparse.Namespace, baselines: dict
) -> dict:
    wf = baselines["workflows"][workflow_key]
    bump = prompt_bump(prompt, baselines["prompt_multipliers"], flags)
    return {
        "workflow": workflow_key,
        "label": wf["label"],
        "usd_low": round(wf["usd_low"] + bump * 0.5, 2),
        "usd_typical": round(wf["usd_typical"] + bump, 2),
        "usd_high": round(wf["usd_high"] + bump * 1.5, 2),
        "calls_typical": wf["calls_typical"],
        "prompt_chars": len(prompt),
        "bump_usd": round(bump, 2),
    }


def build_estimate_report(
    estimate: dict,
    prompt: str,
    flags: argparse.Namespace,
    baselines: dict,
    usage: dict | None,
) -> str:
    wf = baselines["workflows"][estimate["workflow"]]
    bump = estimate["bump_usd"]
    lines = [
        "## Workflow cost estimate (heuristic)",
        "",
        f"**Workflow:** {estimate['label']}",
        f"**Estimated Cursor spend:** {fmt_usd(estimate['usd_low'])} – {fmt_usd(estimate['usd_high'])} "
        f"(typical {fmt_usd(estimate['usd_typical'])})",
        f"**Estimated API calls:** {wf['calls_low']}–{wf['calls_high']} (typical ~{wf['calls_typical']})",
        "",
        f"**Prompt size:** {len(prompt):,} characters",
        f"**Notes:** {wf['notes']}",
        "",
        "_Not a guarantee. Actual cost depends on model choice, chat length, cache, and test runs._",
    ]

    if bump > 0:
        extras = []
        if flags.images:
            extras.append("image(s)")
        if flags.backend:
            extras.append("backend/API")
        if flags.about_guide:
            extras.append("About/Guide")
        if len(prompt) > 1500:
            extras.append("long prompt")
        if extras:
            lines.append(f"**Adjustments:** +{fmt_usd(bump)} for {', '.join(extras)}")

    if usage:
        plan = usage.get("planUsage") or {}
        spend = usage.get("spendLimitUsage") or {}
        lines.extend(
            [
                "",
                "### Current billing cycle",
                f"- Plan usage: {plan.get('totalPercentUsed', 0):.0f}% "
                f"({fmt_usd((plan.get('includedSpend') or 0) / 100)} of "
                f"{fmt_usd((plan.get('limit') or 0) / 100)} included)",
                f"- On-demand used: {fmt_usd((spend.get('individualUsed') or 0) / 100)} of "
                f"{fmt_usd((spend.get('individualLimit') or 0) / 100)}",
            ]
        )
        remaining = (spend.get("individualRemaining") or 0) / 100
        if remaining < estimate["usd_high"]:
            lines.append(
                f"- **Warning:** estimate high end ({fmt_usd(estimate['usd_high'])}) may exceed "
                f"remaining on-demand budget ({fmt_usd(remaining)})"
            )

    lines.extend(
        [
            "",
            "### Proceed?",
            "Reply **yes** / **proceed** to start the workflow, or **no** / revise the prompt.",
        ]
    )
    return "\n".join(lines)


def cmd_start(args: argparse.Namespace) -> int:
    if ACTIVE_PATH.exists():
        print(
            f"Warning: replacing existing active session in {ACTIVE_PATH}",
            file=sys.stderr,
        )

    baselines = load_baselines()
    try:
        workflow_key = detect_workflow(args.prompt, args.workflow)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2

    estimate = compute_estimate(workflow_key, args.prompt, args, baselines)
    started_ms = int(time.time() * 1000)

    usage = None
    try:
        usage = fetch_usage(load_token())
    except (RuntimeError, urllib.error.URLError, TimeoutError):
        pass

    session = {
        "session_id": str(uuid.uuid4()),
        "workflow": workflow_key,
        "label": estimate["label"],
        "started_at_ms": started_ms,
        "started_at_iso": datetime.fromtimestamp(
            started_ms / 1000, tz=timezone.utc
        ).isoformat(),
        "prompt_preview": args.prompt[:200],
        "estimate": estimate,
        "billing_start": billing_snapshot(usage),
    }
    ACTIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    ACTIVE_PATH.write_text(json.dumps(session, indent=2))

    if args.json:
        print(json.dumps(session, indent=2))
        return 0

    print(f"Workflow cost tracking started ({estimate['label']}).")
    print(f"Session: {session['session_id']}")
    print(f"Estimated: {fmt_usd(estimate['usd_typical'])} typical")
    return 0


def summarize_events(events: list[dict]) -> dict:
    total_charged = 0.0
    total_on_demand = 0.0
    by_model: dict[str, float] = defaultdict(float)
    by_kind: dict[str, float] = defaultdict(float)
    input_tokens = output_tokens = cache_tokens = 0

    for event in events:
        charged = float(event.get("chargedCents") or 0)
        total_charged += charged
        kind = str(event.get("kind") or "unknown")
        by_kind[kind] += charged
        if "USAGE_BASED" in kind:
            total_on_demand += charged
        model = str(event.get("model") or "unknown")
        by_model[model] += charged
        usage = event.get("tokenUsage") or {}
        input_tokens += int(usage.get("inputTokens") or 0)
        output_tokens += int(usage.get("outputTokens") or 0)
        cache_tokens += int(usage.get("cacheReadTokens") or 0)

    return {
        "api_calls": len(events),
        "charged_usd": round(total_charged / 100, 2),
        "on_demand_usd": round(total_on_demand / 100, 2),
        "by_model_usd": {
            k: round(v / 100, 2) for k, v in sorted(by_model.items(), key=lambda x: -x[1])
        },
        "by_kind_usd": {
            k: round(v / 100, 2) for k, v in sorted(by_kind.items(), key=lambda x: -x[1])
        },
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cache_read_tokens": cache_tokens,
    }


def compare_to_estimate(actual_usd: float, estimate: dict) -> str:
    typical = estimate["usd_typical"]
    low = estimate["usd_low"]
    high = estimate["usd_high"]
    if actual_usd <= high:
        if actual_usd <= typical:
            return f"Under typical estimate ({fmt_usd(typical)})"
        return f"Within estimate range ({fmt_usd(low)}–{fmt_usd(high)})"
    over = actual_usd - high
    return f"**{fmt_usd(over)} over** high estimate ({fmt_usd(high)})"


def build_actual_report(session: dict, actual: dict, ended_ms: int) -> str:
    estimate = session["estimate"]
    duration_min = max(1, round((ended_ms - session["started_at_ms"]) / 60000))
    lines = [
        "## Workflow actual cost",
        "",
        f"**Workflow:** {session['label']}",
        f"**Session:** {session['session_id']}",
        f"**Window:** {fmt_ts(session['started_at_ms'])} → {fmt_ts(ended_ms)} (~{duration_min} min)",
        "",
        f"**Actual Cursor spend:** **{fmt_usd(actual['charged_usd'])}** "
        f"({actual['api_calls']} API calls)",
        f"**On-demand portion:** {fmt_usd(actual['on_demand_usd'])}",
        f"**vs estimate:** {compare_to_estimate(actual['charged_usd'], estimate)} "
        f"(estimated {fmt_usd(estimate['usd_low'])}–{fmt_usd(estimate['usd_high'])}, "
        f"typical {fmt_usd(estimate['usd_typical'])})",
        "",
        "### Tokens",
        f"- Input: {actual['input_tokens']:,}",
        f"- Output: {actual['output_tokens']:,}",
        f"- Cache read: {actual['cache_read_tokens']:,}",
    ]

    if actual["by_model_usd"]:
        lines.append("")
        lines.append("### By model")
        for model, usd in actual["by_model_usd"].items():
            lines.append(f"- {model}: {fmt_usd(usd)}")

    billing_start = session.get("billing_start") or {}
    billing_end = session.get("billing_end") or {}
    if billing_start and billing_end:
        od_delta = (
            (billing_end.get("on_demand_used_cents") or 0)
            - (billing_start.get("on_demand_used_cents") or 0)
        ) / 100
        lines.extend(
            [
                "",
                "### Billing cycle delta",
                f"- On-demand increase this workflow: {fmt_usd(od_delta)}",
            ]
        )

    lines.append("")
    lines.append(
        "_Based on Cursor usage events with timestamps after workflow start. "
        "May miss a few minutes of API lag._"
    )
    return "\n".join(lines)


def cmd_end(args: argparse.Namespace) -> int:
    if not ACTIVE_PATH.exists():
        print(f"No active workflow session at {ACTIVE_PATH}", file=sys.stderr)
        return 2

    session = json.loads(ACTIVE_PATH.read_text())
    ended_ms = int(time.time() * 1000)
    start_ms = int(session["started_at_ms"])

    try:
        token = load_token()
        usage_end = fetch_usage(token)
        session["billing_end"] = billing_snapshot(usage_end)
        events = fetch_all_events(token)
    except (RuntimeError, urllib.error.URLError, TimeoutError) as exc:
        print(f"Failed to fetch usage: {exc}", file=sys.stderr)
        return 1

    window_events = [
        e for e in events if int(e.get("timestamp") or 0) > start_ms
    ]
    actual = summarize_events(window_events)

    result = {
        "session_id": session["session_id"],
        "workflow": session["workflow"],
        "label": session["label"],
        "started_at_ms": start_ms,
        "ended_at_ms": ended_ms,
        "estimate": session["estimate"],
        "actual": actual,
        "billing_start": session.get("billing_start"),
        "billing_end": session.get("billing_end"),
    }

    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with HISTORY_PATH.open("a") as history:
        history.write(json.dumps(result) + "\n")
    ACTIVE_PATH.unlink(missing_ok=True)

    if args.json:
        print(json.dumps(result, indent=2))
        return 0

    print(build_actual_report(session, actual, ended_ms))
    return 0


def add_common_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--workflow",
        choices=["twin-ui", "cost-twin-ui", "publish-on-web"],
        help="Workflow type (auto-detected from prompt if omitted)",
    )
    parser.add_argument("--prompt", default="", help="User instruction text")
    parser.add_argument("--prompt-file", type=Path, help="Read prompt from file")
    parser.add_argument("--backend", action="store_true", help="Expect backend/API changes")
    parser.add_argument("--images", action="store_true", help="Prompt includes reference image(s)")
    parser.add_argument(
        "--about-guide", action="store_true", help="Expect About/Guide doc updates"
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON")


def resolve_prompt(args: argparse.Namespace) -> str:
    prompt = args.prompt
    if args.prompt_file:
        prompt = args.prompt_file.read_text()
    return prompt


def cmd_estimate(args: argparse.Namespace) -> int:
    prompt = resolve_prompt(args)
    if not prompt.strip() and not args.workflow:
        raise SystemExit("Provide --prompt or --prompt-file (or --workflow with --prompt)")

    baselines = load_baselines()
    try:
        workflow_key = detect_workflow(prompt, args.workflow)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2

    estimate = compute_estimate(workflow_key, prompt, args, baselines)

    usage = None
    try:
        usage = fetch_usage(load_token())
    except (RuntimeError, urllib.error.URLError, TimeoutError) as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}))
            return 1

    if args.json:
        payload = {**estimate, "billing": usage}
        print(json.dumps(payload, indent=2))
        return 0

    print(build_estimate_report(estimate, prompt, args, baselines, usage))
    return 0


def main() -> int:
    argv = sys.argv[1:]
    command = "estimate"
    if argv and argv[0] in {"estimate", "start", "end"}:
        command = argv[0]
        argv = argv[1:]

    if command == "end":
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument("--json", action="store_true")
        args = parser.parse_args(argv)
        return cmd_end(args)

    parser = argparse.ArgumentParser(description=__doc__)
    add_common_flags(parser)
    args = parser.parse_args(argv)
    args.prompt = resolve_prompt(args)

    if command == "start":
        if not args.prompt.strip() and not args.workflow:
            parser.error("Provide --prompt or --prompt-file")
        return cmd_start(args)

    if not args.prompt.strip() and not args.workflow:
        parser.error("Provide --prompt or --prompt-file")
    return cmd_estimate(args)


if __name__ == "__main__":
    raise SystemExit(main())
