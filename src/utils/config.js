import { readConfig, writeConfig } from './state.js';
import chalk from 'chalk';

/**
 * Validate required environment variables/config
 */
export async function validateConfig() {
  const config = await readConfig();
  const errors = [];

  if (!config.githubToken && !process.env.GITHUB_TOKEN) {
    errors.push('GitHub token not configured');
  }

  if (!config.linearApiKey && !process.env.LINEAR_API_KEY) {
    errors.push('Linear API key not configured');
  }

  if (!config.supabaseToken && !process.env.SUPABASE_ACCESS_TOKEN) {
    errors.push('Supabase access token not configured');
  }

  if (!config.flyToken && !process.env.FLY_API_TOKEN) {
    errors.push('Fly.io API token not configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration value with fallback to environment variable
 */
export async function getConfig(key, envVar = null) {
  const config = await readConfig();
  return config[key] || (envVar ? process.env[envVar] : null);
}

/**
 * Get all tokens
 */
export async function getTokens() {
  return {
    github: await getConfig('githubToken', 'GITHUB_TOKEN'),
    linear: await getConfig('linearApiKey', 'LINEAR_API_KEY'),
    supabase: await getConfig('supabaseToken', 'SUPABASE_ACCESS_TOKEN'),
    fly: await getConfig('flyToken', 'FLY_API_TOKEN'),
  };
}

/**
 * Set configuration value
 */
export async function setConfig(key, value) {
  const config = await readConfig();
  config[key] = value;
  await writeConfig(config);
}

/**
 * Display current configuration (with masked tokens)
 */
export function displayConfig(config) {
  console.log(chalk.bold('\nCurrent Configuration:\n'));

  const maskToken = (token) => {
    if (!token) return chalk.red('Not configured');
    return token.substring(0, 4) + '*'.repeat(20);
  };

  console.log(chalk.blue('GitHub Token:     '), maskToken(config.githubToken));
  console.log(chalk.blue('Linear API Key:   '), maskToken(config.linearApiKey));
  console.log(chalk.blue('Supabase Token:   '), maskToken(config.supabaseToken));
  console.log(chalk.blue('Fly.io Token:     '), maskToken(config.flyToken));
  console.log();
}

/**
 * Interactive configuration setup
 */
export async function setupConfig(inquirer) {
  console.log(chalk.bold('\n🔧 Dovetail Configuration\n'));
  console.log('You can configure API tokens here or use environment variables.\n');

  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'githubToken',
      message: 'GitHub Personal Access Token:',
      mask: '*',
    },
    {
      type: 'password',
      name: 'linearApiKey',
      message: 'Linear API Key:',
      mask: '*',
    },
    {
      type: 'password',
      name: 'supabaseToken',
      message: 'Supabase Access Token:',
      mask: '*',
    },
    {
      type: 'password',
      name: 'flyToken',
      message: 'Fly.io API Token:',
      mask: '*',
    },
  ]);

  await writeConfig(answers);
  console.log(chalk.green('\n✅ Configuration saved!\n'));
}
