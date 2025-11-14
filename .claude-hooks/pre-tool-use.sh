#!/bin/bash
# Dovetail 2.0 - Pre Tool Use Hook
# Validates workflow state before Write/Edit operations

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool_name from JSON
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only check Write/Edit operations
[[ ! "$TOOL_NAME" =~ (Write|Edit|NotebookEdit) ]] && exit 0

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

# Call validate command
# Exits 0 if valid, exits 2 to block operation
echo "🔍 PRE-TOOL-USE: Validating project state..."
dovetail validate
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ PRE-TOOL-USE: Validation passed"
else
  echo "✗ PRE-TOOL-USE: Validation failed (exit $EXIT_CODE)"
fi

exit $EXIT_CODE
