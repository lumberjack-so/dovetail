import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Check if a CLI is installed and working
 */
async function checkCLI(name, command, args = ['--version']) {
  try {
    await execa(command, args, { timeout: 5000 });
    return { installed: true, working: true };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { installed: false, working: false, error: 'Not installed' };
    }
    return { installed: true, working: false, error: error.message };
  }
}

/**
 * Check if a CLI command supports specific flags
 */
async function checkFlags(command, subcommands, flags) {
  try {
    const { stdout, stderr } = await execa(command, [...subcommands, '--help'], {
      reject: false,
      timeout: 5000
    });

    const output = (stdout + stderr).toLowerCase();
    const results = {};

    for (const flag of flags) {
      results[flag] = output.includes(`--${flag.toLowerCase()}`);
    }

    return results;
  } catch (error) {
    return null;
  }
}

/**
 * Check Linear API authentication
 */
async function checkLinearAuth() {
  try {
    const tokenPath = join(homedir(), '.linear_api_token');
    const apiKey = readFileSync(tokenPath, 'utf-8').trim();

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ viewer { id name email } }'
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return { authenticated: false, error: data.errors[0].message };
    }

    return {
      authenticated: true,
      user: data.data.viewer.name,
      email: data.data.viewer.email
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { authenticated: false, error: 'No API token found at ~/.linear_api_token' };
    }
    return { authenticated: false, error: error.message };
  }
}

/**
 * Run diagnostics on Dovetail environment
 */
export async function doctorCommand() {
  console.log(chalk.bold('\n🔍 Dovetail Doctor - Environment Diagnostics\n'));

  const results = {
    clis: {},
    flags: {},
    auth: {}
  };

  // Check CLI installations
  console.log(chalk.bold('Checking CLI installations...\n'));

  const clis = [
    { name: 'GitHub CLI', command: 'gh', args: ['--version'] },
    { name: 'Linearis', command: 'linearis', args: ['--version'] },
    { name: 'Supabase CLI', command: 'supabase', args: ['--version'] },
    { name: 'Fly.io CLI', command: 'flyctl', args: ['version'] },
    { name: 'Git', command: 'git', args: ['--version'] },
    { name: 'Node.js', command: 'node', args: ['--version'] },
    { name: 'npm', command: 'npm', args: ['--version'] }
  ];

  for (const cli of clis) {
    const spinner = ora(`Checking ${cli.name}...`).start();
    const result = await checkCLI(cli.name, cli.command, cli.args);
    results.clis[cli.name] = result;

    // Small delay to ensure spinner shows
    await new Promise(resolve => setTimeout(resolve, 10));

    if (result.installed && result.working) {
      spinner.succeed(chalk.green(`${cli.name} is installed and working`));
    } else if (result.installed && !result.working) {
      spinner.warn(chalk.yellow(`${cli.name} is installed but not working: ${result.error}`));
    } else {
      spinner.fail(chalk.red(`${cli.name} is not installed`));
    }
  }

  // Check critical CLI flags
  console.log(chalk.bold('\n\nChecking CLI command compatibility...\n'));

  const flagChecks = [
    {
      name: 'linearis issues list',
      command: 'linearis',
      subcommands: ['issues', 'list'],
      flags: ['limit'],
      shouldNotHave: ['team', 'project']
    },
    {
      name: 'linearis issues create',
      command: 'linearis',
      subcommands: ['issues', 'create'],
      flags: ['team', 'project', 'description', 'priority']
    },
    {
      name: 'flyctl apps create',
      command: 'flyctl',
      subcommands: ['apps', 'create'],
      flags: ['org', 'json'],
      shouldNotHave: ['region']
    },
    {
      name: 'gh repo create',
      command: 'gh',
      subcommands: ['repo', 'create'],
      flags: ['private', 'public'],
      shouldNotHave: ['json']
    },
    {
      name: 'gh repo view',
      command: 'gh',
      subcommands: ['repo', 'view'],
      flags: ['json']
    }
  ];

  for (const check of flagChecks) {
    if (!results.clis[check.name]?.installed) {
      continue; // Skip if CLI not installed
    }

    const spinner = ora(`Checking ${check.name} flags...`).start();
    const flagResults = await checkFlags(check.command, check.subcommands, [
      ...(check.flags || []),
      ...(check.shouldNotHave || [])
    ]);

    if (!flagResults) {
      spinner.warn(chalk.yellow(`Could not check ${check.name}`));
      continue;
    }

    let allGood = true;
    const issues = [];

    // Check expected flags
    if (check.flags) {
      for (const flag of check.flags) {
        if (!flagResults[flag]) {
          allGood = false;
          issues.push(`Missing --${flag}`);
        }
      }
    }

    // Check flags that shouldn't exist
    if (check.shouldNotHave) {
      for (const flag of check.shouldNotHave) {
        if (flagResults[flag]) {
          allGood = false;
          issues.push(`Has --${flag} (should not exist)`);
        }
      }
    }

    results.flags[check.name] = { supported: allGood, issues };

    if (allGood) {
      spinner.succeed(chalk.green(`${check.name} supports correct flags`));
    } else {
      spinner.fail(chalk.red(`${check.name} flag issues: ${issues.join(', ')}`));
    }
  }

  // Check authentication
  console.log(chalk.bold('\n\nChecking authentication...\n'));

  // GitHub
  const ghSpinner = ora('Checking GitHub authentication...').start();
  try {
    const { stdout } = await execa('gh', ['auth', 'status'], { reject: false });
    if (stdout.includes('Logged in')) {
      const match = stdout.match(/Logged in to github\.com account ([^\s]+)/);
      const user = match ? match[1] : 'unknown';
      results.auth.github = { authenticated: true, user };
      ghSpinner.succeed(chalk.green(`GitHub authenticated as ${user}`));
    } else {
      results.auth.github = { authenticated: false };
      ghSpinner.fail(chalk.red('GitHub not authenticated'));
    }
  } catch (error) {
    results.auth.github = { authenticated: false, error: error.message };
    ghSpinner.fail(chalk.red('GitHub authentication check failed'));
  }

  // Linear
  const linearSpinner = ora('Checking Linear authentication...').start();
  const linearAuth = await checkLinearAuth();
  results.auth.linear = linearAuth;

  if (linearAuth.authenticated) {
    linearSpinner.succeed(chalk.green(`Linear authenticated as ${linearAuth.user} (${linearAuth.email})`));
  } else {
    linearSpinner.fail(chalk.red(`Linear not authenticated: ${linearAuth.error}`));
  }

  // Supabase
  const supabaseSpinner = ora('Checking Supabase authentication...').start();
  try {
    await execa('supabase', ['projects', 'list'], { reject: false, timeout: 5000 });
    results.auth.supabase = { authenticated: true };
    supabaseSpinner.succeed(chalk.green('Supabase authenticated'));
  } catch (error) {
    results.auth.supabase = { authenticated: false };
    if (error.message.includes('not logged in')) {
      supabaseSpinner.fail(chalk.red('Supabase not authenticated'));
    } else {
      supabaseSpinner.warn(chalk.yellow('Supabase authentication unknown'));
    }
  }

  // Fly.io
  const flySpinner = ora('Checking Fly.io authentication...').start();
  try {
    const { stdout } = await execa('flyctl', ['auth', 'whoami'], { reject: false, timeout: 5000 });
    if (stdout && !stdout.includes('not logged in')) {
      results.auth.flyio = { authenticated: true, email: stdout.trim() };
      flySpinner.succeed(chalk.green(`Fly.io authenticated as ${stdout.trim()}`));
    } else {
      results.auth.flyio = { authenticated: false };
      flySpinner.fail(chalk.red('Fly.io not authenticated'));
    }
  } catch (error) {
    results.auth.flyio = { authenticated: false };
    flySpinner.warn(chalk.yellow('Fly.io authentication unknown'));
  }

  // Test Dovetail commands E2E
  console.log(chalk.bold('\n\nTesting Dovetail commands (E2E)...\n'));

  results.commands = {};

  // Test Linear API integration
  const linearApiSpinner = ora('Testing Linear API (list teams)...').start();
  try {
    const { listTeams } = await import('../cli/linear-api.js');
    const teams = await listTeams();
    results.commands.linearListTeams = { working: true, teamsCount: teams.length };
    linearApiSpinner.succeed(chalk.green(`Linear API working (found ${teams.length} team(s))`));
  } catch (error) {
    results.commands.linearListTeams = { working: false, error: error.message };
    linearApiSpinner.fail(chalk.red(`Linear API failed: ${error.message}`));
  }

  // Test Linear API - list issues (if we have a saved config)
  const linearIssuesSpinner = ora('Testing Linear API (list issues)...').start();
  try {
    const { readConfig } = await import('../utils/state.js');
    const config = await readConfig();

    if (config.linearTeamKey) {
      const { getTeamByKey, createProject, listIssues } = await import('../cli/linear-api.js');
      const team = await getTeamByKey(config.linearTeamKey);

      // Try to list issues from any project
      // Note: We can't test project creation without actually creating one
      results.commands.linearGetTeam = { working: true, teamId: team.id };
      linearIssuesSpinner.succeed(chalk.green(`Linear team lookup working (team: ${config.linearTeamKey})`));
    } else {
      results.commands.linearGetTeam = { working: false, error: 'No team key in config' };
      linearIssuesSpinner.warn(chalk.yellow('Linear team lookup skipped (no team key set)'));
    }
  } catch (error) {
    results.commands.linearGetTeam = { working: false, error: error.message };
    linearIssuesSpinner.fail(chalk.red(`Linear team lookup failed: ${error.message}`));
  }

  // Test linearis CLI integration
  const linearisSpinner = ora('Testing linearis CLI (projects list)...').start();
  try {
    const { listProjects } = await import('../cli/linearis.js');
    const projects = await listProjects();
    results.commands.linearisListProjects = { working: true, projectsCount: projects.length };
    linearisSpinner.succeed(chalk.green(`linearis CLI working (found ${projects.length} project(s))`));
  } catch (error) {
    results.commands.linearisListProjects = { working: false, error: error.message };
    linearisSpinner.fail(chalk.red(`linearis CLI failed: ${error.message}`));
  }

  // Test GitHub CLI integration
  const ghCmdSpinner = ora('Testing GitHub CLI (list repos)...').start();
  try {
    const { stdout } = await execa('gh', ['repo', 'list', '--limit', '1', '--json', 'name'], {
      reject: false,
      timeout: 10000
    });
    const repos = JSON.parse(stdout);
    results.commands.ghListRepos = { working: true, reposCount: repos.length };
    ghCmdSpinner.succeed(chalk.green('GitHub CLI working'));
  } catch (error) {
    results.commands.ghListRepos = { working: false, error: error.message };
    ghCmdSpinner.fail(chalk.red(`GitHub CLI failed: ${error.message}`));
  }

  // Test Supabase CLI integration
  const supabaseCmdSpinner = ora('Testing Supabase CLI (list projects)...').start();
  try {
    const { listProjects } = await import('../cli/supabase.js');
    const projects = await listProjects();
    results.commands.supabaseListProjects = { working: true, projectsCount: projects.length };
    supabaseCmdSpinner.succeed(chalk.green(`Supabase CLI working (found ${projects.length} project(s))`));
  } catch (error) {
    results.commands.supabaseListProjects = { working: false, error: error.message };
    supabaseCmdSpinner.fail(chalk.red(`Supabase CLI failed: ${error.message}`));
  }

  // Test Fly.io CLI integration
  const flyCmdSpinner = ora('Testing Fly.io CLI (list apps)...').start();
  try {
    const { listApps } = await import('../cli/flyctl.js');
    const apps = await listApps();
    results.commands.flyListApps = { working: true, appsCount: apps.length };
    flyCmdSpinner.succeed(chalk.green(`Fly.io CLI working (found ${apps.length} app(s))`));
  } catch (error) {
    results.commands.flyListApps = { working: false, error: error.message };
    flyCmdSpinner.fail(chalk.red(`Fly.io CLI failed: ${error.message}`));
  }

  // Test state management
  const stateSpinner = ora('Testing state management...').start();
  try {
    const { readConfig, writeConfig } = await import('../utils/state.js');
    const config = await readConfig();

    // Test write/read cycle
    const testKey = '__doctor_test__';
    const testValue = Date.now().toString();
    await writeConfig({ ...config, [testKey]: testValue });

    const updatedConfig = await readConfig();
    if (updatedConfig[testKey] === testValue) {
      // Clean up
      delete updatedConfig[testKey];
      await writeConfig(updatedConfig);

      results.commands.stateManagement = { working: true };
      stateSpinner.succeed(chalk.green('State management working'));
    } else {
      results.commands.stateManagement = { working: false, error: 'Config write/read mismatch' };
      stateSpinner.fail(chalk.red('State management failed: write/read mismatch'));
    }
  } catch (error) {
    results.commands.stateManagement = { working: false, error: error.message };
    stateSpinner.fail(chalk.red(`State management failed: ${error.message}`));
  }

  // Test dovetail config command
  const configCmdSpinner = ora('Testing dovetail config command...').start();
  try {
    const { stdout, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'config',
      '--show'
    ], {
      reject: false,
      timeout: 10000
    });

    if (exitCode === 0 && stdout.includes('Dovetail Preferences')) {
      results.commands.configCommand = { working: true };
      configCmdSpinner.succeed(chalk.green('dovetail config command working'));
    } else {
      results.commands.configCommand = { working: false, error: `Exit code: ${exitCode}` };
      configCmdSpinner.fail(chalk.red('dovetail config command failed'));
    }
  } catch (error) {
    results.commands.configCommand = { working: false, error: error.message };
    configCmdSpinner.fail(chalk.red(`dovetail config command failed: ${error.message}`));
  }

  // Test dovetail status command (should handle being outside a project)
  const statusCmdSpinner = ora('Testing dovetail status command...').start();
  try {
    const { stdout, stderr, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'status'
    ], {
      reject: false,
      timeout: 10000,
      cwd: '/tmp' // Run in temp dir where there's no project
    });

    const output = stdout + stderr;
    // Should exit with code 0 or 1 and show "Not in a Dovetail project" message
    if ((exitCode === 0 || exitCode === 1) && output.includes('Not in a Dovetail project')) {
      results.commands.statusCommand = { working: true };
      statusCmdSpinner.succeed(chalk.green('dovetail status command working'));
    } else {
      results.commands.statusCommand = { working: false, error: `Unexpected behavior: exit ${exitCode}` };
      statusCmdSpinner.fail(chalk.red('dovetail status command unexpected behavior'));
    }
  } catch (error) {
    results.commands.statusCommand = { working: false, error: error.message };
    statusCmdSpinner.fail(chalk.red(`dovetail status command failed: ${error.message}`));
  }

  // Test dovetail onboard command
  const onboardCmdSpinner = ora('Testing dovetail onboard command...').start();
  try {
    const { stdout, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'onboard'
    ], {
      reject: false,
      timeout: 10000,
      input: '\n' // Send enter to exit immediately
    });

    if (exitCode === 0 && stdout.includes('Dovetail Onboarding')) {
      results.commands.onboardCommand = { working: true };
      onboardCmdSpinner.succeed(chalk.green('dovetail onboard command working'));
    } else {
      results.commands.onboardCommand = { working: false, error: `Exit code: ${exitCode}` };
      onboardCmdSpinner.fail(chalk.red('dovetail onboard command failed'));
    }
  } catch (error) {
    results.commands.onboardCommand = { working: false, error: error.message };
    onboardCmdSpinner.fail(chalk.red(`dovetail onboard command failed: ${error.message}`));
  }

  // Test dovetail adopt command (should fail gracefully outside a git repo)
  const adoptCmdSpinner = ora('Testing dovetail adopt command...').start();
  try {
    const { stderr, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'adopt'
    ], {
      reject: false,
      timeout: 10000,
      cwd: '/tmp' // Run in temp dir with no git repo
    });

    // Should exit with non-zero code and show helpful error
    if (exitCode !== 0 && (stderr.includes('Not a git repository') || stderr.includes('git'))) {
      results.commands.adoptCommand = { working: true };
      adoptCmdSpinner.succeed(chalk.green('dovetail adopt command working'));
    } else {
      results.commands.adoptCommand = { working: false, error: `Unexpected behavior: exit ${exitCode}` };
      adoptCmdSpinner.fail(chalk.red('dovetail adopt command unexpected behavior'));
    }
  } catch (error) {
    results.commands.adoptCommand = { working: false, error: error.message };
    adoptCmdSpinner.fail(chalk.red(`dovetail adopt command failed: ${error.message}`));
  }

  // Test dovetail start command (should fail gracefully outside a project)
  const startCmdSpinner = ora('Testing dovetail start command...').start();
  try {
    const { stderr, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'start'
    ], {
      reject: false,
      timeout: 10000,
      cwd: '/tmp'
    });

    // Should exit with non-zero code and show project error
    if (exitCode !== 0 && (stderr.includes('Not in a Dovetail project') || stderr.includes('state.json'))) {
      results.commands.startCommand = { working: true };
      startCmdSpinner.succeed(chalk.green('dovetail start command working'));
    } else {
      results.commands.startCommand = { working: false, error: `Unexpected behavior: exit ${exitCode}` };
      startCmdSpinner.fail(chalk.red('dovetail start command unexpected behavior'));
    }
  } catch (error) {
    results.commands.startCommand = { working: false, error: error.message };
    startCmdSpinner.fail(chalk.red(`dovetail start command failed: ${error.message}`));
  }

  // Test dovetail test command (should handle being outside a project)
  const testCmdSpinner = ora('Testing dovetail test command...').start();
  try {
    const { stderr, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'test',
      '--help'
    ], {
      reject: false,
      timeout: 10000
    });

    // Should show help text
    if (exitCode === 0 && (stderr.includes('Usage:') || stderr.includes('test'))) {
      results.commands.testCommand = { working: true };
      testCmdSpinner.succeed(chalk.green('dovetail test command working'));
    } else {
      results.commands.testCommand = { working: false, error: `Exit code: ${exitCode}` };
      testCmdSpinner.fail(chalk.red('dovetail test command failed'));
    }
  } catch (error) {
    results.commands.testCommand = { working: false, error: error.message };
    testCmdSpinner.fail(chalk.red(`dovetail test command failed: ${error.message}`));
  }

  // Test dovetail check command (should handle being outside a project)
  const checkCmdSpinner = ora('Testing dovetail check command...').start();
  try {
    const { stderr, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'check'
    ], {
      reject: false,
      timeout: 10000,
      cwd: '/tmp'
    });

    // Should exit with error about not being in a project
    if (exitCode !== 0 && (stderr.includes('Not in a Dovetail project') || stderr.includes('state.json'))) {
      results.commands.checkCommand = { working: true };
      checkCmdSpinner.succeed(chalk.green('dovetail check command working'));
    } else {
      results.commands.checkCommand = { working: false, error: `Unexpected behavior: exit ${exitCode}` };
      checkCmdSpinner.fail(chalk.red('dovetail check command unexpected behavior'));
    }
  } catch (error) {
    results.commands.checkCommand = { working: false, error: error.message };
    checkCmdSpinner.fail(chalk.red(`dovetail check command failed: ${error.message}`));
  }

  // Test dovetail ready command (should handle being outside a project)
  const readyCmdSpinner = ora('Testing dovetail ready command...').start();
  try {
    const { stderr, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'ready'
    ], {
      reject: false,
      timeout: 10000,
      cwd: '/tmp'
    });

    // Should exit with error about not being in a project
    if (exitCode !== 0 && (stderr.includes('Not in a Dovetail project') || stderr.includes('state.json'))) {
      results.commands.readyCommand = { working: true };
      readyCmdSpinner.succeed(chalk.green('dovetail ready command working'));
    } else {
      results.commands.readyCommand = { working: false, error: `Unexpected behavior: exit ${exitCode}` };
      readyCmdSpinner.fail(chalk.red('dovetail ready command unexpected behavior'));
    }
  } catch (error) {
    results.commands.readyCommand = { working: false, error: error.message };
    readyCmdSpinner.fail(chalk.red(`dovetail ready command failed: ${error.message}`));
  }

  // Test dovetail sync command (should handle being outside a project)
  const syncCmdSpinner = ora('Testing dovetail sync command...').start();
  try {
    const { stderr, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'sync'
    ], {
      reject: false,
      timeout: 10000,
      cwd: '/tmp'
    });

    // Should exit with error about not being in a project
    if (exitCode !== 0 && (stderr.includes('Not in a Dovetail project') || stderr.includes('state.json'))) {
      results.commands.syncCommand = { working: true };
      syncCmdSpinner.succeed(chalk.green('dovetail sync command working'));
    } else {
      results.commands.syncCommand = { working: false, error: `Unexpected behavior: exit ${exitCode}` };
      syncCmdSpinner.fail(chalk.red('dovetail sync command unexpected behavior'));
    }
  } catch (error) {
    results.commands.syncCommand = { working: false, error: error.message };
    syncCmdSpinner.fail(chalk.red(`dovetail sync command failed: ${error.message}`));
  }

  // Test dovetail migrate command (should show help)
  const migrateCmdSpinner = ora('Testing dovetail migrate command...').start();
  try {
    const { stderr, exitCode } = await execa('node', [
      join(new URL('../..', import.meta.url).pathname, 'bin/dovetail.js'),
      'migrate',
      '--help'
    ], {
      reject: false,
      timeout: 10000
    });

    // Should show help text
    if (exitCode === 0 && (stderr.includes('Usage:') || stderr.includes('migrate'))) {
      results.commands.migrateCommand = { working: true };
      migrateCmdSpinner.succeed(chalk.green('dovetail migrate command working'));
    } else {
      results.commands.migrateCommand = { working: false, error: `Exit code: ${exitCode}` };
      migrateCmdSpinner.fail(chalk.red('dovetail migrate command failed'));
    }
  } catch (error) {
    results.commands.migrateCommand = { working: false, error: error.message };
    migrateCmdSpinner.fail(chalk.red(`dovetail migrate command failed: ${error.message}`));
  }

  // Summary
  console.log(chalk.bold('\n\n📊 Summary\n'));

  const cliIssues = Object.values(results.clis).filter(r => !r.installed || !r.working).length;
  const flagIssues = Object.values(results.flags).filter(r => !r.supported).length;
  const authIssues = Object.values(results.auth).filter(r => !r.authenticated).length;
  const commandIssues = Object.values(results.commands).filter(r => !r.working).length;

  const totalIssues = cliIssues + flagIssues + authIssues + commandIssues;

  if (totalIssues === 0) {
    console.log(chalk.green('✓ All checks passed! Your Dovetail environment is healthy.'));
  } else {
    console.log(chalk.yellow(`⚠ Found ${totalIssues} issue(s):\n`));

    if (cliIssues > 0) {
      console.log(chalk.red(`  ${cliIssues} CLI installation issue(s)`));
    }
    if (flagIssues > 0) {
      console.log(chalk.red(`  ${flagIssues} CLI compatibility issue(s)`));
    }
    if (authIssues > 0) {
      console.log(chalk.red(`  ${authIssues} authentication issue(s)`));
    }
    if (commandIssues > 0) {
      console.log(chalk.red(`  ${commandIssues} command integration issue(s)`));
    }

    console.log(chalk.dim('\nRun `dovetail config` to fix authentication issues.'));
    console.log(chalk.dim('Run `dovetail onboard` for installation help.'));
  }

  console.log();

  return results;
}
