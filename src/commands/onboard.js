import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { checkAuth as checkGhAuth } from '../cli/gh.js';
import { checkAuth as checkLinearisAuth } from '../cli/linearis.js';
import { checkAuth as checkSupabaseAuth } from '../cli/supabase.js';
import { checkAuth as checkFlyctlAuth } from '../cli/flyctl.js';

/**
 * Check if a CLI is installed
 */
async function checkCLIInstalled(name, command) {
  try {
    await execa(command, ['--version'], { reject: false });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check CLI installation and authentication
 */
async function checkCLI(name, command, checkAuthFn, installInstructions) {
  const spinner = ora(`Checking ${name}...`).start();

  // Check installation
  const installed = await checkCLIInstalled(name, command);

  if (!installed) {
    spinner.fail(`${name} not installed`);
    return {
      name,
      installed: false,
      authenticated: false,
      installInstructions
    };
  }

  // Check authentication
  const authResult = await checkAuthFn();

  if (authResult.authenticated) {
    spinner.succeed(`${name} installed and authenticated`);
    return {
      name,
      installed: true,
      authenticated: true,
      info: authResult.email || authResult.info || null
    };
  } else {
    spinner.warn(`${name} installed but not authenticated`);
    return {
      name,
      installed: true,
      authenticated: false
    };
  }
}

/**
 * Onboard command - check CLI installations and guide setup
 */
export async function onboard(options = {}) {
  console.log(chalk.bold('\n🚀 Dovetail Onboarding\n'));
  console.log('Checking required CLI tools...\n');

  // Check all CLIs
  const results = {
    gh: await checkCLI(
      'GitHub CLI',
      'gh',
      checkGhAuth,
      {
        description: 'GitHub CLI for repository and PR management',
        install: [
          'macOS:   brew install gh',
          'Windows: winget install --id GitHub.cli',
          'Linux:   https://github.com/cli/cli/blob/trunk/docs/install_linux.md'
        ],
        auth: 'gh auth login'
      }
    ),
    linearis: await checkCLI(
      'Linearis',
      'linearis',
      checkLinearisAuth,
      {
        description: 'Linear CLI for issue management',
        install: [
          'npm install -g linearis'
        ],
        auth: [
          '1. Get API key: https://linear.app/settings/api',
          '2. export LINEAR_API_KEY=<your-key>',
          '3. Or create ~/.linearisrc.json with: { "apiKey": "<your-key>" }'
        ]
      }
    ),
    supabase: await checkCLI(
      'Supabase CLI',
      'supabase',
      checkSupabaseAuth,
      {
        description: 'Supabase CLI for database and backend',
        install: [
          'macOS:   brew install supabase/tap/supabase',
          'Windows: scoop install supabase',
          'Linux:   https://supabase.com/docs/guides/cli'
        ],
        auth: 'supabase login'
      }
    ),
    flyctl: await checkCLI(
      'Fly.io CLI',
      'flyctl',
      checkFlyctlAuth,
      {
        description: 'Fly.io CLI for deployment',
        install: [
          'macOS/Linux: curl -L https://fly.io/install.sh | sh',
          'Windows:     pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"'
        ],
        auth: 'flyctl auth login'
      }
    )
  };

  // Summary
  console.log('\n' + chalk.bold('Summary:') + '\n');

  const allReady = Object.values(results).every(r => r.installed && r.authenticated);

  if (allReady) {
    console.log(chalk.green('✅ All CLIs installed and authenticated!\n'));
    console.log(chalk.bold('Next steps:'));
    console.log(chalk.dim('  • Create a new project: ') + chalk.cyan('dovetail init "Project Name"'));
    console.log(chalk.dim('  • Adopt existing project: ') + chalk.cyan('dovetail adopt'));
    console.log();
    return;
  }

  // Show what needs to be done
  console.log(chalk.yellow('⚠️  Some CLIs need setup:\n'));

  Object.values(results).forEach(result => {
    if (!result.installed) {
      console.log(chalk.bold(`📦 Install ${result.name}:`));
      console.log(chalk.dim(`   ${result.installInstructions.description}`));
      console.log();
      result.installInstructions.install.forEach(cmd => {
        console.log(chalk.cyan(`   ${cmd}`));
      });
      console.log();
    } else if (!result.authenticated) {
      console.log(chalk.bold(`🔐 Authenticate ${result.name}:`));
      console.log();
      const authInstructions = Array.isArray(result.installInstructions.auth)
        ? result.installInstructions.auth
        : [result.installInstructions.auth];

      authInstructions.forEach(instruction => {
        console.log(chalk.cyan(`   ${instruction}`));
      });
      console.log();
    }
  });

  console.log(chalk.dim('After setup, run ') + chalk.cyan('dovetail onboard') + chalk.dim(' again to verify.\n'));

  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      ready: allReady,
      clis: results
    }, null, 2));
  }

  process.exit(allReady ? 0 : 1);
}

// Backwards compatibility
export const onboardCommand = onboard;
