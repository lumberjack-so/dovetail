#!/bin/bash

# Dovetail Agent Complete Hook
# Shows next workflow step after Claude completes a task

if [ ! -f ".dovetail/state.json" ]; then
  exit 0
fi

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  exit 0
fi

# Get current status
STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  exit 0
fi

HAS_CHANGES=$(echo "$STATUS" | jq -r '.git.hasChanges')
PR_URL=$(echo "$STATUS" | jq -r '.pr.url // empty')
CI_STATUS=$(echo "$STATUS" | jq -r '.ciStatus // "unknown"')
ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue.key // empty')

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 WORKFLOW: NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

# Determine next step
if [ "$HAS_CHANGES" == "true" ]; then
  cat <<EOF
📌 NEXT: Commit your changes

Execute: dovetail commit

This will:
• Run security and quality checks
• Run automated tests
• Create/update PR
• Update Linear issue with progress
EOF

elif [ -n "$PR_URL" ] && [ "$CI_STATUS" == "passing" ]; then
  cat <<EOF
📌 NEXT: Ready to merge

PR: $PR_URL
✅ All checks passing

When ready:
1. Test on staging
2. Execute: dovetail merge
   (Will close issue and clean up)
3. Then deploy to production
EOF

elif [ -n "$PR_URL" ] && [ "$CI_STATUS" == "failing" ]; then
  cat <<EOF
📌 NEXT: Fix CI failures

PR: $PR_URL
❌ CI is failing

Review the failures and fix issues.
Then commit again with: dovetail commit
EOF

elif [ -z "$ACTIVE_ISSUE" ]; then
  cat <<EOF
📌 NEXT: Start working on an issue

Tell me what you want to build, and I'll:
1. Find or create a Linear issue
2. Create a feature branch
3. Guide you through the workflow
EOF

else
  cat <<EOF
📌 NEXT: Continue development

No uncommitted changes.
Keep coding or move to next task.
EOF
fi

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
