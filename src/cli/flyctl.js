import { execa } from 'execa';
import chalk from 'chalk';

/**
 * Execute a Fly.io CLI command
 * @param {Array<string>} args - Command arguments
 * @param {Object} options - Options (stdin, cwd, etc.)
 * @returns {Promise<Object>} - { stdout, stderr, success }
 */
export async function execFlyctl(args, options = {}) {
  try {
    const { stdout, stderr, exitCode } = await execa('flyctl', args, {
      reject: false,
      ...options
    });

    if (exitCode !== 0) {
      // Check for common errors
      if (stderr.includes('not logged in') || stderr.includes('authentication')) {
        throw new Error(
          'Fly.io CLI not authenticated.\n\n' +
          'Run: flyctl auth login'
        );
      }

      if (stderr.includes('not found') || stderr.includes('Could not find App')) {
        throw new Error(`Fly.io app not found.`);
      }

      if (stderr.includes('permission') || stderr.includes('unauthorized')) {
        throw new Error(
          `Fly.io permission denied.\n\n` +
          `Check that you have access to the organization/app.`
        );
      }

      throw new Error(`Fly.io CLI command failed:\n${stderr || stdout}`);
    }

    return { stdout, stderr, success: true };
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('command not found')) {
      throw new Error(
        'Fly.io CLI not installed.\n\n' +
        'Install it from: https://fly.io/docs/hands-on/install-flyctl/\n' +
        '  macOS/Linux: curl -L https://fly.io/install.sh | sh\n' +
        '  Windows:     pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"'
      );
    }
    throw error;
  }
}

/**
 * Check authentication status
 */
export async function checkAuth() {
  try {
    const { stdout } = await execFlyctl(['auth', 'whoami']);
    return { authenticated: true, email: stdout.trim() };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}

/**
 * Create a new app
 */
export async function createApp(name, options = {}) {
  const args = ['apps', 'create', name, '--json'];

  if (options.org) {
    args.push('--org', options.org);
  }

  if (options.region) {
    args.push('--region', options.region);
  }

  const { stdout } = await execFlyctl(args);
  return JSON.parse(stdout);
}

/**
 * List apps
 */
export async function listApps(options = {}) {
  const args = ['apps', 'list', '--json'];

  if (options.org) {
    args.push('--org', options.org);
  }

  const { stdout } = await execFlyctl(args);
  return JSON.parse(stdout);
}

/**
 * Get app details
 */
export async function getApp(appName) {
  const { stdout } = await execFlyctl(['apps', 'show', appName, '--json']);
  return JSON.parse(stdout);
}

/**
 * Deploy an app
 */
export async function deploy(options = {}) {
  const args = ['deploy'];

  if (options.config) {
    args.push('--config', options.config);
  }

  if (options.app) {
    args.push('--app', options.app);
  }

  if (options.remote) {
    args.push('--remote-only');
  }

  await execFlyctl(args, options);
}

/**
 * Set a secret
 */
export async function setSecret(appName, secrets) {
  const secretPairs = Object.entries(secrets).map(([key, value]) => `${key}=${value}`);

  await execFlyctl([
    'secrets',
    'set',
    ...secretPairs,
    '--app', appName
  ]);
}

/**
 * Get app logs
 */
export async function getLogs(appName, options = {}) {
  const args = ['logs', '--app', appName];

  if (options.limit) {
    args.push('--limit', String(options.limit));
  }

  const { stdout } = await execFlyctl(args);
  return stdout;
}

/**
 * List organizations
 */
export async function listOrgs() {
  const { stdout } = await execFlyctl(['orgs', 'list', '--json']);
  return JSON.parse(stdout);
}
