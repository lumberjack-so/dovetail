import inquirer from 'inquirer';
import chalk from 'chalk';
import { Listr } from 'listr2';
import { execa } from 'execa';
import slugify from 'slugify';

// Native CLI wrappers
import { getCurrentUser, createRepo, setSecret } from '../cli/gh.js';
import { createIssue } from '../cli/linearis.js';
import { getTeamByKey, createProject as createLinearProject } from '../cli/linear-api.js';
import { listOrgs as listSupabaseOrgs, createProject as createSupabaseProject, getProjectKeys } from '../cli/supabase.js';
import { createApp } from '../cli/flyctl.js';

// Utilities
import { init as gitInit, addRemote, commit, push } from '../utils/git.js';
import { scaffoldProject } from '../templates/scaffold.js';
import { saveProjectState, readConfig } from '../utils/state.js';

/**
 * Create slug from project name
 */
function createSlug(name) {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true
  });
}

/**
 * Initialize a new Dovetail project
 */
export async function initCommand(projectName, options = {}) {
  try {
    console.log(chalk.bold('\n🚀 Dovetail Project Generator\n'));

    // Get current GitHub user
    console.log(chalk.dim('Checking GitHub authentication...'));
    const githubUser = await getCurrentUser();
    console.log(chalk.green(`✓ Authenticated as ${githubUser}`));
    console.log();

    // Load saved config for defaults
    const savedConfig = await readConfig();

    // Prompt for configuration
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'slug',
        message: 'Repository slug:',
        default: options.slug || createSlug(projectName),
        validate: (input) => {
          if (/^[a-z0-9-]+$/.test(input)) return true;
          return 'Slug must be lowercase letters, numbers, and hyphens only';
        }
      },
      {
        type: 'confirm',
        name: 'isPublic',
        message: 'Make repository public?',
        default: options.public || false
      },
      {
        type: 'input',
        name: 'linearTeamKey',
        message: 'Linear team key (e.g., ENG, PROD):',
        default: savedConfig.linearTeamKey || undefined,
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Team key is required. Find it in your Linear URL: linear.app/[workspace]/team/[TEAM-KEY]';
          }
          if (!/^[A-Z0-9-]+$/i.test(input)) {
            return 'Team key should only contain letters, numbers, and hyphens';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'region',
        message: 'Fly.io region:',
        choices: [
          { name: 'US East (iad)', value: 'iad' },
          { name: 'US West (sjc)', value: 'sjc' },
          { name: 'Europe (ams)', value: 'ams' }
        ],
        default: options.region || 'iad'
      }
    ]);

    const config = {
      projectName,
      slug: answers.slug,
      isPublic: answers.isPublic,
      linearTeamKey: answers.linearTeamKey,
      region: answers.region,
      githubOwner: githubUser
    };

    // Confirmation
    console.log(chalk.bold('\nProject Configuration:'));
    console.log(chalk.blue('Name:        '), config.projectName);
    console.log(chalk.blue('Slug:        '), config.slug);
    console.log(chalk.blue('Owner:       '), config.githubOwner);
    console.log(chalk.blue('Visibility:  '), config.isPublic ? 'public' : 'private');
    console.log(chalk.blue('Linear Team: '), config.linearTeamKey);
    console.log(chalk.blue('Region:      '), config.region);
    console.log();

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Create project with these settings?',
      default: true
    }]);

    if (!confirm) {
      console.log(chalk.yellow('\nProject creation cancelled.'));
      process.exit(0);
    }

    // Execute project creation tasks
    const projectData = {
      name: config.projectName,
      slug: config.slug
    };

    const tasks = new Listr([
      {
        title: 'Scaffolding project structure',
        task: async (ctx) => {
          await scaffoldProject(config.slug, config);
          ctx.projectDir = config.slug;
        }
      },
      {
        title: 'Creating GitHub repository',
        task: async (ctx) => {
          const repo = await createRepo(config.slug, {
            private: !config.isPublic,
            description: config.projectName
          });

          ctx.githubRepo = repo;
          projectData.github = {
            owner: repo.owner.login,
            repo: config.slug,
            url: repo.url
          };
        }
      },
      {
        title: 'Creating Linear project',
        task: async (ctx) => {
          // Get team ID from team key
          const team = await getTeamByKey(config.linearTeamKey);

          // Create project using Linear GraphQL API
          const project = await createLinearProject(
            config.projectName,
            [team.id],
            {
              description: `${config.projectName} development project`,
              color: '#3b82f6', // Blue
            }
          );

          // Create 3 starter issues in the project
          const starterIssues = [
            { title: 'Setup development environment', priority: 2 },
            { title: 'Build initial features', priority: 3 },
            { title: 'Deploy to production', priority: 3 }
          ];

          const createdIssues = [];
          for (const issueData of starterIssues) {
            const issue = await createIssue(config.linearTeamKey, {
              title: issueData.title,
              description: `Part of ${config.projectName} project setup`,
              priority: issueData.priority,
              projectId: project.id // Add issues to the project
            });
            createdIssues.push(issue);
          }

          ctx.linearTeam = team;
          ctx.linearProject = project;
          ctx.linearIssues = createdIssues;
          projectData.linear = {
            teamId: team.id,
            teamKey: config.linearTeamKey,
            projectId: project.id,
            projectUrl: project.url
          };
        }
      },
      {
        title: 'Creating Supabase project',
        task: async (ctx) => {
          // Get Supabase organizations
          const orgs = await listSupabaseOrgs();
          if (orgs.length === 0) {
            throw new Error('No Supabase organizations found. Create one at https://supabase.com');
          }

          // Use first org (or could prompt user to select)
          const org = orgs[0];

          // Generate random database password
          const dbPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);

          // Create project
          const project = await createSupabaseProject(config.projectName, {
            orgId: org.id,
            dbPassword,
            region: 'us-east-1'
          });

          // Wait a bit for project to initialize
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Get API keys (use project.id as the ref)
          const keys = await getProjectKeys(project.id);

          ctx.supabaseProject = project;
          ctx.supabaseKeys = keys;
          projectData.supabase = {
            projectRef: project.id,
            url: `https://${project.id}.supabase.co`
          };
        }
      },
      {
        title: 'Creating Fly.io apps',
        task: async (ctx) => {
          const stagingApp = `${config.slug}-staging`;
          const productionApp = `${config.slug}-production`;

          // Note: Region will be set during first deploy, not during app creation
          await createApp(stagingApp);
          await createApp(productionApp);

          ctx.flyApps = { staging: stagingApp, production: productionApp };
          projectData.flyio = {
            staging: stagingApp,
            production: productionApp,
            region: config.region // Save for later use during deploy
          };
        }
      },
      {
        title: 'Installing dependencies',
        task: async () => {
          await execa('npm', ['install'], { cwd: config.slug });
        }
      },
      {
        title: 'Initializing git repository',
        task: async (ctx) => {
          process.chdir(config.slug);
          await gitInit();
          await addRemote('origin', `https://github.com/${projectData.github.owner}/${config.slug}.git`);
          await commit('Initial commit from Dovetail\n\n🤖 Generated with Dovetail');
        }
      },
      {
        title: 'Pushing to GitHub',
        task: async () => {
          await push('main', true);
        }
      },
      {
        title: 'Setting up GitHub secrets',
        task: async (ctx) => {
          const repo = `${projectData.github.owner}/${config.slug}`;

          // Find anon and service role keys
          const anonKey = ctx.supabaseKeys.find(k => k.name === 'anon')?.api_key;
          const serviceRoleKey = ctx.supabaseKeys.find(k => k.name === 'service_role')?.api_key;

          // Set secrets one by one
          if (projectData.supabase.url) {
            await setSecret(repo, 'SUPABASE_URL', projectData.supabase.url);
          }
          if (anonKey) {
            await setSecret(repo, 'SUPABASE_ANON_KEY', anonKey);
          }
          if (serviceRoleKey) {
            await setSecret(repo, 'SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
          }
        }
      },
      {
        title: 'Saving project state',
        task: async () => {
          // We're already in the project directory after git init task
          await saveProjectState(process.cwd(), projectData);
        }
      },
      {
        title: 'Installing Dovetail hooks',
        task: async () => {
          const dovetailPath = new URL('../../', import.meta.url).pathname;

          // Create .claude directory if it doesn't exist
          await execa('mkdir', ['-p', '.claude/hooks']);

          // Copy all hook files
          await execa('cp', [
            '-r',
            `${dovetailPath}/.claude-hooks/.`,
            '.claude/hooks/'
          ]);

          // Copy config.json to .claude/ (Claude Code reads it from here)
          await execa('cp', [
            `${dovetailPath}/.claude-hooks/claude-config.json`,
            '.claude/config.json'
          ]);
        }
      }
    ]);

    await tasks.run();

    // Success message
    console.log(chalk.green.bold('\n✨ Project ready!\n'));

    console.log(chalk.bold('Resources created:\n'));
    console.log(chalk.blue('  GitHub:   '), projectData.github.url);
    console.log(chalk.blue('  Linear:   '), projectData.linear.projectUrl);
    console.log(chalk.blue('            '), chalk.dim(`Team: ${projectData.linear.teamKey}`));
    console.log(chalk.blue('  Supabase: '), projectData.supabase.url);
    console.log(chalk.blue('  Fly.io:   '), chalk.dim(`Staging: ${projectData.flyio.staging}`));
    console.log(chalk.blue('            '), chalk.dim(`Production: ${projectData.flyio.production}`));
    console.log();

    console.log(chalk.bold('Next steps:\n'));
    console.log(chalk.cyan(`  cd ${config.slug}`));
    console.log(chalk.cyan('  dovetail status'));
    console.log(chalk.cyan('  dovetail check-issue'));
    console.log();

    console.log(chalk.dim('Open Claude Code in this directory to start building with AI assistance.'));
    console.log();
  } catch (error) {
    console.error(chalk.red('\nError during project initialization:'), error.message);
    process.exit(1);
  }
}

// Backwards compatibility
export { initCommand as init };
