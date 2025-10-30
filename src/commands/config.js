import chalk from 'chalk';
import inquirer from 'inquirer';
import { readConfig, displayConfig, setupConfig, validateConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function configCommand(options = {}) {
  if (options.show) {
    // Show current configuration
    const config = await readConfig();
    displayConfig(config);
    return;
  }

  // Interactive configuration setup
  try {
    await setupConfig(inquirer);

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
  } catch (error) {
    logger.error(`Configuration failed: ${error.message}`);
    process.exit(1);
  }
}
