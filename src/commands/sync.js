import chalk from 'chalk';
import inquirer from 'inquirer';
import { getCurrentBranch, checkout, pull, fetch, getCommitsBehind, rebase, getLog } from '../utils/git.js';
import { logger } from '../utils/logger.js';

export async function syncCommand() {
  console.log(chalk.bold('\n🔄 Syncing Main Branch\n'));

  try {
    const currentBranch = await getCurrentBranch();
    const wasOnFeature = currentBranch !== 'main';

    // Fetch latest
    logger.info('Fetching from origin...');
    await fetch();

    // Switch to main
    if (wasOnFeature) {
      logger.info('Switching to main...');
      await checkout('main');
    }

    // Pull latest changes
    logger.info('Pulling latest changes...');
    await pull('main');

    // Get commits pulled
    const commits = await getLog({ maxCount: 5 });

    console.log(chalk.bold('\n📥 Latest commits:\n'));
    commits.forEach(commit => {
      const message = commit.message.split('\n')[0];
      const hash = commit.hash.substring(0, 7);
      console.log(chalk.gray(`  ${hash}`), message);
    });

    // Check if current branch is behind
    if (wasOnFeature) {
      await checkout(currentBranch);
      const behind = await getCommitsBehind();

      if (behind > 0) {
        console.log(chalk.yellow(`\n⚠️  Current branch is ${behind} commits behind main\n`));

        const { shouldRebase } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldRebase',
            message: 'Rebase your branch on main?',
            default: true,
          },
        ]);

        if (shouldRebase) {
          logger.info('Rebasing...');
          try {
            await rebase('main');
            logger.success('Rebased successfully! ✅');
          } catch (error) {
            logger.error('Rebase failed. You may need to resolve conflicts.');
            console.log(chalk.yellow('\nRun: git rebase --abort to cancel'));
            process.exit(1);
          }
        }
      } else {
        logger.success('Branch is up to date! ✅');
      }
    }

    console.log(chalk.green.bold('\n✅ Sync complete!\n'));
  } catch (error) {
    logger.error(`Sync failed: ${error.message}`);
    process.exit(1);
  }
}
