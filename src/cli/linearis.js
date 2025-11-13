import { execa } from 'execa';
import chalk from 'chalk';

/**
 * Execute a Linearis CLI command
 * @param {Array<string>} args - Command arguments
 * @param {Object} options - Options (stdin, etc.)
 * @returns {Promise<Object>} - { stdout, stderr, success }
 */
export async function execLinearis(args = [], options = {}) {
  try {
    const { stdout, stderr, exitCode } = await execa('linearis', args, {
      reject: false,
      ...options
    });

    if (exitCode !== 0) {
      // Check for common errors
      if (stderr.includes('Unauthorized') || stderr.includes('API key') || stderr.includes('authentication')) {
        throw new Error(
          'Linearis not authenticated.\n\n' +
          'Get your Linear API key at: https://linear.app/settings/api\n' +
          'Then set LINEAR_API_KEY environment variable:\n' +
          '  export LINEAR_API_KEY=<your-key>\n' +
          'Or create ~/.linearisrc.json with:\n' +
          '  { "apiKey": "<your-key>" }'
        );
      }

      if (stderr.includes('not found') && stderr.includes('team')) {
        throw new Error(`Linear team not found. Check your team ID or name.`);
      }

      if (stderr.includes('not found') && stderr.includes('project')) {
        throw new Error(`Linear project not found. Check your project ID or name.`);
      }

      throw new Error(`Linearis command failed:\n${stderr || stdout}`);
    }

    return { stdout, stderr, success: true };
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('command not found')) {
      throw new Error(
        'Linearis CLI not installed.\n\n' +
        'Install it with: npm install -g linearis\n' +
        'Repository: https://github.com/czottmann/linearis'
      );
    }
    throw error;
  }
}

/**
 * List issues in a Linear team/project
 */
export async function listIssues(teamId, projectId, options = {}) {
  const args = ['issues', 'list'];

  // Use limit flag (linearis uses -l or --limit)
  if (options.limit) {
    args.push('-l', String(options.limit));
  } else {
    args.push('-l', '50'); // Default limit
  }

  // Add team filter if specified
  if (teamId) {
    args.push('--team', teamId);
  }

  // Add project filter if specified
  if (projectId) {
    args.push('--project', projectId);
  }

  const { stdout } = await execLinearis(args);
  return JSON.parse(stdout);
}

/**
 * Search issues
 */
export async function searchIssues(query, options = {}) {
  const args = ['issues', 'search', query];

  if (options.team) {
    args.push('--team', options.team);
  }

  if (options.project) {
    args.push('--project', options.project);
  }

  const { stdout } = await execLinearis(args);
  return JSON.parse(stdout);
}

/**
 * Show a single issue
 */
export async function showIssue(issueKey) {
  const { stdout } = await execLinearis(['issues', 'read', issueKey]);
  return JSON.parse(stdout);
}

/**
 * Create a new issue
 */
export async function createIssue(teamId, data) {
  const args = [
    'issues',
    'create',
    data.title,
    '--team', teamId
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

  if (data.assignee) {
    args.push('--assignee', data.assignee);
  }

  if (data.labels) {
    args.push('--labels', data.labels);
  }

  // Note: state must be set via update after creation if needed
  // linearis issues create doesn't support --state

  const { stdout } = await execLinearis(args);
  return JSON.parse(stdout);
}

/**
 * Update an issue
 */
export async function updateIssue(issueKey, updates) {
  const args = ['issues', 'update', issueKey];

  if (updates.state) {
    args.push('--state', updates.state);
  }

  if (updates.stateId) {
    // linearis uses --state not --state-id
    // We'll need to pass the state name, not ID
    throw new Error('updateIssue: use updates.state (state name) instead of updates.stateId');
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

  if (updates.labels) {
    args.push('--labels', updates.labels);
  }

  if (updates.clearLabels) {
    args.push('--clear-labels');
  }

  if (updates.parentTicket) {
    args.push('--parent-ticket', updates.parentTicket);
  }

  const { stdout } = await execLinearis(args);
  return JSON.parse(stdout);
}

/**
 * Add a comment to an issue
 */
export async function commentOnIssue(issueKey, body) {
  const { stdout } = await execLinearis([
    'comments',
    'create',
    issueKey,
    '--body', body
  ]);
  return JSON.parse(stdout);
}

/**
 * List workflow states for a team
 * Note: linearis doesn't have a dedicated workflow states command
 * We'll need to use the Linear API directly or hard-code common states
 */
export async function listWorkflowStates(teamId) {
  // linearis doesn't support listing workflow states
  // Return common Linear states as a fallback
  return [
    { id: 'backlog', name: 'Backlog', type: 'backlog' },
    { id: 'unstarted', name: 'Todo', type: 'unstarted' },
    { id: 'started', name: 'In Progress', type: 'started' },
    { id: 'completed', name: 'Done', type: 'completed' },
    { id: 'canceled', name: 'Canceled', type: 'canceled' },
  ];
}

/**
 * Check authentication status
 */
export async function checkAuth() {
  try {
    // Try to list projects - if this works, we're authenticated
    await execLinearis(['projects', 'list']);
    return { authenticated: true };
  } catch (error) {
    if (error.message.includes('not authenticated') || error.message.includes('API key')) {
      return { authenticated: false, error: error.message };
    }
    throw error;
  }
}

/**
 * List teams
 * Note: linearis CLI does not support listing teams. Team keys/names must be
 * provided by the user or obtained through the Linear web UI or GraphQL API.
 *
 * Team keys are typically short codes like "ENG", "PROD", "DESIGN", etc.
 * You can find your team key in Linear's URL: linear.app/[workspace]/team/[TEAM-KEY]
 */
export async function listTeams() {
  throw new Error(
    'linearis does not support listing teams.\n\n' +
    'To find your team key:\n' +
    '1. Go to https://linear.app\n' +
    '2. Open your team page\n' +
    '3. Check the URL: linear.app/[workspace]/team/[TEAM-KEY]\n\n' +
    'The team key is typically a short code like "ENG", "PROD", or "DESIGN".'
  );
}

/**
 * List projects
 */
export async function listProjects(teamId) {
  const args = ['projects', 'list'];

  if (teamId) {
    args.push('--team', teamId);
  }

  const { stdout } = await execLinearis(args);
  return JSON.parse(stdout);
}

/**
 * List labels
 */
export async function listLabels(teamId) {
  const args = ['labels', 'list'];

  if (teamId) {
    args.push('--team', teamId);
  }

  const { stdout } = await execLinearis(args);
  return JSON.parse(stdout);
}

/**
 * List cycles (sprints)
 */
export async function listCycles(teamId, options = {}) {
  const args = ['cycles', 'list'];

  if (teamId) {
    args.push('--team', teamId);
  }

  if (options.limit) {
    args.push('--limit', String(options.limit));
  }

  if (options.active) {
    args.push('--active');
  }

  if (options.aroundActive) {
    args.push('--around-active', String(options.aroundActive));
  }

  const { stdout } = await execLinearis(args);
  return JSON.parse(stdout);
}

/**
 * Read cycle details
 */
export async function readCycle(cycleName, teamId) {
  const args = ['cycles', 'read', cycleName];

  if (teamId) {
    args.push('--team', teamId);
  }

  const { stdout } = await execLinearis(args);
  return JSON.parse(stdout);
}
