# Publishing Dovetail to npm

## Pre-Publishing Checklist

✅ Package configuration complete
✅ Package name `@lumberjack-so/dovetail` (scoped package)
✅ Package size: 28.1 kB (compressed), 107.9 kB (unpacked)
✅ All source files included (30 files)
✅ .npmignore configured to exclude development files
✅ README.md, LICENSE included
✅ Repository metadata added

## Publishing Scoped Package

This package is published under the `@lumberjack-so` organization scope.

## Publishing Steps

### 1. Create npm Account (if you don't have one)

```bash
npm adduser
```

Or sign up at: https://www.npmjs.com/signup

### 2. Login to npm

```bash
npm login
```

Enter your:
- Username
- Password
- Email
- One-time password (if 2FA enabled)

### 3. Verify Login

```bash
npm whoami
```

### 4. Test Package Locally (Optional)

```bash
# Create a tarball to inspect
npm pack

# This creates: dovetail-cli-0.1.0.tgz
# You can extract and inspect it:
tar -xzf dovetail-cli-0.1.0.tgz
ls -la package/
```

### 5. Publish to npm (Scoped Package)

**Important**: Scoped packages are private by default. Use `--access public` to make it public:

```bash
npm publish --access public
```

Or use the npm script:

```bash
npm run publish:npm
```

**That's it!** Your package will be available at:
- **Package page**: https://www.npmjs.com/package/@lumberjack-so/dovetail
- **Install command**: `npm install -g @lumberjack-so/dovetail`
- **Binary command**: `dovetail` (same as before!)

### 6. Verify Publication

```bash
# Check package info
npm view @lumberjack-so/dovetail

# Install globally to test
npm install -g @lumberjack-so/dovetail

# Test the CLI (binary is just 'dovetail')
dovetail --version
dovetail --help
```

## Publishing Updates

When you make changes and want to publish a new version:

### 1. Update Version

```bash
# Patch version (0.1.0 -> 0.1.1)
npm version patch

# Minor version (0.1.0 -> 0.2.0)
npm version minor

# Major version (0.1.0 -> 1.0.0)
npm version major
```

This automatically:
- Updates package.json version
- Creates a git commit
- Creates a git tag

### 2. Publish Update

```bash
npm publish --access public
```

Or use the script:

```bash
npm run publish:npm
```

## Unpublishing (Use with Caution)

You can unpublish within 72 hours of publishing:

```bash
# Unpublish specific version
npm unpublish @lumberjack-so/dovetail@0.1.0

# Unpublish entire package (not recommended)
npm unpublish @lumberjack-so/dovetail --force
```

**Note**: Unpublishing can break other packages that depend on yours. Only do this if absolutely necessary.

## npm Badges for README

Once published, you can add these badges to your README.md:

```markdown
[![npm version](https://badge.fury.io/js/%40lumberjack-so%2Fdovetail.svg)](https://www.npmjs.com/package/@lumberjack-so/dovetail)
[![npm downloads](https://img.shields.io/npm/dm/@lumberjack-so/dovetail.svg)](https://www.npmjs.com/package/@lumberjack-so/dovetail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

## Automation with GitHub Actions

To automatically publish on git tags, create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Then set `NPM_TOKEN` in your GitHub repository secrets.

## Troubleshooting

### "Package name already exists"
- This shouldn't happen with scoped packages under your organization
- Make sure you have access to the `@lumberjack-so` organization on npm

### "You must verify your email"
- Check your email and click the verification link from npm

### "You do not have permission to publish"
- Make sure you're logged in: `npm whoami`
- Verify you're a member of the `@lumberjack-so` organization on npm
- Check organization settings allow publishing

### "Version already published"
- Update version number in package.json
- Or use `npm version patch/minor/major`

## Resources

- [npm Publishing Documentation](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [npm Version Management](https://docs.npmjs.com/cli/v9/commands/npm-version)
