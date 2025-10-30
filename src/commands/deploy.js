import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { deploy as flyDeploy, checkHealth, formatAppUrl } from '../integrations/flyio.js';
import { createRelease, getCommitStatus } from '../integrations/github.js';
import { readProjectState } from '../utils/state.js';
import { getCurrentBranch, getCommitsSince, createTag, pushTags, isRepoClean } from '../utils/git.js';
import { runSmokeTests } from '../checks/test-runner.js';
import { logger } from '../utils/logger.js';

async function getLatestTag() {
  const { execa } = await import('execa');
  try {
    const { stdout } = await execa('git', ['describe', '--tags', '--abbrev=0']);
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function deployCommand(environment, options = {}) {
  console.log(chalk.bold(`\n🚀 Deploying to ${environment}\n`));

  const validEnvironments = ['staging', 'production'];
  if (!validEnvironments.includes(environment)) {
    logger.error(`Invalid environment. Use: ${validEnvironments.join(', ')}`);
    process.exit(1);
  }

  try {
    const projectState = await readProjectState(process.cwd());

    if (!projectState.fly) {
      logger.error('Fly.io apps not configured. Run: dovetail init');
      process.exit(1);
    }

    // Pre-flight checks
    console.log(chalk.bold('🔍 Pre-flight checks:\n'));

    const currentBranch = await getCurrentBranch();
    if (currentBranch !== 'main') {
      logger.error('Must be on main branch to deploy');
      console.log(chalk.yellow('Run: git checkout main'));
      process.exit(1);
    }
    logger.success('On main branch ✅');

    const repoClean = await isRepoClean();
    if (!repoClean) {
      logger.error('Uncommitted changes detected');
      process.exit(1);
    }
    logger.success('No uncommitted changes ✅');

    // Check CI status
    if (projectState.github) {
      const ciStatus = await getCommitStatus(
        projectState.github.owner,
        projectState.github.repo,
        'main'
      );

      if (!ciStatus.passing) {
        logger.error('CI is not passing');
        process.exit(1);
      }
      logger.success('CI passing ✅');
    }

    console.log();

    // Generate changelog
    const lastTag = await getLatestTag();
    let changelog = [];

    if (lastTag) {
      const commits = await getCommitsSince(lastTag);
      changelog = commits.map(c => c.message.split('\n')[0]);
      console.log(chalk.bold('📝 Changes since last deploy:\n'));
      changelog.forEach(msg => console.log(chalk.gray('  -'), msg));
      console.log();
    }

    // Production requires confirmation
    if (environment === 'production') {
      const { confirmDeploy } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmDeploy',
          message: chalk.yellow('Deploy to PRODUCTION?'),
          default: false,
        },
      ]);

      if (!confirmDeploy) {
        console.log(chalk.yellow('\nDeployment cancelled.'));
        process.exit(0);
      }
    }

    // Get app name
    const appName = environment === 'staging'
      ? `${projectState.slug}-staging`
      : `${projectState.slug}-production`;

    const appUrl = formatAppUrl(appName);

    // Deploy
    const deploySpinner = ora(`Deploying to ${environment}...`).start();

    try {
      await flyDeploy(appName);
      deploySpinner.succeed(`Deployed to ${environment}! ✅`);
    } catch (error) {
      deploySpinner.fail(`Deployment failed: ${error.message}`);
      throw error;
    }

    console.log();
    console.log(chalk.bold('🌐 App URL:'), chalk.blue(appUrl));
    console.log();

    // Health checks
    const healthSpinner = ora('Running health checks...').start();
    const health = await checkHealth(appName);

    if (health.healthy) {
      healthSpinner.succeed('Health checks passed! ✅');
    } else {
      healthSpinner.fail('Health checks failed! ❌');
      logger.error(health.error);
    }

    // Run smoke tests
    if (!options.skipTests) {
      const smokeSpinner = ora('Running smoke tests...').start();
      const smokeResults = await runSmokeTests(appUrl);

      if (smokeResults.passed) {
        smokeSpinner.succeed('Smoke tests passed! ✅');
      } else {
        smokeSpinner.fail('Smoke tests failed! ❌');
        smokeResults.results.forEach(result => {
          if (!result.passed) {
            console.log(chalk.red(`  ✗ ${result.name}`));
          }
        });
      }
    }

    // Create release for production
    if (environment === 'production' && projectState.github) {
      const { version } = await inquirer.prompt([
        {
          type: 'input',
          name: 'version',
          message: 'Release version (e.g., v1.2.0):',
          validate: (input) => /^v\d+\.\d+\.\d+$/.test(input) || 'Version must be in format: v1.2.0',
        },
      ]);

      const releaseSpinner = ora('Creating release...').start();

      try {
        await createTag(version, `Release ${version}`);
        await pushTags();

        await createRelease(
          projectState.github.owner,
          projectState.github.repo,
          {
            tag: version,
            name: version,
            body: `## Changes\n\n${changelog.map(msg => `- ${msg}`).join('\n')}`,
          }
        );

        releaseSpinner.succeed(`Release ${version} created! ✅`);
      } catch (error) {
        releaseSpinner.fail(`Release creation failed: ${error.message}`);
      }
    }

    console.log(chalk.green.bold(`\n🎉 ${environment} deployment complete!\n`));

    if (environment === 'staging') {
      console.log(chalk.bold('📚 Next steps:'));
      console.log(chalk.cyan('  • Test on staging'));
      console.log(chalk.cyan('  • dovetail deploy production'), '  # Deploy to production');
      console.log();
    }
  } catch (error) {
    logger.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}
