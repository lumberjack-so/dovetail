# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dovetail is an opinionated CLI that scaffolds and automates the entire PERN stack (PostgreSQL, Express, React, Node) development workflow. It integrates GitHub, Linear, Supabase, and Fly.io into a single unified development experience with enforced best practices.

## Development Commands

### Running the CLI locally
```bash
npm run dev <command>              # Run dovetail CLI in development
# Example: npm run dev init "Test Project"
```

### Testing
```bash
npm test                           # Currently no tests configured
```

### Local installation for testing
```bash
npm link                           # Install CLI globally from source
dovetail <command>                 # Use globally linked version
npm unlink -g @lumberjack-so/dovetail  # Uninstall global link
```

### Publishing
```bash
npm publish --access public        # Manual publish to npm
# Or update version in package.json - GitHub Actions will auto-publish
```

## Architecture

### Core Design Principles

1. **CLI-First**: All functionality accessible via command line for automation, hooks, and CI/CD
2. **Opinionated**: Enforces best practices through workflow automation
3. **Stateful**: Maintains project state in `~/.dovetail/` (global) and `.dovetail/` (project-specific)
4. **Service Integration**: Deep integration with GitHub, Linear, Supabase, and Fly.io APIs

### Module Organization

```
src/
├── commands/          # CLI command implementations
│   ├── init.js       # Project scaffolding with full stack setup
│   ├── start.js      # Issue selection and branch creation
│   ├── commit.js     # Smart commits with auto-checks
│   ├── merge.js      # PR merging with quality gates
│   ├── deploy.js     # Deployment to Fly.io
│   ├── onboard.js    # Interactive first-time setup
│   └── ...
├── integrations/     # Third-party API clients
│   ├── github.js     # Octokit wrapper for repos, PRs, secrets
│   ├── linear.js     # Linear SDK wrapper for issues
│   ├── supabase.js   # Supabase API for project creation
│   └── flyio.js      # Fly.io CLI wrapper with execa
├── checks/           # Quality checks and validation
│   ├── security-scan.js   # npm audit + sensitive file detection
│   ├── test-runner.js     # Playwright + API test runner
│   └── quality-gate.js    # Pre-merge validation
├── utils/            # Shared utilities
│   ├── state.js      # State management (global + project)
│   ├── config.js     # API token management
│   ├── git.js        # Git operations via simple-git
│   └── logger.js     # Colored console output
└── templates/
    └── scaffold.js   # Project template generation
```

### State Management

Dovetail maintains two levels of state:

1. **Global State** (`~/.dovetail/state.json` and `config.json`)
   - API tokens (GitHub, Linear, Supabase, Fly.io)
   - Default organizations
   - Active issue tracking across projects

2. **Project State** (`.dovetail/state.json` in project root)
   - Current active issue
   - GitHub repository details
   - Linear project/team IDs
   - Supabase project ID
   - Fly.io app names

### Integration Layer

All external services use a consistent retry pattern:

- **Supabase API**: Retries 502/503/504 errors with exponential backoff (see `supabase.js:retryApiCall`)
- **GitHub API**: Uses Octokit with proper error handling for permission issues
- **Linear API**: Direct SDK usage with Linear team/project context
- **Fly.io**: Shell wrapper using execa for flyctl commands

### Command Flow Example

When `dovetail start` is executed:

1. Validates config (`utils/config.js`)
2. Queries Linear API for open issues (`integrations/linear.js`)
3. Prompts user for issue selection (inquirer)
4. Creates branch with naming convention: `feat/ISSUE-KEY-description`
5. Updates project state with active issue (`utils/state.js`)
6. Links branch to Linear issue

### Scaffolding System

`init` command generates a monorepo structure:

```
generated-project/
├── apps/
│   ├── web/          # Vite + React frontend
│   └── api/          # Express backend
├── migrations/       # Database migrations
├── tests/            # Playwright tests
├── .dovetail/        # Project-specific state
└── fly.*.toml        # Fly.io configs (staging + production)
```

All templates are code-generated in `templates/scaffold.js` (not file-based templates).

## Important Implementation Details

### Configuration Validation

Always check configuration before API operations:

```javascript
const configCheck = await validateConfig();
if (!configCheck.valid) {
  // Prompt for missing tokens
}
```

### Error Handling for API Calls

GitHub token errors often indicate missing scopes. The `github.js` integration provides detailed remediation:

```javascript
catch (error) {
  if (error.message.includes('Resource not accessible')) {
    // Provide specific instructions for token scope fix
  }
}
```

### Testing Strategy Detection

`commit` command analyzes changed files to determine which tests to run:

- Frontend changes → Playwright visual tests
- API changes → API tests + doc update warning
- No test files → security scan only

### Git Operations

All git operations use `simple-git` library (`utils/git.js`), not shell commands:

```javascript
import { getCurrentBranch, commit, push } from '../utils/git.js';
```

### Listr2 for Task Progress

Complex multi-step operations (like `init`) use Listr2 for progress display:

```javascript
const tasks = new Listr([
  { title: 'Creating GitHub repo', task: async () => {...} },
  { title: 'Creating Linear project', task: async () => {...} },
]);
await tasks.run();
```

### Secrets Management

GitHub secrets are encrypted using TweetNaCl before being stored:

- Supabase API keys
- Database passwords
- Fly.io tokens

See `github.js:createRepositorySecrets` for encryption logic.

## Working with Generated Projects

Projects created by Dovetail have this structure:

### Development workflow
```bash
npm run dev              # Start both web and api servers
npm run dev:web          # Start only frontend (Vite)
npm run dev:api          # Start only backend (Express)
```

### Building
```bash
npm run build            # Build both apps
npm run build:web        # Build frontend only
npm run build:api        # Build backend only
```

### Testing
```bash
npm test                 # Run Playwright tests
npm run test:api         # Run API tests (Node test runner)
```

## Commit Message Convention

Dovetail enforces conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance
- `docs:` - Documentation
- `refactor:` - Code refactoring

Commits are automatically linked to Linear issues and GitHub PRs.

## Key Files to Understand

1. **bin/dovetail.js** - CLI entry point, command registration with commander
2. **src/commands/init.js** - Most complex command, orchestrates full project setup
3. **src/commands/commit.js** - Smart commit logic with quality checks
4. **src/integrations/supabase.js** - Retry logic for API reliability
5. **src/utils/state.js** - Dual-level state management (global + project)
6. **src/templates/scaffold.js** - Project generation templates

## Dependencies

### Core CLI
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal colors
- `ora` - Spinners
- `listr2` - Task lists with progress

### Integrations
- `octokit` - GitHub API
- `@linear/sdk` - Linear API
- `axios` - Supabase API (REST)
- `execa` - Fly.io CLI wrapper
- `simple-git` - Git operations

### Utilities
- `fs-extra` - File system operations
- `slugify` - URL-safe slugs
- `tweetnacl` + `tweetnacl-util` - Secret encryption
- `conventional-commits-parser` - Commit message parsing

## Node Version

Requires Node.js 18+ (see `package.json` engines field).

## Module System

Uses ES modules (`"type": "module"` in package.json). All imports must use `.js` extensions.
