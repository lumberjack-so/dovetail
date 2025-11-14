#!/bin/bash
# Dovetail 2.0 - Pre Tool Use Hook
# Validates workflow state before Write/Edit operations with auto-fix

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool_name from JSON
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PRE-TOOL-USE HOOK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Agent is trying to use tool: $TOOL_NAME"
echo ""

# Only check Write/Edit operations
if [[ ! "$TOOL_NAME" =~ (Write|Edit|NotebookEdit) ]]; then
  echo "✓ Tool use permitted (read-only operation)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

echo "⚠️  Restricted tool identified - validating workflow state..."
echo ""

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
  echo "ℹ️  Not a Dovetail project - validation skipped"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

cd "$PROJECT_ROOT" 2>/dev/null || exit 0

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  echo "⚠️  Dovetail CLI not found - validation skipped"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

echo "🔄 Validation in progress..."
echo ""

# Get project status
STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "⚠️  Could not load project status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

PROJECT_NAME=$(echo "$STATUS" | jq -r '.name // "Unknown"')
ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue')

echo "📁 Dovetail Project: $PROJECT_NAME"
echo ""

# Check if there's an active issue
if [ "$ACTIVE_ISSUE" != "null" ]; then
  ISSUE_KEY=$(echo "$ACTIVE_ISSUE" | jq -r '.key')
  ISSUE_TITLE=$(echo "$ACTIVE_ISSUE" | jq -r '.title')
  ISSUE_ID=$(echo "$ACTIVE_ISSUE" | jq -r '.id // empty')

  echo "🎯 Current Issue: $ISSUE_KEY - $ISSUE_TITLE"
  echo ""

  # Get detailed issue info from Linear (if linearis available)
  if command -v linearis &> /dev/null && [ -n "$ISSUE_KEY" ]; then
    LINEAR_TEAM_KEY=$(echo "$STATUS" | jq -r '.linear.teamKey // empty')

    if [ -n "$LINEAR_TEAM_KEY" ]; then
      echo "🔄 Getting issue status from Linear..."
      ISSUE_DATA=$(linearis issue show "$ISSUE_KEY" --json 2>/dev/null)

      if [ $? -eq 0 ]; then
        STATE=$(echo "$ISSUE_DATA" | jq -r '.state.name // "Unknown"')
        PRIORITY=$(echo "$ISSUE_DATA" | jq -r '.priority // "None"')
        ASSIGNEE=$(echo "$ISSUE_DATA" | jq -r '.assignee.name // "Unassigned"')

        echo "  📊 Status: $STATE"
        echo "  🎯 Priority: $PRIORITY"
        echo "  👤 Assignee: $ASSIGNEE"
        echo ""
      fi
    fi
  fi

  echo "✅ Validation passed - proceeding with $TOOL_NAME operation"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  # No active issue - auto-fix by running check-issue
  echo "⚠️  NO ACTIVE ISSUE SELECTED"
  echo ""
  echo "🔧 Auto-fix: Running issue finder..."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Run check-issue in auto mode which will:
  # 1. Search for existing issues
  # 2. Present them to Claude
  # 3. Let Claude select or create new one
  dovetail check-issue --auto
  CHECK_EXIT=$?

  if [ $CHECK_EXIT -eq 0 ]; then
    # Re-check status after auto-fix
    NEW_STATUS=$(dovetail status --json 2>/dev/null)
    NEW_ISSUE=$(echo "$NEW_STATUS" | jq -r '.activeIssue')

    if [ "$NEW_ISSUE" != "null" ]; then
      NEW_KEY=$(echo "$NEW_ISSUE" | jq -r '.key')
      NEW_TITLE=$(echo "$NEW_ISSUE" | jq -r '.title')

      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "✅ Issue selected: $NEW_KEY - $NEW_TITLE"
      echo "✅ Validation passed - proceeding with $TOOL_NAME operation"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      exit 0
    fi
  fi

  # If auto-fix failed, block with clear instructions
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⛔ VALIDATION FAILED: No Active Issue"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Dovetail requires all code changes to be linked to a Linear issue."
  echo ""
  echo "🔧 REQUIRED ACTIONS:"
  echo "  1. Search Linear: Tell me what you're working on"
  echo "  2. I'll find or create a relevant issue"
  echo "  3. Then run: dovetail start <issue-key>"
  echo ""
  echo "⛔ $TOOL_NAME operation BLOCKED until issue is selected"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 2
fi
