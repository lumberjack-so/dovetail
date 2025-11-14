import fetch from 'node-fetch';

/**
 * Get Linear API key from environment
 */
function getLinearApiKey() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error(
      'LINEAR_API_KEY environment variable not set.\n\n' +
      'Get your Linear API key at: https://linear.app/settings/api\n' +
      'Then set it:\n' +
      '  export LINEAR_API_KEY=<your-key>'
    );
  }
  return apiKey;
}

/**
 * Execute a Linear GraphQL query
 */
async function executeGraphQL(query, variables = {}) {
  const apiKey = getLinearApiKey();

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`Linear GraphQL error: ${result.errors[0].message}`);
  }

  return result.data;
}

/**
 * Get issue by key (e.g., "PRJ-123")
 */
export async function getIssue(issueKey) {
  const query = `
    query GetIssue($issueId: String!) {
      issue(id: $issueId) {
        id
        identifier
        title
        description
        url
        state {
          id
          name
          type
        }
        team {
          id
          key
        }
        project {
          id
          name
        }
      }
    }
  `;

  const data = await executeGraphQL(query, { issueId: issueKey });
  return data.issue;
}

/**
 * Update issue status to "In Progress" or specified state
 */
export async function updateIssueStatus(issueId, stateName = 'In Progress') {
  // First, get the team's workflow states
  const statesQuery = `
    query GetTeamStates($issueId: String!) {
      issue(id: $issueId) {
        team {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    }
  `;

  const statesData = await executeGraphQL(statesQuery, { issueId });
  const states = statesData.issue.team.states.nodes;

  // Find the target state
  const targetState = states.find(s =>
    s.name.toLowerCase() === stateName.toLowerCase() ||
    (stateName === 'In Progress' && s.type === 'started')
  );

  if (!targetState) {
    throw new Error(`State "${stateName}" not found in team workflow`);
  }

  // Update the issue
  const updateQuery = `
    mutation UpdateIssue($issueId: String!, $stateId: String!) {
      issueUpdate(id: $issueId, input: { stateId: $stateId }) {
        success
        issue {
          id
          identifier
          state {
            id
            name
          }
        }
      }
    }
  `;

  const updateData = await executeGraphQL(updateQuery, {
    issueId,
    stateId: targetState.id,
  });

  return updateData.issueUpdate.issue;
}

/**
 * Search issues by text query
 */
export async function searchIssues(teamId, query, options = {}) {
  const graphqlQuery = `
    query SearchIssues($teamId: String!, $filter: IssueFilter) {
      team(id: $teamId) {
        issues(filter: $filter, first: ${options.limit || 50}) {
          nodes {
            id
            identifier
            title
            description
            url
            state {
              id
              name
              type
            }
          }
        }
      }
    }
  `;

  const filter = {};

  if (query) {
    filter.title = { contains: query };
  }

  if (options.projectId) {
    filter.project = { id: { eq: options.projectId } };
  }

  const data = await executeGraphQL(graphqlQuery, { teamId, filter });
  return data.team.issues.nodes;
}

/**
 * Create a new issue
 */
export async function createIssue(teamId, data) {
  const mutation = `
    mutation CreateIssue($teamId: String!, $title: String!, $description: String, $projectId: String) {
      issueCreate(input: {
        teamId: $teamId
        title: $title
        description: $description
        projectId: $projectId
      }) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `;

  const result = await executeGraphQL(mutation, {
    teamId,
    title: data.title,
    description: data.description || '',
    projectId: data.projectId,
  });

  return result.issueCreate.issue;
}

/**
 * Add a comment to an issue
 */
export async function addComment(issueId, body) {
  const mutation = `
    mutation CreateComment($issueId: String!, $body: String!) {
      commentCreate(input: {
        issueId: $issueId
        body: $body
      }) {
        success
        comment {
          id
          body
        }
      }
    }
  `;

  const result = await executeGraphQL(mutation, { issueId, body });
  return result.commentCreate.comment;
}
