# Changelog

All notable changes to the Dovetail CLI will be documented in this file.

## [0.2.0] - 2025-10-30

### Added
- **Seamless onboarding**: `dovetail init` now auto-launches config setup if tokens are missing
  - No more confusing error messages telling you to run another command
  - Inline token configuration during first init
- **Interactive config management**: `dovetail config` is now a full menu system
  - View current configuration status
  - Update all tokens at once
  - Update individual tokens without re-entering everything
  - Clear all configuration
  - Exit without changes

### Changed
- **Better UX flow**: Install → `dovetail init` → (auto config if needed) → project creation
- **Improved visual feedback**: Color-coded messages throughout (warnings in yellow, success in green)
- Configuration always displayed before making changes

**Impact**: Much smoother first-time experience. No more confusion about what to do after installation.

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
