import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { Listr } from 'listr2';
import { createSlug } from '../utils/slugify-helper.js';
import { createRepository, getAuthenticatedUser } from '../integrations/github.js';
import { createProject as createLinearProject, getTeams, createStarterIssues } from '../integrations/linear.js';
import { createProject as createSupabaseProject, getOrganizations, waitForProject } from '../integrations/supabase.js';
import { createApp } from '../integrations/flyio.js';
import { init as gitInit, addRemote, commit, push } from '../utils/git.js';
import { scaffoldProject } from '../templates/scaffold.js';
import { updateProjectState } from '../utils/state.js';
import { validateConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function initCommand(projectName, options) {
  console.log(chalk.bold('\n🚀 Dovetail Project Generator\n'));

  // Validate configuration first
  const configCheck = await validateConfig();
  if (!configCheck.valid) {
    console.log(chalk.yellow('⚠️  Configuration incomplete. Let\'s set that up first!\n'));
    console.log(chalk.gray('Missing:\n'));
    configCheck.errors.forEach(err => console.log(chalk.gray(`  - ${err}`)));
    console.log();

    // Run config setup inline
    const { setupConfig } = await import('../utils/config.js');
    await setupConfig(inquirer);

    // Validate again
    const recheckConfig = await validateConfig();
    if (!recheckConfig.valid) {
      logger.error('Configuration still incomplete. Cannot proceed.');
      process.exit(1);
    }

    console.log(chalk.green('\n✅ Configuration complete! Continuing with project setup...\n'));
  }

  // Prompt for additional details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'slug',
      message: 'Repository slug:',
      default: options.slug || createSlug(projectName),
      validate: (input) => {
        if (/^[a-z0-9-]+$/.test(input)) return true;
        return 'Slug must be lowercase letters, numbers, and hyphens only';
      },
    },
    {
      type: 'list',
      name: 'region',
      message: 'Fly.io region:',
      choices: [
        { name: 'US East (iad)', value: 'iad' },
        { name: 'US West (sjc)', value: 'sjc' },
        { name: 'Europe (ams)', value: 'ams' },
      ],
      default: options.region || 'iad',
    },
    {
      type: 'confirm',
      name: 'public',
      message: 'Make repository public?',
      default: options.public || false,
    },
  ]);

  const config = {
    projectName,
    slug: answers.slug,
    region: answers.region,
    public: answers.public,
  };

  console.log(chalk.bold('\nProject Configuration:'));
  console.log(chalk.blue('Name:       '), config.projectName);
  console.log(chalk.blue('Slug:       '), config.slug);
  console.log(chalk.blue('Region:     '), config.region);
  console.log(chalk.blue('Visibility: '), config.public ? 'public' : 'private');
  console.log();

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Create project with these settings?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('\nProject creation cancelled.'));
    process.exit(0);
  }

  // Store project data
  const projectData = {
    name: config.projectName,
    slug: config.slug,
    region: config.region,
  };

  // Create resources
  const tasks = new Listr([
    {
      title: 'Scaffolding project structure',
      task: async (ctx) => {
        await scaffoldProject(config.slug, config);
        ctx.projectDir = config.slug;
      },
    },
    {
      title: 'Creating GitHub repository',
      task: async (ctx) => {
        const user = await getAuthenticatedUser();
        const repo = await createRepository(config.slug, {
          description: config.projectName,
          public: config.public,
        });
        ctx.githubRepo = repo;
        projectData.github = {
          owner: user.login,
          repo: config.slug,
          url: repo.html_url,
        };
      },
    },
    {
      title: 'Creating Linear project',
      task: async (ctx) => {
        const teams = await getTeams();
        if (teams.length === 0) {
          throw new Error('No Linear teams found. Please create a team first.');
        }
        const team = teams[0]; // Use first team
        const project = await createLinearProject(team.id, config.projectName);
        await createStarterIssues(team.id, project.id);
        ctx.linearProject = project;
        projectData.linear = {
          teamId: team.id,
          projectId: project.id,
        };
      },
    },
    {
      title: 'Creating Supabase project',
      task: async (ctx) => {
        const orgs = await getOrganizations();
        if (orgs.length === 0) {
          throw new Error('No Supabase organizations found.');
        }
        const org = orgs[0]; // Use first org
        const project = await createSupabaseProject(config.projectName, org.id, {
          region: 'us-east-1',
        });
        // Wait for project to be ready
        const readyProject = await waitForProject(project.ref);
        ctx.supabaseProject = readyProject;
        projectData.supabase = {
          ref: readyProject.ref,
          url: `https://${readyProject.ref}.supabase.co`,
        };
      },
    },
    {
      title: 'Creating Fly.io apps',
      task: async (ctx) => {
        const stagingApp = `${config.slug}-staging`;
        const productionApp = `${config.slug}-production`;

        await createApp(stagingApp, { region: config.region });
        await createApp(productionApp, { region: config.region });

        ctx.flyApps = { staging: stagingApp, production: productionApp };
        projectData.fly = {
          staging: `https://${stagingApp}.fly.dev`,
          production: `https://${productionApp}.fly.dev`,
        };
      },
    },
    {
      title: 'Installing dependencies',
      task: async () => {
        const { execa } = await import('execa');
        await execa('npm', ['install'], { cwd: config.slug });
      },
    },
    {
      title: 'Initializing git repository',
      task: async (ctx) => {
        process.chdir(config.slug);
        await gitInit();
        await addRemote('origin', ctx.githubRepo.clone_url);
        await commit('Initial commit from Dovetail\n\n🤖 Generated with Dovetail');
      },
    },
    {
      title: 'Pushing to GitHub',
      task: async () => {
        await push('main', true);
      },
    },
    {
      title: 'Saving project state',
      task: async () => {
        await updateProjectState(process.cwd(), projectData);
      },
    },
  ]);

  try {
    await tasks.run();

    console.log(chalk.green.bold('\n✨ Project ready!\n'));

    console.log(chalk.bold('Resources created:\n'));
    console.log(chalk.blue('GitHub:    '), projectData.github.url);
    console.log(chalk.blue('Linear:    '), `https://linear.app/team/project/${projectData.linear.projectId}`);
    console.log(chalk.blue('Supabase:  '), projectData.supabase.url);
    console.log(chalk.blue('Staging:   '), projectData.fly.staging);
    console.log(chalk.blue('Production:'), projectData.fly.production);

    console.log(chalk.bold('\n📚 Next steps:\n'));
    console.log(chalk.cyan('  cd'), config.slug);
    console.log(chalk.cyan('  npm run dev'), '         # Start dev servers');
    console.log(chalk.cyan('  dovetail start'), '      # Begin working on an issue');
    console.log();
  } catch (error) {
    logger.error(`Project creation failed: ${error.message}`);
    process.exit(1);
  }
}
