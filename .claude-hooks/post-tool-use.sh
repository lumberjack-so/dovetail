#!/bin/bash

# Dovetail Post-Tool-Use Hook
# Automatically commits work when ready

# Only for file operations
if [[ ! "$TOOL_NAME" =~ (Write|Edit) ]]; then
  exit 0
fi

# Not dovetail project? Exit
if [ ! -f ".dovetail/state.json" ]; then
  exit 0
fi

# Check if we have dovetail CLI
if ! command -v dovetail &> /dev/null; then
  exit 0
fi

# Get current status
STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  exit 0
fi

ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue.key // empty')
CURRENT_BRANCH=$(echo "$STATUS" | jq -r '.git.currentBranch // "unknown"')
HAS_CHANGES=$(echo "$STATUS" | jq -r '.git.hasChanges')
CHANGED_COUNT=$(echo "$STATUS" | jq -r '[.git.changedFiles.modified[], .git.changedFiles.created[]] | length')

# Track file operation count to trigger auto-commit
COUNT_FILE="/tmp/dovetail_operation_count_${ACTIVE_ISSUE}"

# Increment operation counter
if [ -f "$COUNT_FILE" ]; then
  OPERATION_COUNT=$(cat "$COUNT_FILE")
  OPERATION_COUNT=$((OPERATION_COUNT + 1))
else
  OPERATION_COUNT=1
fi
echo "$OPERATION_COUNT" > "$COUNT_FILE"

# Print status to console (visible to user)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "📝 DOVETAIL POST-TOOL-USE HOOK" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "Issue: $ACTIVE_ISSUE | Branch: $CURRENT_BRANCH" >&2
echo "Files changed: $CHANGED_COUNT | Operations: $OPERATION_COUNT" >&2

# Auto-commit threshold: 3+ file operations
if [ "$HAS_CHANGES" == "true" ] && [ "$OPERATION_COUNT" -ge 3 ]; then
  echo "" >&2
  echo "🚀 AUTO-COMMIT TRIGGERED (threshold: 3 operations)" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  echo "" >&2

  # ACTUALLY RUN THE COMMIT COMMAND
  echo "Executing: dovetail commit --auto" >&2
  dovetail commit --auto

  # Reset counter after commit
  echo "0" > "$COUNT_FILE"

  echo "" >&2
  echo "✅ Auto-commit completed!" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
else
  echo "⏳ Waiting for more changes before auto-commit (3 ops)" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
fi

# Exit 0 to allow the tool operation
exit 0
