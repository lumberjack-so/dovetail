import chalk from 'chalk';
import slugify from 'slugify';
import { loadProjectState, saveProjectState } from '../utils/state.js';
import { showIssue, updateIssue, listWorkflowStates } from '../cli/linearis.js';
import { createBranch, checkout, pull, getDefaultBranch, getCurrentBranch } from '../utils/git.js';

/**
 * Create branch name from issue key and title
 */
function createBranchName(issueKey, issueTitle) {
  const titleSlug = slugify(issueTitle, {
    lower: true,
    strict: true,
    trim: true
  }).substring(0, 50); // Limit length

  return `feat/${issueKey.toLowerCase()}-${titleSlug}`;
}

/**
 * Start work on a Linear issue
 */
export async function start(options = {}) {
  try {
    const { issueKey, quiet } = options;

    if (!issueKey) {
      console.error(chalk.red('Error: Issue key is required'));
      console.error(chalk.dim('Usage: dovetail start <issue-key>'));
      process.exit(1);
    }

    // Load project state
    const state = loadProjectState();

    if (!quiet) {
      console.error(chalk.dim('   Starting work on issue...'));
    }

    // Sync main branch
    if (!quiet) {
      console.error(chalk.dim('   Syncing main branch...'));
    }
    const mainBranch = await getDefaultBranch();
    const currentBranch = await getCurrentBranch();

    if (currentBranch !== mainBranch) {
      await checkout(mainBranch);
    }
    await pull(mainBranch);

    // Get issue details from Linear
    if (!quiet) {
      console.error(chalk.dim(`   Loading issue details from Linear...`));
    }

    const issue = await showIssue(issueKey);

    // Create branch name
    const branchName = createBranchName(issue.identifier, issue.title);

    if (!quiet) {
      console.error(chalk.green(`   ✓ Issue: ${issue.identifier} - ${issue.title}`));
      console.error(chalk.dim(`   Creating branch: ${branchName}`));
    }

    // Create and checkout branch
    try {
      await createBranch(branchName);
      if (!quiet) {
        console.error(chalk.green(`   ✓ Branch created and checked out`));
      }
    } catch (error) {
      // Branch might already exist - just check it out
      if (error.message.includes('already exists')) {
        await checkout(branchName);
        if (!quiet) {
          console.error(chalk.yellow('   Branch already exists - checked out'));
        }
      } else {
        throw error;
      }
    }

    // Update Linear issue to "In Progress"
    try {
      // Get workflow states to find "In Progress" state
      const states = await listWorkflowStates(state.linear.teamId);
      const inProgressState = states.find(s =>
        s.name.toLowerCase().includes('progress') ||
        s.type === 'started'
      );

      if (inProgressState) {
        if (!quiet) {
          console.error(chalk.dim('   Moving issue to "In Progress" in Linear...'));
        }
        await updateIssue(issue.identifier, {
          state: inProgressState.name
        });
        if (!quiet) {
          console.error(chalk.green(`   ✓ Issue moved to "In Progress"`));
        }
      }
    } catch (error) {
      // Non-critical - continue even if state update fails
      if (!quiet) {
        console.error(chalk.yellow(`   Warning: Could not update issue state: ${error.message}`));
      }
    }

    // Save active issue to project state
    state.activeIssue = {
      key: issue.identifier,
      id: issue.id,
      title: issue.title,
      branch: branchName,
      url: issue.url
    };

    saveProjectState(state);

    if (!quiet) {
      console.error(chalk.green('   ✓ Ready to code!'));
    }

    return issue;
  } catch (error) {
    console.error(chalk.red('Error starting work:'), error.message);
    process.exit(1);
  }
}

// Backwards compatibility
export const startCommand = start;
