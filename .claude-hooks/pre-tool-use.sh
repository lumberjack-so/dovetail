#!/bin/bash
# Dovetail 2.0 - Pre Tool Use Hook
# Invokes dovetail-sync subagent to validate workflow state before Write/Edit operations

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

# Check if claude CLI is available
if ! command -v claude &> /dev/null; then
  echo "⚠️  Claude CLI not found - cannot invoke dovetail-sync agent"
  echo "   Falling back to basic validation..."
  echo ""

  # Fallback: just check if dovetail CLI exists and has active issue
  if command -v dovetail &> /dev/null; then
    STATUS=$(dovetail status --json 2>/dev/null)
    if [ $? -eq 0 ]; then
      ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue')
      if [ "$ACTIVE_ISSUE" != "null" ]; then
        ISSUE_KEY=$(echo "$ACTIVE_ISSUE" | jq -r '.key')
        echo "✓ Active issue: $ISSUE_KEY"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
      fi
    fi
  fi

  echo "⛔ No active issue - please run: dovetail check-issue"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 2
fi

# Invoke dovetail-sync subagent
echo "🤖 Invoking dovetail-sync subagent..."
echo ""

# Create a prompt that includes context from the current conversation
AGENT_PROMPT="A developer is about to use the $TOOL_NAME tool. Please perform Dovetail workflow synchronization:

1. Check current project state (dovetail status, git status, branch)
2. Verify the task is relevant to the active issue (or help find/create one)
3. Ensure we're on the correct feature branch
4. Show git status and recent commit history
5. Get live issue details from Linear

Be extremely verbose - print every step with clear formatting."

# Run the subagent using claude CLI in print mode
# The --add-dir flag ensures the agent has access to the project directory
AGENT_OUTPUT=$(claude --print \
  --max-turns 5 \
  --add-dir "$PROJECT_ROOT" \
  --agents "$(cat <<'EOF'
{
  "dovetail-sync": {
    "description": "Dovetail workflow sync agent",
    "prompt": "$(cat $PROJECT_ROOT/.claude/hooks/agents/dovetail-sync.md | tail -n +7)",
    "tools": ["Read", "Bash", "Grep", "Glob"],
    "model": "sonnet"
  }
}
EOF
)" \
  "$AGENT_PROMPT" 2>&1)

AGENT_EXIT=$?

# Display agent output
echo "$AGENT_OUTPUT"
echo ""

# Check if agent succeeded
if [ $AGENT_EXIT -eq 0 ]; then
  # Verify the agent actually fixed the issue
  FINAL_STATUS=$(dovetail status --json 2>/dev/null)
  FINAL_ISSUE=$(echo "$FINAL_STATUS" | jq -r '.activeIssue')

  if [ "$FINAL_ISSUE" != "null" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Dovetail sync complete - proceeding with $TOOL_NAME operation"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  fi
fi

# Agent failed or didn't resolve the issue
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⛔ Dovetail sync failed - $TOOL_NAME operation BLOCKED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 2
