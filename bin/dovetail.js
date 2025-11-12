#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Import commands
import { onboardCommand } from '../src/commands/onboard.js';
import { initCommand } from '../src/commands/init.js';
import { adoptCommand } from '../src/commands/adopt.js';
import { startCommand } from '../src/commands/start.js';
import { statusCommand } from '../src/commands/status.js';
// import { commitCommand } from '../src/commands/commit.js'; // TODO 2.0: Migrate to CLI wrappers
import { testCommand } from '../src/commands/test.js';
import { readyCommand } from '../src/commands/ready.js';
// import { mergeCommand } from '../src/commands/merge.js'; // TODO 2.0: Migrate to CLI wrappers
// import { deployCommand } from '../src/commands/deploy.js'; // TODO 2.0: Migrate to CLI wrappers
import { syncCommand } from '../src/commands/sync.js';
// import { cleanCommand } from '../src/commands/clean.js'; // TODO 2.0: Migrate to CLI wrappers
// import { configCommand } from '../src/commands/config.js'; // TODO 2.0: Migrate to CLI wrappers
import { migrateCommand } from '../src/commands/migrate.js';
// import { rollbackCommand } from '../src/commands/rollback.js'; // TODO 2.0: Migrate to CLI wrappers
// import { purgeCommand } from '../src/commands/purge.js'; // TODO 2.0: Migrate to CLI wrappers
// import { linearSearchCommand } from '../src/commands/linear-search.js'; // TODO 2.0: Migrate to CLI wrappers
// import { prStatusCommand } from '../src/commands/pr-status.js'; // TODO 2.0: Migrate to CLI wrappers

// Hook-equivalent commands (Dovetail 2.0)
import { checkIssue } from '../src/commands/check-issue.js';
import { validate } from '../src/commands/validate.js';
import { autoCommit } from '../src/commands/auto-commit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('dovetail')
  .description('An opinionated CLI that scaffolds and automates the entire PERN stack development workflow')
  .version(packageJson.version);

// Onboarding
program
  .command('onboard')
  .description('Interactive onboarding wizard for first-time setup')
  .action(onboardCommand);

// Project lifecycle
program
  .command('init <project-name>')
  .description('Bootstrap a new PERN stack project')
  .option('-s, --slug <slug>', 'Custom repository slug')
  .option('-r, --region <region>', 'Fly.io region (default: iad)', 'iad')
  .option('--public', 'Make repository public', false)
  .action(initCommand);

program
  .command('adopt')
  .description('Adopt an existing project into Dovetail')
  .action(adoptCommand);

program
  .command('status')
  .description('Show current project state')
  .option('--json', 'Output as JSON')
  .action(statusCommand);

// TODO 2.0: Migrate config command to use CLI wrappers
// program
//   .command('config')
//   .description('Manage API tokens and configuration')
//   .option('-s, --show', 'Show current configuration')
//   .action(configCommand);

// Work session
program
  .command('start [issue-key]')
  .description('Start work on a Linear issue')
  .action(startCommand);

// During work
// TODO 2.0: Migrate commit command to use CLI wrappers
// program
//   .command('commit')
//   .description('Smart commit with auto-checks')
//   .option('-m, --message <message>', 'Custom commit message')
//   .option('--auto', 'Auto-commit without prompts')
//   .action(commitCommand);

program
  .command('test')
  .description('Run relevant tests based on changed files')
  .option('--all', 'Run all tests')
  .action(testCommand);

program
  .command('check')
  .description('Run quality checks without committing')
  .action(readyCommand);

// Finishing work
program
  .command('ready')
  .description('Check if ready to merge (runs quality gate)')
  .action(readyCommand);

// TODO 2.0: Migrate merge command to use CLI wrappers
// program
//   .command('merge')
//   .description('Merge to main branch')
//   .option('--skip-checks', 'Skip quality gate checks', false)
//   .action(mergeCommand);

// Deployment
// TODO 2.0: Migrate deploy command to use CLI wrappers
// program
//   .command('deploy <environment>')
//   .description('Deploy to staging or production')
//   .option('--skip-tests', 'Skip smoke tests', false)
//   .action(deployCommand);

// TODO 2.0: Migrate rollback command to use CLI wrappers
// program
//   .command('rollback <environment> <version>')
//   .description('Rollback to a previous deployment')
//   .action(rollbackCommand);

// Utilities
program
  .command('sync')
  .description('Sync main branch from origin')
  .action(syncCommand);

// TODO 2.0: Migrate clean command to use CLI wrappers
// program
//   .command('clean')
//   .description('Clean up merged branches')
//   .option('--dry-run', 'Show what would be deleted', false)
//   .action(cleanCommand);

// TODO 2.0: Migrate purge command to use CLI wrappers
// program
//   .command('purge <slug>')
//   .description('Delete all project resources (GitHub, Linear, Supabase, Fly.io)')
//   .action(purgeCommand);

program
  .command('migrate')
  .description('Run or manage database migrations')
  .option('-c, --create <name>', 'Create a new migration')
  .option('-u, --up', 'Run pending migrations')
  .option('-d, --down', 'Rollback last migration')
  .action(migrateCommand);

// Hook helper commands
// TODO 2.0: Migrate linear-search command to use CLI wrappers
// program
//   .command('linear-search')
//   .description('Search Linear issues (for hooks)')
//   .option('--query <query>', 'Search query')
//   .option('--limit <limit>', 'Number of results', '10')
//   .option('--json', 'Output as JSON')
//   .action(linearSearchCommand);

// TODO 2.0: Migrate pr-status command to use CLI wrappers
// program
//   .command('pr-status')
//   .description('Get PR status for current branch (for hooks)')
//   .option('--json', 'Output as JSON')
//   .action(prStatusCommand);

// Hook-equivalent commands (Dovetail 2.0)
program
  .command('check-issue')
  .description('Ensure active issue exists (user-prompt-submit hook)')
  .option('--auto', 'Auto-select/create issue without prompts')
  .option('--quiet', 'Minimal output')
  .option('--json', 'Output as JSON')
  .action(checkIssue);

program
  .command('validate')
  .description('Validate workflow state (pre-tool-use hook)')
  .option('--quiet', 'Minimal output')
  .option('--json', 'Output as JSON')
  .action(validate);

program
  .command('auto-commit')
  .description('Auto-commit changes (post-tool-use hook)')
  .option('--no-push', 'Skip pushing to remote')
  .option('--no-linear-comment', 'Skip Linear comment')
  .option('--quiet', 'Minimal output')
  .option('--json', 'Output as JSON')
  .action(autoCommit);

// Error handling
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error.code !== 'commander.help' && error.code !== 'commander.version') {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
