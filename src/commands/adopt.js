import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { readProjectState, writeProjectState } from '../utils/state.js';
import { validateConfig } from '../utils/config.js';
import { getRemoteUrl, getCurrentBranch } from '../utils/git.js';
import { getAuthenticatedUser, getRepository } from '../integrations/github.js';
import { getTeams } from '../integrations/linear.js';
import { getOrganizations as getSupabaseOrgs } from '../integrations/supabase.js';
import { createClaudeCodeHooks } from '../templates/scaffold.js';
import { logger } from '../utils/logger.js';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';

/**
 * Adopt an existing project into Dovetail
 */
export async function adoptCommand() {
  console.log(chalk.bold.cyan('\n🔗 Adopt Existing Project into Dovetail\n'));

  // Check if already a dovetail project
  const existingState = await readProjectState(process.cwd());
  if (existingState && Object.keys(existingState).length > 0) {
    logger.error('This is already a Dovetail project!');
    logger.info('State file exists at: .dovetail/state.json');
    process.exit(1);
  }

  // Validate config
  const configCheck = await validateConfig();
  if (!configCheck.valid) {
    logger.error('Missing API tokens. Run: dovetail onboard');
    process.exit(1);
  }

  console.log(chalk.gray('This wizard will connect your existing project to Dovetail.\n'));

  // Step 1: Get GitHub info from git remote
  console.log(chalk.bold('1. GitHub Repository'));
  const spinner = ora('Detecting GitHub repository...').start();

  let githubOwner, githubRepo;
  try {
    const remoteUrl = await getRemoteUrl();
    const match = remoteUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+?)(\.git)?$/);
    if (match) {
      githubOwner = match[1];
      githubRepo = match[2];
      spinner.succeed(`Detected: ${githubOwner}/${githubRepo}`);
    } else {
      spinner.warn('Could not auto-detect GitHub repository');
      const { owner, repo } = await inquirer.prompt([
        {
          type: 'input',
          name: 'owner',
          message: 'GitHub owner/organization:',
        },
        {
          type: 'input',
          name: 'repo',
          message: 'GitHub repository name:',
        },
      ]);
      githubOwner = owner;
      githubRepo = repo;
    }
  } catch (error) {
    spinner.fail('Not a git repository');
    logger.error('This directory must be a git repository with a GitHub remote');
    process.exit(1);
  }

  // Verify GitHub repo exists (optional - continue if fails)
  const verifySpinner = ora('Verifying GitHub repository access...').start();
  try {
    const repo = await getRepository(githubOwner, githubRepo);
    verifySpinner.succeed(`Connected to ${repo.full_name}`);
  } catch (error) {
    verifySpinner.warn('Cannot verify repository access');
    console.log(chalk.yellow('\n⚠️  Could not verify GitHub repository access.'));
    console.log(chalk.gray('This might be because:'));
    console.log(chalk.gray('1. Repository is in an organization and token lacks org access'));
    console.log(chalk.gray('2. Repository doesn\'t exist yet'));
    console.log(chalk.gray('3. Token permissions are insufficient\n'));

    const { continueAnyway } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Continue anyway?',
        default: true,
      },
    ]);

    if (!continueAnyway) {
      logger.info('Cancelled. Fix GitHub access and try again.');
      process.exit(0);
    }
  }

  console.log();

  // Step 2: Get Linear project
  console.log(chalk.bold('2. Linear Project'));
  const linearSpinner = ora('Fetching Linear teams and projects...').start();

  let linearTeamId, linearProjectId, linearProjectUrl;
  try {
    const teams = await getTeams();

    linearSpinner.succeed(`Found ${teams.length} team(s)`);

    // Get all projects from all teams
    const teamChoices = [];
    for (const team of teams) {
      const projects = await team.projects();
      for (const project of projects.nodes) {
        teamChoices.push({
          name: `${team.name} → ${project.name}`,
          value: {
            teamId: team.id,
            projectId: project.id,
            projectName: project.name,
            url: project.url,
          },
        });
      }
    }

    if (teamChoices.length === 0) {
      logger.error('No Linear projects found. Create one first at linear.app');
      process.exit(1);
    }

    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: 'Select the Linear project:',
        choices: teamChoices,
      },
    ]);

    linearTeamId = selectedProject.teamId;
    linearProjectId = selectedProject.projectId;
    linearProjectUrl = selectedProject.url;

    console.log(chalk.green(`✓ Selected: ${selectedProject.projectName}\n`));
  } catch (error) {
    linearSpinner.fail('Failed to fetch Linear projects');
    logger.error(error.message);
    process.exit(1);
  }

  // Step 3: Get Supabase project (optional)
  console.log(chalk.bold('3. Supabase Project (Optional)'));
  const { hasSupabase } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasSupabase',
      message: 'Does this project use Supabase?',
      default: true,
    },
  ]);

  let supabaseRef, supabaseUrl;
  if (hasSupabase) {
    try {
      const spinner = ora('Fetching Supabase projects...').start();
      const { getProjects } = await import('../integrations/supabase.js');
      const projects = await getProjects();
      spinner.stop();

      if (!projects || projects.length === 0) {
        console.log(chalk.yellow('⚠ No Supabase projects found\n'));
        console.log(chalk.gray('Skipping Supabase\n'));
      } else {
        const choices = projects.map((project) => ({
          name: `${project.name} (${project.id})`,
          value: project.id,
        }));

        const { selectedProject } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedProject',
            message: 'Select Supabase project:',
            choices,
          },
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
      default: true,
    },
  ]);

  let flyStaging, flyProduction;
  if (hasFly) {
    const { staging, production } = await inquirer.prompt([
      {
        type: 'input',
        name: 'staging',
        message: 'Staging app name (or leave empty):',
      },
      {
        type: 'input',
        name: 'production',
        message: 'Production app name (or leave empty):',
      },
    ]);

    if (staging) flyStaging = `https://${staging}.fly.dev`;
    if (production) flyProduction = `https://${production}.fly.dev`;

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
    },
    {
      type: 'input',
      name: 'projectSlug',
      message: 'Project slug:',
      default: githubRepo,
    },
  ]);

  // Summary
  console.log(chalk.bold('\n📋 Summary:\n'));
  console.log(chalk.cyan('GitHub:    ') + `${githubOwner}/${githubRepo}`);
  console.log(chalk.cyan('Linear:    ') + linearProjectUrl);
  if (supabaseUrl) console.log(chalk.cyan('Supabase:  ') + supabaseUrl);
  if (flyStaging) console.log(chalk.cyan('Staging:   ') + flyStaging);
  if (flyProduction) console.log(chalk.cyan('Production:') + flyProduction);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '\nAdopt this project into Dovetail?',
      default: true,
    },
  ]);

  if (!confirm) {
    logger.info('Cancelled');
    process.exit(0);
  }

  // Create state
  const saveSpinner = ora('Creating Dovetail state...').start();

  try {
    const state = {
      name: projectName,
      slug: projectSlug,
      github: {
        owner: githubOwner,
        repo: githubRepo,
        url: `https://github.com/${githubOwner}/${githubRepo}`,
      },
      linear: {
        teamId: linearTeamId,
        projectId: linearProjectId,
        url: linearProjectUrl,
      },
    };

    if (supabaseRef) {
      state.supabase = {
        ref: supabaseRef,
        url: supabaseUrl,
      };
    }

    if (flyStaging || flyProduction) {
      state.fly = {};
      if (flyStaging) state.fly.staging = flyStaging;
      if (flyProduction) state.fly.production = flyProduction;
    }

    // Create .dovetail directory if it doesn't exist
    const dovetailDir = join(process.cwd(), '.dovetail');
    if (!existsSync(dovetailDir)) {
      await mkdir(dovetailDir, { recursive: true });
    }

    await writeProjectState(process.cwd(), state);

    saveSpinner.succeed('Dovetail state created!');

    // Install Claude Code hooks
    const hooksSpinner = ora('Installing Claude Code hooks...').start();
    try {
      await createClaudeCodeHooks(process.cwd(), { slug: projectSlug, name: projectName });
      hooksSpinner.succeed('Claude Code hooks installed!');
    } catch (error) {
      hooksSpinner.warn('Could not install hooks (optional)');
      console.log(chalk.gray(`  ${error.message}`));
    }

    console.log(chalk.bold.green('\n✨ Project adopted successfully!\n'));
    console.log(chalk.bold('Next steps:\n'));
    console.log(chalk.cyan('  dovetail status'), '  # View project status');
    console.log(chalk.cyan('  dovetail start'), '   # Start working on an issue');
    console.log();
  } catch (error) {
    saveSpinner.fail('Failed to create state');
    logger.error(error.message);
    process.exit(1);
  }
}
