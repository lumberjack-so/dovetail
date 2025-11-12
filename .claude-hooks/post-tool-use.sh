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

# Show status based on changes
if [ "$HAS_CHANGES" == "true" ]; then
  if [ "$CHANGED_COUNT" -ge 5 ]; then
    cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 WORKFLOW CHECKPOINT RECOMMENDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Status:
• Active Issue: $ACTIVE_ISSUE
• Branch: $CURRENT_BRANCH
• Files Modified: $CHANGED_COUNT

You've made significant changes ($CHANGED_COUNT files).

🔧 RECOMMENDED ACTION:
When this feature/fix is complete, Claude should execute:

→ dovetail commit

This will automatically:
• Run security & quality checks
• Execute automated tests
• Create/update GitHub PR
• Update Linear issue to "In Review"
• Link all changes to $ACTIVE_ISSUE

Or continue coding if not ready yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
  else
    cat <<EOF

📝 Dovetail Tracking: $CHANGED_COUNT file(s) modified on $ACTIVE_ISSUE

EOF
  fi
else
  cat <<EOF

📝 Dovetail: File operation completed (no uncommitted changes)

EOF
fi
