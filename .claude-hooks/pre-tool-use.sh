#!/bin/bash
# Dovetail 2.0 - Pre Tool Use Hook
# Invokes dovetail-sync subagent to validate workflow state before Write/Edit operations

# Redirect all output to stderr so Claude Code sees it
exec 1>&2

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

echo "⚠️  Restricted tool identified - invoking Dovetail sync agent..."
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

# Get current project status
STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "⚠️  Could not load project status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

PROJECT_NAME=$(echo "$STATUS" | jq -r '.name // "Unknown"')
ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue')
CURRENT_BRANCH=$(echo "$STATUS" | jq -r '.branch // "unknown"')

echo "📁 Project: $PROJECT_NAME"
echo "🌿 Branch: $CURRENT_BRANCH"
echo ""

# Check if there's an active issue
if [ "$ACTIVE_ISSUE" != "null" ]; then
  ISSUE_KEY=$(echo "$ACTIVE_ISSUE" | jq -r '.key')
  ISSUE_TITLE=$(echo "$ACTIVE_ISSUE" | jq -r '.title')

  echo "🎯 Active Issue: $ISSUE_KEY - $ISSUE_TITLE"
  echo ""

  # Basic validation passed - but prompt Claude to use dovetail-sync agent for full validation
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  DOVETAIL WORKFLOW SYNC REQUIRED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Before writing code, you MUST run the dovetail-sync agent to:"
  echo "  • Verify task relevance to current issue"
  echo "  • Ensure correct feature branch"
  echo "  • Check git status and commit history"
  echo "  • Validate Linear issue status"
  echo ""
  echo "🤖 REQUIRED ACTION:"
  echo "   Use the dovetail-sync agent to validate workflow state"
  echo ""
  echo "   The agent will ensure everything is synced before allowing"
  echo "   the $TOOL_NAME operation to proceed."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Block the operation - Claude must invoke the agent
  exit 2
else
  # No active issue - block immediately
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⛔ NO ACTIVE ISSUE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Dovetail requires all code changes to be linked to a Linear issue."
  echo ""
  echo "🤖 REQUIRED ACTION:"
  echo "   Use the dovetail-sync agent to find or create an issue"
  echo ""
  echo "   The agent will:"
  echo "   • Search Linear for relevant issues"
  echo "   • Let you select an existing issue"
  echo "   • Or create a new issue if needed"
  echo "   • Set up the correct feature branch"
  echo ""
  echo "⛔ $TOOL_NAME operation BLOCKED until issue is selected"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 2
fi
