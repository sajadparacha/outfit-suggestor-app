#!/usr/bin/env bash
# Run remote API tests against Railway (or any deployed base URL).
#
# Required env vars:
# - API_BASE_URL (e.g. https://web-production-dfcf8.up.railway.app)
# - TEST_USERNAME (email)
# - TEST_PASSWORD
#
# Optional:
# - RUN_AI_TESTS=1 (enables AI-calling tests)
#
set -euo pipefail

cd "$(dirname "$0")"

: "${API_BASE_URL:?Missing API_BASE_URL}"
: "${TEST_USERNAME:?Missing TEST_USERNAME}"
: "${TEST_PASSWORD:?Missing TEST_PASSWORD}"

echo "Running remote tests against: $API_BASE_URL"
pytest backend/tests_remote -v

