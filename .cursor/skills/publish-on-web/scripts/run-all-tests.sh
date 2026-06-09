#!/usr/bin/env bash
# Test gate for publish-on-web skill. Exits non-zero on first failure.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../../../" && pwd)"
IOS_SIM="${IOS_SIM:-iPhone 17}"

echo "=== Publish on Web — test gate ==="
echo "Repo: $REPO_ROOT"
echo

echo ">>> Web (Jest)"
cd "$REPO_ROOT/frontend"
npm test -- --watchAll=false --passWithNoTests
echo

echo ">>> Backend (pytest)"
cd "$REPO_ROOT/backend"
# shellcheck source=/dev/null
. venv/bin/activate
pytest -q
echo

echo ">>> iOS (xcodebuild)"
cd "$REPO_ROOT/ios-client"
xcodebuild test \
  -scheme OutfitSuggestor \
  -destination "platform=iOS Simulator,name=${IOS_SIM}" \
  -only-testing:OutfitSuggestorTests \
  -only-testing:OutfitSuggestorUITests
echo

echo "=== All test suites passed ==="
