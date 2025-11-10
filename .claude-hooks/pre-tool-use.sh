#!/bin/bash

# Dovetail Pre-Tool-Use Hook
# Validates and blocks file operations if workflow requirements not met

# Only enforce for file operations
if [[ ! "$TOOL_NAME" =~ (Write|Edit|NotebookEdit) ]]; then
  exit 0
fi

# Not a dovetail project? Allow
if [ ! -f ".dovetail/state.json" ]; then
  exit 0
fi

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  exit 0
fi

# ============================================
# VALIDATION CHECKS
# ============================================

STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  exit 0
fi

ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue.key // empty')
CURRENT_BRANCH=$(echo "$STATUS" | jq -r '.git.currentBranch // "unknown"')

# ============================================
# CHECK 1: Must have active issue
# ============================================

if [ -z "$ACTIVE_ISSUE" ]; then
  cat >&2 <<EOF

⛔ BLOCKED: No Active Linear Issue

You cannot write code without a Linear issue.

REQUIRED ACTION:
1. Execute: dovetail start <issue-key>
2. Then try writing code again

This is enforced by Dovetail workflow.

EOF
  exit 2
fi

# ============================================
# CHECK 2: Must be on feature branch
# ============================================

if [ "$CURRENT_BRANCH" == "main" ] || [ "$CURRENT_BRANCH" == "master" ]; then
  cat >&2 <<EOF

⛔ BLOCKED: Cannot Write on Main Branch

Active issue: $ACTIVE_ISSUE
Current branch: $CURRENT_BRANCH

You must be on a feature branch to write code.

REQUIRED ACTION:
1. Execute: dovetail start $ACTIVE_ISSUE
   (This will create and checkout the feature branch)
2. Then try again

This is enforced by Dovetail workflow.

EOF
  exit 2
fi

# ============================================
# CHECK 3: Branch must match active issue
# ============================================

EXPECTED_BRANCH_PREFIX="feat/${ACTIVE_ISSUE}"
if [[ ! "$CURRENT_BRANCH" =~ ^$EXPECTED_BRANCH_PREFIX ]]; then
  cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  WARNING: Branch Mismatch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active issue: $ACTIVE_ISSUE
Current branch: $CURRENT_BRANCH
Expected branch: ${EXPECTED_BRANCH_PREFIX}-*

The branch doesn't match the active issue.

SUGGESTED ACTION:
1. Verify: dovetail status
2. Or switch issue: dovetail start <different-issue>

Allowing operation with warning...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
  # Allow but warn
  exit 0
fi

# ============================================
# All checks passed
# ============================================

exit 0
