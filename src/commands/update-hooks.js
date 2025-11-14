import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { existsSync } from 'fs';

/**
 * Update Claude Code hooks in an existing Dovetail project
 */
export async function updateHooksCommand() {
  try {
    console.log(chalk.bold.cyan('\n🔄 Update Claude Code Hooks\n'));

    // Check if this is a Dovetail project
    if (!existsSync('.dovetail/state.json')) {
      console.log(chalk.red('✗ Not a Dovetail project!'));
      console.log(chalk.dim('Run this command in a directory with .dovetail/state.json'));
      console.log(chalk.dim('Use "dovetail adopt" to add Dovetail to an existing project'));
      process.exit(1);
    }

    // Check if hooks directory exists
    const hasExistingHooks = existsSync('.claude/hooks');
    if (hasExistingHooks) {
      console.log(chalk.yellow('⚠️  Existing hooks found - they will be replaced\n'));
    }

    const spinner = ora('Updating Claude Code hooks...').start();
    try {
      // Get Dovetail installation path
      const dovetailPath = new URL('../../', import.meta.url).pathname;

      // Backup existing hooks if they exist
      if (hasExistingHooks) {
        try {
          await execa('cp', [
            '-r',
            '.claude/hooks',
            `.claude/hooks.backup.${Date.now()}`
          ]);
          spinner.text = 'Backed up existing hooks, installing new ones...';
        } catch (error) {
          // Continue even if backup fails
        }
      }

      // Create hooks directory
      await execa('mkdir', ['-p', '.claude/hooks']);

      // Copy hooks from Dovetail installation
      await execa('cp', [
        '-r',
        `${dovetailPath}/.claude-hooks/.`,
        '.claude/hooks/'
      ]);

      spinner.succeed('Claude Code hooks updated successfully!');

      console.log(chalk.bold.green('\n✨ Hooks updated!\n'));
      console.log(chalk.dim('Your project now has the latest Dovetail hooks:\n'));
      console.log(chalk.cyan('  • user-prompt-submit.sh  ') + chalk.dim('- Ensures active issue'));
      console.log(chalk.cyan('  • pre-tool-use.sh        ') + chalk.dim('- Validates before writes'));
      console.log(chalk.cyan('  • post-tool-use.sh       ') + chalk.dim('- Auto-commits changes'));
      console.log();

      if (hasExistingHooks) {
        console.log(chalk.gray('Old hooks backed up to: .claude/hooks.backup.*'));
        console.log();
      }

    } catch (error) {
      spinner.fail('Failed to update hooks');
      console.log(chalk.red('\nError:'), error.message);
      console.log(chalk.dim('\nTroubleshooting:'));
      console.log(chalk.dim('  • Ensure you have write permissions in this directory'));
      console.log(chalk.dim('  • Try running with appropriate permissions'));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\nError updating hooks:'), error.message);
    process.exit(1);
  }
}

// Backwards compatibility
export { updateHooksCommand as updateHooks };
