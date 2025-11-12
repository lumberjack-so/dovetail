import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';

// Native CLI wrappers
import { getCurrentRepo, viewRepo } from '../cli/gh.js';
import { listTeams, listProjects } from '../cli/linearis.js';
import { listProjects as listSupabaseProjects } from '../cli/supabase.js';

// Utilities
import { loadProjectState, saveProjectState } from '../utils/state.js';
import { getRemoteUrl } from '../utils/git.js';

/**
 * Adopt an existing project into Dovetail
 */
export async function adoptCommand() {
  try {
    console.log(chalk.bold.cyan('\n🔗 Adopt Existing Project into Dovetail\n'));

    // Check if already a dovetail project
    try {
      const existingState = loadProjectState();
      if (existingState && existingState.name) {
        console.log(chalk.red('✗ This is already a Dovetail project!'));
        console.log(chalk.dim('State file exists at: .dovetail/state.json'));
        process.exit(1);
      }
    } catch (error) {
      // Not a Dovetail project yet - good!
    }

    console.log(chalk.gray('This wizard will connect your existing project to Dovetail.\n'));

    // Step 1: Get GitHub info
    console.log(chalk.bold('1. GitHub Repository'));
    const spinner = ora('Detecting GitHub repository...').start();

    let githubOwner, githubRepo;
    try {
      const remoteUrl = await getRemoteUrl();
      const match = remoteUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+?)(\.git)?$/);

      if (match) {
        githubOwner = match[1];
        githubRepo = match[2];

        // Verify access via gh CLI
        try {
          const repo = await viewRepo(`${githubOwner}/${githubRepo}`);
          spinner.succeed(`Detected: ${githubOwner}/${githubRepo}`);
        } catch (error) {
          spinner.warn(`Detected: ${githubOwner}/${githubRepo} (cannot verify access)`);
        }
      } else {
        spinner.fail('Could not auto-detect GitHub repository');
        const { owner, repo } = await inquirer.prompt([
          {
            type: 'input',
            name: 'owner',
            message: 'GitHub owner/organization:',
            validate: (input) => input.length > 0 || 'Owner is required'
          },
          {
            type: 'input',
            name: 'repo',
            message: 'GitHub repository name:',
            validate: (input) => input.length > 0 || 'Repository name is required'
          }
        ]);
        githubOwner = owner;
        githubRepo = repo;
      }
    } catch (error) {
      spinner.fail('Not a git repository');
      console.log(chalk.red('This directory must be a git repository with a GitHub remote'));
      process.exit(1);
    }

    console.log();

    // Step 2: Get Linear project
    console.log(chalk.bold('2. Linear Project'));
    const linearSpinner = ora('Fetching Linear teams and projects...').start();

    let linearTeamId;
    try {
      const teams = await listTeams();

      if (teams.length === 0) {
        linearSpinner.fail('No Linear teams found');
        console.log(chalk.red('Create a team first at https://linear.app'));
        process.exit(1);
      }

      linearSpinner.succeed(`Found ${teams.length} team(s)`);

      // Prompt user to select team
      const { selectedTeam } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTeam',
          message: 'Select the Linear team:',
          choices: teams.map(team => ({
            name: team.name,
            value: team.id
          }))
        }
      ]);

      linearTeamId = selectedTeam;
      console.log(chalk.green(`✓ Linear team selected\n`));
    } catch (error) {
      linearSpinner.fail('Failed to fetch Linear teams');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }

    // Step 3: Get Supabase project (optional)
    console.log(chalk.bold('3. Supabase Project (Optional)'));
    const { hasSupabase } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasSupabase',
        message: 'Does this project use Supabase?',
        default: true
      }
    ]);

    let supabaseRef, supabaseUrl;
    if (hasSupabase) {
      try {
        const spinner = ora('Fetching Supabase projects...').start();
        const projects = await listSupabaseProjects();
        spinner.stop();

        if (!projects || projects.length === 0) {
          console.log(chalk.yellow('⚠ No Supabase projects found'));
          console.log(chalk.gray('Skipping Supabase\n'));
        } else {
          const { selectedProject } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProject',
              message: 'Select Supabase project:',
              choices: projects.map(project => ({
                name: `${project.name} (${project.id})`,
                value: project.id
              }))
            }
          ]);

          supabaseRef = selectedProject;
          supabaseUrl = `https://${selectedProject}.supabase.co`;
          console.log(chalk.green(`✓ Supabase: ${supabaseUrl}\n`));
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠ Could not fetch Supabase projects: ${error.message}\n`));
        console.log(chalk.gray('Skipping Supabase\n'));
      }
    } else {
      console.log(chalk.gray('Skipping Supabase\n'));
    }

    // Step 4: Get Fly.io apps (optional)
    console.log(chalk.bold('4. Fly.io Apps (Optional)'));
    const { hasFly } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasFly',
        message: 'Does this project deploy to Fly.io?',
        default: true
      }
    ]);

    let flyStaging, flyProduction;
    if (hasFly) {
      const { staging, production } = await inquirer.prompt([
        {
          type: 'input',
          name: 'staging',
          message: 'Staging app name (or leave empty):'
        },
        {
          type: 'input',
          name: 'production',
          message: 'Production app name (or leave empty):'
        }
      ]);

      if (staging) flyStaging = staging;
      if (production) flyProduction = production;

      console.log(chalk.green('✓ Fly.io apps configured\n'));
    } else {
      console.log(chalk.gray('Skipping Fly.io\n'));
    }

    // Step 5: Project name
    console.log(chalk.bold('5. Project Details'));
    const { projectName, projectSlug } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: githubRepo,
        validate: (input) => input.length > 0 || 'Project name is required'
      },
      {
        type: 'input',
        name: 'projectSlug',
        message: 'Project slug:',
        default: githubRepo,
        validate: (input) => input.length > 0 || 'Project slug is required'
      }
    ]);

    // Summary
    console.log(chalk.bold('\n📋 Summary:\n'));
    console.log(chalk.cyan('GitHub:    ') + `${githubOwner}/${githubRepo}`);
    console.log(chalk.cyan('Linear:    ') + `Team ID: ${linearTeamId}`);
    if (supabaseUrl) console.log(chalk.cyan('Supabase:  ') + supabaseUrl);
    if (flyStaging) console.log(chalk.cyan('Staging:   ') + flyStaging);
    if (flyProduction) console.log(chalk.cyan('Production:') + flyProduction);
    console.log();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Adopt this project into Dovetail?',
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Cancelled'));
      process.exit(0);
    }

    // Create state
    const saveSpinner = ora('Creating Dovetail state...').start();

    const state = {
      name: projectName,
      slug: projectSlug,
      github: {
        owner: githubOwner,
        repo: githubRepo,
        url: `https://github.com/${githubOwner}/${githubRepo}`
      },
      linear: {
        teamId: linearTeamId,
        projectId: null // Linear projects are team-based in 2.0
      }
    };

    if (supabaseRef) {
      state.supabase = {
        projectRef: supabaseRef,
        url: supabaseUrl
      };
    }

    if (flyStaging || flyProduction) {
      state.flyio = {};
      if (flyStaging) state.flyio.staging = flyStaging;
      if (flyProduction) state.flyio.production = flyProduction;
    }

    // Create .dovetail directory if it doesn't exist
    const dovetailDir = join(process.cwd(), '.dovetail');
    if (!existsSync(dovetailDir)) {
      await mkdir(dovetailDir, { recursive: true });
    }

    saveProjectState(state);
    saveSpinner.succeed('Dovetail state created!');

    // Install Claude Code hooks
    const hooksSpinner = ora('Installing Claude Code hooks...').start();
    try {
      // Copy hooks from Dovetail installation
      const dovetailPath = new URL('../../', import.meta.url).pathname;
      await execa('mkdir', ['-p', '.claude/hooks']);
      await execa('cp', [
        '-r',
        `${dovetailPath}/.claude-hooks/.`,
        '.claude/hooks/'
      ]);
      hooksSpinner.succeed('Claude Code hooks installed!');
    } catch (error) {
      hooksSpinner.warn('Could not install hooks (optional)');
      console.log(chalk.gray(`  ${error.message}`));
    }

    console.log(chalk.bold.green('\n✨ Project adopted successfully!\n'));
    console.log(chalk.bold('Next steps:\n'));
    console.log(chalk.cyan('  dovetail status       ') + chalk.dim('# View project status'));
    console.log(chalk.cyan('  dovetail check-issue  ') + chalk.dim('# Select or create an issue'));
    console.log(chalk.cyan('  dovetail start <key>  ') + chalk.dim('# Start working on an issue'));
    console.log();
  } catch (error) {
    console.error(chalk.red('\nError during adoption:'), error.message);
    process.exit(1);
  }
}

// Backwards compatibility
export { adoptCommand as adopt };
