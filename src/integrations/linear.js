import { LinearClient } from '@linear/sdk';
import { getConfig } from '../utils/config.js';

let client = null;

/**
 * Initialize Linear client
 */
async function getLinearClient() {
  if (!client) {
    const apiKey = await getConfig('linearApiKey', 'LINEAR_API_KEY');
    if (!apiKey) {
      throw new Error('Linear API key not configured');
    }
    client = new LinearClient({ apiKey });
  }
  return client;
}

/**
 * Get all teams
 */
export async function getTeams() {
  const linear = await getLinearClient();
  const teams = await linear.teams();
  return teams.nodes;
}

/**
 * Create a project
 */
export async function createProject(teamId, name, options = {}) {
  const linear = await getLinearClient();
  const project = await linear.createProject({
    teamIds: [teamId],
    name,
    description: options.description || '',
  });
  return project.project;
}

/**
 * Get open issues for a team
 */
export async function getOpenIssues(teamId, limit = 10) {
  const linear = await getLinearClient();
  const issues = await linear.issues({
    filter: {
      team: { id: { eq: teamId } },
      state: { name: { nin: ['Done', 'Canceled'] } },
    },
    first: limit,
  });
  return issues.nodes;
}

/**
 * Get issue by key (e.g., "TS-007")
 */
export async function getIssueByKey(issueKey) {
  const linear = await getLinearClient();
  const issue = await linear.issue(issueKey);
  return issue;
}

/**
 * Update issue status
 */
export async function updateIssueStatus(issueId, statusName) {
  const linear = await getLinearClient();

  // Get workflow states
  const states = await linear.workflowStates();
  const targetState = states.nodes.find(s => s.name === statusName);

  if (!targetState) {
    throw new Error(`Status "${statusName}" not found`);
  }

  await linear.updateIssue(issueId, {
    stateId: targetState.id,
  });
}

/**
 * Add comment to issue
 */
export async function addIssueComment(issueId, body) {
  const linear = await getLinearClient();
  await linear.createComment({
    issueId,
    body,
  });
}

/**
 * Get issue's current status
 */
export async function getIssueStatus(issueId) {
  const linear = await getLinearClient();
  const issue = await linear.issue(issueId);
  const state = await issue.state;
  return state?.name || null;
}

/**
 * Create starter issues for new project
 */
export async function createStarterIssues(teamId, projectId) {
  const linear = await getLinearClient();

  const starterIssues = [
    {
      title: 'Set up development environment',
      description: 'Install dependencies and configure local development setup.',
      priority: 1,
    },
    {
      title: 'Review project structure',
      description: 'Familiarize yourself with the codebase structure and conventions.',
      priority: 2,
    },
    {
      title: 'Configure deployment pipeline',
      description: 'Verify staging and production deployments are working correctly.',
      priority: 2,
    },
  ];

  const created = [];
  for (const issue of starterIssues) {
    const result = await linear.createIssue({
      teamId,
      projectId,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
    });
    created.push(result.issue);
  }

  return created;
}

/**
 * Close/complete an issue
 */
export async function completeIssue(issueId) {
  const linear = await getLinearClient();

  // Find "Done" state
  const states = await linear.workflowStates();
  const doneState = states.nodes.find(s => s.type === 'completed');

  if (!doneState) {
    throw new Error('No "Done" state found');
  }

  await linear.updateIssue(issueId, {
    stateId: doneState.id,
  });
}

/**
 * Get authenticated user
 */
export async function getCurrentUser() {
  const linear = await getLinearClient();
  const viewer = await linear.viewer;
  return viewer;
}

/**
 * Link issue to PR
 */
export async function linkIssueToPR(issueId, prUrl) {
  const linear = await getLinearClient();
  await addIssueComment(
    issueId,
    `🔀 Pull Request created: ${prUrl}`
  );
}

/**
 * Update issue with commit info
 */
export async function addCommitToIssue(issueId, commitHash, commitMessage, repoUrl) {
  const linear = await getLinearClient();
  const commitUrl = `${repoUrl}/commit/${commitHash}`;
  await addIssueComment(
    issueId,
    `💾 Commit: [${commitHash.substring(0, 7)}](${commitUrl})\n\n${commitMessage}`
  );
}

/**
 * Format issue for display
 */
export function formatIssue(issue) {
  return {
    id: issue.id,
    key: issue.identifier,
    title: issue.title,
    description: issue.description,
    priority: issue.priority,
    estimate: issue.estimate,
    url: issue.url,
  };
}

/**
 * Delete a project
 */
export async function deleteProject(projectId) {
  const linear = await getLinearClient();
  await linear.deleteProject(projectId);
}
