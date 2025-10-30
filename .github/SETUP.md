# GitHub Actions Setup for Auto-Publishing

This repository is configured to automatically publish to npm when you push changes that include a version bump.

## Prerequisites

You need to set up an npm access token as a GitHub secret.

## Setup Instructions

### 1. Create an npm Access Token

1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click your profile icon → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** (recommended for CI/CD)
5. Copy the token (you won't see it again!)

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/lumberjack-so/dovetail`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **Add secret**

## How It Works

The workflow (`.github/workflows/publish.yml`) automatically:

1. **Triggers on push** to `main` or any `claude/**` branch
2. **Checks if version changed** by comparing `package.json` version with previous commit
3. **Publishes to npm** if version changed (using `npm publish --access public`)
4. **Creates a git tag** (e.g., `v0.3.5`) for the release
5. **Skips publishing** if version hasn't changed

## Publishing a New Version

Simply update the version in `package.json` and push:

```bash
# Edit package.json to bump version
npm version patch  # or minor, or major

# Commit and push
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.3.6"
git push

# GitHub Actions will automatically publish to npm!
```

## Monitoring

- Check the **Actions** tab in GitHub to see workflow runs
- You'll see a ✅ or ❌ for each publish attempt
- Click on a workflow run to see detailed logs

## Manual Publishing (if needed)

If you need to publish manually:

```bash
npm login
npm publish --access public
```

## Troubleshooting

### "npm ERR! code ENEEDAUTH"
- Your NPM_TOKEN secret is missing or invalid
- Regenerate token on npmjs.com and update GitHub secret

### "npm ERR! code E403"
- Token doesn't have publish permissions
- Make sure you created an **Automation** token, not a **Read-only** token

### Workflow not running
- Check if you pushed to `main` or a `claude/**` branch
- Verify workflow file exists at `.github/workflows/publish.yml`
- Check GitHub Actions permissions in repo Settings → Actions → General
