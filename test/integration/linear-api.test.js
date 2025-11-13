import { describe, it, expect } from 'vitest';
import { getTeamByKey, createProject, listIssues } from '../../src/cli/linear-api.js';

/**
 * Integration tests for Linear GraphQL API
 * These tests require a valid Linear API token in ~/.linear_api_token
 */
describe('Linear API Integration', () => {
  describe('getTeamByKey', () => {
    it('should fetch team by key', async () => {
      const team = await getTeamByKey('SSD');

      expect(team).toBeDefined();
      expect(team.id).toBeDefined();
      expect(team.key).toBe('SSD');
      expect(team.name).toBeDefined();
    });

    it('should throw error for invalid team key', async () => {
      await expect(getTeamByKey('NONEXISTENT')).rejects.toThrow('Team with key "NONEXISTENT" not found');
    });
  });

  describe('listIssues', () => {
    it('should list issues for a project', async () => {
      // Use a real project ID from your setup
      const projectId = 'efc07a66-8be3-40bf-a066-e53424006dbc';

      const issues = await listIssues(projectId, {
        stateType: ['unstarted', 'started'],
        limit: 10
      });

      expect(Array.isArray(issues)).toBe(true);

      if (issues.length > 0) {
        const issue = issues[0];
        expect(issue.id).toBeDefined();
        expect(issue.identifier).toBeDefined();
        expect(issue.title).toBeDefined();
        expect(issue.state).toBeDefined();
        expect(issue.state.type).toBeDefined();
      }
    });
  });
});
