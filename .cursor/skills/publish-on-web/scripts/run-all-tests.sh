#!/usr/bin/env bash
# User-run test gate for publish-on-web skill (local matrix).
# Passing runs write .cursor/test-gates/local-pass.json for skip-on-publish.
# Slim production: ./run_production_tests
exec "$(cd "$(dirname "$0")" && pwd)/../../../../scripts/run_all_tests.sh" "$@"
