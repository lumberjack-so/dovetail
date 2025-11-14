#!/bin/bash

# Dovetail Session Start Hook
# Displays comprehensive project context when Claude Code opens

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

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  exit 0
fi

# Get project status
STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  exit 0
fi

# Extract basic info
PROJECT_NAME=$(echo "$STATUS" | jq -r '.name // "Unknown"')
CURRENT_BRANCH=$(echo "$STATUS" | jq -r '.branch // "unknown"')
ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue')

# Extract service URLs
GITHUB_OWNER=$(echo "$STATUS" | jq -r '.github.owner // empty')
GITHUB_REPO=$(echo "$STATUS" | jq -r '.github.repo // empty')
GITHUB_URL=$(echo "$STATUS" | jq -r '.github.url // empty')
LINEAR_PROJECT_URL=$(echo "$STATUS" | jq -r '.linear.projectUrl // empty')
LINEAR_TEAM_KEY=$(echo "$STATUS" | jq -r '.linear.teamKey // empty')
SUPABASE_REF=$(echo "$STATUS" | jq -r '.supabase.projectRef // empty')
FLYIO_STAGING=$(echo "$STATUS" | jq -r '.flyio.staging // empty')
FLYIO_PRODUCTION=$(echo "$STATUS" | jq -r '.flyio.production // empty')

# Print header
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 DOVETAIL PROJECT SNAPSHOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Project: $PROJECT_NAME"
echo "🌿 Branch: $CURRENT_BRANCH"
echo ""

# Service Links
echo "🔗 SERVICES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$GITHUB_URL" ]; then
  echo "  GitHub:   $GITHUB_URL"
fi
if [ -n "$LINEAR_PROJECT_URL" ]; then
  echo "  Linear:   $LINEAR_PROJECT_URL"
fi
if [ -n "$SUPABASE_REF" ]; then
  echo "  Supabase: https://supabase.com/dashboard/project/$SUPABASE_REF"
fi
if [ -n "$FLYIO_STAGING" ]; then
  echo "  Staging:  https://$FLYIO_STAGING.fly.dev"
fi
if [ -n "$FLYIO_PRODUCTION" ]; then
  echo "  Prod:     https://$FLYIO_PRODUCTION.fly.dev"
fi
echo ""

# Active Issue
echo "🎯 ACTIVE ISSUE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ACTIVE_ISSUE" != "null" ]; then
  ISSUE_KEY=$(echo "$ACTIVE_ISSUE" | jq -r '.key')
  ISSUE_TITLE=$(echo "$ACTIVE_ISSUE" | jq -r '.title')
  ISSUE_ID=$(echo "$ACTIVE_ISSUE" | jq -r '.id // empty')

  echo "  $ISSUE_KEY: $ISSUE_TITLE"
  if [ -n "$ISSUE_ID" ] && [ -n "$LINEAR_TEAM_KEY" ]; then
    echo "  🔗 https://linear.app/team/$LINEAR_TEAM_KEY/issue/$ISSUE_KEY"
  fi
else
  echo "  ⚠️  No active issue selected"
  echo "  Run: dovetail check-issue"
fi
echo ""

# Git Activity (Last 7 days)
echo "📊 GIT ACTIVITY (Last 7 Days)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
COMMIT_COUNT=$(git log --since="7 days ago" --oneline 2>/dev/null | wc -l | xargs)
echo "  Commits: $COMMIT_COUNT"

if [ "$COMMIT_COUNT" -gt 0 ]; then
  echo ""
  echo "  Recent commits:"
  git log --since="7 days ago" --pretty=format:"    %s" --max-count=5 2>/dev/null
  echo ""
fi
echo ""

# Linear Issues Summary (if linearis is available)
if command -v linearis &> /dev/null && [ -n "$LINEAR_TEAM_KEY" ]; then
  echo "📋 LINEAR ISSUES SUMMARY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Get recent activity (completed in last 7 days)
  COMPLETED_ISSUES=$(linearis issue ls --team "$LINEAR_TEAM_KEY" --state "completed" --json 2>/dev/null | jq -r '.[] | select(.completedAt != null and ((now - (.completedAt | fromdate)) < 604800)) | "    ✅ \(.identifier): \(.title)"' 2>/dev/null | head -3)

  if [ -n "$COMPLETED_ISSUES" ]; then
    echo "  Recently Completed:"
    echo "$COMPLETED_ISSUES"
    echo ""
  fi

  # Get in-progress issues
  IN_PROGRESS=$(linearis issue ls --team "$LINEAR_TEAM_KEY" --state "started" --json 2>/dev/null | jq -r '.[] | "    🔄 \(.identifier): \(.title)"' 2>/dev/null | head -3)

  if [ -n "$IN_PROGRESS" ]; then
    echo "  In Progress:"
    echo "$IN_PROGRESS"
    echo ""
  fi

  # Get backlog/todo
  BACKLOG=$(linearis issue ls --team "$LINEAR_TEAM_KEY" --state "unstarted" --json 2>/dev/null | jq -r '.[] | "    📌 \(.identifier): \(.title)"' 2>/dev/null | head -3)

  if [ -n "$BACKLOG" ]; then
    echo "  Up Next:"
    echo "$BACKLOG"
    echo ""
  fi
else
  echo "💡 Install linearis for Linear integration: npm install -g linearis"
  echo ""
fi

# Project Update (latest Linear project update if available)
if command -v linearis &> /dev/null && [ -n "$LINEAR_PROJECT_URL" ]; then
  PROJECT_ID=$(echo "$STATUS" | jq -r '.linear.projectId // empty')
  if [ -n "$PROJECT_ID" ]; then
    echo "📰 LATEST PROJECT UPDATE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    # Note: linearis doesn't have direct project update commands yet
    # This would require Linear API integration
    echo "  View updates: $LINEAR_PROJECT_URL"
    echo ""
  fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
