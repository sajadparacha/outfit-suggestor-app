#!/usr/bin/env bash
# Full test gate: web, backend, iOS unit/integration, and iOS UITests.
# Prints a pass/fail summary table at the end.
#
# Usage:
#   ./scripts/run_all_tests.sh
#   ./run_all_tests
#   IOS_SIM="iPhone 17 Pro" ./run_all_tests
#   ./run_all_tests --web-only
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_SIM="${IOS_SIM:-iPhone 17}"
RUN_WEB=1
RUN_BACKEND=1
RUN_IOS=1

TMP_DIR=""
OVERALL_EXIT=0

declare -a SUMMARY_NAMES=()
declare -a SUMMARY_PASSED=()
declare -a SUMMARY_FAILED=()
declare -a SUMMARY_TOTAL=()
declare -a SUMMARY_STATUS=()

cleanup() {
  if [[ -n "$TMP_DIR" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

usage() {
  cat <<'EOF'
Usage: run_all_tests [options]

Runs all test suites: web (Jest), backend (pytest), iOS unit/integration
(OutfitSuggestorTests), and iOS UITests (OutfitSuggestorUITests).

Prints a summary table (passed / failed / total per category) when finished.

Options:
  --web-only          Frontend Jest only
  --backend-only      Backend pytest only
  --ios-only          iOS unit + UITests only
  --simulator NAME    iOS simulator (default: iPhone 17; or set IOS_SIM)
  --help              Show this help

Examples:
  run_all_tests
  run_all_tests --ios-only --simulator "iPhone 17 Pro"
  IOS_SIM="iPad Pro 13-inch (M5)" run_all_tests
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-only)
      RUN_BACKEND=0
      RUN_IOS=0
      shift
      ;;
    --backend-only)
      RUN_WEB=0
      RUN_IOS=0
      shift
      ;;
    --ios-only)
      RUN_WEB=0
      RUN_BACKEND=0
      shift
      ;;
    --simulator)
      IOS_SIM="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

record_summary() {
  local name="$1" passed="$2" failed="$3" total="$4" status="$5"
  SUMMARY_NAMES+=("$name")
  SUMMARY_PASSED+=("$passed")
  SUMMARY_FAILED+=("$failed")
  SUMMARY_TOTAL+=("$total")
  SUMMARY_STATUS+=("$status")
  if [[ "$status" != "PASS" ]]; then
    OVERALL_EXIT=1
  fi
}

run_logged() {
  local log_file="$1"
  shift
  "$@" 2>&1 | tee "$log_file"
  return "${PIPESTATUS[0]}"
}

parse_jest_counts() {
  local log_file="$1"
  local line passed failed total

  line="$(grep -E '^Tests:' "$log_file" | tail -1 || true)"
  passed="$(echo "$line" | grep -oE '[0-9]+ passed' | awk '{print $1}' || true)"
  failed="$(echo "$line" | grep -oE '[0-9]+ failed' | awk '{print $1}' || true)"
  total="$(echo "$line" | grep -oE '[0-9]+ total' | awk '{print $1}' || true)"

  passed="${passed:-0}"
  failed="${failed:-0}"
  total="${total:-0}"

  if [[ "$total" -eq 0 && "$((passed + failed))" -gt 0 ]]; then
    total=$((passed + failed))
  fi

  echo "$passed $failed $total"
}

parse_pytest_counts() {
  local log_file="$1"
  local line passed failed errors skipped total

  line="$(grep -E '[0-9]+ (passed|failed|error)' "$log_file" | tail -1 || true)"
  passed="$(echo "$line" | grep -oE '[0-9]+ passed' | awk '{print $1}' || true)"
  failed="$(echo "$line" | grep -oE '[0-9]+ failed' | awk '{print $1}' || true)"
  errors="$(echo "$line" | grep -oE '[0-9]+ error' | awk '{print $1}' || true)"
  skipped="$(echo "$line" | grep -oE '[0-9]+ skipped' | awk '{print $1}' || true)"

  passed="${passed:-0}"
  failed="${failed:-0}"
  errors="${errors:-0}"
  skipped="${skipped:-0}"
  failed=$((failed + errors))
  total=$((passed + failed + skipped))

  echo "$passed $failed $total"
}

parse_xcodebuild_counts() {
  local log_file="$1"
  local total failures passed

  total="$(grep -E 'Executed [0-9]+ tests, with' "$log_file" | tail -1 | sed -n 's/.*Executed \([0-9][0-9]*\) tests.*/\1/p' || true)"
  failures="$(grep -E 'Executed [0-9]+ tests, with' "$log_file" | tail -1 | sed -n 's/.*with \([0-9][0-9]*\) failures.*/\1/p' || true)"

  total="${total:-0}"
  failures="${failures:-0}"
  passed=$((total - failures))

  if [[ "$total" -lt "$failures" ]]; then
    passed=0
    total="$failures"
  fi

  echo "$passed $failures $total"
}

status_from_counts() {
  local exit_code="$1" passed="$2" failed="$3" total="$4"

  if [[ "$exit_code" -ne 0 && "$total" -eq 0 ]]; then
    echo "ERROR"
  elif [[ "$failed" -gt 0 || "$exit_code" -ne 0 ]]; then
    echo "FAIL"
  else
    echo "PASS"
  fi
}

run_web_tests() {
  local log_file="$1"
  echo ">>> Web (Jest — unit + integration)"
  cd "$REPO_ROOT/frontend"
  local exit_code=0
  run_logged "$log_file" npm test -- --watchAll=false --passWithNoTests || exit_code=$?

  read -r passed failed total <<<"$(parse_jest_counts "$log_file")"
  record_summary "Web (Jest)" "$passed" "$failed" "$total" "$(status_from_counts "$exit_code" "$passed" "$failed" "$total")"
  echo
}

run_backend_tests() {
  local log_file="$1"
  echo ">>> Backend (pytest)"
  cd "$REPO_ROOT/backend"

  if [[ ! -f venv/bin/activate ]]; then
    echo "ERROR: backend/venv not found. Create the venv before running backend tests." >&2
    record_summary "Backend (pytest)" 0 0 0 "ERROR"
    echo
    return
  fi

  # shellcheck source=/dev/null
  . venv/bin/activate
  local exit_code=0
  run_logged "$log_file" pytest -q || exit_code=$?

  read -r passed failed total <<<"$(parse_pytest_counts "$log_file")"
  record_summary "Backend (pytest)" "$passed" "$failed" "$total" "$(status_from_counts "$exit_code" "$passed" "$failed" "$total")"
  echo
}

run_ios_tests() {
  local target_label="$1"
  local only_testing="$2"
  local log_file="$3"

  echo ">>> iOS ($target_label)"
  cd "$REPO_ROOT/ios-client"
  xcrun simctl boot "$IOS_SIM" >/dev/null 2>&1 || true

  local exit_code=0
  run_logged "$log_file" xcodebuild test \
    -scheme OutfitSuggestor \
    -destination "platform=iOS Simulator,name=${IOS_SIM}" \
    -only-testing:"$only_testing" || exit_code=$?

  read -r passed failed total <<<"$(parse_xcodebuild_counts "$log_file")"
  record_summary "$target_label" "$passed" "$failed" "$total" "$(status_from_counts "$exit_code" "$passed" "$failed" "$total")"
  echo
}

print_summary_table() {
  local total_passed=0 total_failed=0 total_tests=0
  local i name passed failed total status

  echo "=== Test Results ==="
  echo ""
  printf "%-28s %7s %7s %7s  %s\n" "Category" "Passed" "Failed" "Total" "Status"
  printf "%-28s %7s %7s %7s  %s\n" "----------------------------" "-------" "-------" "-------" "------"

  for i in "${!SUMMARY_NAMES[@]}"; do
    name="${SUMMARY_NAMES[$i]}"
    passed="${SUMMARY_PASSED[$i]}"
    failed="${SUMMARY_FAILED[$i]}"
    total="${SUMMARY_TOTAL[$i]}"
    status="${SUMMARY_STATUS[$i]}"

    printf "%-28s %7s %7s %7s  %s\n" "$name" "$passed" "$failed" "$total" "$status"
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))
    total_tests=$((total_tests + total))
  done

  printf "%-28s %7s %7s %7s  %s\n" "----------------------------" "-------" "-------" "-------" "------"
  if [[ "$OVERALL_EXIT" -eq 0 ]]; then
    printf "%-28s %7s %7s %7s  %s\n" "Overall" "$total_passed" "$total_failed" "$total_tests" "PASS"
    echo ""
    echo "All test suites passed."
  else
    printf "%-28s %7s %7s %7s  %s\n" "Overall" "$total_passed" "$total_failed" "$total_tests" "FAIL"
    echo ""
    echo "One or more test suites failed. See output above for details."
  fi
  echo ""
}

TMP_DIR="$(mktemp -d)"

echo "=== run_all_tests ==="
echo "Repo: $REPO_ROOT"
echo "Simulator: $IOS_SIM"
echo

if [[ "$RUN_WEB" -eq 1 ]]; then
  run_web_tests "$TMP_DIR/web.log"
fi

if [[ "$RUN_BACKEND" -eq 1 ]]; then
  run_backend_tests "$TMP_DIR/backend.log"
fi

if [[ "$RUN_IOS" -eq 1 ]]; then
  run_ios_tests "iOS unit/integration" "OutfitSuggestorTests" "$TMP_DIR/ios-unit.log"
  run_ios_tests "iOS UITests" "OutfitSuggestorUITests" "$TMP_DIR/ios-ui.log"
fi

print_summary_table
exit "$OVERALL_EXIT"
