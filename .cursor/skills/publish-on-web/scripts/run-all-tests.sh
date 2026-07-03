#!/usr/bin/env bash
# User-run test gate for publish-on-web skill. Exits non-zero on first failure.
# The publish-on-web agent workflow does not invoke this script — run it in your terminal.
exec "$(cd "$(dirname "$0")" && pwd)/../../../../scripts/run_all_tests.sh" "$@"
