#!/usr/bin/env bash
# Slim production gate for publish-on-web (health + tests_remote).
# Full matrix: pass --full through to scripts/run_all_tests.sh --production-full.
exec "$(cd "$(dirname "$0")" && pwd)/../../../../scripts/run_all_tests.sh" --production "$@"
