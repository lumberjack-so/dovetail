import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadProjectState, saveProjectState } from '../utils/state.js';
import { listIssues, createIssue } from '../cli/linearis.js';
import { start } from './start.js';

/**
 * Check for active issue, auto-select/create if needed
 * Used by user-prompt-submit hook
 */
export async function checkIssue(options = {}) {
  try {
    // Check if in a Dovetail project
    let state;
    try {
      state = loadProjectState();
    } catch (error) {
      if (!options.quiet) {
        console.log(chalk.dim('Not in a Dovetail project - check skipped'));
      }
      process.exit(0);
    }

    // Already has active issue
    if (state.activeIssue && state.activeIssue.key) {
      if (options.json) {
        console.log(JSON.stringify({
          hasActiveIssue: true,
          issue: state.activeIssue
        }));
      } else if (!options.quiet) {
        console.log(chalk.green(`✓ Active issue: ${state.activeIssue.key}`));
      }
      process.exit(0);
    }

    // No active issue - search Linear
    if (!options.quiet) {
      console.log(chalk.yellow('⚠️  No active issue - searching Linear...'));
    }

    const issues = await listIssues(state.linear.teamId, state.linear.projectId, {
      stateType: ['unstarted', 'started'],
      limit: 10
    });

    // Auto mode - pick first issue or create one
    if (options.auto) {
      if (issues.length === 0) {
        // No issues - create a placeholder
        if (!options.quiet) {
          console.log(chalk.yellow('No open issues found - creating placeholder issue...'));
        }

        const newIssue = await createIssue(state.linear.teamId, {
          projectId: state.linear.projectId,
          title: 'Work in progress',
          description: 'Automatically created by Dovetail',
          priority: 3
        });

        if (!options.quiet) {
          console.log(chalk.green(`✓ Created issue: ${newIssue.identifier}`));
        }

        await start({ issueKey: newIssue.identifier, quiet: options.quiet });

        if (options.json) {
          console.log(JSON.stringify({
            hasActiveIssue: true,
            issue: newIssue,
            action: 'created'
          }));
        }
      } else {
        // Pick first issue
        const selectedIssue = issues[0];

        if (!options.quiet) {
          console.log(chalk.green(`✓ Auto-selected issue: ${selectedIssue.identifier} - ${selectedIssue.title}`));
        }

        await start({ issueKey: selectedIssue.identifier, quiet: options.quiet });

        if (options.json) {
          console.log(JSON.stringify({
            hasActiveIssue: true,
            issue: selectedIssue,
            action: 'selected'
          }));
        }
      }

      process.exit(0);
    }

    // Interactive mode - prompt user
    if (issues.length === 0) {
      console.log(chalk.yellow('\nNo open issues found in Linear.'));
      console.log();

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Create a new issue', value: 'create' },
          { name: 'Exit', value: 'exit' }
        ]
      }]);

      if (action === 'exit') {
        process.exit(0);
      }

      // Create new issue
      const issueData = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Issue title:',
          validate: (input) => input.length > 0 || 'Title is required'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Issue description (optional):'
        },
        {
          type: 'list',
          name: 'priority',
          message: 'Priority:',
          choices: [
            { name: 'Urgent (1)', value: 1 },
            { name: 'High (2)', value: 2 },
            { name: 'Medium (3)', value: 3 },
            { name: 'Low (4)', value: 4 }
          ],
          default: 2
        }
      ]);

      const newIssue = await createIssue(state.linear.teamId, {
        projectId: state.linear.projectId,
        ...issueData
      });

      console.log(chalk.green(`\n✓ Created issue: ${newIssue.identifier}`));
      await start({ issueKey: newIssue.identifier });

      if (options.json) {
        console.log(JSON.stringify({
          hasActiveIssue: true,
          issue: newIssue,
          action: 'created'
        }));
      }

      process.exit(0);
    }

    // Has issues - prompt selection
    console.log(chalk.cyan('\nOpen issues in Linear:'));
    console.log();

    const issueChoices = issues.map(issue => ({
      name: `[${issue.identifier}] ${issue.title}`,
      value: issue.identifier,
      short: issue.identifier
    }));

    issueChoices.push(
      { name: chalk.dim('───────────────────────────'), value: 'separator', disabled: true },
      { name: '+ Create new issue', value: 'CREATE_NEW' }
    );

    const { selected } = await inquirer.prompt([{
      type: 'list',
      name: 'selected',
      message: 'Select an issue:',
      choices: issueChoices,
      pageSize: 15
    }]);

    if (selected === 'CREATE_NEW') {
      // Create new issue
      const issueData = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Issue title:',
          validate: (input) => input.length > 0 || 'Title is required'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Issue description (optional):'
        },
        {
          type: 'list',
          name: 'priority',
          message: 'Priority:',
          choices: [
            { name: 'Urgent (1)', value: 1 },
            { name: 'High (2)', value: 2 },
            { name: 'Medium (3)', value: 3 },
            { name: 'Low (4)', value: 4 }
          ],
          default: 2
        }
      ]);

      const newIssue = await createIssue(state.linear.teamId, {
        projectId: state.linear.projectId,
        ...issueData
      });

      console.log(chalk.green(`\n✓ Created issue: ${newIssue.identifier}`));
      await start({ issueKey: newIssue.identifier });

      if (options.json) {
        console.log(JSON.stringify({
          hasActiveIssue: true,
          issue: newIssue,
          action: 'created'
        }));
      }
    } else {
      // Selected existing issue
      await start({ issueKey: selected });

      if (options.json) {
        const selectedIssue = issues.find(i => i.identifier === selected);
        console.log(JSON.stringify({
          hasActiveIssue: true,
          issue: selectedIssue,
          action: 'selected'
        }));
      }
    }

    process.exit(0);
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({
        error: error.message
      }));
    } else {
      console.error(chalk.red('Error:'), error.message);
    }
    process.exit(1);
  }
}
