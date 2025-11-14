#!/bin/bash
# Dovetail 2.0 - Post Tool Use Hook
# Automatically commits changes after Write/Edit operations

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool_name from JSON
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only for file operations
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

# Check if there are changes
if git diff --quiet && git diff --cached --quiet; then
  # No changes - skip
  echo "📝 POST-TOOL-USE: No changes to commit"
  exit 0
fi

# Call auto-commit command
echo "📝 POST-TOOL-USE: Changes detected, auto-committing..."
dovetail auto-commit
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ POST-TOOL-USE: Auto-commit succeeded"
else
  echo "✗ POST-TOOL-USE: Auto-commit failed (exit $EXIT_CODE)"
fi

exit 0
