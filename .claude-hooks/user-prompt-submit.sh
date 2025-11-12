#!/bin/bash
# Dovetail 2.0 - User Prompt Submit Hook
# Ensures active issue exists before Claude sees user prompt

# Exit if not a Dovetail project
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT" 2>/dev/null || exit 0

[ ! -f ".dovetail/state.json" ] && exit 0

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  exit 0
fi

# Call check-issue command in auto mode
# This will automatically select/create an issue and start it if needed
dovetail check-issue --auto --quiet

exit 0
