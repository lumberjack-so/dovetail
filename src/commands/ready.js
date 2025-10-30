import chalk from 'chalk';
import { runQualityGate, formatQualityGateResults } from '../checks/quality-gate.js';
import { readProjectState } from '../utils/state.js';
import { logger } from '../utils/logger.js';

export async function readyCommand() {
  console.log(chalk.bold('\n🔍 Running Quality Gate\n'));

  try {
    const projectState = await readProjectState(process.cwd());

    const options = {};
    if (projectState.github) {
      options.owner = projectState.github.owner;
      options.repo = projectState.github.repo;
    }

    const results = await runQualityGate(options);

    console.log(chalk.bold('Quality Gate Results:\n'));

    const lines = formatQualityGateResults(results);
    lines.forEach(line => console.log(line));

    console.log();

    if (results.passed) {
      console.log(chalk.green.bold('✅ Ready to merge!\n'));
      console.log(chalk.cyan('Run: dovetail merge'));
      console.log();
    } else {
      console.log(chalk.red.bold('❌ Cannot merge yet.\n'));
      console.log(chalk.yellow('Fix the issues above before merging.'));
      console.log();
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Quality gate check failed: ${error.message}`);
    process.exit(1);
  }
}
