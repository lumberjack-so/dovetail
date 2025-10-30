import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { displayConfig, setupConfig, validateConfig } from '../utils/config.js';
import { readConfig, writeConfig } from '../utils/state.js';
import { logger } from '../utils/logger.js';
import { getUserOrganizations, getAuthenticatedUser } from '../integrations/github.js';
import { getOrganizations as getSupabaseOrgs } from '../integrations/supabase.js';

export async function configCommand(options = {}) {
  console.log(chalk.bold('\n🔧 Dovetail Configuration\n'));

  // Always show current config first
  const currentConfig = await readConfig();

  if (options.show) {
    // Just show and exit
    displayConfig(currentConfig);
    return;
  }

  // Interactive menu
  const hasAnyConfig = currentConfig.githubToken || currentConfig.linearApiKey ||
                       currentConfig.supabaseToken || currentConfig.flyToken;

  if (hasAnyConfig) {
    // Show current config
    console.log(chalk.bold('Current Configuration:\n'));
    displayConfig(currentConfig);

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Update all tokens', value: 'update-all' },
          { name: 'Update individual token', value: 'update-one' },
          { name: 'Change default GitHub organization', value: 'change-github-org' },
          { name: 'Change default Supabase organization', value: 'change-supabase-org' },
          { name: 'Clear all configuration', value: 'clear' },
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);

    if (action === 'exit') {
      console.log();
      return;
    }

    if (action === 'clear') {
      const { confirmClear } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmClear',
          message: chalk.yellow('Are you sure you want to clear all tokens?'),
          default: false,
        },
      ]);

      if (confirmClear) {
        await writeConfig({});
        logger.success('All tokens cleared!');
      }
      console.log();
      return;
    }

    if (action === 'change-github-org') {
      console.log();
      const spinner = ora('Fetching your GitHub organizations...').start();
      try {
        const user = await getAuthenticatedUser();
        const orgs = await getUserOrganizations();
        spinner.succeed(`Found ${orgs.length} organization(s)`);

        console.log();
        const choices = [
          { name: `Personal account (${user.login})`, value: null },
          ...orgs.map(org => ({ name: org.login, value: org.login })),
        ];

        const { defaultOrg } = await inquirer.prompt([
          {
            type: 'list',
            name: 'defaultOrg',
            message: 'Where should repositories be created by default?',
            choices,
            default: currentConfig.githubDefaultOrg,
          },
        ]);

        const updatedConfig = await readConfig();
        updatedConfig.githubDefaultOrg = defaultOrg;
        await writeConfig(updatedConfig);

        if (defaultOrg) {
          logger.success(`Default GitHub organization set to: ${defaultOrg}`);
        } else {
          logger.success('Repositories will be created in your personal account');
        }
        console.log();
      } catch (error) {
        spinner.fail('Could not fetch GitHub organizations');
        logger.error(error.message);
        console.log();
      }
      return;
    }

    if (action === 'change-supabase-org') {
      console.log();
      const spinner = ora('Fetching your Supabase organizations...').start();
      try {
        const orgs = await getSupabaseOrgs();
        spinner.succeed(`Found ${orgs.length} organization(s)`);

        if (orgs.length === 0) {
          spinner.warn('No Supabase organizations found. Please create one first.');
          console.log();
          return;
        }

        console.log();
        const choices = orgs.map(org => ({ name: org.name, value: org.id }));

        const { defaultOrg } = await inquirer.prompt([
          {
            type: 'list',
            name: 'defaultOrg',
            message: 'Which Supabase organization should be used for new projects?',
            choices,
            default: currentConfig.supabaseDefaultOrg,
          },
        ]);

        const updatedConfig = await readConfig();
        updatedConfig.supabaseDefaultOrg = defaultOrg;
        await writeConfig(updatedConfig);

        const selectedOrg = orgs.find(org => org.id === defaultOrg);
        logger.success(`Default Supabase organization set to: ${selectedOrg.name}`);
        console.log();
      } catch (error) {
        spinner.fail('Could not fetch Supabase organizations');
        logger.error(error.message);
        console.log();
      }
      return;
    }

    if (action === 'update-one') {
      const { token } = await inquirer.prompt([
        {
          type: 'list',
          name: 'token',
          message: 'Which token do you want to update?',
          choices: [
            { name: 'GitHub Token', value: 'githubToken' },
            { name: 'Linear API Key', value: 'linearApiKey' },
            { name: 'Supabase Token', value: 'supabaseToken' },
            { name: 'Fly.io Token', value: 'flyToken' },
          ],
        },
      ]);

      const tokenLabels = {
        githubToken: 'GitHub Personal Access Token',
        linearApiKey: 'Linear API Key',
        supabaseToken: 'Supabase Access Token',
        flyToken: 'Fly.io API Token',
      };

      const { value } = await inquirer.prompt([
        {
          type: 'password',
          name: 'value',
          message: `${tokenLabels[token]}:`,
          mask: '*',
        },
      ]);

      const updatedConfig = await readConfig();
      updatedConfig[token] = value;
      await writeConfig(updatedConfig);

      logger.success(`${tokenLabels[token]} updated!`);
      console.log();
      return;
    }

    if (action === 'update-all') {
      await setupConfig(inquirer);
    }
  } else {
    // No config yet, run setup
    console.log(chalk.gray('No configuration found. Let\'s set up your API tokens.\n'));
    await setupConfig(inquirer);
  }

  // Validate the configuration
  const validation = await validateConfig();

  if (validation.valid) {
    logger.success('All tokens configured correctly!');
    console.log(chalk.bold('\n📚 Next steps:\n'));
    console.log(chalk.cyan('  dovetail init "Project Name"'), '  # Create a new project');
    console.log();
  } else {
    logger.warning('Some tokens are still missing:');
    validation.errors.forEach(err => console.log(chalk.yellow(`  - ${err}`)));
    console.log();
  }
}
