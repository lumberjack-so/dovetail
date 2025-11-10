# Dovetail × Claude Code Integration

## Overview

This integration makes Claude Code automatically enforce the Dovetail workflow through **deterministic hooks** that inject context and block non-compliant actions.

## How It Works

When you open a Dovetail project in Claude Code:

1. **Hooks query services** (Linear, GitHub, Git) before every interaction
2. **Context is injected** into Claude's system prompt with workflow requirements
3. **Actions are blocked** if they violate workflow (e.g., writing code without an issue)
4. **Next steps are suggested** after completing tasks

**Result:** Claude Code becomes a workflow execution engine that enforces best practices automatically.

## Architecture

```
User types message
    ↓
[user-prompt-submit hook]
    ↓
Query: dovetail status, Linear issues, GitHub PR, git status
    ↓
Inject workflow requirements into Claude's context
    ↓
Claude processes with enforced rules
    ↓
[pre-tool-use hook]
    ↓
Validate: Active issue? Correct branch? Block if not.
    ↓
Claude writes code
    ↓
[post-tool-use hook]
    ↓
Suggest commit after 3+ files changed
    ↓
[agent-complete hook]
    ↓
Show next workflow step
```

## Hooks

### 1. `session-start.sh`
**Trigger:** When Claude Code opens

**Purpose:** Display project context

**Output:**
```
🔧 DOVETAIL PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Project: My App
🌿 Branch: feat/TS-007-add-profile

🎯 ACTIVE ISSUE: TS-007 - Add user profile

🔀 PR: https://github.com/user/repo/pull/42
✅ CI: Passing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. `user-prompt-submit.sh`
**Trigger:** Before every user message

**Purpose:** Inject workflow context and requirements

**Queries:**
- `dovetail status --json` - Project state
- `dovetail linear-search --query "$USER_MESSAGE" --json` - Related issues
- `dovetail pr-status --json` - GitHub PR status
- `git status` - Uncommitted changes

**Injects:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 DOVETAIL WORKFLOW CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CURRENT STATE:
• Active Issue: TS-007
• Current Branch: feat/TS-007-add-profile
• Uncommitted Changes: true
• PR: https://github.com/user/repo/pull/42
• CI Status: passing

🎯 WORKFLOW STATE: needs_commit

⚠️  REQUIRED WORKFLOW BEFORE PROCEEDING:

You MUST commit these changes:

1. Execute: dovetail commit
   - Runs security scan
   - Runs automated tests
   - Creates/updates PR
   - Updates Linear issue

2. After commit: dovetail deploy staging

⛔ DO NOT continue coding without committing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Workflow States:**
- `needs_issue_selection` - No active issue, user wants to build something
- `needs_branch_creation` - Has issue but on main branch
- `ready_to_code` - On feature branch, ready to implement
- `needs_commit` - Has uncommitted changes
- `ready_to_merge` - PR ready, CI passing

### 3. `pre-tool-use.sh`
**Trigger:** Before Claude uses Write/Edit

**Purpose:** Block file operations if requirements not met

**Validations:**
1. Must have active Linear issue
2. Must be on feature branch (not main)
3. Branch must match active issue

**Blocks with:**
```
⛔ BLOCKED: No Active Linear Issue

You cannot write code without a Linear issue.

REQUIRED ACTION:
Execute: dovetail start <issue-key>
```

### 4. `post-tool-use.sh`
**Trigger:** After Claude writes/edits files

**Purpose:** Suggest commit after significant work

**Triggers when:** 3+ files changed

**Suggests:**
```
💡 WORKFLOW CHECKPOINT

You've modified 5 files. Consider committing soon.

When ready:
→ Execute: dovetail commit
```

### 5. `agent-complete.sh`
**Trigger:** After Claude completes a task

**Purpose:** Show next workflow step

**Examples:**
```
🎯 WORKFLOW: NEXT STEPS

📌 NEXT: Commit your changes
Execute: dovetail commit
```

```
🎯 WORKFLOW: NEXT STEPS

📌 NEXT: Ready to merge
PR: https://github.com/user/repo/pull/42
✅ All checks passing

When ready:
1. Test on staging
2. Execute: dovetail merge
```

## CLI Commands for Hooks

### `dovetail status --json`
Returns full project state:
```json
{
  "isDovetailProject": true,
  "project": { "name": "My App", "slug": "my-app" },
  "git": {
    "currentBranch": "feat/TS-007-add-profile",
    "hasChanges": true,
    "changedFiles": { ... },
    "commitsAhead": 2
  },
  "activeIssue": {
    "key": "TS-007",
    "id": "uuid",
    "title": "Add user profile",
    "branch": "feat/TS-007-add-profile",
    "url": "https://linear.app/..."
  },
  "pr": {
    "url": "https://github.com/user/repo/pull/42",
    "number": 42,
    "state": "open",
    "draft": false
  },
  "ciStatus": "passing"
}
```

### `dovetail linear-search --query "auth" --json`
Searches Linear issues:
```json
{
  "issues": [
    {
      "key": "TS-001",
      "id": "uuid",
      "title": "Set up authentication",
      "priority": 1,
      "estimate": 3,
      "url": "https://linear.app/..."
    }
  ]
}
```

### `dovetail pr-status --json`
Gets PR for current branch:
```json
{
  "hasPR": true,
  "number": 42,
  "url": "https://github.com/user/repo/pull/42",
  "state": "open",
  "draft": false,
  "ciStatus": "passing",
  "mergeable": true
}
```

## User Experience Flow

### Starting Work

**User:** "I want to build authentication"

**Hook fires:** Queries Linear for "authentication"

**Claude receives:**
```
WORKFLOW STATE: needs_issue_selection

📋 LINEAR ISSUES FOUND:
• TS-001: Set up authentication (Priority: 1, Estimate: 3h)

REQUIRED WORKFLOW:
1. Relevant issue exists: TS-001
2. Execute: dovetail start TS-001
3. Then proceed to implementation
```

**Claude:** "I found issue TS-001 for authentication. Starting it now..."

**Claude executes:** `dovetail start TS-001`

**Result:** Branch created, Linear updated, ready to code

### Writing Code

**User:** "Create the auth endpoints"

**pre-tool-use hook:** Validates active issue, correct branch ✅

**Claude:** Writes files

**post-tool-use hook:** "3 files modified, consider committing"

### Committing

**User:** "Commit it"

**Hook injects:**
```
WORKFLOW STATE: needs_commit
REQUIRED: Execute 'dovetail commit'
```

**Claude executes:** `dovetail commit`

**Result:** Security checks run, tests run, PR created, Linear updated

### Merging

**User:** "Merge it"

**Hook injects:**
```
WORKFLOW STATE: ready_to_merge
REQUIRED: Ask user to confirm testing, then 'dovetail merge'
```

**Claude:** "Have you tested on staging? Ready to merge?"

**User:** "Yes"

**Claude executes:** `dovetail merge`

**Result:** PR merged, issue closed, branch deleted

## Installation

### For New Projects

Hooks are automatically installed when you run:
```bash
dovetail init "My Project"
```

The `.claude/` directory is created with all hooks configured.

### For Existing Projects

1. Copy hook templates:
```bash
mkdir -p .claude/hooks
cp -r /path/to/dovetail/.claude-hooks/* .claude/hooks/
chmod +x .claude/hooks/*.sh
```

2. Create `.claude/config.json`:
```json
{
  "hooks": {
    "sessionStart": ".claude/hooks/session-start.sh",
    "userPromptSubmit": ".claude/hooks/user-prompt-submit.sh",
    "preToolUse": ".claude/hooks/pre-tool-use.sh",
    "postToolUse": ".claude/hooks/post-tool-use.sh",
    "agentComplete": ".claude/hooks/agent-complete.sh"
  }
}
```

3. Ensure `dovetail` CLI is in PATH

## Configuration

Edit `.claude/config.json` to customize:

```json
{
  "hooks": { ... },
  "dovetail": {
    "enforcement": "strict",
    "autoCommit": false,
    "autoMerge": false,
    "autoDeploy": {
      "staging": true,
      "production": false
    },
    "requireConfirmation": {
      "merge": true,
      "deployProduction": true
    }
  }
}
```

## Requirements

- `dovetail` CLI installed and in PATH
- `jq` installed (for JSON parsing in hooks)
- Claude Code (claude.ai/code)

## Troubleshooting

### Hooks not firing

Check:
```bash
ls -la .claude/hooks/
```

Hooks must be executable:
```bash
chmod +x .claude/hooks/*.sh
```

### Commands not found

Verify dovetail is in PATH:
```bash
which dovetail
```

### JSON parsing errors

Install jq:
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```

## Disable Hooks Temporarily

```bash
mv .claude/hooks .claude/hooks.disabled
```

Re-enable:
```bash
mv .claude/hooks.disabled .claude/hooks
```

## Benefits

1. **Deterministic:** Same workflow every time
2. **Enforced:** Can't skip steps or forget actions
3. **Automatic:** Context injected without thinking
4. **Error-proof:** Blocks non-compliant actions
5. **Guided:** Shows next steps automatically
6. **Best practices:** Security, testing, documentation enforced

## Example Session

```
[Opens project in Claude Code]

🔧 DOVETAIL PROJECT
💡 NO ACTIVE ISSUE

---

User: Build a user profile page

[Hook queries Linear: finds TS-007]
[Injects: Must start TS-007 first]

Claude: Found TS-007 for user profiles. Starting it...
[Executes: dovetail start TS-007]
✓ Branch created, issue in progress

---

Claude: [Writes ProfilePage.tsx, Profile.jsx, ProfileAPI.js]

[post-tool-use: Suggests commit after 3 files]

---

User: Commit this

[Hook: needs_commit state, must use dovetail commit]

Claude: [Executes: dovetail commit]
✓ Security checks passed
✓ Tests passed
✓ PR #42 created

---

[agent-complete: Shows "Ready to merge" when CI passes]

User: Merge it

Claude: Have you tested on staging?
User: Yes

Claude: [Executes: dovetail merge]
✓ Merged, issue closed, branch deleted

---

[agent-complete: "Ready to deploy to production"]

User: Deploy to production

Claude: [Executes: dovetail deploy production]
✓ Deployed, created release v1.1.0
```

## Philosophy

The hooks **brute force** Claude Code to always follow the Dovetail protocol. This isn't optional tools - it's enforced workflow through automatic context injection and action blocking.

Claude Code becomes a **workflow execution engine** that can't deviate from best practices.
