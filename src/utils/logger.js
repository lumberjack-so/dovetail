import chalk from 'chalk';

export const logger = {
  success: (message) => console.log(chalk.green('✅'), message),
  error: (message) => console.log(chalk.red('❌'), message),
  warning: (message) => console.log(chalk.yellow('⚠️ '), message),
  info: (message) => console.log(chalk.blue('ℹ️ '), message),
  step: (message) => console.log(chalk.cyan('→'), message),
  section: (message) => console.log(chalk.bold(`\n${message}\n`)),
};
