#!/bin/bash
# Dovetail 2.0 - Pre Tool Use Hook
# Validates workflow state before Write/Edit operations

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool_name from JSON
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only check Write/Edit operations
[[ ! "$TOOL_NAME" =~ (Write|Edit|NotebookEdit) ]] && exit 0

# Exit if not a Dovetail project
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT" 2>/dev/null || exit 0

[ ! -f ".dovetail/state.json" ] && exit 0

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  exit 0
fi

# Call validate command
# Exits 0 if valid, exits 2 to block operation
dovetail validate

exit $?
