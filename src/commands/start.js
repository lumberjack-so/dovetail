import inquirer from 'inquirer';
import chalk from 'chalk';
import { getOpenIssues, getIssueByKey, updateIssueStatus, formatIssue } from '../integrations/linear.js';
import { createBranch, checkout, pull, getDefaultBranch } from '../utils/git.js';
import { readProjectState, updateProjectState } from '../utils/state.js';
import { createBranchName } from '../utils/slugify-helper.js';
import { logger } from '../utils/logger.js';
import { validateConfig } from '../utils/config.js';

export async function startCommand(issueKey) {
  console.log(chalk.bold('\n🚀 Starting work...\n'));

  // Validate configuration
  const configCheck = await validateConfig();
  if (!configCheck.valid) {
    logger.error('Configuration incomplete. Please run: dovetail config');
    process.exit(1);
  }

  // Get project state
  const projectState = await readProjectState(process.cwd());
  if (!projectState.linear) {
    logger.error('Project not initialized. Run: dovetail init');
    process.exit(1);
  }

  logger.info('Environment check... ✅');

  // Sync main branch
  logger.info('Syncing main branch...');
  const mainBranch = await getDefaultBranch();
  await checkout(mainBranch);
  await pull(mainBranch);
  logger.success('Synced!');

  let selectedIssue;

  if (issueKey) {
    // Start specific issue
    logger.info(`Loading issue ${issueKey}...`);
    const issue = await getIssueByKey(issueKey);
    selectedIssue = formatIssue(issue);
  } else {
    // Query Linear for open issues
    logger.info('Querying Linear...\n');
    const issues = await getOpenIssues(projectState.linear.teamId, 10);

    if (issues.length === 0) {
      logger.warning('No open issues found in Linear.');
      process.exit(0);
    }

    // Format issues for display
    const choices = await Promise.all(
      issues.map(async (issue) => {
        const formatted = formatIssue(issue);
        const estimate = formatted.estimate ? `${formatted.estimate}h` : 'No estimate';
        const priority = ['Urgent', 'High', 'Medium', 'Low'][formatted.priority - 1] || 'None';

        return {
          name: `${formatted.key}: ${formatted.title} (${estimate}, priority: ${priority})`,
          value: formatted,
        };
      })
    );

    console.log(chalk.bold('Open issues:\n'));
    const { issue } = await inquirer.prompt([
      {
        type: 'list',
        name: 'issue',
        message: 'Which issue do you want to work on?',
        choices,
      },
    ]);

    selectedIssue = issue;
  }

  // Show issue details
  console.log();
  console.log(chalk.bold('📝 Starting work on'), chalk.cyan(selectedIssue.key));
  console.log(chalk.gray(selectedIssue.title));
  console.log();

  // Create branch
  const branchName = createBranchName(selectedIssue.key, selectedIssue.title);
  logger.info(`Creating branch: ${branchName}`);

  try {
    await createBranch(branchName);

    // Update Linear issue to "In Progress"
    logger.info('Moving issue to "In Progress"...');
    await updateIssueStatus(selectedIssue.id, 'In Progress');
    logger.success('Updated!');

    // Save active issue to project state
    await updateProjectState(process.cwd(), {
      activeIssue: {
        key: selectedIssue.key,
        id: selectedIssue.id,
        title: selectedIssue.title,
        branch: branchName,
        url: selectedIssue.url,
      },
    });

    console.log(chalk.green.bold('\n✨ Ready to code! 🚀\n'));
  } catch (error) {
    logger.error(`Failed to start work: ${error.message}`);
    process.exit(1);
  }
}
