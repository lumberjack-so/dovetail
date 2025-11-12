import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { readConfig, writeConfig } from '../utils/state.js';
import { logger } from '../utils/logger.js';
import { checkAuth as checkGhAuth, getCurrentUser as getGhUser } from '../cli/gh.js';
import { checkAuth as checkLinearisAuth } from '../cli/linearis.js';
import { checkAuth as checkSupabaseAuth } from '../cli/supabase.js';
import { checkAuth as checkFlyAuth } from '../cli/flyctl.js';

/**
 * Check authentication status for all CLIs
 */
async function checkAllAuth() {
  const status = {
    gh: { authenticated: false, user: null },
    linearis: { authenticated: false },
    supabase: { authenticated: false },
    flyctl: { authenticated: false },
  };

  try {
    await checkGhAuth();
    status.gh.authenticated = true;
    try {
      status.gh.user = await getGhUser();
    } catch {
      // User info not critical
    }
  } catch {
    status.gh.authenticated = false;
  }

  try {
    await checkLinearisAuth();
    status.linearis.authenticated = true;
  } catch {
    status.linearis.authenticated = false;
  }

  try {
    await checkSupabaseAuth();
    status.supabase.authenticated = true;
  } catch {
    status.supabase.authenticated = false;
  }

  try {
    await checkFlyAuth();
    status.flyctl.authenticated = true;
  } catch {
    status.flyctl.authenticated = false;
  }

  return status;
}

/**
 * Display authentication status
 */
function displayAuthStatus(status) {
  console.log(chalk.bold('CLI Authentication Status:\n'));

  const ghStatus = status.gh.authenticated
    ? chalk.green(`✓ Authenticated${status.gh.user ? ` as ${status.gh.user}` : ''}`)
    : chalk.red('✗ Not authenticated');
  console.log(chalk.bold('GitHub (gh):'), ghStatus);
  if (!status.gh.authenticated) {
    console.log(chalk.dim('  Run: gh auth login'));
  }

  const linearStatus = status.linearis.authenticated
    ? chalk.green('✓ Authenticated')
    : chalk.red('✗ Not authenticated');
  console.log(chalk.bold('Linear (linearis):'), linearStatus);
  if (!status.linearis.authenticated) {
    console.log(chalk.dim('  Set: LINEAR_API_KEY=<key> in ~/.zshrc or ~/.bashrc'));
    console.log(chalk.dim('  Or create: ~/.linearisrc.json with {"apiKey": "<key>"}'));
  }

  const supabaseStatus = status.supabase.authenticated
    ? chalk.green('✓ Authenticated')
    : chalk.red('✗ Not authenticated');
  console.log(chalk.bold('Supabase:'), supabaseStatus);
  if (!status.supabase.authenticated) {
    console.log(chalk.dim('  Run: supabase login'));
  }

  const flyStatus = status.flyctl.authenticated
    ? chalk.green('✓ Authenticated')
    : chalk.red('✗ Not authenticated');
  console.log(chalk.bold('Fly.io (flyctl):'), flyStatus);
  if (!status.flyctl.authenticated) {
    console.log(chalk.dim('  Run: flyctl auth login'));
  }

  console.log();
}

/**
 * Display Dovetail preferences
 */
function displayPreferences(config) {
  console.log(chalk.bold('Dovetail Preferences:\n'));

  if (config.githubDefaultOrg) {
    console.log(chalk.bold('GitHub Default Org:'), config.githubDefaultOrg);
  } else {
    console.log(chalk.bold('GitHub Default Org:'), chalk.dim('Personal account'));
  }

  if (config.supabaseDefaultOrg) {
    console.log(chalk.bold('Supabase Default Org:'), config.supabaseDefaultOrg);
  } else {
    console.log(chalk.bold('Supabase Default Org:'), chalk.dim('Not set'));
  }

  console.log();
}

export async function configCommand(options = {}) {
  console.log(chalk.bold('\n🔧 Dovetail Configuration\n'));

  const spinner = ora('Checking authentication status...').start();
  const authStatus = await checkAllAuth();
  spinner.stop();

  const currentConfig = await readConfig();

  if (options.show) {
    // Just show and exit
    displayAuthStatus(authStatus);
    displayPreferences(currentConfig);
    return;
  }

  // Show current status
  displayAuthStatus(authStatus);
  displayPreferences(currentConfig);

  // Interactive menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Set GitHub default organization', value: 'github-org' },
        { name: 'Set Supabase default organization', value: 'supabase-org' },
        { name: 'Show authentication help', value: 'auth-help' },
        { name: 'Clear all preferences', value: 'clear' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  if (action === 'exit') {
    console.log();
    return;
  }

  if (action === 'auth-help') {
    console.log(chalk.bold('\n📚 Authentication Setup:\n'));
    console.log(chalk.cyan('GitHub (gh):'));
    console.log('  Run: gh auth login');
    console.log('  Then follow the OAuth flow\n');

    console.log(chalk.cyan('Linear (linearis):'));
    console.log('  1. Get your API key from: https://linear.app/settings/api');
    console.log('  2. Set environment variable:');
    console.log('     export LINEAR_API_KEY=<key>');
    console.log('  3. Add to ~/.zshrc or ~/.bashrc to persist');
    console.log('  OR create ~/.linearisrc.json:');
    console.log('     {"apiKey": "<key>"}\n');

    console.log(chalk.cyan('Supabase:'));
    console.log('  Run: supabase login');
    console.log('  Then follow the OAuth flow\n');

    console.log(chalk.cyan('Fly.io (flyctl):'));
    console.log('  Run: flyctl auth login');
    console.log('  Then follow the OAuth flow\n');

    return;
  }

  if (action === 'clear') {
    const { confirmClear } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmClear',
        message: chalk.yellow('Are you sure you want to clear all preferences?'),
        default: false,
      },
    ]);

    if (confirmClear) {
      await writeConfig({});
      logger.success('All preferences cleared!');
    }
    console.log();
    return;
  }

  if (action === 'github-org') {
    if (!authStatus.gh.authenticated) {
      logger.error('Please authenticate with GitHub first: gh auth login');
      console.log();
      return;
    }

    const { useOrg } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useOrg',
        message: 'Use an organization instead of personal account?',
        default: !!currentConfig.githubDefaultOrg,
      },
    ]);

    if (useOrg) {
      const { orgName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'orgName',
          message: 'Organization name:',
          default: currentConfig.githubDefaultOrg,
          validate: input => input.length > 0 || 'Organization name is required',
        },
      ]);

      const updatedConfig = { ...currentConfig, githubDefaultOrg: orgName };
      await writeConfig(updatedConfig);
      logger.success(`Default GitHub organization set to: ${orgName}`);
    } else {
      const updatedConfig = { ...currentConfig };
      delete updatedConfig.githubDefaultOrg;
      await writeConfig(updatedConfig);
      logger.success('Repositories will be created in your personal account');
    }
    console.log();
    return;
  }

  if (action === 'supabase-org') {
    if (!authStatus.supabase.authenticated) {
      logger.error('Please authenticate with Supabase first: supabase login');
      console.log();
      return;
    }

    const { orgId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'orgId',
        message: 'Supabase organization ID:',
        default: currentConfig.supabaseDefaultOrg,
        validate: input => input.length > 0 || 'Organization ID is required',
      },
    ]);

    const updatedConfig = { ...currentConfig, supabaseDefaultOrg: orgId };
    await writeConfig(updatedConfig);
    logger.success(`Default Supabase organization set to: ${orgId}`);
    console.log();
    return;
  }
}
