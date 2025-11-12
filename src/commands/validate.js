import chalk from 'chalk';
import { loadProjectState } from '../utils/state.js';

/**
 * Validate workflow state - used by pre-tool-use hook
 * Exit 0 if valid, Exit 2 to block operation
 */
export async function validate(options = {}) {
  try {
    // Check if in a Dovetail project
    let state;
    try {
      state = loadProjectState();
    } catch (error) {
      // Not in a Dovetail project - allow operation
      if (!options.quiet) {
        console.error(chalk.dim('Not in a Dovetail project - validation skipped'));
      }
      process.exit(0);
    }

    // Check for active issue
    if (!state.activeIssue || !state.activeIssue.key) {
      if (options.json) {
        console.log(JSON.stringify({
          valid: false,
          reason: 'no_active_issue',
          message: 'No active Linear issue'
        }));
      } else {
        console.error(chalk.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.error(chalk.red('⛔ DOVETAIL VALIDATION: BLOCKED'));
        console.error(chalk.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.error();
        console.error(chalk.yellow('VIOLATION: No Active Linear Issue'));
        console.error();
        console.error(chalk.cyan('REQUIRED ACTION:'));
        console.error('  Run: dovetail check-issue');
        console.error('  Or:  dovetail start <issue-key>');
        console.error();
        console.error(chalk.dim('All code changes must be linked to a Linear issue.'));
        console.error(chalk.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      }
      process.exit(2); // Exit 2 blocks the operation
    }

    // Valid - allow operation
    if (options.json) {
      console.log(JSON.stringify({
        valid: true,
        activeIssue: state.activeIssue
      }));
    } else if (!options.quiet) {
      console.error(chalk.green(`✓ Validation passed - Active issue: ${state.activeIssue.key}`));
    }

    process.exit(0);
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({
        valid: false,
        reason: 'error',
        message: error.message
      }));
    } else {
      console.error(chalk.red('Validation error:'), error.message);
    }
    process.exit(2);
  }
}
