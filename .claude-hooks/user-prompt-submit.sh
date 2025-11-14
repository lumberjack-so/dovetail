#!/bin/bash
# Dovetail 2.0 - User Prompt Submit Hook
# Ensures active issue exists before Claude sees user prompt

# Find Dovetail project root by searching upward for .dovetail/state.json
find_dovetail_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/.dovetail/state.json" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

# Find and change to project root
PROJECT_ROOT=$(find_dovetail_root)
if [[ -z "$PROJECT_ROOT" ]]; then
  exit 0
fi

cd "$PROJECT_ROOT" 2>/dev/null || exit 0

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  exit 0
fi

# Call check-issue command in auto mode
# This will automatically select/create an issue and start it if needed
echo "🎯 USER-PROMPT-SUBMIT: Checking for active issue..."
dovetail check-issue --auto
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ USER-PROMPT-SUBMIT: Issue check completed"
else
  echo "✗ USER-PROMPT-SUBMIT: Issue check failed (exit $EXIT_CODE)"
fi

exit 0
