# Dovetail

**An opinionated CLI that scaffolds and automates the entire PERN stack development workflow.**

## What It Does

Dovetail generates production-ready full-stack applications (React + Express + PostgreSQL + Node) with all infrastructure pre-configured and wired together: Supabase for database/auth, Fly.io for deployment, GitHub for code/CI, and Linear for issue tracking.

More importantly, it **enforces your development workflow** through a CLI that handles commits, testing, issue tracking, PR management, and deployments—so you never forget a step.

## The Problem

Starting a new full-stack project means:
- 2-3 days configuring infrastructure (database, auth, hosting, CI/CD)
- Manual workflow steps that get forgotten (commit conventions, updating tickets, running tests, updating docs)
- Inconsistent processes across projects and team members
- Context-switching between tools (GitHub, Linear, Supabase dashboards)

## How It Works

**One command scaffolds everything:**
```bash
dovetail init "My Project"
```
Generates a working app in 5 minutes with auth flow, database, deployments, and CI/CD configured.

**CLI commands enforce workflow:**
```bash
dovetail start        # Pick Linear issue, create branch
dovetail commit       # Auto-test, format, push, update Linear
dovetail merge        # Run quality checks, merge to main
dovetail deploy staging    # One-command deployment
```

Every action is deterministic—runs security scans, visual tests, updates tickets, manages PRs automatically. No steps get skipped.

## Installation

```bash
npm install -g dovetail-cli
```

## Quick Start

### 1. Configure API Tokens

```bash
dovetail config
```

You'll need:
- **GitHub Token**: [Create here](https://github.com/settings/tokens) (scopes: `repo`, `workflow`)
- **Linear API Key**: [Create here](https://linear.app/settings/api)
- **Supabase Token**: [Create here](https://supabase.com/dashboard/account/tokens)
- **Fly.io Token**: Run `flyctl auth token`

### 2. Create a New Project

```bash
dovetail init "My Awesome App"
```

This will:
- ✅ Scaffold a PERN stack project
- ✅ Create GitHub repository
- ✅ Create Linear project with starter issues
- ✅ Create Supabase project
- ✅ Create Fly.io apps (staging + production)
- ✅ Initialize git and push

### 3. Start Developing

```bash
cd my-awesome-app
npm run dev              # Start dev servers
dovetail start           # Begin working on an issue
```

## Commands

### Project Lifecycle

```bash
dovetail init "Project Name"    # Bootstrap new project
dovetail status                 # Show current project state
dovetail config                 # Manage API tokens
```

### Work Session

```bash
dovetail start                  # Query Linear, pick issue, create branch
dovetail start <issue-key>      # Start work on specific issue (e.g., TS-007)
```

### During Work

```bash
dovetail commit                 # Smart commit (auto-detects changes, runs checks)
dovetail test                   # Run relevant tests based on changed files
dovetail check                  # Run quality checks without committing
```

### Finishing Work

```bash
dovetail ready                  # Run quality gate, check if ready to merge
dovetail merge                  # Merge to main (runs quality gate first)
```

### Deployment

```bash
dovetail deploy staging         # Deploy to staging
dovetail deploy production      # Deploy to production
dovetail rollback <env> <ver>   # Rollback deployment
```

### Utilities

```bash
dovetail sync                   # Sync main branch
dovetail clean                  # Clean up merged branches
dovetail migrate                # Run/manage database migrations
```

## Workflow Example

```bash
# Start work
dovetail start
# → Queries Linear for open issues
# → Creates branch: feat/TS-007-add-user-profile

# Make changes...
vim apps/web/src/components/Profile.tsx

# Commit with auto-checks
dovetail commit
# → Runs security scan ✅
# → Runs visual tests ✅
# → Creates PR (draft)
# → Updates Linear issue

# Check if ready to merge
dovetail ready
# → CI passing ✅
# → Tests passing ✅
# → No console.logs ✅
# → Documentation updated ✅

# Merge to main
dovetail merge
# → Squash merges PR
# → Closes Linear issue
# → Deletes feature branch

# Deploy
dovetail deploy staging
# → Deploys to Fly.io
# → Runs smoke tests ✅
```

## What Makes It Different

### ✅ Opinionated & Complete
Not a boilerplate—a complete development environment with enforced workflow.

### ✅ Infrastructure as Code
No manual clicking in dashboards. Everything created programmatically.

### ✅ Automated Quality Gates
Security scans, visual tests, doc checks run automatically. Can't merge broken code.

### ✅ Service Integration
GitHub, Linear, Supabase, and Fly.io work together seamlessly.

### ✅ CLI-First Design
Can be used standalone, by Claude Code, in hooks, or in CI/CD.

## Architecture

```
dovetail/
├── bin/
│   └── dovetail.js           # CLI entry point
├── src/
│   ├── commands/
│   │   ├── init.js           # Project scaffolding
│   │   ├── start.js          # Issue management
│   │   ├── commit.js         # Smart commits
│   │   ├── merge.js          # Merge automation
│   │   └── deploy.js         # Deployment
│   ├── integrations/
│   │   ├── github.js         # GitHub API
│   │   ├── linear.js         # Linear API
│   │   ├── supabase.js       # Supabase API
│   │   └── flyio.js          # Fly.io CLI wrapper
│   ├── checks/
│   │   ├── security-scan.js  # npm audit, sensitive files
│   │   ├── test-runner.js    # Playwright, API tests
│   │   └── quality-gate.js   # Merge requirements
│   ├── utils/
│   │   ├── git.js            # Git operations
│   │   ├── state.js          # Project state management
│   │   └── config.js         # Configuration
│   └── templates/
│       └── scaffold.js       # Project templates
└── package.json
```

## Configuration

Configuration is stored in `~/.dovetail/config.json`. You can also use environment variables:

```bash
export GITHUB_TOKEN=ghp_xxx
export LINEAR_API_KEY=lin_api_xxx
export SUPABASE_ACCESS_TOKEN=sbp_xxx
export FLY_API_TOKEN=xxx
```

## Requirements

- Node.js 18+
- Git
- Fly.io CLI (`flyctl`)
- npm or yarn

## Generated Project Structure

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
│   └── api.md
├── .dovetail/               # Project state
│   └── state.json
├── fly.staging.toml         # Fly.io staging config
├── fly.production.toml      # Fly.io production config
└── package.json             # Monorepo root
```

## Roadmap

- [ ] TypeScript support
- [ ] Multiple database options (Postgres, MySQL)
- [ ] Alternative hosting (Vercel, Railway, AWS)
- [ ] Alternative project management (Jira, GitHub Projects)
- [ ] Custom workflow configurations
- [ ] Plugin system
- [ ] VS Code extension

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

## The Name

A dovetail joint is the strongest wood joint—interlocking pieces that fit together perfectly. Dovetail joins your services (GitHub, Linear, Supabase, Fly.io) into one seamless, automated workflow.

---

**TL;DR:** Instant PERN app scaffold + enforced best-practice workflow + zero manual infrastructure.
