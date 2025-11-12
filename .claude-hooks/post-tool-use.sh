#!/bin/bash

# Dovetail Post-Tool-Use Hook
# Tracks changes and suggests workflow checkpoints

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

# Show status based on changes
if [ "$HAS_CHANGES" == "true" ]; then
  if [ "$CHANGED_COUNT" -ge 5 ] && [ "$OPERATION_COUNT" -ge 5 ]; then
    cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 AUTO-COMMIT THRESHOLD REACHED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Status:
• Active Issue: $ACTIVE_ISSUE
• Branch: $CURRENT_BRANCH
• Files Modified: $CHANGED_COUNT
• Operations: $OPERATION_COUNT

Significant work detected. Ready to commit.

🔧 WORKFLOW INSTRUCTION:
Claude should now execute: dovetail commit --auto

This will automatically:
• Run security & quality checks
• Execute automated tests
• Create/update GitHub PR
• Update Linear issue to "In Review"

Then reset the counter for next batch of work.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
    # Reset counter after suggesting commit
    echo "0" > "$COUNT_FILE"
  else
    cat <<EOF

📝 Dovetail: $CHANGED_COUNT file(s) modified on $ACTIVE_ISSUE (operation $OPERATION_COUNT)

EOF
  fi
else
  cat <<EOF

📝 Dovetail: File operation completed (no uncommitted changes)

EOF
fi
