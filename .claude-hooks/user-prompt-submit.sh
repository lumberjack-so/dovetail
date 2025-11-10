#!/bin/bash

# Dovetail User Prompt Submit Hook
# Injects workflow context and requirements before every user message

# Exit if not dovetail project
if [ ! -f ".dovetail/state.json" ]; then
  exit 0
fi

# Check if dovetail CLI is available
if ! command -v dovetail &> /dev/null; then
  exit 0
fi

# ============================================
# QUERY ALL SERVICES
# ============================================

# Get dovetail status
STATUS=$(dovetail status --json 2>/dev/null)
if [ $? -ne 0 ]; then
  exit 0
fi

ACTIVE_ISSUE=$(echo "$STATUS" | jq -r '.activeIssue.key // empty')
CURRENT_BRANCH=$(echo "$STATUS" | jq -r '.git.currentBranch // "unknown"')
HAS_CHANGES=$(echo "$STATUS" | jq -r '.git.hasChanges // false')
PR_URL=$(echo "$STATUS" | jq -r '.pr.url // empty')
CI_STATUS=$(echo "$STATUS" | jq -r '.ciStatus // "unknown"')
PR_DRAFT=$(echo "$STATUS" | jq -r '.pr.draft // false')

# ============================================
# DETERMINE WORKFLOW STATE
# ============================================

WORKFLOW_STATE="unknown"

if [ -z "$ACTIVE_ISSUE" ]; then
  # Check if user is requesting work
  if echo "$USER_MESSAGE" | grep -qiE "(build|create|add|implement|fix|work on)"; then
    WORKFLOW_STATE="needs_issue_selection"
  else
    WORKFLOW_STATE="no_active_work"
  fi
elif [ "$CURRENT_BRANCH" == "main" ]; then
  WORKFLOW_STATE="needs_branch_creation"
elif [ "$HAS_CHANGES" == "true" ]; then
  WORKFLOW_STATE="needs_commit"
elif [ -n "$PR_URL" ] && [ "$CI_STATUS" == "passing" ] && [ "$PR_DRAFT" == "false" ]; then
  WORKFLOW_STATE="ready_to_merge"
elif [ "$CURRENT_BRANCH" != "main" ] && [ "$HAS_CHANGES" == "false" ]; then
  WORKFLOW_STATE="ready_to_code"
fi

# ============================================
# INJECT WORKFLOW REQUIREMENTS
# ============================================

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 DOVETAIL WORKFLOW CONTEXT (System Injection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CURRENT STATE:
• Active Issue: ${ACTIVE_ISSUE:-"NONE"}
• Current Branch: $CURRENT_BRANCH
• Uncommitted Changes: $HAS_CHANGES
• PR: $([ -n "$PR_URL" ] && echo "$PR_URL" || echo "none")
• CI Status: $CI_STATUS

🎯 WORKFLOW STATE: $WORKFLOW_STATE

EOF

# ============================================
# STATE-SPECIFIC REQUIREMENTS
# ============================================

case "$WORKFLOW_STATE" in
  "needs_issue_selection")
    # Query Linear for related issues
    LINEAR_ISSUES=$(dovetail linear-search --query "$USER_MESSAGE" --json 2>/dev/null)

    cat <<EOF
📋 SEARCHING LINEAR FOR RELATED ISSUES...

$(echo "$LINEAR_ISSUES" | jq -r '.issues[] | "• \(.key): \(.title) (Priority: \(.priority), Estimate: \(.estimate)h)"')

⚠️  REQUIRED WORKFLOW - YOU MUST FOLLOW THESE STEPS:

1. ANALYZE the user's intent and the Linear issues above
2. If a relevant issue exists:
   → Execute: dovetail start <issue-key>
   → This creates the branch and updates Linear to "In Progress"
3. If NO relevant issue exists:
   → ASK user: "Should I create a new Linear issue for this?"
   → If yes, tell them you'll create it (they'll use 'dovetail start' after)
4. ONLY AFTER starting an issue, proceed to implementation

⛔ CRITICAL RULES - DO NOT:
- Skip 'dovetail start' command
- Write any code without a Linear issue
- Create files before starting an issue
- Proceed to next step until workflow is executed

The user's message will follow this context.

EOF
    ;;

  "needs_branch_creation")
    cat <<EOF
⚠️  WRONG BRANCH - BLOCKING VIOLATION

You are on 'main' branch but have active issue: $ACTIVE_ISSUE

⚠️  REQUIRED ACTION - EXECUTE THIS NOW:

Execute: dovetail start $ACTIVE_ISSUE

This will create and checkout the correct feature branch.

⛔ DO NOT write any code until on the correct feature branch.

User message follows:

EOF
    ;;

  "ready_to_code")
    cat <<EOF
✅ READY TO CODE

Active Issue: $ACTIVE_ISSUE
Branch: $CURRENT_BRANCH

You may now implement the feature. When ready to commit:
1. Execute: dovetail commit
2. This runs all checks, creates PR, updates Linear
3. Then: dovetail deploy staging (automatic deployment)

User message follows:

EOF
    ;;

  "needs_commit")
    CHANGED_COUNT=$(echo "$STATUS" | jq -r '[.git.changedFiles.modified[], .git.changedFiles.created[]] | length')

    cat <<EOF
⚠️  UNCOMMITTED CHANGES DETECTED - ACTION REQUIRED

Changed files: $CHANGED_COUNT

⚠️  REQUIRED WORKFLOW BEFORE PROCEEDING:

You MUST commit these changes:

1. Execute: dovetail commit
   This will:
   - Run security scan (npm audit, console.log check, sensitive files)
   - Run automated tests (Playwright if UI changed, API tests if backend changed)
   - Block if any checks fail
   - Create or update PR on GitHub
   - Update Linear issue with commit info
   - Link everything together

2. After successful commit, execute: dovetail deploy staging
   - Deploys to staging environment
   - Runs health checks

⛔ CRITICAL - DO NOT:
- Continue writing code without committing
- Skip quality checks
- Use manual git commands (must use 'dovetail commit')

If user wants to continue coding, you must commit first.

User message follows:

EOF
    ;;

  "ready_to_merge")
    cat <<EOF
🎉 READY TO MERGE - QUALITY GATE PASSED

Issue: $ACTIVE_ISSUE
PR: $PR_URL
CI Status: ✅ $CI_STATUS

⚠️  REQUIRED WORKFLOW:

Before merging, you MUST:

1. ASK user: "Have you tested on staging? Ready to merge?"
2. Wait for user confirmation
3. If confirmed, execute: dovetail merge
   This will:
   - Run final quality gate
   - Squash merge the PR
   - Close Linear issue (mark as Done)
   - Delete the feature branch
   - Clean up

4. After merge, ASK: "Ready to deploy to production?"
5. If yes, execute: dovetail deploy production
   - Requires confirmation
   - Creates release version tag
   - Deploys to production

⛔ DO NOT merge without explicit user confirmation.

User message follows:

EOF
    ;;

  "no_active_work")
    cat <<EOF
💡 NO ACTIVE WORK

The user is not currently working on an issue.

If they want to start work:
- Ask what they want to build
- Search Linear for related issues
- Start the workflow

User message follows:

EOF
    ;;
esac

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END WORKFLOW CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  CRITICAL: You are REQUIRED to follow the workflow above.
This is not optional. The hooks enforce these rules.

User's actual message: "$USER_MESSAGE"

EOF
