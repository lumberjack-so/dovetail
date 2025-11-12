import chalk from 'chalk';
import { loadProjectState } from '../utils/state.js';
import { getCurrentBranch } from '../utils/git.js';

export async function status(options = {}) {
  try {
    // Check if in a Dovetail project
    let state;
    try {
      state = loadProjectState();
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ isDovetailProject: false }));
        process.exit(0);
      }
      console.log(chalk.red('✗ Not in a Dovetail project'));
      console.log(chalk.dim('  Run `dovetail init` or `dovetail adopt` to get started'));
      process.exit(1);
    }

    // Get current branch
    const currentBranch = await getCurrentBranch();

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        isDovetailProject: true,
        activeIssue: state.activeIssue || null,
        branch: currentBranch,
        github: state.github || null,
        linear: state.linear || null,
        supabase: state.supabase || null,
        flyio: state.flyio || null
      }, null, 2));
      process.exit(0);
    }

    // Human-readable output
    console.log(chalk.bold('\n📊 Dovetail Status\n'));

    // Active Issue
    if (state.activeIssue) {
      console.log(chalk.green('✓ Active Issue'));
      console.log(chalk.dim('  Key:    ') + chalk.white(state.activeIssue.key));
      console.log(chalk.dim('  Title:  ') + chalk.white(state.activeIssue.title || 'N/A'));
      console.log(chalk.dim('  Branch: ') + chalk.white(state.activeIssue.branch || 'N/A'));
    } else {
      console.log(chalk.yellow('⚠ No active issue'));
      console.log(chalk.dim('  Run `dovetail check-issue` to select or create one'));
    }

    console.log();

    // Git Branch
    if (currentBranch) {
      console.log(chalk.cyan('Git Branch'));
      console.log(chalk.dim('  Current: ') + chalk.white(currentBranch));
    }

    console.log();

    // GitHub
    if (state.github) {
      console.log(chalk.cyan('GitHub'));
      console.log(chalk.dim('  Repo:  ') + chalk.white(`${state.github.owner}/${state.github.repo}`));
      if (state.github.url) {
        console.log(chalk.dim('  URL:   ') + chalk.white(state.github.url));
      }
    }

    console.log();

    // Linear
    if (state.linear) {
      console.log(chalk.cyan('Linear'));
      console.log(chalk.dim('  Team:    ') + chalk.white(state.linear.teamId || 'N/A'));
      console.log(chalk.dim('  Project: ') + chalk.white(state.linear.projectId || 'N/A'));
    }

    console.log();

    // Supabase
    if (state.supabase) {
      console.log(chalk.cyan('Supabase'));
      console.log(chalk.dim('  Project: ') + chalk.white(state.supabase.projectRef || 'N/A'));
      if (state.supabase.url) {
        console.log(chalk.dim('  URL:     ') + chalk.white(state.supabase.url));
      }
    }

    console.log();

    // Fly.io
    if (state.flyio) {
      console.log(chalk.cyan('Fly.io'));
      if (state.flyio.staging) {
        console.log(chalk.dim('  Staging:    ') + chalk.white(state.flyio.staging));
      }
      if (state.flyio.production) {
        console.log(chalk.dim('  Production: ') + chalk.white(state.flyio.production));
      }
    }

    console.log();
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Backwards compatibility
export const statusCommand = status;
