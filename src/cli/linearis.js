import { execa } from 'execa';
import chalk from 'chalk';

/**
 * Execute a Linearis CLI command
 * @param {string} command - The linearis subcommand (e.g., 'issue', 'project')
 * @param {string} action - The action (e.g., 'ls', 'create', 'show')
 * @param {Array<string>} args - Additional arguments
 * @param {Object} options - Options (stdin, etc.)
 * @returns {Promise<Object>} - { stdout, stderr, success }
 */
export async function execLinearis(command, action, args = [], options = {}) {
  const fullArgs = [command, action, ...args];

  try {
    const { stdout, stderr, exitCode } = await execa('linearis', fullArgs, {
      reject: false,
      ...options
    });

    if (exitCode !== 0) {
      // Check for common errors
      if (stderr.includes('Unauthorized') || stderr.includes('API key') || stderr.includes('authentication')) {
        throw new Error(
          'Linearis not authenticated.\n\n' +
          'Get your Linear API key at: https://linear.app/settings/api\n' +
          'Then run: export LINEAR_API_KEY=<your-key>\n' +
          'Or create ~/.linearisrc.json with: { "apiKey": "<your-key>" }'
        );
      }

      if (stderr.includes('not found') && stderr.includes('team')) {
        throw new Error(`Linear team not found. Check your team ID in .dovetail/state.json`);
      }

      if (stderr.includes('not found') && stderr.includes('project')) {
        throw new Error(`Linear project not found. Check your project ID in .dovetail/state.json`);
      }

      throw new Error(`Linearis command failed:\n${stderr || stdout}`);
    }

    return { stdout, stderr, success: true };
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('command not found')) {
      throw new Error(
        'Linearis CLI not installed.\n\n' +
        'Install it with: npm install -g linearis'
      );
    }
    throw error;
  }
}

/**
 * List issues in a Linear project
 */
export async function listIssues(teamId, projectId, options = {}) {
  const args = [
    '--team', teamId,
    '--json'
  ];

  if (projectId) {
    args.push('--project', projectId);
  }

  if (options.stateType) {
    const stateTypes = Array.isArray(options.stateType) ? options.stateType : [options.stateType];
    stateTypes.forEach(type => {
      args.push('--state-type', type);
    });
  }

  if (options.limit) {
    args.push('--limit', String(options.limit));
  }

  const { stdout } = await execLinearis('issue', 'ls', args);
  return JSON.parse(stdout);
}

/**
 * Show a single issue
 */
export async function showIssue(issueKey) {
  const { stdout } = await execLinearis('issue', 'show', [issueKey, '--json']);
  return JSON.parse(stdout);
}

/**
 * Create a new issue
 */
export async function createIssue(teamId, data) {
  const args = [
    '--team', teamId,
    '--title', data.title,
    '--json'
  ];

  if (data.projectId) {
    args.push('--project', data.projectId);
  }

  if (data.description) {
    args.push('--description', data.description);
  }

  if (data.priority) {
    args.push('--priority', String(data.priority));
  }

  if (data.stateId) {
    args.push('--state-id', data.stateId);
  }

  const { stdout } = await execLinearis('issue', 'create', args);
  return JSON.parse(stdout);
}

/**
 * Update an issue
 */
export async function updateIssue(issueKey, updates) {
  const args = [issueKey, '--json'];

  if (updates.stateId) {
    args.push('--state-id', updates.stateId);
  }

  if (updates.title) {
    args.push('--title', updates.title);
  }

  if (updates.description) {
    args.push('--description', updates.description);
  }

  if (updates.priority) {
    args.push('--priority', String(updates.priority));
  }

  const { stdout } = await execLinearis('issue', 'update', args);
  return JSON.parse(stdout);
}

/**
 * Add a comment to an issue
 */
export async function commentOnIssue(issueKey, body) {
  const { stdout } = await execLinearis('issue', 'comment', [
    issueKey,
    '--body', body,
    '--json'
  ]);
  return JSON.parse(stdout);
}

/**
 * List workflow states for a team
 */
export async function listWorkflowStates(teamId) {
  const { stdout } = await execLinearis('workflow-state', 'ls', [
    '--team', teamId,
    '--json'
  ]);
  return JSON.parse(stdout);
}

/**
 * Check authentication status
 */
export async function checkAuth() {
  try {
    await execLinearis('team', 'ls', ['--json']);
    return { authenticated: true };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}

/**
 * List teams
 */
export async function listTeams() {
  const { stdout } = await execLinearis('team', 'ls', ['--json']);
  return JSON.parse(stdout);
}

/**
 * List projects for a team
 */
export async function listProjects(teamId) {
  const { stdout } = await execLinearis('project', 'ls', [
    '--team', teamId,
    '--json'
  ]);
  return JSON.parse(stdout);
}
