# Dovetail

**An AI-native development workflow system that enforces best practices automatically.**

Dovetail integrates GitHub, Linear, Supabase, and Fly.io into a single CLI that enforces issue-driven development, continuous commits, automated testing, and quality gates. When paired with Claude Code, it creates a fully automated development workflow where commits, PRs, and deployments happen automatically as you code.

---

## What is Dovetail?

Dovetail is two things:

1. **A project scaffolder** - Generates production-ready full-stack applications (React + Express + PostgreSQL) with all infrastructure pre-configured
2. **A workflow enforcer** - CLI commands and hooks that ensure every code change is tracked, tested, and linked to issues

The magic happens when you combine Dovetail with **Claude Code** - an AI coding assistant that can execute bash commands. Claude Code hooks trigger Dovetail commands automatically, creating a workflow where you describe what you want, and the entire development lifecycle happens automatically.

---

## How It Works

### The Workflow Loop

```
1. User: "Build a user profile page"
   ↓
2. Claude Code hooks detect no active issue
   ↓
3. Dovetail searches Linear for related issues
   ↓
4. Claude asks user to select an issue (or creates one)
   ↓
5. Dovetail creates feature branch
   ↓
6. Claude writes code
   ↓
7. AFTER EVERY FILE OPERATION:
   ↓
8. Dovetail automatically commits
   ↓
9. Runs security scans
   ↓
10. Runs tests
   ↓
11. Creates/updates PR
   ↓
12. Updates Linear issue status
   ↓
13. Loop back to step 6 until feature complete
```

### What's Deterministic vs. What's Injected

**Deterministically Enforced (Hooks physically block operations):**
- ⛔ Cannot write code without an active Linear issue
- ⛔ Cannot write code on main/master branch
- ✅ Auto-commits after every Write/Edit operation
- ✅ Runs security scans on every commit
- ✅ Runs tests on every commit
- ✅ Creates/updates PR on every commit
- ✅ Updates Linear issue status

**Injected into Claude's Context (Informational):**
- 📋 List of available Linear issues matching the task
- 📊 Current project status (branch, issue, changes)
- 🎯 Next recommended action in workflow
- ⚠️ Warnings about branch mismatches or workflow violations

### Division of Labor

**Dovetail Does:**
- Manages Linear issues (search, status updates)
- Creates and switches git branches
- Runs security scans (npm audit, sensitive file detection)
- Runs tests (Playwright for frontend, Node test runner for API)
- Creates and updates GitHub PRs
- Deploys to Fly.io (staging/production)
- Enforces workflow rules via hooks

**Claude Does:**
- Understands user intent
- Searches for relevant issues
- Asks user to select an issue
- Writes/edits code
- Executes Dovetail commands via Bash tool
- Responds to hook feedback

**The User Does:**
- Describes features they want
- Selects Linear issues when prompted
- Reviews PRs and merges when ready

---

## Installation

```bash
npm install -g @lumberjack-so/dovetail
```

### First-Time Setup

```bash
dovetail onboard
```

This interactive wizard will:
- Configure API tokens (GitHub, Linear, Supabase, Fly.io)
- Test connections to all services
- Guide you through creating your first project

You'll need:
- **GitHub Token**: [Create here](https://github.com/settings/tokens) - Use "classic" token with `repo` and `workflow` scopes
- **Linear API Key**: [Create here](https://linear.app/settings/api)
- **Supabase Token**: [Create here](https://supabase.com/dashboard/account/tokens)
- **Fly.io Token**: [Create here](https://fly.io/user/personal_access_tokens) - Create a permanent "Personal Access Token"

---

## Usage Scenarios

### Scenario 1: Starting a New Project from Scratch

**What the user does:**
```bash
dovetail init "My Awesome App"
```

**What Dovetail does automatically:**
1. Scaffolds a PERN stack monorepo with:
   - `apps/web/` - React frontend (Vite)
   - `apps/api/` - Express backend
   - `migrations/` - Database migrations
   - `tests/` - Playwright test suite
2. Creates GitHub repository
3. Creates Linear project with starter issues
4. Creates Supabase project (database + auth)
5. Creates Fly.io apps (staging + production)
6. Installs Claude Code hooks in `.claude/hooks/`
7. Pushes initial commit to GitHub

**What you get:**
- A working full-stack app with authentication
- All services connected and configured
- 5-10 starter Linear issues to work on
- CI/CD ready to go

**Time: ~5 minutes**

**Opening in Claude Code:**
```bash
cd my-awesome-app
claude
```

When Claude Code opens, the session-start hook displays your project status:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 DOVETAIL PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Project: my-awesome-app
🌿 Branch: main
📋 Active Issue: None

📌 NEXT STEP: Select an issue to start working
→ Execute: dovetail start
```

**Starting work with Claude:**

User: "Build a user profile page"

Claude sees the user-prompt-submit hook output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 DOVETAIL WORKFLOW CONTEXT (System Injection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CURRENT STATE:
• Active Issue: NONE
• Current Branch: main

🎯 WORKFLOW STATE: needs_issue_selection

📋 SEARCHING LINEAR FOR RELATED ISSUES...

• APP-001: Create user profile page (Priority: High, Estimate: 3h)
• APP-002: Add user avatar upload (Priority: Medium, Estimate: 2h)
• APP-003: Build settings page (Priority: Low, Estimate: 4h)

⚠️  REQUIRED WORKFLOW - YOU MUST FOLLOW THESE STEPS:
1. ANALYZE the user's intent and the Linear issues above
2. If a relevant issue exists:
   → Execute: dovetail start <issue-key>
3. If NO relevant issue exists:
   → ASK user: "Should I create a new Linear issue for this?"

⛔ CRITICAL RULES - DO NOT:
- Write any code without a Linear issue
- Create files before starting an issue
```

Claude responds: "I found a relevant Linear issue: APP-001 'Create user profile page'. Let me start working on it."

```bash
dovetail start APP-001
```

Dovetail:
1. Syncs main branch
2. Creates branch: `feat/APP-001-create-user-profile-page`
3. Updates Linear issue to "In Progress"
4. Saves active issue to `.dovetail/state.json`

Claude: "Now I'll create the profile page component."

Claude tries to write `apps/web/src/components/Profile.tsx`

Pre-tool-use hook runs BEFORE the Write operation:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DOVETAIL PRE-TOOL-USE: PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue: APP-001 | Branch: feat/APP-001-create-user-profile-page
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

File is written.

Post-tool-use hook runs AFTER the Write operation:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 DOVETAIL POST-TOOL-USE HOOK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue: APP-001 | Branch: feat/APP-001-create-user-profile-page
Files changed: 1

🚀 AUTO-COMMIT TRIGGERED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Executing: dovetail commit --auto

Running security scan...
✓ No vulnerabilities found
✓ No sensitive files detected

Running tests...
✓ Frontend tests: 12 passed
✓ API tests: 8 passed

Creating PR...
✓ PR created: https://github.com/user/my-awesome-app/pull/1

Updating Linear...
✓ Issue APP-001 updated to "In Review"

✅ Auto-commit completed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**This happens AUTOMATICALLY after EVERY file Claude writes.**

---

### Scenario 2: Adopting an Existing Project

You clone someone else's GitHub repo that's already using GitHub, Linear, Supabase, etc., but isn't a Dovetail project yet.

**What the user does:**
```bash
git clone https://github.com/team/existing-project
cd existing-project
dovetail adopt
```

**What Dovetail does:**
1. Auto-detects GitHub repo from git remote
2. Shows interactive wizard to select Linear project
3. Optionally select Supabase project (lists all projects)
4. Optionally configure Fly.io apps
5. Creates `.dovetail/state.json` with project config
6. Installs Claude Code hooks

**Interactive prompts:**
```
✔ Detected GitHub repo: team/existing-project

1. Linear Project
✔ Fetching Linear projects...
? Select Linear project: (Use arrow keys)
❯ Main App (existing-project-abc123)
  Mobile App (mobile-app-def456)
  Backend Services (backend-xyz789)

2. Supabase Project (Optional)
? Does this project use Supabase? (Y/n)
✔ Fetching Supabase projects...
? Select Supabase project: (Use arrow keys)
❯ existing-project (ijlycyasxmpexnsgotwe)
  staging-db (xyzabcdefghijklmnop)

3. Fly.io Apps (Optional)
? Does this project deploy to Fly.io? (Y/n)
? Staging app name: existing-project-staging
? Production app name: existing-project-production

✨ Project adopted successfully!
```

**What you get:**
- `.dovetail/state.json` with all service connections
- `.claude/hooks/` with workflow enforcement
- Ability to use all Dovetail commands

**Opening in Claude Code:**
```bash
claude
```

Session-start hook shows project status:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 DOVETAIL PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Project: existing-project
🌿 Branch: main
📋 Active Issue: None
```

Now you can work exactly like Scenario 1 - ask Claude to build features, and the hooks enforce the workflow.

---

### Scenario 3: Continuing Work on an Existing Project

You're already working on a Dovetail project, and you want to continue work on a different computer or after closing Claude Code.

**What the user does:**
```bash
cd my-awesome-app
dovetail status
```

**What you see:**
```
📁 Project: my-awesome-app
🌿 Branch: feat/APP-001-create-user-profile-page

📋 Active Issue: APP-001: Create user profile page
   Status: In Progress
   Linear: https://linear.app/team/issue/APP-001

📝 Changes:
  Modified: apps/web/src/components/Profile.tsx
  Modified: apps/web/src/pages/ProfilePage.tsx

🔀 PR: https://github.com/user/my-awesome-app/pull/1
   Status: Draft
   CI: ✅ Passing
```

**Opening in Claude Code:**
```bash
claude
```

User: "Add an avatar upload button to the profile page"

Claude sees the user-prompt-submit hook:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 DOVETAIL WORKFLOW CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CURRENT STATE:
• Active Issue: APP-001
• Current Branch: feat/APP-001-create-user-profile-page
• Uncommitted Changes: true
• PR: https://github.com/user/my-awesome-app/pull/1

🎯 WORKFLOW STATE: ready_to_code

✅ READY TO CODE

You may now implement the feature. After each file operation,
changes will be automatically committed, tested, and pushed.
```

Claude writes code, and after each file:
- Pre-tool-use hook validates workflow
- File is written
- Post-tool-use hook auto-commits, tests, updates PR

**When feature is complete:**

User: "This is ready to merge"

Claude: "Let me check if it's ready to merge."

```bash
dovetail ready
```

Dovetail runs quality gate:
```
Running quality gate checks...

✓ CI Status: Passing
✓ Tests: All passing (20/20)
✓ No console.logs in production code
✓ API documentation updated
✓ No sensitive files committed

✅ Ready to merge!
```

Claude: "All checks passed! Shall I merge it?"

User: "Yes"

```bash
dovetail merge
```

Dovetail:
1. Squash merges PR
2. Closes Linear issue
3. Deletes feature branch
4. Switches back to main

---

## Additional Scenarios

### Scenario 4: Multiple Developers on Same Project

**Developer A** (original developer):
```bash
dovetail init "Team Project"
# Shares GitHub repo URL with team
```

**Developer B** (new team member):
```bash
git clone https://github.com/team/team-project
cd team-project
dovetail adopt
```

Both developers now have:
- Same Linear project
- Same Supabase database
- Same Fly.io apps
- Same workflow enforcement

When Developer B runs `dovetail start`, they see all open Linear issues, including ones Developer A is working on (marked "In Progress").

---

### Scenario 5: Working Without Claude Code

Dovetail works perfectly without Claude Code - you just run commands manually:

```bash
# Check status
dovetail status

# Start working on an issue
dovetail start APP-005

# Make changes manually
vim apps/api/src/routes/auth.js

# Commit when ready
dovetail commit

# Check if ready to merge
dovetail ready

# Merge
dovetail merge

# Deploy
dovetail deploy staging
```

The hooks are Claude Code-specific, but all workflow enforcement still happens via the CLI commands.

---

## Commands Reference

### Setup
- `dovetail onboard` - Interactive first-time setup wizard
- `dovetail config` - Manage API tokens
- `dovetail init <name>` - Create new project
- `dovetail adopt` - Adopt existing project

### Daily Workflow
- `dovetail status` - Show project state
- `dovetail start [issue-key]` - Start working on issue
- `dovetail commit` - Commit with auto-checks
- `dovetail test` - Run tests
- `dovetail ready` - Check if ready to merge
- `dovetail merge` - Merge to main

### Deployment
- `dovetail deploy staging` - Deploy to staging
- `dovetail deploy production` - Deploy to production
- `dovetail rollback <env> <version>` - Rollback deployment

### Utilities
- `dovetail sync` - Sync main branch
- `dovetail clean` - Clean merged branches
- `dovetail migrate` - Run database migrations
- `dovetail linear-search` - Search Linear issues
- `dovetail pr-status` - Check PR status

---

## Hook Architecture

Dovetail installs hooks in `.claude/hooks/` that integrate with Claude Code:

### session-start.sh
**When it runs:** When Claude Code opens
**What it does:** Displays project status banner
**Output:** Injected into Claude's context

### user-prompt-submit.sh
**When it runs:** Before each user message
**What it does:**
- Analyzes current workflow state
- Searches Linear for related issues if needed
- Injects workflow instructions into Claude's context
**Output:** Injected into Claude's context

### pre-tool-use.sh
**When it runs:** BEFORE Write/Edit operations
**What it does:**
- Checks if active issue exists (blocks if not)
- Checks if on feature branch (blocks if on main)
- Prints status to console
**Exit codes:**
- `0` = Allow operation
- `2` = Block operation (shows error to Claude)
**Output:** Both to console (stderr) AND to Claude

### post-tool-use.sh
**When it runs:** AFTER Write/Edit operations
**What it does:**
- Prints status to console
- Automatically executes `dovetail commit --auto`
- Runs security scans
- Runs tests
- Creates/updates PR
- Updates Linear issue
**Output:** Both to console (stderr) AND shown in transcript

---

## Configuration Files

### Global Config (`~/.dovetail/config.json`)
```json
{
  "githubToken": "ghp_...",
  "linearApiKey": "lin_api_...",
  "supabaseToken": "sbp_...",
  "flyToken": "..."
}
```

### Project State (`.dovetail/state.json`)
```json
{
  "name": "my-awesome-app",
  "slug": "my-awesome-app",
  "github": {
    "owner": "username",
    "repo": "my-awesome-app",
    "url": "https://github.com/username/my-awesome-app"
  },
  "linear": {
    "teamId": "...",
    "projectId": "...",
    "url": "https://linear.app/team/project/..."
  },
  "supabase": {
    "ref": "...",
    "url": "https://....supabase.co"
  },
  "fly": {
    "staging": "my-awesome-app-staging",
    "production": "my-awesome-app-production"
  },
  "activeIssue": {
    "id": "...",
    "key": "APP-001",
    "title": "Create user profile page"
  }
}
```

---

## Requirements

- Node.js 18+
- Git
- Fly.io CLI (`flyctl`) installed and in PATH
- npm or yarn

---

## Generated Project Structure

When you run `dovetail init`, you get:

```
my-project/
├── apps/
│   ├── web/                  # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── utils/
│   │   └── package.json
│   └── api/                  # Express backend
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   └── middleware/
│       └── package.json
├── migrations/               # Database migrations
├── tests/                    # Playwright tests
├── docs/                     # Documentation
├── .dovetail/               # Project state
│   └── state.json
├── .claude/                 # Claude Code hooks
│   ├── hooks/
│   │   ├── session-start.sh
│   │   ├── user-prompt-submit.sh
│   │   ├── pre-tool-use.sh
│   │   └── post-tool-use.sh
│   └── settings.json
├── fly.staging.toml         # Fly.io staging config
├── fly.production.toml      # Fly.io production config
└── package.json             # Monorepo root
```

---

## Why Dovetail?

**Traditional Development:**
```
1. User describes feature
2. AI writes code
3. User manually commits
4. User manually runs tests (maybe)
5. User manually creates PR
6. User manually updates Linear
7. User forgets half the steps
```

**With Dovetail + Claude Code:**
```
1. User describes feature
2. AI automatically:
   - Selects Linear issue
   - Creates branch
   - Writes code
   - Commits after every file
   - Runs security scans
   - Runs tests
   - Creates PR
   - Updates Linear
3. User reviews and merges when ready
```

**Result:** 10x faster development, zero forgotten steps, perfect audit trail.

---

## License

MIT

---

## The Name

A dovetail joint is the strongest wood joint—interlocking pieces that fit together perfectly. Dovetail joins your services (GitHub, Linear, Supabase, Fly.io) and your AI coding assistant into one seamless, automated workflow.
