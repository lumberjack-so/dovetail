import chalk from 'chalk';
import inquirer from 'inquirer';
import { displayConfig, setupConfig, validateConfig } from '../utils/config.js';
import { readConfig, writeConfig } from '../utils/state.js';
import { logger } from '../utils/logger.js';

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
