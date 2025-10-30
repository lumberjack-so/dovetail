import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getChangedFiles, commit as gitCommit, push, getCurrentCommit } from '../utils/git.js';
import { readProjectState } from '../utils/state.js';
import { runSecurityChecks } from '../checks/security-scan.js';
import { detectTestStrategy, runRelevantTests } from '../checks/test-runner.js';
import { createPullRequest, getPullRequestByBranch, updatePullRequest } from '../integrations/github.js';
import { addCommitToIssue, linkIssueToPR } from '../integrations/linear.js';
import { logger } from '../utils/logger.js';

export async function commitCommand(options = {}) {
  console.log(chalk.bold('\n💾 Smart Commit\n'));

  try {
    const projectState = await readProjectState(process.cwd());

    if (!projectState.activeIssue) {
      logger.warning('No active issue. Start work with: dovetail start');
      process.exit(1);
    }

    // Get changed files
    const changedFiles = await getChangedFiles();
    const allFiles = [
      ...changedFiles.modified,
      ...changedFiles.created,
      ...changedFiles.renamed.map(r => r.to),
    ];

    if (allFiles.length === 0) {
      logger.warning('No changes to commit');
      process.exit(0);
    }

    console.log(chalk.bold('🔄 Analyzing changes...\n'));
    console.log(chalk.bold('Files changed:'));
    allFiles.forEach(file => console.log(chalk.gray('  -'), file));
    console.log();

    // Detect what checks to run
    const testStrategy = detectTestStrategy(allFiles);

    console.log(chalk.bold('Running checks:'));

    // Run security checks
    const securitySpinner = ora('Security scan...').start();
    const securityResults = await runSecurityChecks(allFiles);

    if (securityResults.passed) {
      securitySpinner.succeed('Security scan... ✅');
    } else {
      securitySpinner.fail('Security scan... ❌');

      if (securityResults.results.audit.total > 0) {
        console.log(chalk.red(`  → ${securityResults.results.audit.total} vulnerabilities found`));
      }

      if (securityResults.results.consoleLogs && !securityResults.results.consoleLogs.passed) {
        console.log(chalk.yellow(`  ⚠️  ${securityResults.results.consoleLogs.count} console.log statements found`));
      }
    }

    // Run relevant tests
    if (testStrategy.runPlaywright || testStrategy.runAPITests) {
      const testSpinner = ora('Running tests...').start();
      const testResults = await runRelevantTests(allFiles);

      if (testResults.passed) {
        testSpinner.succeed('Tests passed... ✅');
      } else {
        testSpinner.fail('Tests failed... ❌');
        console.log(chalk.red('\nTests must pass before committing.'));
        process.exit(1);
      }
    }

    // Check for documentation updates needed
    if (testStrategy.runAPITests) {
      console.log(chalk.yellow('  ⚠️  API changed, docs may need update'));
    }

    console.log();

    // Generate or prompt for commit message
    let commitMessage;

    if (options.message) {
      commitMessage = options.message;
    } else if (options.auto) {
      commitMessage = `feat: update ${allFiles[0].split('/').pop()}`;
    } else {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'Commit message (will be prefixed with feat/fix/etc):',
          validate: (input) => input.length > 0 || 'Commit message required',
        },
      ]);
      commitMessage = message;
    }

    // Format commit message with conventional commits and issue key
    const issueKey = projectState.activeIssue.key;
    const fullMessage = `feat: ${commitMessage} [${issueKey}]`;

    console.log(chalk.bold('\n📝 Commit message:'), chalk.cyan(fullMessage));
    console.log();

    // Commit
    const commitSpinner = ora('Committing...').start();
    await gitCommit(fullMessage);
    const commitHash = await getCurrentCommit();
    commitSpinner.succeed('Committed! ✅');

    // Push to GitHub
    const pushSpinner = ora('Pushing to GitHub...').start();
    await push(projectState.activeIssue.branch, true);
    pushSpinner.succeed('Pushed! ✅');

    // Update Linear with commit info
    if (projectState.github) {
      const linearSpinner = ora('Updating Linear...').start();
      await addCommitToIssue(
        projectState.activeIssue.id,
        commitHash,
        commitMessage,
        projectState.github.url
      );
      linearSpinner.succeed('Linear updated! ✅');
    }

    // Create or update PR
    if (projectState.github) {
      const prSpinner = ora('Managing pull request...').start();

      try {
        const existingPR = await getPullRequestByBranch(
          projectState.github.owner,
          projectState.github.repo,
          projectState.activeIssue.branch
        );

        if (existingPR) {
          prSpinner.succeed(`PR updated: #${existingPR.number}`);
          console.log(chalk.blue(`  ${existingPR.html_url}`));
        } else {
          // Create new PR
          const pr = await createPullRequest(
            projectState.github.owner,
            projectState.github.repo,
            {
              title: `${projectState.activeIssue.key}: ${projectState.activeIssue.title}`,
              head: projectState.activeIssue.branch,
              base: 'main',
              body: `## Summary\n\nCloses ${projectState.activeIssue.url}\n\n## Test Plan\n\n- [ ] Manual testing\n- [ ] Unit tests passing\n- [ ] Integration tests passing`,
              draft: true,
            }
          );

          await linkIssueToPR(projectState.activeIssue.id, pr.html_url);

          prSpinner.succeed(`PR created: #${pr.number} (Draft)`);
          console.log(chalk.blue(`  ${pr.html_url}`));
        }
      } catch (error) {
        prSpinner.fail(`PR management failed: ${error.message}`);
      }
    }

    // Show warnings if any
    if (testStrategy.runAPITests) {
      console.log();
      console.log(chalk.yellow('⚠️  Don\'t forget to update docs/api.md with API changes'));
    }

    console.log(chalk.green.bold('\n✨ Commit complete!\n'));
  } catch (error) {
    logger.error(`Commit failed: ${error.message}`);
    process.exit(1);
  }
}
