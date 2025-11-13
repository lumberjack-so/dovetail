import simpleGit from 'simple-git';
import { execa } from 'execa';

// Helper to get git instance for current working directory
function getGit() {
  return simpleGit(process.cwd());
}

/**
 * Get current branch name
 */
export async function getCurrentBranch() {
  const status = await getGit().status();
  return status.current;
}

/**
 * Get remote URL
 */
export async function getRemoteUrl(remoteName = 'origin') {
  const remotes = await getGit().getRemotes(true);
  const remote = remotes.find(r => r.name === remoteName);
  return remote?.refs?.fetch || remote?.refs?.push || '';
}

/**
 * Check if repository is clean (no uncommitted changes)
 */
export async function isRepoClean() {
  const status = await getGit().status();
  return status.isClean();
}

/**
 * Get list of changed files
 */
export async function getChangedFiles() {
  const status = await getGit().status();
  return {
    modified: status.modified,
    created: status.created,
    deleted: status.deleted,
    renamed: status.renamed,
    staged: status.staged,
  };
}

/**
 * Create and checkout a new branch
 */
export async function createBranch(branchName) {
  await getGit().checkoutLocalBranch(branchName);
  return branchName;
}

/**
 * Commit changes with message
 */
export async function commit(message) {
  await getGit().add('.');
  await getGit().commit(message);
}

/**
 * Push to remote
 */
export async function push(branch, setUpstream = false) {
  if (setUpstream) {
    await getGit().push(['-u', 'origin', branch]);
  } else {
    await getGit().push();
  }
}

/**
 * Pull from remote
 */
export async function pull(branch = null) {
  if (branch) {
    await getGit().pull('origin', branch);
  } else {
    await getGit().pull();
  }
}

/**
 * Fetch from remote
 */
export async function fetch() {
  await getGit().fetch();
}

/**
 * Switch to branch
 */
export async function checkout(branch) {
  await getGit().checkout(branch);
}

/**
 * Merge branch into current
 */
export async function merge(branch, options = {}) {
  const args = [branch];
  if (options.squash) {
    args.unshift('--squash');
  }
  await getGit().merge(args);
}

/**
 * Delete branch
 */
export async function deleteBranch(branch, force = false) {
  await getGit().deleteLocalBranch(branch, force);
}

/**
 * Get commits ahead of origin
 */
export async function getCommitsAhead() {
  const status = await getGit().status();
  return status.ahead;
}

/**
 * Get commits behind origin
 */
export async function getCommitsBehind() {
  const status = await getGit().status();
  return status.behind;
}

/**
 * Get log of commits
 */
export async function getLog(options = {}) {
  const log = await getGit().log(options);
  return log.all;
}

/**
 * Get commits since last tag or specific ref
 */
export async function getCommitsSince(ref) {
  const log = await getGit().log({ from: ref, to: 'HEAD' });
  return log.all;
}

/**
 * Get list of merged branches
 */
export async function getMergedBranches(baseBranch = 'main') {
  const { stdout } = await execa('git', ['branch', '--merged', baseBranch]);
  return stdout
    .split('\n')
    .map(b => b.trim())
    .filter(b => b && !b.startsWith('*') && b !== baseBranch);
}

/**
 * Check if branch exists
 */
export async function branchExists(branchName) {
  const branches = await getGit().branchLocal();
  return branches.all.includes(branchName);
}

/**
 * Get default branch (main or master)
 */
export async function getDefaultBranch() {
  try {
    const { stdout } = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD']);
    return stdout.replace('refs/remotes/origin/', '').trim();
  } catch {
    // Fallback to main
    return 'main';
  }
}

/**
 * Initialize git repository
 */
export async function init() {
  await getGit().init();
}

/**
 * Check if remote exists
 */
export async function remoteExists(name) {
  try {
    const remotes = await getGit().getRemotes();
    return remotes.some(remote => remote.name === name);
  } catch {
    return false;
  }
}

/**
 * Add remote (or update if it already exists)
 */
export async function addRemote(name, url) {
  const exists = await remoteExists(name);
  if (exists) {
    // Update the remote URL instead of adding
    await getGit().remote(['set-url', name, url]);
  } else {
    await getGit().addRemote(name, url);
  }
}

/**
 * Get current commit hash
 */
export async function getCurrentCommit() {
  const log = await getGit().log({ maxCount: 1 });
  return log.latest.hash;
}

/**
 * Create tag
 */
export async function createTag(tagName, message) {
  await getGit().addTag(tagName);
  if (message) {
    await getGit().tag(['-a', tagName, '-m', message, '-f']);
  }
}

/**
 * Push tags
 */
export async function pushTags() {
  await getGit().pushTags();
}

/**
 * Get file diff
 */
export async function getDiff(file = null) {
  if (file) {
    return await getGit().diff([file]);
  }
  return await getGit().diff();
}

/**
 * Rebase current branch on another
 */
export async function rebase(branch) {
  await getGit().rebase([branch]);
}

/**
 * Check if inside git repository
 */
export async function isGitRepository() {
  try {
    await getGit().revparse(['--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}
