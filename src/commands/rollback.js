import chalk from 'chalk';
import inquirer from 'inquirer';
import { rollback as flyRollback, listReleases } from '../integrations/flyio.js';
import { readProjectState } from '../utils/state.js';
import { logger } from '../utils/logger.js';

export async function rollbackCommand(environment, version) {
  console.log(chalk.bold(`\n⏪ Rolling Back ${environment}\n`));

  const validEnvironments = ['staging', 'production'];
  if (!validEnvironments.includes(environment)) {
    logger.error(`Invalid environment. Use: ${validEnvironments.join(', ')}`);
    process.exit(1);
  }

  try {
    const projectState = await readProjectState(process.cwd());

    if (!projectState.fly) {
      logger.error('Fly.io apps not configured');
      process.exit(1);
    }

    const appName = environment === 'staging'
      ? `${projectState.slug}-staging`
      : `${projectState.slug}-production`;

    // Get recent releases
    logger.info('Fetching releases...');
    const releases = await listReleases(appName);

    if (releases.length === 0) {
      logger.error('No releases found');
      process.exit(1);
    }

    console.log(chalk.bold('\n📋 Recent releases:\n'));
    releases.slice(0, 5).forEach((release, i) => {
      const isCurrent = i === 0;
      const marker = isCurrent ? chalk.green('← current') : '';
      console.log(chalk.gray(`  ${release.version}`), release.description || '', marker);
    });

    let targetVersion = version;

    if (!targetVersion) {
      // Prompt for version
      const { selectedVersion } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedVersion',
          message: 'Select version to rollback to:',
          choices: releases.slice(1, 6).map(r => ({
            name: `${r.version} - ${r.description || 'No description'}`,
            value: r.version,
          })),
        },
      ]);
      targetVersion = selectedVersion;
    }

    // Confirm rollback
    const { confirmRollback } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmRollback',
        message: chalk.yellow(`Rollback ${environment} to version ${targetVersion}?`),
        default: false,
      },
    ]);

    if (!confirmRollback) {
      console.log(chalk.yellow('\nRollback cancelled.'));
      process.exit(0);
    }

    // Perform rollback
    logger.info(`Rolling back to ${targetVersion}...`);
    await flyRollback(appName, targetVersion);

    console.log(chalk.green.bold('\n✅ Rollback complete!\n'));
    console.log(chalk.bold('🌐 App URL:'), chalk.blue(`https://${appName}.fly.dev`));
    console.log();
  } catch (error) {
    logger.error(`Rollback failed: ${error.message}`);
    process.exit(1);
  }
}
