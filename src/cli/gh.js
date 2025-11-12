import { execa } from 'execa';
import chalk from 'chalk';

/**
 * Execute a GitHub CLI command
 * @param {Array<string>} args - Command arguments
 * @param {Object} options - Options (stdin, cwd, etc.)
 * @returns {Promise<Object>} - { stdout, stderr, success }
 */
export async function execGh(args, options = {}) {
  try {
    const { stdout, stderr, exitCode } = await execa('gh', args, {
      reject: false,
      ...options
    });

    if (exitCode !== 0) {
      // Check for common errors
      if (stderr.includes('not logged in') || stderr.includes('authentication')) {
        throw new Error(
          'GitHub CLI not authenticated.\n\n' +
          'Run: gh auth login'
        );
      }

      if (stderr.includes('Not Found') || stderr.includes('Could not resolve to a Repository')) {
        throw new Error(`Repository not found. Check that you have access to it.`);
      }

      if (stderr.includes('permission') || stderr.includes('forbidden')) {
        throw new Error(
          `GitHub permission denied.\n\n` +
          `You may need to grant additional scopes:\n` +
          `  gh auth refresh -s repo -s project -s admin:org`
        );
      }

      throw new Error(`GitHub CLI command failed:\n${stderr || stdout}`);
    }

    return { stdout, stderr, success: true };
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('command not found')) {
      throw new Error(
        'GitHub CLI not installed.\n\n' +
        'Install it from: https://cli.github.com/\n' +
        '  macOS:   brew install gh\n' +
        '  Windows: winget install --id GitHub.cli'
      );
    }
    throw error;
  }
}

/**
 * Check authentication status
 */
export async function checkAuth() {
  try {
    const { stdout } = await execGh(['auth', 'status']);
    return { authenticated: true, info: stdout };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const { stdout } = await execGh(['api', 'user', '--jq', '.login']);
  return stdout.trim();
}

/**
 * Create a repository
 */
export async function createRepo(name, options = {}) {
  const args = ['repo', 'create', name];

  if (options.private) {
    args.push('--private');
  } else {
    args.push('--public');
  }

  if (options.description) {
    args.push('--description', options.description);
  }

  // Create the repository
  await execGh(args);

  // Get repository details using gh api
  // Format: owner/name - need to get current user if not specified
  const owner = options.owner || await getCurrentUser();
  const repoFullName = `${owner}/${name}`;

  // Fetch repo details
  const { stdout } = await execGh([
    'repo',
    'view',
    repoFullName,
    '--json',
    'name,owner,url'
  ]);

  return JSON.parse(stdout);
}

/**
 * View repository details
 */
export async function viewRepo(repo) {
  const { stdout } = await execGh([
    'repo',
    'view',
    repo,
    '--json',
    'name,owner,url,defaultBranchRef,isPrivate'
  ]);
  return JSON.parse(stdout);
}

/**
 * Set a repository secret
 */
export async function setSecret(repo, name, value) {
  await execGh([
    'secret',
    'set',
    name,
    '--repo', repo,
    '--body', value
  ]);
}

/**
 * Create a pull request
 */
export async function createPr(options) {
  const args = [
    'pr',
    'create',
    '--json', 'url,number,title'
  ];

  if (options.title) {
    args.push('--title', options.title);
  }

  if (options.body) {
    args.push('--body', options.body);
  }

  if (options.base) {
    args.push('--base', options.base);
  }

  if (options.head) {
    args.push('--head', options.head);
  }

  const { stdout } = await execGh(args);
  return JSON.parse(stdout);
}

/**
 * Merge a pull request
 */
export async function mergePr(prNumber, options = {}) {
  const args = ['pr', 'merge', String(prNumber)];

  if (options.squash) {
    args.push('--squash');
  } else if (options.rebase) {
    args.push('--rebase');
  } else {
    args.push('--merge');
  }

  if (options.auto) {
    args.push('--auto');
  }

  if (options.delete) {
    args.push('--delete-branch');
  }

  await execGh(args);
}

/**
 * List pull requests
 */
export async function listPrs(options = {}) {
  const args = [
    'pr',
    'list',
    '--json', 'number,title,state,url,headRefName'
  ];

  if (options.state) {
    args.push('--state', options.state);
  }

  if (options.limit) {
    args.push('--limit', String(options.limit));
  }

  const { stdout } = await execGh(args);
  return JSON.parse(stdout);
}

/**
 * Get current repository (from git remote)
 */
export async function getCurrentRepo() {
  try {
    const { stdout } = await execGh(['repo', 'view', '--json', 'name,owner']);
    return JSON.parse(stdout);
  } catch (error) {
    return null;
  }
}
