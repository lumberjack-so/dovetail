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
        console.error(chalk.dim('Not in a Dovetail project - auto-commit skipped'));
      }
      process.exit(0);
    }

    // Check for active issue
    if (!state.activeIssue) {
      if (!options.quiet) {
        console.error(chalk.yellow('⚠️  No active issue - auto-commit skipped'));
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
        console.error(chalk.dim('No changes to commit'));
      }
      process.exit(0);
    }

    if (!options.quiet) {
      console.error(chalk.cyan('📝 Dovetail: Auto-committing changes...'));
      console.error(chalk.dim(`   Files changed: ${allFiles.length}`));
      if (changedFiles.modified.length > 0) {
        console.error(chalk.dim(`   Modified: ${changedFiles.modified.slice(0, 3).join(', ')}${changedFiles.modified.length > 3 ? ' ...' : ''}`));
      }
      if (changedFiles.created.length > 0) {
        console.error(chalk.dim(`   Created: ${changedFiles.created.slice(0, 3).join(', ')}${changedFiles.created.length > 3 ? ' ...' : ''}`));
      }
      if (changedFiles.deleted.length > 0) {
        console.error(chalk.dim(`   Deleted: ${changedFiles.deleted.slice(0, 3).join(', ')}${changedFiles.deleted.length > 3 ? ' ...' : ''}`));
      }
    }

    // Generate commit message
    const fileNames = allFiles.map(f => f.split('/').pop()).slice(0, 3).join(', ');
    const commitMessage = `feat(${state.activeIssue.key}): update ${fileNames}${allFiles.length > 3 ? ' and more' : ''}`;

    if (!options.quiet) {
      console.error(chalk.dim(`   Generating commit message...`));
      console.error(chalk.dim(`   Message: ${commitMessage}`));
    }

    // Commit changes
    await gitCommit(commitMessage);

    if (!options.quiet) {
      console.error(chalk.green('   ✓ Committed successfully'));
    }

    // Push to remote (if configured)
    if (!options.noPush) {
      try {
        if (!options.quiet) {
          console.error(chalk.dim(`   Pushing to origin/${state.activeIssue.branch || 'current branch'}...`));
        }
        await push();
        if (!options.quiet) {
          console.error(chalk.green('   ✓ Pushed successfully'));
        }
      } catch (error) {
        // Non-critical - push might fail if remote not configured
        if (!options.quiet && !error.message.includes('No upstream branch')) {
          console.error(chalk.yellow(`   Warning: Could not push: ${error.message}`));
        }
      }
    }

    // Add comment to Linear issue (optional, non-blocking)
    if (!options.noLinearComment) {
      try {
        if (!options.quiet) {
          console.error(chalk.dim(`   Adding comment to Linear issue ${state.activeIssue.key}...`));
        }

        const commitUrl = state.github
          ? `${state.github.url}/commit/${allFiles[0]}`
          : null;

        const comment = commitUrl
          ? `Committed changes: ${commitMessage}\n${commitUrl}`
          : `Committed changes: ${commitMessage}`;

        await commentOnIssue(state.activeIssue.key, comment);

        if (!options.quiet) {
          console.error(chalk.green('   ✓ Comment added to Linear'));
        }
      } catch (error) {
        // Non-critical - continue even if comment fails
        if (!options.quiet) {
          console.error(chalk.dim(`   Note: Could not add Linear comment: ${error.message}`));
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
