import chalk from 'chalk';
import { getCurrentBranch, getChangedFiles, getCommitsAhead } from '../utils/git.js';
import { readProjectState } from '../utils/state.js';
import { getCommitStatus } from '../integrations/github.js';
import { getPullRequestByBranch } from '../integrations/github.js';
import { logger } from '../utils/logger.js';

export async function statusCommand(options = {}) {
  try {
    const projectState = await readProjectState(process.cwd());

    if (!projectState.name) {
      if (options.json) {
        console.log(JSON.stringify({ isDovetailProject: false }));
        process.exit(0);
      }
      logger.error('Not in a Dovetail project directory');
      process.exit(1);
    }

    // Get git status
    const currentBranch = await getCurrentBranch();
    const changedFiles = await getChangedFiles();
    const commitsAhead = await getCommitsAhead();

    // Get PR info
    let prInfo = null;
    if (projectState.github && projectState.activeIssue) {
      try {
        const pr = await getPullRequestByBranch(
          projectState.github.owner,
          projectState.github.repo,
          currentBranch
        );

        if (pr) {
          prInfo = {
            url: pr.html_url,
            number: pr.number,
            state: pr.state,
            draft: pr.draft
          };
        }
      } catch {
        // No PR yet
      }
    }

    // Get CI status
    let ciStatus = null;
    if (projectState.github) {
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
    }

    // JSON output
    if (options.json) {
      const jsonOutput = {
        isDovetailProject: true,
        project: {
          name: projectState.name,
          slug: projectState.slug
        },
        git: {
          currentBranch,
          hasChanges: changedFiles.modified.length > 0 || changedFiles.created.length > 0 || changedFiles.deleted.length > 0,
          changedFiles: {
            modified: changedFiles.modified,
            created: changedFiles.created,
            deleted: changedFiles.deleted
          },
          stagedFiles: changedFiles.staged,
          commitsAhead
        },
        activeIssue: projectState.activeIssue || null,
        pr: prInfo,
        ciStatus,
        github: projectState.github || null,
        linear: projectState.linear || null,
        supabase: projectState.supabase || null,
        fly: projectState.fly || null
      };

      console.log(JSON.stringify(jsonOutput, null, 2));
      process.exit(0);
    }

    // Human-readable output
    console.log();
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

    // Display CI
    if (ciStatus) {
      const statusIcon = ciStatus === 'passing' ? '✅' : ciStatus === 'failing' ? '❌' : '⚪';
      const statusText = ciStatus === 'passing' ? 'Passing' : ciStatus === 'failing' ? 'Failing' : 'Not available';
      console.log(chalk.bold('\n🔄 CI Status:'), statusIcon, statusText);
    }

    // Display PR
    if (prInfo) {
      console.log(chalk.bold('\n🔀 PR:      '), prInfo.url, prInfo.draft ? chalk.gray('(Draft)') : '');
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
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
    logger.error(`Failed to get status: ${error.message}`);
    process.exit(1);
  }
}
