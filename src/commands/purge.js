import inquirer from 'inquirer';
import chalk from 'chalk';
import { Listr } from 'listr2';
import { deleteApp as deleteFlyApp } from '../integrations/flyio.js';
import { deleteProject as deleteSupabaseProject } from '../integrations/supabase.js';
import { deleteRepository } from '../integrations/github.js';
import { deleteProject as deleteLinearProject } from '../integrations/linear.js';
import { readProjectState } from '../utils/state.js';
import { logger } from '../utils/logger.js';
import { existsSync } from 'fs';
import { join } from 'path';

export async function purgeCommand(slug, options) {
  console.log(chalk.bold.red('\n⚠️  DANGER ZONE: Project Purge\n'));

  // Look for project state file
  const projectPath = join(process.cwd(), slug);
  const stateExists = existsSync(join(projectPath, '.dovetail', 'state.json'));

  if (!stateExists) {
    logger.error(`No dovetail project found at ${projectPath}`);
    console.log(chalk.gray('Make sure you\'re in the parent directory of the project you want to purge.'));
    process.exit(1);
  }

  // Read project state
  const projectData = await readProjectState(projectPath);

  if (!projectData || Object.keys(projectData).length === 0) {
    logger.error('Project state is empty. Cannot determine what to delete.');
    process.exit(1);
  }

  console.log(chalk.yellow('This will permanently delete the following resources:\n'));

  if (projectData.github) {
    console.log(chalk.red('  ❌ GitHub Repository:'), projectData.github.url);
  }
  if (projectData.linear) {
    console.log(chalk.red('  ❌ Linear Project:'), projectData.linear.url);
  }
  if (projectData.supabase) {
    console.log(chalk.red('  ❌ Supabase Project:'), projectData.supabase.url);
  }
  if (projectData.fly) {
    console.log(chalk.red('  ❌ Fly.io Staging:'), projectData.fly.staging);
    console.log(chalk.red('  ❌ Fly.io Production:'), projectData.fly.production);
  }

  console.log(chalk.bold.red('\n⚠️  This action CANNOT be undone!\n'));

  // First confirmation
  const { confirmFirst } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmFirst',
      message: 'Are you sure you want to delete all these resources?',
      default: false,
    },
  ]);

  if (!confirmFirst) {
    console.log(chalk.yellow('\nPurge cancelled.'));
    process.exit(0);
  }

  // Second confirmation - require typing project slug
  const { confirmSlug } = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirmSlug',
      message: `Type the project slug "${slug}" to confirm deletion:`,
    },
  ]);

  if (confirmSlug !== slug) {
    console.log(chalk.red('\n❌ Slug does not match. Purge cancelled.'));
    process.exit(0);
  }

  // Create deletion tasks
  const tasks = new Listr([
    {
      title: 'Deleting Fly.io staging app',
      enabled: () => projectData.fly?.staging,
      task: async () => {
        const appName = projectData.fly.staging.replace('https://', '').replace('.fly.dev', '');
        await deleteFlyApp(appName);
      },
    },
    {
      title: 'Deleting Fly.io production app',
      enabled: () => projectData.fly?.production,
      task: async () => {
        const appName = projectData.fly.production.replace('https://', '').replace('.fly.dev', '');
        await deleteFlyApp(appName);
      },
    },
    {
      title: 'Deleting Supabase project',
      enabled: () => projectData.supabase?.ref,
      task: async () => {
        await deleteSupabaseProject(projectData.supabase.ref);
      },
    },
    {
      title: 'Deleting Linear project',
      enabled: () => projectData.linear?.projectId,
      task: async () => {
        await deleteLinearProject(projectData.linear.projectId);
      },
    },
    {
      title: 'Deleting GitHub repository',
      enabled: () => projectData.github?.owner && projectData.github?.repo,
      task: async () => {
        await deleteRepository(projectData.github.owner, projectData.github.repo);
      },
    },
  ]);

  try {
    await tasks.run();

    console.log(chalk.green.bold('\n✅ Project purged successfully!\n'));
    console.log(chalk.gray('All remote resources have been deleted.'));
    console.log(chalk.gray(`Local directory "${slug}" still exists - you can delete it manually if needed.\n`));
  } catch (error) {
    console.log();
    logger.error('Purge failed:');
    console.log();

    if (error.message) {
      console.log(error.message);
    } else {
      console.log(String(error));
    }

    if (error.errors && Array.isArray(error.errors)) {
      console.log();
      console.log(chalk.yellow('Additional errors:'));
      error.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.message || err}`);
      });
    }

    console.log();
    console.log(chalk.yellow('Some resources may have been deleted. Check the output above for details.'));
    console.log();
    process.exit(1);
  }
}
