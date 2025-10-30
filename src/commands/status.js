import chalk from 'chalk';
import { getCurrentBranch, getChangedFiles, getCommitsAhead } from '../utils/git.js';
import { readProjectState } from '../utils/state.js';
import { getCommitStatus } from '../integrations/github.js';
import { getPullRequestByBranch } from '../integrations/github.js';
import { logger } from '../utils/logger.js';

export async function statusCommand() {
  console.log();

  try {
    const projectState = await readProjectState(process.cwd());

    if (!projectState.name) {
      logger.error('Not in a Dovetail project directory');
      process.exit(1);
    }

    // Get git status
    const currentBranch = await getCurrentBranch();
    const changedFiles = await getChangedFiles();
    const commitsAhead = await getCommitsAhead();

    // Display project info
    console.log(chalk.bold('📁 Project:'), projectState.name);
    console.log(chalk.bold('🌿 Branch: '), currentBranch);

    // Display active issue
    if (projectState.activeIssue) {
      console.log(chalk.bold('📋 Issue:  '), `${projectState.activeIssue.key} - ${projectState.activeIssue.title}`, chalk.gray('(In Progress)'));
    }

    // Display changes
    if (changedFiles.modified.length > 0 || changedFiles.created.length > 0 || changedFiles.deleted.length > 0) {
      console.log(chalk.bold('\n📝 Changes:'));

      changedFiles.modified.forEach(file => {
        console.log(chalk.yellow('  Modified:'), file);
      });

      changedFiles.created.forEach(file => {
        console.log(chalk.green('  Added:   '), file);
      });

      changedFiles.deleted.forEach(file => {
        console.log(chalk.red('  Deleted: '), file);
      });
    } else {
      console.log(chalk.gray('\n📝 No uncommitted changes'));
    }

    // Display commits ahead
    if (commitsAhead > 0) {
      console.log(chalk.bold('\n📤 Commits ahead of origin:'), commitsAhead);
    }

    // Check CI status
    if (projectState.github) {
      try {
        const ciStatus = await getCommitStatus(
          projectState.github.owner,
          projectState.github.repo,
          currentBranch
        );

        const statusIcon = ciStatus.passing ? '✅' : '❌';
        const statusText = ciStatus.passing ? 'Passing' : 'Failing';

        console.log(chalk.bold('\n🔄 CI Status:'), statusIcon, statusText);
      } catch {
        console.log(chalk.bold('\n🔄 CI Status:'), chalk.gray('Not available'));
      }
    }

    // Check for PR
    if (projectState.github && projectState.activeIssue) {
      try {
        const pr = await getPullRequestByBranch(
          projectState.github.owner,
          projectState.github.repo,
          currentBranch
        );

        if (pr) {
          console.log(chalk.bold('\n🔀 PR:      '), pr.html_url, pr.draft ? chalk.gray('(Draft)') : '');
        }
      } catch {
        // No PR yet
      }
    }

    // Display useful links
    if (projectState.activeIssue) {
      console.log(chalk.bold('\n🔗 Links:'));
      console.log(chalk.blue('  Linear: '), projectState.activeIssue.url);

      if (projectState.github) {
        console.log(chalk.blue('  GitHub: '), projectState.github.url);
      }
    }

    console.log();
  } catch (error) {
    logger.error(`Failed to get status: ${error.message}`);
    process.exit(1);
  }
}
