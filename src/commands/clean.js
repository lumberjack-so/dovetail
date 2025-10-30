import chalk from 'chalk';
import inquirer from 'inquirer';
import { getMergedBranches, deleteBranch } from '../utils/git.js';
import { deleteBranch as deleteGitHubBranch } from '../integrations/github.js';
import { readProjectState } from '../utils/state.js';
import { logger } from '../utils/logger.js';

export async function cleanCommand(options = {}) {
  console.log(chalk.bold('\n🗑️  Cleaning Merged Branches\n'));

  try {
    logger.info('Finding merged branches...');

    const mergedBranches = await getMergedBranches('main');

    if (mergedBranches.length === 0) {
      logger.success('No merged branches to clean up!');
      console.log();
      process.exit(0);
    }

    console.log(chalk.bold('\n📋 Merged branches:\n'));
    mergedBranches.forEach(branch => {
      console.log(chalk.gray('  -'), branch);
    });

    if (options.dryRun) {
      console.log(chalk.yellow('\n(Dry run - no branches deleted)'));
      console.log();
      process.exit(0);
    }

    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: `Delete these ${mergedBranches.length} branches?`,
        default: false,
      },
    ]);

    if (!confirmDelete) {
      console.log(chalk.yellow('\nCleanup cancelled.'));
      process.exit(0);
    }

    console.log();

    const projectState = await readProjectState(process.cwd());
    let deletedCount = 0;
    let failedCount = 0;

    for (const branch of mergedBranches) {
      try {
        // Delete local branch
        await deleteBranch(branch, true);

        // Delete remote branch if GitHub configured
        if (projectState.github) {
          try {
            await deleteGitHubBranch(
              projectState.github.owner,
              projectState.github.repo,
              branch
            );
          } catch {
            // Remote branch might not exist
          }
        }

        logger.success(`Deleted: ${branch}`);
        deletedCount++;
      } catch (error) {
        logger.error(`Failed to delete ${branch}: ${error.message}`);
        failedCount++;
      }
    }

    console.log();

    if (failedCount === 0) {
      console.log(chalk.green.bold(`✅ Cleaned up ${deletedCount} branches!\n`));
    } else {
      console.log(chalk.yellow(`⚠️  Deleted ${deletedCount}, failed ${failedCount}\n`));
    }
  } catch (error) {
    logger.error(`Cleanup failed: ${error.message}`);
    process.exit(1);
  }
}
