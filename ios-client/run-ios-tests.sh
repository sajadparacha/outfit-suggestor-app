#!/usr/bin/env bash
set -euo pipefail

# Reusable iOS test runner for OutfitSuggestor.
# Examples:
#   ./run-ios-tests.sh
#   ./run-ios-tests.sh --suite ui
#   ./run-ios-tests.sh --suite unit
#   ./run-ios-tests.sh --suite smoke
#   ./run-ios-tests.sh --only-testing OutfitSuggestorUITests/OutfitAppE2ETests/testWardrobeFilterChipsUpdateVisibleList
#   ./run-ios-tests.sh --simulator "iPhone 16 Pro"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="$SCRIPT_DIR/OutfitSuggestor.xcodeproj"
SCHEME="OutfitSuggestor"
SIMULATOR_NAME="iPad Pro 13-inch (M5)"
DERIVED_DATA_PATH="$SCRIPT_DIR/build-test"
SUITE="all"
CLEAN_BUILD=0
VERBOSE=0
OPEN_RESULT=0
declare -a ONLY_TESTING=()

usage() {
  cat <<'EOF'
Usage: ./run-ios-tests.sh [options]

Options:
  --suite <all|unit|ui|smoke>     Test suite to run (default: all)
  --simulator "<name>"             Simulator name (default: iPad Pro 13-inch (M5))
  --derived-data "<path>"          DerivedData output path (default: ios-client/build-test)
  --only-testing "<target[/class[/test]]>"
                                   Add xcodebuild -only-testing filter (repeatable)
  --clean                          Run clean before test
  --verbose                        Print full xcodebuild output
  --open-result                    Open latest .xcresult in Finder after run
  --help                           Show this help

Examples:
  ./run-ios-tests.sh --suite ui
  ./run-ios-tests.sh --suite smoke
  ./run-ios-tests.sh --simulator "iPhone 16 Pro"
  ./run-ios-tests.sh --only-testing "OutfitSuggestorTests"
  ./run-ios-tests.sh --only-testing "OutfitSuggestorUITests/OutfitAppE2ETests/testWardrobeActionButtonsNavigateToExpectedPaths"
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --suite)
      SUITE="${2:-}"
      shift 2
      ;;
    --simulator)
      SIMULATOR_NAME="${2:-}"
      shift 2
      ;;
    --derived-data)
      DERIVED_DATA_PATH="${2:-}"
      shift 2
      ;;
    --only-testing)
      ONLY_TESTING+=("${2:-}")
      shift 2
      ;;
    --clean)
      CLEAN_BUILD=1
      shift
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    --open-result)
      OPEN_RESULT=1
      shift
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

if [[ ! -d "$PROJECT_PATH" ]]; then
  echo "Project not found at: $PROJECT_PATH" >&2
  exit 1
fi

DESTINATION="platform=iOS Simulator,name=$SIMULATOR_NAME"
echo "Running iOS tests"
echo "  Project:      $PROJECT_PATH"
echo "  Scheme:       $SCHEME"
echo "  Simulator:    $SIMULATOR_NAME"
echo "  Suite:        $SUITE"
echo "  DerivedData:  $DERIVED_DATA_PATH"

# Best-effort simulator boot to reduce startup flakiness.
xcrun simctl boot "$SIMULATOR_NAME" >/dev/null 2>&1 || true

if [[ ${#ONLY_TESTING[@]} -eq 0 ]]; then
  case "$SUITE" in
    all)
      ;;
    unit)
      ONLY_TESTING+=("OutfitSuggestorTests")
      ;;
    ui)
      ONLY_TESTING+=("OutfitSuggestorUITests")
      ;;
    smoke)
      ONLY_TESTING+=("OutfitSuggestorUITests/OutfitAppE2ETests/testSuggestFlowFromSampleImageShowsResultCard")
      ONLY_TESTING+=("OutfitSuggestorUITests/OutfitAppE2ETests/testWardrobeFilterChipsUpdateVisibleList")
      ;;
    *)
      echo "Invalid suite: $SUITE (expected: all|unit|ui|smoke)" >&2
      exit 1
      ;;
  esac
fi

declare -a CMD=(
  xcodebuild
  -project "$PROJECT_PATH"
  -scheme "$SCHEME"
  -destination "$DESTINATION"
  -derivedDataPath "$DERIVED_DATA_PATH"
)

if [[ "$CLEAN_BUILD" -eq 1 ]]; then
  CMD+=(clean test)
else
  CMD+=(test)
fi

if ((${#ONLY_TESTING[@]} > 0)); then
  for test_filter in "${ONLY_TESTING[@]}"; do
    CMD+=("-only-testing:$test_filter")
  done
fi

if ((${#ONLY_TESTING[@]} > 0)); then
  echo "  Filters:"
  for test_filter in "${ONLY_TESTING[@]}"; do
    echo "    - $test_filter"
  done
fi

echo ""
if [[ "$VERBOSE" -eq 1 ]]; then
  "${CMD[@]}"
else
  # Keep output concise but still helpful for local runs.
  "${CMD[@]}" | awk '
    /Test Suite|Test Case|\\*\\* TEST|\\*\\* BUILD|Failing tests:|error:|warning:/ {print}
  '
fi

RESULT_DIR="$DERIVED_DATA_PATH/Logs/Test"
LATEST_RESULT=""
if [[ -d "$RESULT_DIR" ]]; then
  LATEST_RESULT="$(ls -1t "$RESULT_DIR"/*.xcresult 2>/dev/null | awk 'NR==1{print}')"
fi

if [[ -n "$LATEST_RESULT" ]]; then
  echo ""
  echo "Latest test result:"
  echo "  $LATEST_RESULT"
  if [[ "$OPEN_RESULT" -eq 1 ]]; then
    open "$LATEST_RESULT"
  fi
fi

echo ""
echo "Done."
