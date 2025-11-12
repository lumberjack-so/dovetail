#!/bin/bash

# Dovetail Post-Tool-Use Hook
# Suggests commit after significant work

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

HAS_CHANGES=$(echo "$STATUS" | jq -r '.git.hasChanges')
CHANGED_COUNT=$(echo "$STATUS" | jq -r '[.git.changedFiles.modified[], .git.changedFiles.created[]] | length')

# Show status
if [ "$HAS_CHANGES" == "true" ]; then
  if [ "$CHANGED_COUNT" -ge 3 ]; then
    cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 WORKFLOW CHECKPOINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You've modified $CHANGED_COUNT files. Consider committing soon.

When ready to commit:
→ Execute: dovetail commit

This will:
• Run security and quality checks
• Run automated tests
• Create/update PR
• Update Linear issue

Or continue coding if not ready.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
  else
    cat <<EOF

📝 Dovetail: $CHANGED_COUNT file(s) modified

EOF
  fi
else
  cat <<EOF

📝 Dovetail: File operation completed

EOF
fi
