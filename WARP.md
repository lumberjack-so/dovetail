# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Essential Development Commands

### Local Development
```bash
# Install dependencies and link CLI locally
npm install
npm link

# Test CLI commands (after linking)
dovetail --help
dovetail --version

# Run CLI directly in development
npm run dev -- [command]
```

### Testing
No automated tests currently exist. Manual testing required:
- Test CLI commands manually
- Verify integrations with GitHub, Linear, Supabase, Fly.io APIs

### Publishing
This project uses **automated GitHub Actions publishing**:
1. Update version in `package.json` and document changes in `CHANGELOG.md`
2. Commit and push to `main` or `claude/**` branches
3. GitHub Actions automatically publishes to npm if version changed
4. No manual `npm publish` needed

Manual publishing (if needed):
```bash
npm publish --access public
```

Published as: `@lumberjack-so/dovetail`

## Architecture Overview

### Core Concept
Dovetail is an opinionated CLI that scaffolds complete PERN stack applications and enforces development workflow through integrated commands. It's **not just a boilerplate generator** - it's a complete workflow automation tool that connects GitHub, Linear, Supabase, and Fly.io together.

### Directory Structure
```
bin/dovetail.js          # CLI entry point using Commander.js
src/
  commands/              # CLI command implementations
  integrations/          # Service integrations (GitHub, Linear, Supabase, Fly.io)
  checks/                # Security scanning, test running, quality gates
  utils/                 # Git operations, state management, config handling
  templates/             # Project scaffolding templates
```

### State Management
**Two-level state system:**
- **Global state** (`~/.dovetail/state.json` + `config.json`): API tokens, user preferences, default organizations
- **Project state** (`<project>/.dovetail/state.json`): Active issue, branch, GitHub/Linear/Supabase metadata

Always use utility functions from `utils/state.js` to read/write state. Never directly access state files.

### Integration Architecture
Each integration (`src/integrations/`) follows a singleton client pattern:
- Lazy initialization on first API call
- Tokens retrieved from config via `getConfig()`
- Client instance cached for performance
- All API calls wrapped with error handling

**Key integrations:**
- **github.js**: Octokit client for repos, PRs, CI status
- **linear.js**: LinearClient for issues, projects, workflow states
- **supabase.js**: REST API for project creation, organization management
- **flyio.js**: CLI wrapper using `execa` to call `flyctl`

### Workflow Command Flow

**`dovetail start`:**
1. Validates config and project state
2. Syncs main branch (`git pull`)
3. Queries Linear for open issues
4. Creates feature branch
5. Updates Linear issue to "In Progress"
6. Saves active issue to project state

**`dovetail commit`:**
1. Reads active issue from project state
2. Detects changed files
3. Runs security scan (npm audit, console.log detection)
4. Runs relevant tests (Playwright, API tests)
5. Creates conventional commit with issue key
6. Pushes to GitHub
7. Creates/updates draft PR
8. Adds commit to Linear issue

**`dovetail merge`:**
1. Runs quality gate (security, docs, migrations, CI status)
2. Squash merges PR to main
3. Closes Linear issue
4. Deletes feature branch

### Quality Gate System
Located in `src/checks/quality-gate.js`. Enforces merge requirements:
- Security scan must pass (no vulnerabilities, no console.logs)
- Documentation updates required if API routes changed
- Migration review required if SQL files changed
- CI status must be passing (if GitHub integration present)

All checks must pass before merge is allowed.

### Generated Project Structure
When running `dovetail init`, scaffolds:
```
project-slug/
  apps/
    web/           # React + Vite
    api/           # Express server
  migrations/      # Database migrations
  tests/           # Playwright tests
  docs/api.md      # API documentation
  .dovetail/       # Project state
  fly.staging.toml
  fly.production.toml
```

Monorepo structure using npm workspaces.

### Configuration Flow
1. First-time users run `dovetail onboard` (interactive wizard)
2. Tokens stored in `~/.dovetail/config.json`
3. Environment variables override config file values
4. Token validation happens on first API call
5. Missing config prompts user to run `dovetail config`

### Code Patterns

**Always use ES modules:** `import`/`export` (package.json has `"type": "module"`)

**Consistent UI patterns:**
- Use `chalk` for colored output
- Use `ora` for loading spinners
- Use `inquirer` for interactive prompts
- Use `Listr` for task lists during long operations
- Use `logger.js` utility for standardized messages

**Error handling:**
- Throw descriptive errors with actionable user guidance
- Always include recovery steps in error messages
- Exit with `process.exit(1)` on fatal errors

**Git operations:**
- Always use `utils/git.js` wrapper (uses `simple-git`)
- Never shell out to git directly
- All git operations are async

**API token access:**
- Always use `getConfig(key, envVar)` from `utils/config.js`
- Never access config file directly
- Support both config file and environment variables

## Important Implementation Details

### Branch Naming
Generated by `createBranchName()` in `utils/slugify-helper.js`:
- Format: `feat/ISSUE-123-issue-title`
- Max length: 50 characters
- Slugified and sanitized

### Commit Message Format
Follows Conventional Commits with issue key:
```
feat: description [ISSUE-123]
```

### PR Creation
Always created as **draft** PRs initially. User marks ready when work complete. PR body includes:
- Summary section
- Link to Linear issue
- Test plan checklist

### Security Scan
Located in `checks/security-scan.js`:
- Runs `npm audit` for vulnerabilities
- Scans for `console.log` statements (warns but doesn't fail)
- Scans for orphaned `TODO` comments
- Only runs checks relevant to changed files

### Fly.io Integration
Unlike other integrations, wraps CLI (`flyctl`) instead of REST API:
- Uses `execa` to execute `flyctl` commands
- Requires `flyctl` to be installed
- Token passed via `FLY_API_TOKEN` environment variable
