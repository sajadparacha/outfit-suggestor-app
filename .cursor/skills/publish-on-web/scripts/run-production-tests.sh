#!/usr/bin/env bash
# Production test gate for publish-on-web skill (Option C: full matrix vs live API).
exec "$(cd "$(dirname "$0")" && pwd)/../../../../scripts/run_all_tests.sh" --production "$@"
