import { Octokit } from 'octokit';
import { getConfig } from '../utils/config.js';

let octokit = null;

/**
 * Initialize Octokit with token
 */
async function getOctokit() {
  if (!octokit) {
    const token = await getConfig('githubToken', 'GITHUB_TOKEN');
    if (!token) {
      throw new Error('GitHub token not configured');
    }
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

/**
 * Create a new repository
 */
export async function createRepository(name, options = {}) {
  const client = await getOctokit();
  const response = await client.rest.repos.createForAuthenticatedUser({
    name,
    private: !options.public,
    description: options.description || '',
    auto_init: false,
  });
  return response.data;
}

/**
 * Get authenticated user
 */
export async function getAuthenticatedUser() {
  const client = await getOctokit();
  const response = await client.rest.users.getAuthenticated();
  return response.data;
}

/**
 * Create a pull request
 */
export async function createPullRequest(owner, repo, options) {
  const client = await getOctokit();
  const response = await client.rest.pulls.create({
    owner,
    repo,
    title: options.title,
    head: options.head,
    base: options.base || 'main',
    body: options.body || '',
    draft: options.draft || false,
  });
  return response.data;
}

/**
 * Update a pull request
 */
export async function updatePullRequest(owner, repo, pullNumber, options) {
  const client = await getOctokit();
  const response = await client.rest.pulls.update({
    owner,
    repo,
    pull_number: pullNumber,
    title: options.title,
    body: options.body,
    state: options.state,
  });
  return response.data;
}

/**
 * Get pull request by branch
 */
export async function getPullRequestByBranch(owner, repo, branch) {
  const client = await getOctokit();
  const response = await client.rest.pulls.list({
    owner,
    repo,
    head: `${owner}:${branch}`,
    state: 'open',
  });
  return response.data[0] || null;
}

/**
 * Merge a pull request
 */
export async function mergePullRequest(owner, repo, pullNumber, options = {}) {
  const client = await getOctokit();
  const response = await client.rest.pulls.merge({
    owner,
    repo,
    pull_number: pullNumber,
    merge_method: options.method || 'squash',
    commit_title: options.title,
    commit_message: options.message,
  });
  return response.data;
}

/**
 * Get CI status for a commit
 */
export async function getCommitStatus(owner, repo, ref) {
  const client = await getOctokit();

  try {
    // Get check runs
    const checkRuns = await client.rest.checks.listForRef({
      owner,
      repo,
      ref,
    });

    // Get commit status
    const status = await client.rest.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref,
    });

    const checksPassing = checkRuns.data.check_runs.every(
      run => run.conclusion === 'success' || run.conclusion === 'skipped'
    );
    const statusPassing = status.data.state === 'success' || status.data.statuses.length === 0;

    return {
      passing: checksPassing && statusPassing,
      checks: checkRuns.data.check_runs,
      status: status.data,
    };
  } catch (error) {
    // If no checks/status, assume passing
    return { passing: true, checks: [], status: null };
  }
}

/**
 * Create a release
 */
export async function createRelease(owner, repo, options) {
  const client = await getOctokit();
  const response = await client.rest.repos.createRelease({
    owner,
    repo,
    tag_name: options.tag,
    name: options.name || options.tag,
    body: options.body || '',
    draft: options.draft || false,
    prerelease: options.prerelease || false,
  });
  return response.data;
}

/**
 * Get latest release
 */
export async function getLatestRelease(owner, repo) {
  const client = await getOctokit();
  try {
    const response = await client.rest.repos.getLatestRelease({
      owner,
      repo,
    });
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Parse GitHub URL to owner/repo
 */
export function parseGitHubUrl(url) {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }
  return {
    owner: match[1],
    repo: match[2],
  };
}

/**
 * Get repository info
 */
export async function getRepository(owner, repo) {
  const client = await getOctokit();
  const response = await client.rest.repos.get({
    owner,
    repo,
  });
  return response.data;
}

/**
 * Delete a branch
 */
export async function deleteBranch(owner, repo, branch) {
  const client = await getOctokit();
  await client.rest.git.deleteRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
}
