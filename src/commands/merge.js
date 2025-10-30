import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { runQualityGate } from '../checks/quality-gate.js';
import { readProjectState, updateProjectState } from '../utils/state.js';
import { getCurrentBranch, checkout, merge as gitMerge, push, deleteBranch, getLog } from '../utils/git.js';
import { mergePullRequest, getPullRequestByBranch, deleteBranch as deleteGitHubBranch } from '../integrations/github.js';
import { completeIssue } from '../integrations/linear.js';
import { logger } from '../utils/logger.js';

export async function mergeCommand(options = {}) {
  console.log(chalk.bold('\n🔀 Merging to Main\n'));

  try {
    const projectState = await readProjectState(process.cwd());

    if (!projectState.activeIssue) {
      logger.error('No active issue to merge');
      process.exit(1);
    }

    // Run quality gate unless skipped
    if (!options.skipChecks) {
      logger.info('Running quality gate...');

      const qualityOptions = {};
      if (projectState.github) {
        qualityOptions.owner = projectState.github.owner;
        qualityOptions.repo = projectState.github.repo;
      }

      const qualityResults = await runQualityGate(qualityOptions);

      if (!qualityResults.passed) {
        logger.error('Quality gate failed. Fix issues and try again.');
        console.log(chalk.yellow('\nUse --skip-checks to bypass (not recommended)'));
        process.exit(1);
      }

      logger.success('Quality gate passed! ✅\n');
    }

    // Confirm merge
    const { confirmMerge } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmMerge',
        message: `Merge ${projectState.activeIssue.key} to main?`,
        default: true,
      },
    ]);

    if (!confirmMerge) {
      console.log(chalk.yellow('\nMerge cancelled.'));
      process.exit(0);
    }

    const currentBranch = await getCurrentBranch();

    // Get commits for changelog
    const commits = await getLog({ from: 'main', to: currentBranch });
    const changelogEntry = commits
      .map(c => `- ${c.message.split('\n')[0]}`)
      .join('\n');

    // Merge via GitHub PR if available
    if (projectState.github) {
      const prSpinner = ora('Merging pull request...').start();

      try {
        const pr = await getPullRequestByBranch(
          projectState.github.owner,
          projectState.github.repo,
          currentBranch
        );

        if (pr) {
          await mergePullRequest(
            projectState.github.owner,
            projectState.github.repo,
            pr.number,
            {
              method: 'squash',
              title: `${projectState.activeIssue.key}: ${projectState.activeIssue.title}`,
            }
          );
          prSpinner.succeed('Pull request merged! ✅');
        } else {
          prSpinner.warn('No PR found, merging locally...');

          // Merge locally
          await checkout('main');
          await gitMerge(currentBranch, { squash: true });
          await push('main');
        }
      } catch (error) {
        prSpinner.fail(`PR merge failed: ${error.message}`);
        throw error;
      }
    } else {
      // Merge locally
      const mergeSpinner = ora('Merging locally...').start();
      await checkout('main');
      await gitMerge(currentBranch, { squash: true });
      await push('main');
      mergeSpinner.succeed('Merged to main! ✅');
    }

    // Close Linear issue
    const linearSpinner = ora('Closing Linear issue...').start();
    await completeIssue(projectState.activeIssue.id);
    linearSpinner.succeed(`Closed ${projectState.activeIssue.key}! ✅`);

    // Delete feature branch
    const cleanupSpinner = ora('Cleaning up branches...').start();
    try {
      await deleteBranch(currentBranch, true);

      if (projectState.github) {
        await deleteGitHubBranch(
          projectState.github.owner,
          projectState.github.repo,
          currentBranch
        );
      }

      cleanupSpinner.succeed('Branches deleted! ✅');
    } catch (error) {
      cleanupSpinner.warn(`Branch cleanup: ${error.message}`);
    }

    // Clear active issue
    await updateProjectState(process.cwd(), { activeIssue: null });

    console.log(chalk.green.bold('\n✅ Merged!\n'));

    console.log(chalk.bold('Changelog entry:'));
    console.log(chalk.gray(changelogEntry));

    console.log(chalk.bold('\n📚 Next steps:'));
    console.log(chalk.cyan('  dovetail deploy staging'), '  # Deploy to staging');
    console.log(chalk.cyan('  dovetail start'), '           # Start next issue');
    console.log();
  } catch (error) {
    logger.error(`Merge failed: ${error.message}`);
    process.exit(1);
  }
}
