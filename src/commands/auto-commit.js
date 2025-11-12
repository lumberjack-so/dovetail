import chalk from 'chalk';
import { loadProjectState } from '../utils/state.js';
import { getChangedFiles, commit as gitCommit, push } from '../utils/git.js';
import { commentOnIssue } from '../cli/linearis.js';

/**
 * Auto-commit changes with conventional commit message
 * Used by post-tool-use hook
 */
export async function autoCommit(options = {}) {
  try {
    // Check if in a Dovetail project
    let state;
    try {
      state = loadProjectState();
    } catch (error) {
      if (!options.quiet) {
        console.log(chalk.dim('Not in a Dovetail project - auto-commit skipped'));
      }
      process.exit(0);
    }

    // Check for active issue
    if (!state.activeIssue) {
      if (!options.quiet) {
        console.log(chalk.yellow('⚠️  No active issue - auto-commit skipped'));
      }
      process.exit(0);
    }

    // Get changed files
    const changedFiles = await getChangedFiles();
    const allFiles = [
      ...changedFiles.modified,
      ...changedFiles.created,
      ...changedFiles.deleted
    ];

    if (allFiles.length === 0) {
      if (!options.quiet) {
        console.log(chalk.dim('No changes to commit'));
      }
      process.exit(0);
    }

    // Generate commit message
    const fileNames = allFiles.map(f => f.split('/').pop()).slice(0, 3).join(', ');
    const commitMessage = `feat(${state.activeIssue.key}): update ${fileNames}${allFiles.length > 3 ? ' and more' : ''}`;

    if (!options.quiet) {
      console.log(chalk.cyan('\n📝 Auto-committing changes...'));
      console.log(chalk.dim(`Message: ${commitMessage}`));
      console.log(chalk.dim(`Files:   ${allFiles.length} changed`));
    }

    // Commit changes
    await gitCommit(commitMessage);

    if (!options.quiet) {
      console.log(chalk.green('✓ Changes committed'));
    }

    // Push to remote (if configured)
    if (!options.noPush) {
      try {
        await push();
        if (!options.quiet) {
          console.log(chalk.green('✓ Changes pushed to remote'));
        }
      } catch (error) {
        // Non-critical - push might fail if remote not configured
        if (!options.quiet && !error.message.includes('No upstream branch')) {
          console.log(chalk.yellow(`Warning: Could not push: ${error.message}`));
        }
      }
    }

    // Add comment to Linear issue (optional, non-blocking)
    if (!options.noLinearComment) {
      try {
        const commitUrl = state.github
          ? `${state.github.url}/commit/${allFiles[0]}`
          : null;

        const comment = commitUrl
          ? `Committed changes: ${commitMessage}\n${commitUrl}`
          : `Committed changes: ${commitMessage}`;

        await commentOnIssue(state.activeIssue.key, comment);

        if (!options.quiet) {
          console.log(chalk.dim('✓ Added comment to Linear issue'));
        }
      } catch (error) {
        // Non-critical - continue even if comment fails
        if (!options.quiet) {
          console.log(chalk.dim(`Note: Could not add Linear comment: ${error.message}`));
        }
      }
    }

    if (options.json) {
      console.log(JSON.stringify({
        committed: true,
        message: commitMessage,
        filesChanged: allFiles.length
      }));
    }

    process.exit(0);
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({
        committed: false,
        error: error.message
      }));
    } else {
      console.error(chalk.red('Auto-commit error:'), error.message);
    }
    process.exit(1);
  }
}
