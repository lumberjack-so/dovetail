# Publishing Dovetail to npm

## Pre-Publishing Checklist

✅ Package configuration complete
✅ Package name `dovetail-cli` is available on npm
✅ Package size: 28.1 kB (compressed), 107.9 kB (unpacked)
✅ All source files included (30 files)
✅ .npmignore configured to exclude development files
✅ README.md, LICENSE included
✅ Repository metadata added

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

### 5. Publish to npm

```bash
npm publish
```

**That's it!** Your package will be available at:
- **Package page**: https://www.npmjs.com/package/dovetail-cli
- **Install command**: `npm install -g dovetail-cli`

### 6. Verify Publication

```bash
# Check package info
npm view dovetail-cli

# Install globally to test
npm install -g dovetail-cli

# Test the CLI
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
npm publish
```

## Publishing Scoped Package (Alternative)

If you want to publish under a scope (e.g., `@yourusername/dovetail-cli`):

1. Update package name in `package.json`:
   ```json
   "name": "@yourusername/dovetail-cli"
   ```

2. Publish with public access:
   ```bash
   npm publish --access public
   ```

## Unpublishing (Use with Caution)

You can unpublish within 72 hours of publishing:

```bash
# Unpublish specific version
npm unpublish dovetail-cli@0.1.0

# Unpublish entire package (not recommended)
npm unpublish dovetail-cli --force
```

**Note**: Unpublishing can break other packages that depend on yours. Only do this if absolutely necessary.

## npm Badges for README

Once published, you can add these badges to your README.md:

```markdown
[![npm version](https://badge.fury.io/js/dovetail-cli.svg)](https://www.npmjs.com/package/dovetail-cli)
[![npm downloads](https://img.shields.io/npm/dm/dovetail-cli.svg)](https://www.npmjs.com/package/dovetail-cli)
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
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Then set `NPM_TOKEN` in your GitHub repository secrets.

## Troubleshooting

### "Package name already exists"
- Choose a different name
- Or use a scoped package: `@username/dovetail-cli`

### "You must verify your email"
- Check your email and click the verification link from npm

### "You do not have permission to publish"
- Make sure you're logged in: `npm whoami`
- Check package name doesn't belong to someone else

### "Version already published"
- Update version number in package.json
- Or use `npm version patch/minor/major`

## Resources

- [npm Publishing Documentation](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [npm Version Management](https://docs.npmjs.com/cli/v9/commands/npm-version)
