import { getOpenIssues, formatIssue } from '../integrations/linear.js';
import { readProjectState } from '../utils/state.js';
import { logger } from '../utils/logger.js';

/**
 * Search Linear issues based on query
 */
export async function linearSearchCommand(options = {}) {
  try {
    const projectState = await readProjectState(process.cwd());

    if (!projectState.linear) {
      if (options.json) {
        console.log(JSON.stringify({ issues: [] }));
        process.exit(0);
      }
      logger.error('Linear not configured for this project');
      process.exit(1);
    }

    // Get open issues
    const issues = await getOpenIssues(projectState.linear.teamId, options.limit || 10);

    // Format issues
    const formattedIssues = issues.map(issue => {
      const formatted = formatIssue(issue);
      return {
        key: formatted.key,
        id: formatted.id,
        title: formatted.title,
        description: formatted.description,
        priority: formatted.priority,
        estimate: formatted.estimate,
        url: formatted.url
      };
    });

    // Filter by query if provided
    let filteredIssues = formattedIssues;
    if (options.query) {
      const query = options.query.toLowerCase();
      filteredIssues = formattedIssues.filter(issue =>
        issue.title.toLowerCase().includes(query) ||
        (issue.description && issue.description.toLowerCase().includes(query))
      );
    }

    if (options.json) {
      console.log(JSON.stringify({ issues: filteredIssues }, null, 2));
    } else {
      console.log('\nLinear Issues:\n');
      filteredIssues.forEach(issue => {
        console.log(`${issue.key}: ${issue.title}`);
        console.log(`  Priority: ${issue.priority}, Estimate: ${issue.estimate}h`);
        console.log(`  ${issue.url}\n`);
      });
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
    logger.error(`Failed to search Linear: ${error.message}`);
    process.exit(1);
  }
}
