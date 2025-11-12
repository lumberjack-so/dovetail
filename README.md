# Dovetail 2.0

**An AI-native development workflow system with deterministic enforcement and native CLI delegation.**

Dovetail enforces issue-driven development by integrating GitHub, Linear, Supabase, and Fly.io. When paired with Claude Code, it creates a fully automated workflow where commits, PRs, and issue tracking happen automatically as you code.

## What's New in 2.0

**Native CLI Delegation**: Dovetail 2.0 delegates to native CLIs (`gh`, `linearis`, `supabase`, `flyctl`) instead of wrapping APIs. This makes Dovetail:
- **52% smaller** - Removed 1,174 lines of API wrapper code
- **More powerful** - Full access to all CLI features
- **Less maintenance** - CLIs maintained by service providers
- **Industry standard** - Claude learns commands that work everywhere

**Deterministic Hooks**: Hooks now **enforce** workflow state instead of **suggesting** actions:
- `user-prompt-submit` hook automatically selects/creates issues before Claude sees the prompt
- `pre-tool-use` hook blocks file operations if no active issue
- `post-tool-use` hook auto-commits changes after every file write

Result: **The workflow is always valid. No user intervention needed.**

---

## Installation

### 1. Install Dovetail
```bash
npm install -g @lumberjack-so/dovetail@2.0.0
```

### 2. Install Required CLIs
```bash
# GitHub CLI
brew install gh              # macOS
winget install GitHub.cli    # Windows

# Linearis (Linear CLI)
npm install -g linearis

# Supabase CLI
brew install supabase/tap/supabase    # macOS
scoop install supabase                # Windows

# Fly.io CLI
curl -L https://fly.io/install.sh | sh    # macOS/Linux
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"  # Windows
```

### 3. Authenticate All CLIs
```bash
gh auth login
export LINEAR_API_KEY=<your-key>  # Get from https://linear.app/settings/api
supabase login
flyctl auth login
```

### 4. Verify Setup
```bash
dovetail onboard
```

If all CLIs are installed and authenticated, you'll see:
```
✅ All CLIs installed and authenticated!
```

---

## Quick Start

### Starting a New Project

```bash
dovetail init "My Project"
# → Creates GitHub repo
# → Creates Linear issues
# → Creates Supabase project
# → Creates Fly.io apps
# → Scaffolds React + Express + PostgreSQL app
# → Installs hooks for Claude Code

cd my-project
```

### Adopting an Existing Project

```bash
cd your-existing-project
dovetail adopt
# → Links to GitHub repo
# → Links to Linear team
# → Links to Supabase project (optional)
# → Links to Fly.io apps (optional)
# → Installs hooks for Claude Code
```

### Working with Claude Code

Open the project in Claude Code (https://claude.ai/code):

```bash
# You say:
"add a login form"

# Dovetail hooks automatically:
# 1. Search Linear for related issues
# 2. Auto-select first issue or create placeholder
# 3. Create feature branch
# 4. Allow Claude to write code
# 5. Auto-commit after every file write
# 6. Push to GitHub
# 7. Comment on Linear issue

# Result: You never think about workflow. Just code.
```

---

## How It Works

### The Hook Architecture

Dovetail uses **Claude Code hooks** to enforce workflow:

**user-prompt-submit.sh** (runs before Claude sees your message)
```bash
dovetail check-issue --auto  # Auto-select/create issue if none exists
```

**pre-tool-use.sh** (runs before Write/Edit operations)
```bash
dovetail validate  # Block if no active issue
```

**post-tool-use.sh** (runs after Write/Edit operations)
```bash
dovetail auto-commit  # Commit, push, update Linear
```

### The Commands

**Setup Commands:**
- `dovetail onboard` - Check CLI installations and authentication
- `dovetail init <name>` - Create new project with full stack
- `dovetail adopt` - Link existing project to Dovetail

**Workflow Commands:**
- `dovetail status` - Show current project state
- `dovetail check-issue` - Ensure active issue exists (interactive or --auto)
- `dovetail start <key>` - Start work on a Linear issue
- `dovetail validate` - Check if workflow state is valid
- `dovetail auto-commit` - Commit changes with conventional message

**Manual Workflow (Optional):**

You can also use Dovetail without Claude Code:

```bash
# Check project status
dovetail status

# Find an issue to work on
dovetail check-issue  # Interactive selection

# Or start a specific issue
dovetail start PRJ-123

# Make changes...
echo "feature" >> app.js

# Commit manually (or let hooks do it)
dovetail auto-commit
```

---

## Architecture

### Dovetail 2.0 is Three Things

**1. Workflow Orchestrator**
- Enforces issue-driven development
- Coordinates between GitHub, Linear, Supabase, Fly.io
- Maintains project state in `.dovetail/state.json`

**2. CLI Delegation Layer**
- Wraps `gh`, `linearis`, `supabase`, `flyctl` with error handling
- Provides consistent interface across all services
- Passes through full native CLI power

**3. Hook System**
- Integrates with Claude Code lifecycle events
- Enforces workflow **deterministically** (not suggestions)
- Makes workflow invisible to the user

### File Structure

```
your-project/
├── .claude/
│   └── hooks/
│       ├── user-prompt-submit.sh   # Ensure issue exists
│       ├── pre-tool-use.sh         # Validate before writes
│       └── post-tool-use.sh        # Auto-commit after writes
├── .dovetail/
│   └── state.json                  # Project state
├── apps/
│   ├── web/                        # React frontend
│   └── api/                        # Express backend
├── migrations/                     # Database migrations
└── tests/                          # Playwright tests
```

### State Management

`.dovetail/state.json`:
```json
{
  "name": "My Project",
  "slug": "my-project",
  "activeIssue": {
    "key": "PRJ-123",
    "title": "Add login form",
    "branch": "feat/prj-123-add-login-form"
  },
  "github": {
    "owner": "your-username",
    "repo": "my-project",
    "url": "https://github.com/your-username/my-project"
  },
  "linear": {
    "teamId": "abc123"
  },
  "supabase": {
    "projectRef": "xyz789",
    "url": "https://xyz789.supabase.co"
  },
  "flyio": {
    "staging": "my-project-staging",
    "production": "my-project-production"
  }
}
```

---

## Native CLIs Used

### GitHub CLI (`gh`)
- **Purpose**: Repository, PR, and secrets management
- **Dovetail uses**: `gh repo create`, `gh secret set`, `gh pr create`
- **You can use**: Full GitHub CLI feature set

### Linearis (`linearis`)
- **Purpose**: Linear issue management
- **Dovetail uses**: `linearis issue ls`, `linearis issue create`, `linearis issue update`
- **You can use**: Full Linearis feature set
- **Install**: `npm install -g linearis`
- **Docs**: https://github.com/czottmann/linearis

### Supabase CLI (`supabase`)
- **Purpose**: Database and backend management
- **Dovetail uses**: `supabase projects create`, `supabase projects api-keys`
- **You can use**: Full Supabase CLI (migrations, functions, types)

### Fly.io CLI (`flyctl`)
- **Purpose**: Deployment
- **Dovetail uses**: `flyctl apps create`, `flyctl deploy`
- **You can use**: Full Fly.io CLI feature set

---

## FAQ

**Q: Do I need to use Claude Code?**
A: No! Dovetail works standalone. Hooks just automate the workflow when using Claude Code.

**Q: Can I use other AI coding assistants?**
A: If they support lifecycle hooks (like Claude Code), yes. Otherwise, use Dovetail commands manually.

**Q: Why not use the Linear MCP server?**
A: MCP servers are great for exploratory work, but Dovetail is about **deterministic workflow enforcement**. Hooks can intercept and validate CLI commands, but not MCP operations. Plus, Linearis gives you a standard CLI that works anywhere.

**Q: Can I customize the workflow?**
A: Yes! Edit `.claude/hooks/` to change behavior. Or create custom commands that compose native CLIs.

**Q: What if I already use gh/linearis/supabase/flyctl?**
A: Perfect! Dovetail just orchestrates them. Your existing usage is unchanged.

**Q: Does this work with other frameworks?**
A: The hooks and state management work with any project. The `init` command scaffolds React+Express, but you can `adopt` any project structure.

---

## Upgrading from 1.x

Dovetail 2.0 has breaking changes:

**Removed:**
- API token configuration (use native CLI auth instead)
- `dovetail commit` command (hooks handle this via `auto-commit`)
- `dovetail linear-search` command (use `linearis issue ls` directly)

**Changed:**
- `dovetail onboard` now checks CLI installations (not API tokens)
- Hooks are simplified (just call Dovetail commands)
- State format slightly different (no `projectId` for Linear)

**Migration:**
```bash
# 1. Install all CLIs (see Installation above)
# 2. Authenticate all CLIs
# 3. Upgrade Dovetail
npm install -g @lumberjack-so/dovetail@2.0.0

# 4. Re-adopt your project
cd your-project
dovetail adopt  # This will update hooks and state

# 5. Verify
dovetail status
```

---

## Contributing

Dovetail is open source. Contributions welcome!

**Repository**: https://github.com/lumberjack-so/dovetail
**Issues**: https://github.com/lumberjack-so/dovetail/issues

---

## License

MIT © Lumberjack Software
