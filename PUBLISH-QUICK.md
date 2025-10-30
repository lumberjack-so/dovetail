# Quick Reference: Publishing @lumberjack-so/dovetail

## Publishing to npm Registry

### Prerequisites
1. You must be logged into npm: `npm whoami`
2. You must be a member of the `@lumberjack-so` organization on npm
3. The organization must allow you to publish packages

### Publish Command

```bash
# Using npm publish directly
npm publish --access public

# Or using the npm script
npm run publish:npm
```

**⚠️ Important**: The `--access public` flag is required because scoped packages are private by default.

## What Users Will Install

```bash
# Global installation
npm install -g @lumberjack-so/dovetail

# Usage (binary command is just "dovetail")
dovetail --version
dovetail init "My Project"
```

## Package Information

- **Package name**: `@lumberjack-so/dovetail`
- **Organization**: `@lumberjack-so`
- **Binary command**: `dovetail`
- **npm page**: https://www.npmjs.com/package/@lumberjack-so/dovetail (after publishing)
- **Current version**: 0.1.0

## Quick Publishing Steps

1. **Login to npm**:
   ```bash
   npm login
   ```

2. **Verify you're logged in**:
   ```bash
   npm whoami
   ```

3. **Publish**:
   ```bash
   npm publish --access public
   ```

4. **Verify**:
   ```bash
   npm view @lumberjack-so/dovetail
   ```

That's it! 🚀

## Updating Versions

```bash
# For bug fixes (0.1.0 → 0.1.1)
npm version patch

# For new features (0.1.0 → 0.2.0)
npm version minor

# For breaking changes (0.1.0 → 1.0.0)
npm version major

# Then publish
npm run publish:npm
```

## Troubleshooting

If you get "You do not have permission to publish":
1. Make sure you're logged in: `npm whoami`
2. Check you're a member of `@lumberjack-so` organization
3. Go to https://www.npmjs.com/org/lumberjack-so to manage members

For more detailed information, see `PUBLISHING.md`.
