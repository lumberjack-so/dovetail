#!/bin/bash
# Dovetail 2.0 - Post Tool Use Hook
# Invokes dovetail-finalize agent to commit, create PR, and update Linear

# Redirect all output to stderr so Claude Code sees it
exec 1>&2

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool_name from JSON
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 POST-TOOL-USE HOOK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Tool used: $TOOL_NAME"
echo ""

# Only check Write/Edit operations
if [[ ! "$TOOL_NAME" =~ (Write|Edit|NotebookEdit) ]]; then
  echo "✓ Tool use completed (read-only operation)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

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
  echo "ℹ️  Not a Dovetail project - skipping finalization"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

cd "$PROJECT_ROOT" 2>/dev/null || exit 0

# Check if there are changes
if git diff --quiet && git diff --cached --quiet; then
  echo "ℹ️  No changes to commit - skipping finalization"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  echo "⚠️  Dovetail CLI not found - skipping finalization"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

# Get current project status
STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "⚠️  Could not load project status - skipping finalization"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue')
if [ "$ACTIVE_ISSUE" = "null" ]; then
  echo "⚠️  No active issue - skipping finalization"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

ISSUE_KEY=$(echo "$ACTIVE_ISSUE" | jq -r '.key')
echo "🎯 Active Issue: $ISSUE_KEY"
echo ""

# Prompt Claude to use dovetail-finalize agent
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  DOVETAIL FINALIZATION REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Code changes detected. The dovetail-finalize agent will:"
echo "  • Commit changes with conventional commit message"
echo "  • Create pull request with detailed description"
echo "  • Update Linear issue with commit/PR references"
echo "  • Analyze impact on other issues and add insights"
echo "  • Create new issues from TODOs found in code"
echo ""
echo "🤖 REQUIRED ACTION:"
echo "   Use the dovetail-finalize agent to complete the workflow"
echo ""
echo "   The agent will handle everything automatically:"
echo "   • Commit and push"
echo "   • Create PR"
echo "   • Update Linear"
echo "   • Keep workspace clean"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Block until agent runs
exit 2
