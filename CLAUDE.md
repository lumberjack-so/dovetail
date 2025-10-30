# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dovetail** is an opinionated CLI that scaffolds and automates the entire PERN stack (PostgreSQL, Express, React, Node) development workflow. It integrates GitHub, Linear, Supabase, and Fly.io into a seamless, automated workflow with enforced best practices.

The tool generates production-ready full-stack applications with infrastructure pre-configured, and then enforces development workflow through CLI commands that handle commits, testing, issue tracking, PR management, and deployments.

## Core Architecture

### Entry Point
- **bin/dovetail.js** - CLI entry point using Commander.js, imports and registers all commands

### Commands (`src/commands/`)
Each command is a standalone module that exports a function to be registered with Commander:
- **onboard.js** - Interactive first-time setup wizard
- **init.js** - Project scaffolding and infrastructure creation
- **start.js** - Linear issue management and branch creation
- **commit.js** - Smart commits with auto-checks
- **ready.js** / **check** - Quality gate checks without committing
- **merge.js** - Automated PR merge with quality checks
- **deploy.js** - Fly.io deployment automation
- **status.js** - Project state display
- **test.js** - Test runner for changed files
- **sync.js** - Git branch synchronization
- **clean.js** - Merged branch cleanup
- **config.js** - Token and configuration management
- **migrate.js** - Database migration management
- **rollback.js** - Deployment rollbacks

### Integrations (`src/integrations/`)
Service API wrappers that handle authentication and operations:
- **github.js** - GitHub API via Octokit (repos, PRs, commits, CI status)
- **linear.js** - Linear API via @linear/sdk (issues, projects, teams)
- **supabase.js** - Supabase API via axios (projects, organizations, wait polling)
- **flyio.js** - Fly.io CLI wrapper via execa (app creation, deployments)

All integrations use `getConfig()` to retrieve tokens from config or environment variables.

### Checks (`src/checks/`)
Quality assurance modules:
- **security-scan.js** - npm audit, sensitive file detection, console.log detection
- **test-runner.js** - Playwright and API test execution
- **quality-gate.js** - Merge requirements (CI passing, docs updated, migrations reviewed)

### Utilities (`src/utils/`)
- **state.js** - Global and project-specific state management
  - Global: `~/.dovetail/state.json` (active issues, session state)
  - Project: `<project>/.dovetail/state.json` (project metadata)
- **config.js** - Configuration management (`~/.dovetail/config.json`)
  - Supports both config file and environment variables
  - Stores: GitHub token, Linear API key, Supabase token, Fly.io token
- **git.js** - Git operations wrapper using simple-git
- **logger.js** - Consistent logging with chalk
- **slugify-helper.js** - Repository name normalization

### Templates (`src/templates/`)
- **scaffold.js** - Generates PERN stack monorepo structure with:
  - `apps/web/` - React frontend with Vite
  - `apps/api/` - Express backend
  - `migrations/` - Database migrations
  - `tests/` - Playwright tests
  - `.dovetail/state.json` - Project metadata

## Development Commands

### Local Development
```bash
# Install dependencies
npm install

# Link CLI locally for testing
npm link

# Test CLI commands
node bin/dovetail.js <command>
# or after npm link:
dovetail <command>
```

### Testing
```bash
# No automated tests yet - manual testing required
npm test  # Currently exits with error
```

## Publishing to npm

This repository uses automated GitHub Actions publishing:

1. **Update version in package.json**
2. **Push to `main` or any `claude/**` branch**
3. **GitHub Actions automatically:**
   - Detects version changes
   - Publishes to npm with `--access public`
   - Creates git tag (e.g., `v0.3.9`)
   - Skips if version unchanged

**Manual publishing** (if needed):
```bash
npm login
npm publish --access public
```

**Note:** The workflow runs on every push but only publishes when the version in package.json changes from the previous commit.

## Configuration Architecture

### Token Management
Dovetail requires four API tokens, stored in `~/.dovetail/config.json`:
- `githubToken` - Requires "repo" scope for repository creation
- `linearApiKey` - For issue management
- `supabaseToken` - For project creation
- `flyToken` - For deployment (or use `flyctl auth token`)

All integrations check config first, then fall back to environment variables:
- `GITHUB_TOKEN`
- `LINEAR_API_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `FLY_API_TOKEN`

### State Management
Two levels of state:
1. **Global** (`~/.dovetail/state.json`) - User session state, active issue tracking
2. **Project** (`<project>/.dovetail/state.json`) - Project metadata (GitHub repo, Linear project, Supabase project, Fly.io apps)

## Integration Patterns

### GitHub Integration
- Uses Octokit for REST API calls
- Token validation checks for "repo" scope
- Handles repository creation for both personal and organization accounts
- Provides detailed error messages for permission issues

### Linear Integration
- Uses official @linear/sdk
- Queries teams, creates projects, manages issues
- Creates starter issues during project init

### Supabase Integration
- Uses axios for direct API calls
- Implements polling pattern with `waitForProject()` for async project creation
- Error messages now include full debug information instead of console.error

### Fly.io Integration
- Wraps `flyctl` CLI using execa
- Requires flyctl to be installed separately
- Creates staging and production apps with region selection

## Code Conventions

### ES Modules
- All code uses ES modules (`type: "module"` in package.json)
- Use `import/export` syntax
- File extensions required in imports (`.js`)

### Error Handling
- Include debug information in error messages, not via console.error
- Provide actionable error messages with fix instructions
- Use logger.error() for user-facing errors

### CLI UX
- Use chalk for colored output
- Use ora for loading spinners
- Use inquirer for interactive prompts
- Use Listr2 for task lists during multi-step operations

### Git Operations
- Use simple-git wrapper for all git operations
- Never run git commands directly via child_process

## Common Development Tasks

When adding a new command:
1. Create file in `src/commands/<command>.js`
2. Export named function `<command>Command`
3. Import and register in `bin/dovetail.js`
4. Use consistent patterns: validate config, use ora spinners, provide clear error messages

When adding a new integration:
1. Create file in `src/integrations/<service>.js`
2. Use `getConfig()` for token retrieval
3. Handle errors with detailed messages
4. Export specific functions, not a class

## Generated Project Structure

Projects created by `dovetail init` follow this structure:
```
<project-name>/
├── apps/
│   ├── web/              # React + Vite + Supabase Auth
│   └── api/              # Express + PostgreSQL
├── migrations/           # Database migrations
├── tests/                # Playwright E2E tests
├── docs/                 # API documentation
├── .dovetail/
│   └── state.json        # Project metadata
├── fly.staging.toml      # Fly.io staging config
├── fly.production.toml   # Fly.io production config
└── package.json          # Monorepo with workspaces
```

## Important Notes

- Always validate configuration before operations that require tokens
- Use project state (`<project>/.dovetail/state.json`) to track infrastructure IDs
- Quality gate checks run before merge: security scan, CI status, docs updated
- Fly.io requires separate CLI installation (`flyctl`)
- GitHub token must have "repo" scope - validate with `testGitHubToken()`
- Supabase project creation is async - use `waitForProject()` polling pattern
