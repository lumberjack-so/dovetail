#!/bin/bash

# Dovetail Session Start Hook
# Displays project context when Claude Code opens

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
  exit 0
fi

cd "$PROJECT_ROOT" 2>/dev/null || exit 0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 DOVETAIL PROJECT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get project status using dovetail CLI
if command -v dovetail &> /dev/null; then
  STATUS=$(dovetail status --json 2>/dev/null)

  if [ $? -eq 0 ]; then
    PROJECT_NAME=$(echo "$STATUS" | jq -r '.name // "Unknown"')
    ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue')
    CURRENT_BRANCH=$(echo "$STATUS" | jq -r '.branch // "unknown"')
    HAS_CHANGES=$(echo "$STATUS" | jq -r '.hasChanges // false')
    PR_URL=$(echo "$STATUS" | jq -r '.pr.url // empty')
    CI_STATUS=$(echo "$STATUS" | jq -r '.ciStatus // "unknown"')

    echo "📁 Project: $PROJECT_NAME"
    echo "🌿 Branch: $CURRENT_BRANCH"
    echo ""

    if [ "$ACTIVE_ISSUE" != "null" ]; then
      ISSUE_KEY=$(echo "$ACTIVE_ISSUE" | jq -r '.key')
      ISSUE_TITLE=$(echo "$ACTIVE_ISSUE" | jq -r '.title')

      echo "🎯 ACTIVE ISSUE: $ISSUE_KEY - $ISSUE_TITLE"
      echo ""

      if [ -n "$PR_URL" ]; then
        echo "🔀 PR: $PR_URL"
        if [ "$CI_STATUS" == "passing" ]; then
          echo "✅ CI: Passing"
        elif [ "$CI_STATUS" == "failing" ]; then
          echo "❌ CI: Failing"
        else
          echo "⚪ CI: Unknown"
        fi
        echo ""
      fi

      if [ "$HAS_CHANGES" == "true" ]; then
        echo "📝 You have uncommitted changes"
        echo ""
      fi
    else
      echo "💡 NO ACTIVE ISSUE"
      echo ""
      echo "To start working:"
      echo "  • Tell me what you want to build"
      echo "  • I'll find or create a Linear issue"
      echo "  • Then create a branch and guide you through"
      echo ""
    fi
  fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
