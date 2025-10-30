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
  try {
    const response = await client.rest.repos.createForAuthenticatedUser({
      name,
      private: !options.public,
      description: options.description || '',
      auto_init: false,
    });
    return response.data;
  } catch (error) {
    if (error.message && error.message.includes('Resource not accessible')) {
      throw new Error(
        'GitHub token lacks repository creation permissions.\n\n' +
        'Your token needs the "repo" scope. To fix:\n' +
        '1. Go to https://github.com/settings/tokens\n' +
        '2. Click on your token or create a new one\n' +
        '3. Select the "repo" scope (full control of private repositories)\n' +
        '4. Update your token: dovetail config\n\n' +
        'For more details: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
      );
    }
    throw error;
  }
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
 * Test GitHub token and check scopes
 */
export async function testGitHubToken() {
  try {
    const client = await getOctokit();

    // Get authenticated user
    const userResponse = await client.rest.users.getAuthenticated();

    // Get token scopes from headers (Octokit doesn't expose this directly)
    // We'll test actual permissions instead
    const permissions = {
      user: true, // We got here, so user scope works
      repo: false,
    };

    // Test repo creation permission by checking if we can list repos
    try {
      await client.rest.repos.listForAuthenticatedUser({ per_page: 1 });
      permissions.repo = true;
    } catch (error) {
      permissions.repo = false;
    }

    return {
      valid: true,
      username: userResponse.data.login,
      permissions,
      hasRepoAccess: permissions.repo,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Get user's organizations
 */
export async function getUserOrganizations() {
  const client = await getOctokit();
  const response = await client.rest.orgs.listForAuthenticatedUser({
    per_page: 100,
  });
  return response.data;
}

/**
 * Create a repository in an organization
 */
export async function createOrganizationRepository(org, name, options = {}) {
  const client = await getOctokit();
  try {
    const response = await client.rest.repos.createInOrg({
      org,
      name,
      private: !options.public,
      description: options.description || '',
      auto_init: false,
    });
    return response.data;
  } catch (error) {
    if (error.message && error.message.includes('Resource not accessible')) {
      throw new Error(
        `GitHub token lacks permission to create repositories in the "${org}" organization.\n\n` +
        'Your token needs the "repo" scope. To fix:\n' +
        '1. Go to https://github.com/settings/tokens\n' +
        '2. Click on your token or create a new one\n' +
        '3. Select the "repo" scope (full control of private repositories)\n' +
        '4. Update your token: dovetail config\n\n' +
        'For more details: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
      );
    }
    throw error;
  }
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

/**
 * Delete a repository
 */
export async function deleteRepository(owner, repo) {
  const client = await getOctokit();
  await client.rest.repos.delete({
    owner,
    repo,
  });
}

/**
 * Get repository public key for secrets
 */
export async function getRepositoryPublicKey(owner, repo) {
  const client = await getOctokit();
  const response = await client.rest.actions.getRepoPublicKey({
    owner,
    repo,
  });
  return response.data;
}

/**
 * Create or update a repository secret
 */
export async function createRepositorySecret(owner, repo, secretName, secretValue) {
  const client = await getOctokit();

  // Get the repository's public key
  const { key, key_id } = await getRepositoryPublicKey(owner, repo);

  // Encrypt the secret using tweetnacl
  // Note: This requires tweetnacl to be installed: npm install tweetnacl tweetnacl-util
  let encryptedValue;
  try {
    const { default: nacl } = await import('tweetnacl');
    const naclUtil = await import('tweetnacl-util');

    // Convert the secret and key to Uint8Array
    const messageBytes = naclUtil.decodeUTF8(secretValue);
    const keyBytes = naclUtil.decodeBase64(key);

    // Encrypt the secret using box seal (public key encryption)
    const encryptedBytes = nacl.seal(messageBytes, keyBytes);

    // Convert encrypted bytes to base64
    encryptedValue = naclUtil.encodeBase64(encryptedBytes);
  } catch (error) {
    throw new Error(
      'Failed to encrypt secret. Make sure tweetnacl is installed:\n' +
      'npm install tweetnacl tweetnacl-util\n\n' +
      `Original error: ${error.message}`
    );
  }

  // Create or update the secret
  await client.rest.actions.createOrUpdateRepoSecret({
    owner,
    repo,
    secret_name: secretName,
    encrypted_value: encryptedValue,
    key_id,
  });
}

/**
 * Create multiple repository secrets
 */
export async function createRepositorySecrets(owner, repo, secrets) {
  const results = [];
  for (const [name, value] of Object.entries(secrets)) {
    try {
      await createRepositorySecret(owner, repo, name, value);
      results.push({ name, success: true });
    } catch (error) {
      results.push({ name, success: false, error: error.message });
    }
  }
  return results;
}
