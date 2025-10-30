# Changelog

All notable changes to the Dovetail CLI will be documented in this file.

## [0.1.3] - 2025-10-30

### Fixed
- Fixed import error in config command: `readConfig` imported from wrong module (should be from `state.js`, not `config.js`)

**Impact**: `dovetail config` and `dovetail --version` now work without SyntaxError

## [0.1.2] - 2025-10-30

### Fixed
- Fixed import error: `createTag` and `pushTags` were incorrectly imported from `github.js` instead of `git.js`
- Removed unnecessary `gitCreateTag` alias since we now import `createTag` directly

**Impact**: CLI now starts without SyntaxError

## [0.1.1] - 2025-10-30

### Fixed
- Fixed duplicate declaration of `getLatestTag` function in deploy command
- Removed duplicate import that caused SyntaxError on startup

**Impact**: This was a critical bug that prevented the CLI from running at all

## [0.1.0] - 2025-10-30

### Added
- Initial release of Dovetail CLI
- Complete PERN stack scaffolding system
- GitHub, Linear, Supabase, and Fly.io integrations
- 13 core commands: init, start, status, commit, test, ready, merge, deploy, sync, clean, config, migrate, rollback
- Automated quality gates and security checks
- Smart commit system with auto-testing
- One-command deployments
- Project templates for React/Express/PostgreSQL stack

**Known Issues**: Contains critical bugs (fixed in 0.1.1 and 0.1.2)
