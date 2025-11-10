import { execa } from 'execa';
import { getConfig } from '../utils/config.js';

/**
 * Check if flyctl is installed
 */
export async function isFlyctlInstalled() {
  try {
    await execa('flyctl', ['version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get flyctl environment with authentication token
 * If no token is configured, returns unmodified env to let flyctl use its own session
 */
async function getFlyEnv() {
  const token = await getConfig('flyToken', 'FLY_API_TOKEN');

  // If no token configured, let flyctl use its own session (from flyctl auth login)
  if (!token) {
    return process.env;
  }

  // If token is configured, pass it to flyctl
  return {
    ...process.env,
    FLY_API_TOKEN: token,
  };
}

/**
 * Create a new Fly.io app
 */
export async function createApp(appName, options = {}) {
  const env = await getFlyEnv();

  const args = ['apps', 'create', appName];

  if (options.org) {
    args.push('--org', options.org);
  }

  // Note: --region flag is not supported in 'apps create'
  // Region is specified during deployment instead

  const { stdout } = await execa('flyctl', args, { env });
  return stdout;
}

/**
 * Deploy application
 */
export async function deploy(appName, options = {}) {
  const env = await getFlyEnv();

  const args = ['deploy'];

  if (appName) {
    args.push('--app', appName);
  }

  if (options.image) {
    args.push('--image', options.image);
  }

  const { stdout } = await execa('flyctl', args, {
    env,
    stdio: 'inherit',
  });

  return stdout;
}

/**
 * Get app status
 */
export async function getAppStatus(appName) {
  const env = await getFlyEnv();

  const { stdout } = await execa('flyctl', ['status', '--app', appName, '--json'], { env });
  return JSON.parse(stdout);
}

/**
 * Get app info
 */
export async function getAppInfo(appName) {
  const env = await getFlyEnv();

  const { stdout } = await execa('flyctl', ['info', '--app', appName, '--json'], { env });
  return JSON.parse(stdout);
}

/**
 * Set app secrets
 */
export async function setSecrets(appName, secrets) {
  const env = await getFlyEnv();

  const secretArgs = Object.entries(secrets).map(([key, value]) => `${key}=${value}`);

  await execa('flyctl', ['secrets', 'set', ...secretArgs, '--app', appName], { env });
}

/**
 * Scale app
 */
export async function scale(appName, options = {}) {
  const env = await getFlyEnv();

  const args = ['scale'];

  if (options.count) {
    args.push('count', options.count.toString());
  }

  if (options.memory) {
    args.push('memory', options.memory);
  }

  args.push('--app', appName);

  await execa('flyctl', args, { env });
}

/**
 * List releases
 */
export async function listReleases(appName) {
  const env = await getFlyEnv();

  const { stdout } = await execa('flyctl', ['releases', '--app', appName, '--json'], { env });
  return JSON.parse(stdout);
}

/**
 * Rollback to previous release
 */
export async function rollback(appName, version = null) {
  const env = await getFlyEnv();

  const args = ['releases', 'rollback'];

  if (version) {
    args.push(version);
  }

  args.push('--app', appName);

  await execa('flyctl', args, { env });
}

/**
 * Get app logs
 */
export async function getLogs(appName, options = {}) {
  const env = await getFlyEnv();

  const args = ['logs', '--app', appName];

  if (options.lines) {
    args.push('--lines', options.lines.toString());
  }

  const { stdout } = await execa('flyctl', args, { env });
  return stdout;
}

/**
 * Check app health
 */
export async function checkHealth(appName) {
  try {
    const info = await getAppInfo(appName);
    const status = await getAppStatus(appName);

    return {
      healthy: status.Status === 'running',
      url: `https://${info.Hostname}`,
      status: status.Status,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
}

/**
 * Format app URL
 */
export function formatAppUrl(appName) {
  return `https://${appName}.fly.dev`;
}

/**
 * Launch new app (interactive)
 */
export async function launch(options = {}) {
  const env = await getFlyEnv();

  const args = ['launch', '--now', '--no-deploy'];

  if (options.name) {
    args.push('--name', options.name);
  }

  if (options.region) {
    args.push('--region', options.region);
  }

  await execa('flyctl', args, { env, stdio: 'inherit' });
}

/**
 * Delete/destroy an app
 */
export async function deleteApp(appName) {
  const env = await getFlyEnv();

  await execa('flyctl', ['apps', 'destroy', appName, '--yes'], { env });
}
