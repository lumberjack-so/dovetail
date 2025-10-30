# Debugging: Package works in Cursor but not Terminal

## The Problem

The package `@lumberjack-so/dovetail` installs successfully in Cursor but fails with 404 in your macOS Terminal.

## Likely Causes

### 1. Different npm Registry Configuration

Check your npm registry settings in both environments:

**In Terminal:**
```bash
npm config get registry
```

**In Cursor's terminal:**
```bash
npm config get registry
```

Both should return: `https://registry.npmjs.org/`

If they're different, set the registry in your Terminal:
```bash
npm config set registry https://registry.npmjs.org/
```

### 2. Different Node/npm Versions

**Check versions in Terminal:**
```bash
node --version
npm --version
```

**Check in Cursor:**
```bash
node --version
npm --version
```

If they're significantly different, this could cause the issue.

### 3. Different npm Config Files

npm uses multiple config files with different precedence:

1. Per-project config (`.npmrc` in project)
2. Per-user config (`~/.npmrc`)
3. Global config (`/usr/local/etc/npmrc` or similar)
4. Built-in config

**Check your user config:**
```bash
cat ~/.npmrc
```

Look for any `registry=` lines that might be pointing to a private registry.

### 4. Corporate Proxy or VPN

Sometimes Terminal and GUI apps use different network settings.

**Check if you have proxy settings:**
```bash
npm config get proxy
npm config get https-proxy
```

## Quick Fix: Try Installing with Explicit Registry

**In your Terminal, try:**
```bash
npm install -g @lumberjack-so/dovetail --registry=https://registry.npmjs.org
```

## More Detailed Debugging

**See all npm config differences:**
```bash
# In Terminal:
npm config list

# Compare with Cursor's terminal
```

**Check for multiple npm installations:**
```bash
which npm
which node
```

## Workaround: Use Cursor for Now

Since it works in Cursor, you can use Cursor's terminal to install and run dovetail while we debug the Terminal issue.

## Let Me Know

Please run these commands and share the output:

```bash
# In your Terminal:
echo "=== NPM Config ==="
npm config get registry
echo ""
echo "=== Node/npm versions ==="
node --version
npm --version
echo ""
echo "=== npm location ==="
which npm
echo ""
echo "=== .npmrc contents ==="
cat ~/.npmrc 2>/dev/null || echo "No ~/.npmrc file"
```

This will help us understand why there's a difference between the two environments.
