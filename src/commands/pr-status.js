import { getPullRequestByBranch, getCommitStatus } from '../integrations/github.js';
import { getCurrentBranch } from '../utils/git.js';
import { readProjectState } from '../utils/state.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Get PR status for current branch
 */
export async function prStatusCommand(options = {}) {
  try {
    const projectState = await readProjectState(process.cwd());

    if (!projectState.github) {
      if (options.json) {
        console.log(JSON.stringify({ hasPR: false }));
        process.exit(0);
      }
      logger.error('GitHub not configured for this project');
      process.exit(1);
    }

    const currentBranch = await getCurrentBranch();

    // Get PR
    const pr = await getPullRequestByBranch(
      projectState.github.owner,
      projectState.github.repo,
      currentBranch
    );

    if (!pr) {
      if (options.json) {
        console.log(JSON.stringify({ hasPR: false, branch: currentBranch }));
      } else {
        console.log(chalk.yellow('\nNo PR found for branch:'), currentBranch);
      }
      process.exit(0);
    }

    // Get CI status
    let ciStatus = 'unknown';
    try {
      const status = await getCommitStatus(
        projectState.github.owner,
        projectState.github.repo,
        currentBranch
      );
      ciStatus = status.passing ? 'passing' : 'failing';
    } catch {
      ciStatus = 'unknown';
    }

    const prData = {
      hasPR: true,
      number: pr.number,
      url: pr.html_url,
      state: pr.state,
      draft: pr.draft,
      title: pr.title,
      ciStatus,
      mergeable: pr.mergeable,
      branch: currentBranch
    };

    if (options.json) {
      console.log(JSON.stringify(prData, null, 2));
    } else {
      console.log('\nPull Request Status:\n');
      console.log(chalk.bold('PR:'), pr.html_url);
      console.log(chalk.bold('Number:'), pr.number);
      console.log(chalk.bold('State:'), pr.state, pr.draft ? chalk.gray('(Draft)') : '');
      console.log(chalk.bold('CI Status:'), ciStatus === 'passing' ? chalk.green('✅ Passing') : ciStatus === 'failing' ? chalk.red('❌ Failing') : chalk.gray('⚪ Unknown'));
      console.log(chalk.bold('Mergeable:'), pr.mergeable ? chalk.green('Yes') : chalk.red('No'));
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message, hasPR: false }));
      process.exit(1);
    }
    logger.error(`Failed to get PR status: ${error.message}`);
    process.exit(1);
  }
}
