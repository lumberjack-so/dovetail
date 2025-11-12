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

# Print status to console (visible to user)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "📝 DOVETAIL POST-TOOL-USE HOOK" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "Issue: $ACTIVE_ISSUE | Branch: $CURRENT_BRANCH" >&2
echo "Files changed: $CHANGED_COUNT" >&2

# Auto-commit on EVERY change
if [ "$HAS_CHANGES" == "true" ]; then
  echo "" >&2
  echo "🚀 AUTO-COMMIT TRIGGERED" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  echo "" >&2

  # ACTUALLY RUN THE COMMIT COMMAND
  echo "Executing: dovetail commit --auto" >&2
  dovetail commit --auto

  echo "" >&2
  echo "✅ Auto-commit completed!" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
else
  echo "ℹ️  No uncommitted changes detected" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
fi

# Exit 0 to allow the tool operation
exit 0
