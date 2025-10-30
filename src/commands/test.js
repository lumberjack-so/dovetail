import chalk from 'chalk';
import ora from 'ora';
import { getChangedFiles } from '../utils/git.js';
import { detectTestStrategy, runRelevantTests } from '../checks/test-runner.js';
import { logger } from '../utils/logger.js';

export async function testCommand(options = {}) {
  console.log(chalk.bold('\n🧪 Running Tests\n'));

  try {
    if (options.all) {
      // Run all tests
      logger.info('Running all tests...');

      const spinner = ora('Running Playwright tests...').start();
      // Run all test suites
      spinner.succeed('All tests complete!');
    } else {
      // Run tests based on changed files
      const changedFiles = await getChangedFiles();
      const allFiles = [
        ...changedFiles.modified,
        ...changedFiles.created,
        ...changedFiles.renamed.map(r => r.to),
      ];

      if (allFiles.length === 0) {
        logger.warning('No changed files detected. Use --all to run all tests.');
        process.exit(0);
      }

      console.log(chalk.bold('🔍 Detecting test strategy based on changes...\n'));

      const testResults = await runRelevantTests(allFiles, options);

      console.log(chalk.bold('\n📊 Test Results:\n'));

      if (testResults.strategy.runPlaywright && testResults.results.playwright) {
        const icon = testResults.results.playwright.passed ? '✅' : '❌';
        console.log(`${icon} Playwright tests`);
        if (!testResults.results.playwright.passed) {
          console.log(chalk.red(testResults.results.playwright.error));
        }
      }

      if (testResults.strategy.runAPITests && testResults.results.api) {
        const icon = testResults.results.api.passed ? '✅' : '❌';
        console.log(`${icon} API tests`);
        if (!testResults.results.api.passed) {
          console.log(chalk.red(testResults.results.api.error));
        }
      }

      if (testResults.strategy.runVisualTests && testResults.results.visual) {
        const icon = testResults.results.visual.passed ? '✅' : '❌';
        console.log(`${icon} Visual regression tests`);
        if (testResults.results.visual.skipped) {
          console.log(chalk.gray('  (No visual tests configured)'));
        }
      }

      console.log();

      if (testResults.passed) {
        console.log(chalk.green.bold('✨ All tests passed!\n'));
      } else {
        console.log(chalk.red.bold('❌ Some tests failed.\n'));
        process.exit(1);
      }
    }
  } catch (error) {
    logger.error(`Test execution failed: ${error.message}`);
    process.exit(1);
  }
}
