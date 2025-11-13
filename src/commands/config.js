import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { readConfig, writeConfig, updateConfig } from '../utils/state.js';
import { logger } from '../utils/logger.js';
import { checkAuth as checkGhAuth, getCurrentUser as getGhUser } from '../cli/gh.js';
import { checkAuth as checkLinearisAuth } from '../cli/linearis.js';
import { checkAuth as checkSupabaseAuth } from '../cli/supabase.js';
import { checkAuth as checkFlyAuth } from '../cli/flyctl.js';

/**
 * Check if a CLI is installed
 */
async function isCLIInstalled(command) {
  try {
    await execa('which', [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check which CLIs are installed
 */
async function checkCLIsInstalled() {
  return {
    gh: await isCLIInstalled('gh'),
    linearis: await isCLIInstalled('linearis'),
    supabase: await isCLIInstalled('supabase'),
    flyctl: await isCLIInstalled('flyctl'),
  };
}

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
 * Display CLI installation status
 */
function displayInstallationStatus(installed) {
  console.log(chalk.bold('CLI Installation Status:\n'));

  const ghStatus = installed.gh
    ? chalk.green('✓ Installed')
    : chalk.red('✗ Not installed');
  console.log(chalk.bold('GitHub CLI (gh):'), ghStatus);

  const linearisStatus = installed.linearis
    ? chalk.green('✓ Installed')
    : chalk.red('✗ Not installed');
  console.log(chalk.bold('Linearis CLI:'), linearisStatus);

  const supabaseStatus = installed.supabase
    ? chalk.green('✓ Installed')
    : chalk.red('✗ Not installed');
  console.log(chalk.bold('Supabase CLI:'), supabaseStatus);

  const flyctlStatus = installed.flyctl
    ? chalk.green('✓ Installed')
    : chalk.red('✗ Not installed');
  console.log(chalk.bold('Fly.io CLI (flyctl):'), flyctlStatus);

  console.log();
}

/**
 * Display authentication status
 */
function displayAuthStatus(status, installed) {
  console.log(chalk.bold('CLI Authentication Status:\n'));

  if (installed.gh) {
    const ghStatus = status.gh.authenticated
      ? chalk.green(`✓ Authenticated${status.gh.user ? ` as ${status.gh.user}` : ''}`)
      : chalk.red('✗ Not authenticated');
    console.log(chalk.bold('GitHub (gh):'), ghStatus);
    if (!status.gh.authenticated) {
      console.log(chalk.dim('  Run: gh auth login'));
    }
  } else {
    console.log(chalk.bold('GitHub (gh):'), chalk.gray('Not installed'));
  }

  if (installed.linearis) {
    const linearStatus = status.linearis.authenticated
      ? chalk.green('✓ Authenticated')
      : chalk.red('✗ Not authenticated');
    console.log(chalk.bold('Linear (linearis):'), linearStatus);
    if (!status.linearis.authenticated) {
      console.log(chalk.dim('  Use config wizard to set API key'));
    }
  } else {
    console.log(chalk.bold('Linear (linearis):'), chalk.gray('Not installed'));
  }

  if (installed.supabase) {
    const supabaseStatus = status.supabase.authenticated
      ? chalk.green('✓ Authenticated')
      : chalk.red('✗ Not authenticated');
    console.log(chalk.bold('Supabase:'), supabaseStatus);
    if (!status.supabase.authenticated) {
      console.log(chalk.dim('  Run: supabase login'));
    }
  } else {
    console.log(chalk.bold('Supabase:'), chalk.gray('Not installed'));
  }

  if (installed.flyctl) {
    const flyStatus = status.flyctl.authenticated
      ? chalk.green('✓ Authenticated')
      : chalk.red('✗ Not authenticated');
    console.log(chalk.bold('Fly.io (flyctl):'), flyStatus);
    if (!status.flyctl.authenticated) {
      console.log(chalk.dim('  Run: flyctl auth login'));
    }
  } else {
    console.log(chalk.bold('Fly.io (flyctl):'), chalk.gray('Not installed'));
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

  if (config.linearTeamKey) {
    console.log(chalk.bold('Linear Team Key:'), config.linearTeamKey);
  } else {
    console.log(chalk.bold('Linear Team Key:'), chalk.dim('Not set'));
  }

  if (config.supabaseDefaultOrg) {
    console.log(chalk.bold('Supabase Default Org:'), config.supabaseDefaultOrg);
  } else {
    console.log(chalk.bold('Supabase Default Org:'), chalk.dim('Not set'));
  }

  console.log();
}

/**
 * Install linearis CLI via npm
 */
async function installLinearis() {
  const spinner = ora('Installing linearis via npm...').start();
  try {
    await execa('npm', ['install', '-g', 'linearis'], { stdio: 'inherit' });
    spinner.succeed('Linearis installed successfully!');
    return true;
  } catch (error) {
    spinner.fail('Failed to install linearis');
    logger.error(error.message);
    return false;
  }
}

export async function configCommand(options = {}) {
  console.log(chalk.bold('\n🔧 Dovetail Configuration\n'));

  const spinner = ora('Checking installation status...').start();
  const installed = await checkCLIsInstalled();
  const authStatus = await checkAllAuth();
  spinner.stop();

  const currentConfig = await readConfig();

  if (options.show) {
    // Just show and exit
    displayInstallationStatus(installed);
    displayAuthStatus(authStatus, installed);
    displayPreferences(currentConfig);
    return;
  }

  // Show current status
  displayInstallationStatus(installed);
  displayAuthStatus(authStatus, installed);
  displayPreferences(currentConfig);

  // Build menu choices based on installation and auth status
  const menuChoices = [];

  // Add installation options for missing CLIs
  if (!installed.linearis) {
    menuChoices.push({ name: '📦 Install Linearis CLI', value: 'install-linearis' });
  }
  if (!installed.gh) {
    menuChoices.push({ name: '📦 Install GitHub CLI (gh)', value: 'install-gh' });
  }
  if (!installed.supabase) {
    menuChoices.push({ name: '📦 Install Supabase CLI', value: 'install-supabase' });
  }
  if (!installed.flyctl) {
    menuChoices.push({ name: '📦 Install Fly.io CLI (flyctl)', value: 'install-flyctl' });
  }

  // Add Linear API key setup if linearis is installed but not authenticated
  if (installed.linearis && !authStatus.linearis.authenticated) {
    menuChoices.push({ name: '🔑 Set Linear API key', value: 'linear-api-key' });
  }

  // Add Linear team key setup (always available if linearis is installed and authenticated)
  if (installed.linearis && authStatus.linearis.authenticated) {
    menuChoices.push({ name: '🏢 Set Linear team key', value: 'linear-team-key' });
  }

  menuChoices.push(
    { name: 'Set GitHub default organization', value: 'github-org' },
    { name: 'Set Supabase default organization', value: 'supabase-org' },
    { name: 'Show installation help', value: 'install-help' },
    { name: 'Clear all preferences', value: 'clear' },
    { name: 'Exit', value: 'exit' }
  );

  // Interactive menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: menuChoices,
    },
  ]);

  if (action === 'exit') {
    console.log();
    return;
  }

  if (action === 'install-linearis') {
    const success = await installLinearis();
    if (success) {
      console.log();
      console.log(chalk.green('✓ Linearis is now installed!'));
      console.log(chalk.dim('Run'), chalk.cyan('dovetail config'), chalk.dim('again to set your Linear API key.'));
    }
    console.log();
    return;
  }

  if (action === 'install-gh') {
    console.log(chalk.bold('\n📦 GitHub CLI Installation\n'));
    console.log('Choose your installation method:\n');
    console.log(chalk.cyan('macOS:'));
    console.log('  brew install gh\n');
    console.log(chalk.cyan('Windows:'));
    console.log('  winget install --id GitHub.cli\n');
    console.log(chalk.cyan('Linux (Debian/Ubuntu):'));
    console.log('  sudo apt install gh\n');
    console.log(chalk.cyan('Or download from:'), 'https://cli.github.com/\n');
    console.log(chalk.dim('After installation, run'), chalk.cyan('dovetail config'), chalk.dim('again.'));
    console.log();
    return;
  }

  if (action === 'install-supabase') {
    console.log(chalk.bold('\n📦 Supabase CLI Installation\n'));
    console.log('Choose your installation method:\n');
    console.log(chalk.cyan('macOS:'));
    console.log('  brew install supabase/tap/supabase\n');
    console.log(chalk.cyan('Windows:'));
    console.log('  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git');
    console.log('  scoop install supabase\n');
    console.log(chalk.cyan('Linux:'));
    console.log('  See: https://supabase.com/docs/guides/cli/getting-started\n');
    console.log(chalk.dim('After installation, run'), chalk.cyan('dovetail config'), chalk.dim('again.'));
    console.log();
    return;
  }

  if (action === 'install-flyctl') {
    console.log(chalk.bold('\n📦 Fly.io CLI Installation\n'));
    console.log('Choose your installation method:\n');
    console.log(chalk.cyan('macOS/Linux:'));
    console.log('  curl -L https://fly.io/install.sh | sh\n');
    console.log(chalk.cyan('Windows:'));
    console.log('  powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"\n');
    console.log(chalk.cyan('Or visit:'), 'https://fly.io/docs/flyctl/install/\n');
    console.log(chalk.dim('After installation, run'), chalk.cyan('dovetail config'), chalk.dim('again.'));
    console.log();
    return;
  }

  if (action === 'linear-api-key') {
    console.log(chalk.bold('\n🔑 Linear API Key Setup\n'));
    console.log('Get your API key from:', chalk.cyan('https://linear.app/settings/api'));
    console.log();

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Linear API key:',
        mask: '*',
        validate: input => {
          if (!input || input.length === 0) {
            return 'API key is required';
          }
          if (input.length < 20) {
            return 'API key seems too short';
          }
          return true;
        },
      },
    ]);

    // Save to ~/.linear_api_token (linearis expects this exact file)
    const { homedir } = await import('os');
    const { writeFile } = await import('fs/promises');
    const { join } = await import('path');

    const linearTokenPath = join(homedir(), '.linear_api_token');

    try {
      // Save just the token (not JSON) to ~/.linear_api_token
      await writeFile(linearTokenPath, apiKey);
      logger.success('API key saved to ~/.linear_api_token');

      // Test authentication
      const spinner = ora('Testing authentication...').start();
      try {
        const testAuth = await checkLinearisAuth();
        if (testAuth.authenticated) {
          spinner.succeed('Authentication successful!');
          console.log();
          console.log(chalk.green('✓ You can now use Linear commands with dovetail'));
        } else {
          spinner.fail('Authentication failed');
          logger.error('The API key might be invalid. Please check and try again.');
        }
      } catch (error) {
        spinner.fail('Authentication test failed');
        logger.error(error.message);
      }
    } catch (error) {
      logger.error(`Failed to save API key: ${error.message}`);
    }

    console.log();
    return;
  }

  if (action === 'linear-team-key') {
    console.log(chalk.bold('\n🏢 Linear Team Key Setup\n'));
    console.log('Your team key is the short code in your Linear URL:');
    console.log(chalk.cyan('linear.app/[workspace]/team/[TEAM-KEY]'));
    console.log();
    console.log('Common examples: ENG, PROD, DESIGN, OPS');
    console.log();

    const { teamKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'teamKey',
        message: 'Enter your Linear team key:',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Team key is required';
          }
          if (!/^[A-Z0-9-]+$/i.test(input)) {
            return 'Team key should only contain letters, numbers, and hyphens';
          }
          return true;
        },
      },
    ]);

    try {
      await updateConfig({ linearTeamKey: teamKey.trim() });
      logger.success(`Linear team key set to: ${teamKey}`);
      console.log();
      console.log(chalk.green('✓ This team key will be used by default in dovetail commands'));
    } catch (error) {
      logger.error(`Failed to save team key: ${error.message}`);
    }

    console.log();
    return;
  }

  if (action === 'install-help') {
    console.log(chalk.bold('\n📚 CLI Installation Guide:\n'));

    console.log(chalk.cyan('GitHub CLI (gh):'));
    console.log('  macOS:   brew install gh');
    console.log('  Windows: winget install --id GitHub.cli');
    console.log('  Linux:   sudo apt install gh');
    console.log('  Docs:    https://cli.github.com/\n');

    console.log(chalk.cyan('Linearis (Linear CLI):'));
    console.log('  All platforms: npm install -g linearis');
    console.log('  Docs: https://github.com/czottmann/linearis\n');

    console.log(chalk.cyan('Supabase CLI:'));
    console.log('  macOS:   brew install supabase/tap/supabase');
    console.log('  Windows: scoop install supabase');
    console.log('  Linux:   See https://supabase.com/docs/guides/cli\n');

    console.log(chalk.cyan('Fly.io CLI (flyctl):'));
    console.log('  macOS/Linux: curl -L https://fly.io/install.sh | sh');
    console.log('  Windows: powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"');
    console.log('  Docs: https://fly.io/docs/flyctl/install/\n');

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
    if (!installed.gh) {
      logger.error('Please install GitHub CLI first.');
      console.log();
      return;
    }

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
    if (!installed.supabase) {
      logger.error('Please install Supabase CLI first.');
      console.log();
      return;
    }

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
