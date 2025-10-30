#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Import commands
import { onboardCommand } from '../src/commands/onboard.js';
import { initCommand } from '../src/commands/init.js';
import { startCommand } from '../src/commands/start.js';
import { statusCommand } from '../src/commands/status.js';
import { commitCommand } from '../src/commands/commit.js';
import { testCommand } from '../src/commands/test.js';
import { readyCommand } from '../src/commands/ready.js';
import { mergeCommand } from '../src/commands/merge.js';
import { deployCommand } from '../src/commands/deploy.js';
import { syncCommand } from '../src/commands/sync.js';
import { cleanCommand } from '../src/commands/clean.js';
import { configCommand } from '../src/commands/config.js';
import { migrateCommand } from '../src/commands/migrate.js';
import { rollbackCommand } from '../src/commands/rollback.js';

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
  .command('status')
  .description('Show current project state')
  .action(statusCommand);

program
  .command('config')
  .description('Manage API tokens and configuration')
  .option('-s, --show', 'Show current configuration')
  .action(configCommand);

// Work session
program
  .command('start [issue-key]')
  .description('Start work on a Linear issue')
  .action(startCommand);

// During work
program
  .command('commit')
  .description('Smart commit with auto-checks')
  .option('-m, --message <message>', 'Custom commit message')
  .option('--auto', 'Auto-commit without prompts')
  .action(commitCommand);

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

program
  .command('merge')
  .description('Merge to main branch')
  .option('--skip-checks', 'Skip quality gate checks', false)
  .action(mergeCommand);

// Deployment
program
  .command('deploy <environment>')
  .description('Deploy to staging or production')
  .option('--skip-tests', 'Skip smoke tests', false)
  .action(deployCommand);

program
  .command('rollback <environment> <version>')
  .description('Rollback to a previous deployment')
  .action(rollbackCommand);

// Utilities
program
  .command('sync')
  .description('Sync main branch from origin')
  .action(syncCommand);

program
  .command('clean')
  .description('Clean up merged branches')
  .option('--dry-run', 'Show what would be deleted', false)
  .action(cleanCommand);

program
  .command('migrate')
  .description('Run or manage database migrations')
  .option('-c, --create <name>', 'Create a new migration')
  .option('-u, --up', 'Run pending migrations')
  .option('-d, --down', 'Rollback last migration')
  .action(migrateCommand);

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
