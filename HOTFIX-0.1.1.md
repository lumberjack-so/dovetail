# Hotfix 0.1.1 - Critical Bug Fix

## The Bug

Version 0.1.0 had a critical bug that prevented the CLI from running at all:

```
SyntaxError: Identifier 'getLatestTag' has already been declared
```

This was caused by importing `getLatestTag` from git.js AND declaring it locally in deploy.js.

## The Fix

Removed the duplicate import. The function is now only declared locally in deploy.js.

## Publishing the Fix

To publish this hotfix:

```bash
# The version has already been bumped to 0.1.1
# Just publish:
npm publish --access public
```

## For Users

If you already installed 0.1.0, update to 0.1.1:

```bash
npm install -g @lumberjack-so/dovetail@latest
```

Or:

```bash
npm update -g @lumberjack-so/dovetail
```

## Verification

After publishing, verify it works:

```bash
dovetail --version
# Should show: 0.1.1

dovetail --help
# Should show the help menu without errors
```
