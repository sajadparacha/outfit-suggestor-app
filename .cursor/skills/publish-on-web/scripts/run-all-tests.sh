#!/usr/bin/env bash
# User-run test gate for publish-on-web skill.
# Publish workflow also uses ./run_production_tests for the production gate.
exec "$(cd "$(dirname "$0")" && pwd)/../../../../scripts/run_all_tests.sh" "$@"
