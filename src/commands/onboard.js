import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { validateConfig, getConfig, setConfig } from '../utils/config.js';
import { readConfig, writeConfig, updateState } from '../utils/state.js';
import { getAuthenticatedUser, testGitHubToken, getUserOrganizations } from '../integrations/github.js';
import { getCurrentUser as getLinearUser } from '../integrations/linear.js';
import { getOrganizations as getSupabaseOrgs } from '../integrations/supabase.js';
import { isFlyctlInstalled } from '../integrations/flyio.js';
import { logger } from '../utils/logger.js';
import { isGitRepository } from '../utils/git.js';

/**
 * Skill assessment quiz
 */
async function runSkillAssessment() {
  console.log(chalk.bold('\n📚 Quick Skill Assessment\n'));
  console.log(chalk.gray('Help us tailor the experience to your level\n'));

  const questions = [
    {
      type: 'list',
      name: 'experienceLevel',
      message: 'What\'s your overall development experience?',
      choices: [
        { name: 'Beginner (< 1 year)', value: 'beginner' },
        { name: 'Intermediate (1-3 years)', value: 'intermediate' },
        { name: 'Advanced (3-5 years)', value: 'advanced' },
        { name: 'Expert (5+ years)', value: 'expert' },
      ],
    },
    {
      type: 'checkbox',
      name: 'technologies',
      message: 'Which technologies are you comfortable with? (Use space to select, enter to confirm)',
      choices: [
        { name: 'React', value: 'react' },
        { name: 'Node.js/Express', value: 'nodejs' },
        { name: 'PostgreSQL', value: 'postgresql' },
        { name: 'TypeScript', value: 'typescript' },
        { name: 'Git/GitHub', value: 'git' },
        { name: 'CI/CD', value: 'cicd' },
        { name: 'Docker', value: 'docker' },
      ],
    },
    {
      type: 'list',
      name: 'projectManagementExp',
      message: 'Experience with project management tools?',
      choices: [
        { name: 'Never used one', value: 'none' },
        { name: 'Basic (Trello, Asana)', value: 'basic' },
        { name: 'Advanced (Jira, Linear, etc.)', value: 'advanced' },
      ],
    },
    {
      type: 'list',
      name: 'deploymentExp',
      message: 'Experience with deployment/hosting?',
      choices: [
        { name: 'Never deployed before', value: 'none' },
        { name: 'Deployed with platforms (Vercel, Netlify)', value: 'platform' },
        { name: 'Manual deployment (AWS, servers)', value: 'manual' },
      ],
    },
    {
      type: 'list',
      name: 'preferredLearningStyle',
      message: 'How do you prefer to learn?',
      choices: [
        { name: 'Detailed explanations and documentation', value: 'detailed' },
        { name: 'Quick examples and getting started fast', value: 'quick' },
        { name: 'Video tutorials and visual guides', value: 'visual' },
      ],
    },
  ];

  const answers = await inquirer.prompt(questions);

  // Calculate skill score
  let skillScore = 0;
  if (answers.experienceLevel === 'beginner') skillScore += 1;
  else if (answers.experienceLevel === 'intermediate') skillScore += 2;
  else if (answers.experienceLevel === 'advanced') skillScore += 3;
  else skillScore += 4;

  skillScore += answers.technologies.length;

  const profile = {
    ...answers,
    skillScore,
    assessedAt: new Date().toISOString(),
  };

  console.log(chalk.green('\n✅ Profile saved!\n'));

  return profile;
}

/**
 * Configure API tokens with testing
 */
async function configureTokens() {
  console.log(chalk.bold('\n🔑 API Token Configuration\n'));
  console.log(chalk.gray('We need these tokens to connect to your development tools:\n'));

  const tokens = {};

  // GitHub Token
  console.log(chalk.bold('1. GitHub Personal Access Token'));
  console.log(chalk.gray('   Create at: https://github.com/settings/tokens'));
  console.log(chalk.yellow('   ⚠️  Required scopes: ') + chalk.bold('repo') + chalk.gray(' (full control of private repositories)'));
  console.log(chalk.gray('   Optional scopes: workflow (for GitHub Actions)\n'));

  const { githubToken } = await inquirer.prompt([
    {
      type: 'password',
      name: 'githubToken',
      message: 'GitHub Token:',
      mask: '*',
      validate: (input) => input.length > 0 || 'Token is required',
    },
  ]);

  // Test GitHub connection and scopes
  const githubSpinner = ora('Testing GitHub connection and permissions...').start();
  try {
    await setConfig('githubToken', githubToken);
    const testResult = await testGitHubToken();

    if (!testResult.valid) {
      githubSpinner.fail('GitHub connection failed');
      console.log(chalk.red(`Error: ${testResult.error}\n`));
      tokens.github = { valid: false, error: testResult.error };
    } else if (!testResult.hasRepoAccess) {
      githubSpinner.warn(`Connected as ${chalk.cyan(testResult.username)}, but missing "repo" scope`);
      console.log(chalk.yellow('\n⚠️  Your token is missing the "repo" scope!\n'));
      console.log(chalk.gray('This means you won\'t be able to create repositories.\n'));
      console.log(chalk.gray('To add the scope:'));
      console.log(chalk.gray('1. Go to https://github.com/settings/tokens'));
      console.log(chalk.gray('2. Click on your token'));
      console.log(chalk.gray('3. Select the "repo" checkbox'));
      console.log(chalk.gray('4. Save changes\n'));
      tokens.github = { valid: true, username: testResult.username, hasRepoAccess: false };
    } else {
      githubSpinner.succeed(`Connected as ${chalk.cyan(testResult.username)} with full repo access!`);
      tokens.github = { valid: true, username: testResult.username, hasRepoAccess: true };

      // Ask user to select default organization
      console.log();
      const orgsSpinner = ora('Fetching your GitHub organizations...').start();
      try {
        const orgs = await getUserOrganizations();
        orgsSpinner.succeed(`Found ${orgs.length} organization(s)`);

        if (orgs.length > 0) {
          console.log();
          const choices = [
            { name: `Personal account (${testResult.username})`, value: null },
            ...orgs.map(org => ({ name: org.login, value: org.login })),
          ];

          const { defaultOrg } = await inquirer.prompt([
            {
              type: 'list',
              name: 'defaultOrg',
              message: 'Where should repositories be created by default?',
              choices,
            },
          ]);

          if (defaultOrg) {
            await setConfig('githubDefaultOrg', defaultOrg);
            console.log(chalk.green(`\n✓ Default organization set to: ${chalk.cyan(defaultOrg)}\n`));
          } else {
            await setConfig('githubDefaultOrg', null);
            console.log(chalk.green(`\n✓ Repositories will be created in your personal account\n`));
          }
        } else {
          orgsSpinner.info('No organizations found. Repositories will be created in your personal account.');
        }
      } catch (error) {
        orgsSpinner.fail('Could not fetch organizations');
        console.log(chalk.yellow(`Warning: ${error.message}\n`));
      }
    }
  } catch (error) {
    githubSpinner.fail('GitHub connection failed');
    console.log(chalk.red(`Error: ${error.message}\n`));
    tokens.github = { valid: false, error: error.message };
  }

  console.log();

  // Linear API Key
  console.log(chalk.bold('2. Linear API Key'));
  console.log(chalk.gray('   Create at: https://linear.app/settings/api\n'));

  const { linearApiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'linearApiKey',
      message: 'Linear API Key:',
      mask: '*',
      validate: (input) => input.length > 0 || 'API key is required',
    },
  ]);

  // Test Linear connection
  const linearSpinner = ora('Testing Linear connection...').start();
  try {
    await setConfig('linearApiKey', linearApiKey);
    const user = await getLinearUser();
    linearSpinner.succeed(`Connected as ${chalk.cyan(user.name)}!`);
    tokens.linear = { valid: true, name: user.name };
  } catch (error) {
    linearSpinner.fail('Linear connection failed');
    console.log(chalk.red(`Error: ${error.message}\n`));
    tokens.linear = { valid: false, error: error.message };
  }

  console.log();

  // Supabase Token
  console.log(chalk.bold('3. Supabase Access Token'));
  console.log(chalk.gray('   Create at: https://supabase.com/dashboard/account/tokens\n'));

  const { supabaseToken } = await inquirer.prompt([
    {
      type: 'password',
      name: 'supabaseToken',
      message: 'Supabase Token:',
      mask: '*',
      validate: (input) => input.length > 0 || 'Token is required',
    },
  ]);

  // Test Supabase connection
  const supabaseSpinner = ora('Testing Supabase connection...').start();
  try {
    await setConfig('supabaseToken', supabaseToken);
    const orgs = await getSupabaseOrgs();
    supabaseSpinner.succeed(`Connected! Found ${chalk.cyan(orgs.length)} organization(s)`);
    tokens.supabase = { valid: true, orgCount: orgs.length };
  } catch (error) {
    supabaseSpinner.fail('Supabase connection failed');
    console.log(chalk.red(`Error: ${error.message}\n`));
    tokens.supabase = { valid: false, error: error.message };
  }

  console.log();

  // Fly.io Token
  console.log(chalk.bold('4. Fly.io API Token'));
  console.log(chalk.gray('   Get by running: flyctl auth token\n'));

  const hasFlyctl = await isFlyctlInstalled();
  if (!hasFlyctl) {
    console.log(chalk.yellow('⚠️  flyctl not installed. Install from: https://fly.io/docs/hands-on/install-flyctl/\n'));
  }

  const { flyToken } = await inquirer.prompt([
    {
      type: 'password',
      name: 'flyToken',
      message: 'Fly.io Token:',
      mask: '*',
      validate: (input) => input.length > 0 || 'Token is required',
    },
  ]);

  await setConfig('flyToken', flyToken);
  tokens.fly = { valid: true };

  console.log(chalk.green('\n✅ All tokens configured!\n'));

  return tokens;
}

/**
 * Choose project setup path
 */
async function chooseProjectPath() {
  console.log(chalk.bold('\n🚀 Project Setup\n'));

  const isInGitRepo = await isGitRepository();

  const choices = [
    { name: 'Create a new project from scratch', value: 'new' },
    { name: 'Work with an existing GitHub repository', value: 'existing' },
  ];

  if (isInGitRepo) {
    choices.push({ name: 'Work with the current folder/repository', value: 'current' });
  }

  const { path } = await inquirer.prompt([
    {
      type: 'list',
      name: 'path',
      message: 'What would you like to do?',
      choices,
    },
  ]);

  return path;
}

/**
 * Main onboarding command
 */
export async function onboardCommand() {
  console.clear();

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║                                            ║'));
  console.log(chalk.bold.cyan('║        Welcome to Dovetail! 🚀             ║'));
  console.log(chalk.bold.cyan('║                                            ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════╝\n'));

  console.log(chalk.gray('Let\'s get you set up in just a few minutes.\n'));

  try {
    // Step 1: Skill Assessment
    const userProfile = await runSkillAssessment();

    // Save user profile
    await updateState({ userProfile });

    // Step 2: API Token Configuration
    const tokens = await configureTokens();

    // Step 3: Choose Project Path
    const projectPath = await chooseProjectPath();

    // Save onboarding state
    await updateState({
      onboardingComplete: true,
      onboardedAt: new Date().toISOString(),
      tokens,
      selectedProjectPath: projectPath,
    });

    // Final Summary
    console.log(chalk.bold.green('\n✨ Onboarding Complete!\n'));

    console.log(chalk.bold('📊 Your Profile:'));
    console.log(chalk.gray(`   Experience Level: ${userProfile.experienceLevel}`));
    console.log(chalk.gray(`   Technologies: ${userProfile.technologies.join(', ') || 'None selected'}`));
    console.log(chalk.gray(`   Skill Score: ${userProfile.skillScore}/12\n`));

    console.log(chalk.bold('🔗 Connections:'));
    if (tokens.github.valid) console.log(chalk.green(`   ✓ GitHub (${tokens.github.username})`));
    if (tokens.linear.valid) console.log(chalk.green(`   ✓ Linear (${tokens.linear.name})`));
    if (tokens.supabase.valid) console.log(chalk.green(`   ✓ Supabase (${tokens.supabase.orgCount} orgs)`));
    if (tokens.fly.valid) console.log(chalk.green(`   ✓ Fly.io`));
    console.log();

    // Next steps based on chosen path
    console.log(chalk.bold('📚 Next Steps:\n'));

    if (projectPath === 'new') {
      console.log(chalk.cyan('  dovetail init "My Project"'), '  # Create a new project');
    } else if (projectPath === 'existing') {
      console.log(chalk.cyan('  git clone <your-repo>'));
      console.log(chalk.cyan('  cd <your-repo>'));
      console.log(chalk.cyan('  dovetail status'), '               # Check project status');
    } else if (projectPath === 'current') {
      console.log(chalk.cyan('  dovetail status'), '               # Check current project');
    }

    console.log(chalk.cyan('  dovetail --help'), '               # See all commands');
    console.log();

    console.log(chalk.bold.green('Happy coding! 🎉\n'));
  } catch (error) {
    logger.error(`Onboarding failed: ${error.message}`);
    process.exit(1);
  }
}
