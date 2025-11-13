import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Execute a Linear GraphQL query
 * Uses the API token from ~/.linear_api_token
 */
async function executeLinearQuery(query, variables = {}) {
  const tokenPath = join(homedir(), '.linear_api_token');

  let apiKey;
  try {
    apiKey = readFileSync(tokenPath, 'utf-8').trim();
  } catch (error) {
    throw new Error(
      'Linear API token not found.\n\n' +
      'Set your API key with: dovetail config\n' +
      'Or manually create ~/.linear_api_token with your API key from https://linear.app/settings/api'
    );
  }

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (data.errors) {
    const errorMessages = data.errors.map(e => e.message).join('\n');
    throw new Error(`Linear API error:\n${errorMessages}`);
  }

  return data.data;
}

/**
 * Get team ID from team key
 */
export async function getTeamByKey(teamKey) {
  const query = `
    query GetTeams {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `;

  const data = await executeLinearQuery(query);
  const team = data.teams.nodes.find(t => t.key === teamKey);

  if (!team) {
    throw new Error(
      `Team with key "${teamKey}" not found.\n\n` +
      `Available teams:\n` +
      data.teams.nodes.map(t => `  ${t.key}: ${t.name}`).join('\n')
    );
  }

  return team;
}

/**
 * Create a new Linear project
 */
export async function createProject(name, teamIds, options = {}) {
  const mutation = `
    mutation CreateProject($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project {
          id
          name
          url
          icon
          color
        }
      }
    }
  `;

  const input = {
    name,
    teamIds,
    ...options,
  };

  const data = await executeLinearQuery(mutation, { input });

  if (!data.projectCreate.success) {
    throw new Error('Failed to create Linear project');
  }

  return data.projectCreate.project;
}

/**
 * Get all teams
 */
export async function listTeams() {
  const query = `
    query GetTeams {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `;

  const data = await executeLinearQuery(query);
  return data.teams.nodes;
}

/**
 * Get project by ID
 */
export async function getProject(projectId) {
  const query = `
    query GetProject($id: String!) {
      project(id: $id) {
        id
        name
        url
        icon
        color
        description
        state
        progress
      }
    }
  `;

  const data = await executeLinearQuery(query, { id: projectId });
  return data.project;
}

/**
 * List issues for a project
 */
export async function listIssues(projectId, options = {}) {
  const query = `
    query GetProjectIssues($projectId: String!, $first: Int, $states: [String!]) {
      project(id: $projectId) {
        issues(first: $first, filter: { state: { type: { in: $states } } }) {
          nodes {
            id
            identifier
            title
            description
            priority
            state {
              id
              name
              type
            }
            url
            createdAt
            updatedAt
          }
        }
      }
    }
  `;

  const variables = {
    projectId,
    first: options.limit || 50,
    states: options.stateType || ['unstarted', 'started']
  };

  const data = await executeLinearQuery(query, variables);
  return data.project.issues.nodes;
}
