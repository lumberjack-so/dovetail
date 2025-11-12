#!/bin/bash

# Dovetail Pre-Tool-Use Hook
# AUTOMATICALLY enforces and executes Dovetail workflow

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
# GET CURRENT STATUS
# ============================================

STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  exit 0
fi

ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue.key // empty')
CURRENT_BRANCH=$(echo "$STATUS" | jq -r '.git.currentBranch // "unknown"')

# ============================================
# AUTO-FIX: No active issue? Block and instruct
# ============================================

if [ -z "$ACTIVE_ISSUE" ]; then
  cat >&2 <<EOF

⛔ WORKFLOW VIOLATION: No Active Linear Issue

Dovetail enforces issue-driven development.
You MUST select a Linear issue before writing code.

🔧 REQUIRED ACTION:
Claude must execute: dovetail start <issue-key>

Available commands:
• dovetail status        - Check current state
• dovetail linear-search - Search for issues
• dovetail start KEY-123 - Start working on an issue

⛔ This file operation is BLOCKED until an issue is selected.

EOF
  exit 2  # Block the Write/Edit operation
fi

# ============================================
# AUTO-FIX: On main branch? Create feature branch
# ============================================

if [ "$CURRENT_BRANCH" == "main" ] || [ "$CURRENT_BRANCH" == "master" ]; then
  cat >&2 <<EOF

⛔ WORKFLOW VIOLATION: Writing on Main Branch

Active issue: $ACTIVE_ISSUE
Current branch: $CURRENT_BRANCH

You cannot write code directly to main/master.

🔧 REQUIRED ACTION:
Claude must execute: dovetail start $ACTIVE_ISSUE

This will create and checkout the feature branch automatically.

⛔ This file operation is BLOCKED until on a feature branch.

EOF
  exit 2  # Block the Write/Edit operation
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

cat <<EOF

✅ Dovetail: All workflow checks passed
   Issue: $ACTIVE_ISSUE
   Branch: $CURRENT_BRANCH

EOF

exit 0
