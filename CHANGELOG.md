# Changelog

All notable changes to the Dovetail CLI will be documented in this file.

## [0.3.2] - 2025-10-30

### Added
- **GitHub Organization Selection**: Users can now select default organization for repository creation
  - During onboarding, fetches user's GitHub organizations
  - Allows selection of personal account or any organization
  - Saves default choice for future project creation
  - Repositories are created in the selected organization automatically

- **GitHub Token Scope Validation**: Added comprehensive validation for GitHub token permissions
  - Tests token scopes during onboarding and configuration
  - Warns users if "repo" scope is missing
  - Provides clear instructions on how to add required scopes

### Fixed
- **Better Error Messages**: Improved error handling for GitHub API permission errors
  - Repository creation failures now show actionable guidance
  - Clear instructions on fixing token permissions
  - Links to GitHub token documentation
  - Organization-specific error messages when permissions are missing

**Impact**: Users with organization tokens can now properly configure Dovetail to create repositories in their organizations instead of personal accounts. Token validation prevents permission errors before they happen, with clear guidance on fixing issues.

## [0.3.1] - 2025-10-30

### Fixed
- **Onboarding UX improvement**: Added clear instructions to checkbox question in skill assessment
  - Technologies selection now shows "(Use space to select, enter to confirm)"
  - Prevents confusion about how to select multiple technologies

**Impact**: Users can now clearly understand how to interact with the multi-select technology question.

## [0.3.0] - 2025-10-30

### Added
- **🎉 Interactive Onboarding Wizard (`dovetail onboard`)**
  - **Skill Assessment Quiz**: 5 questions to understand user's experience level
    - Overall development experience (beginner to expert)
    - Technology familiarity (React, Node.js, PostgreSQL, TypeScript, etc.)
    - Project management tool experience
    - Deployment/hosting experience
    - Preferred learning style
    - Generates skill score (0-12) saved for future reference
  - **API Token Configuration with Live Testing**
    - GitHub: Tests connection, displays username
    - Linear: Tests connection, displays user name
    - Supabase: Tests connection, shows organization count
    - Fly.io: Checks flyctl installation, configures token
    - Real-time connection validation with spinners
  - **Project Path Selection**
    - Create new project from scratch
    - Work with existing GitHub repository
    - Work with current folder (if already in git repo)
  - **Beautiful TUI Design**
    - Box-drawing characters for header
    - Color-coded sections (cyan for headers, green for success, yellow for warnings)
    - Progress indicators with ora spinners
    - Clear visual hierarchy and spacing
  - **Persistent State Management**
    - User profile saved to `~/.dovetail/state.json`
    - Skill score and preferences accessible by Claude
    - Onboarding completion tracking

### Changed
- **Updated recommended first-time flow**: Install → `dovetail onboard` → `dovetail init`
- README updated with onboarding-first approach
- Help menu now shows onboard command first

**Impact**: New users now have a guided, personalized setup experience that takes 3-5 minutes and tests all connections.

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
