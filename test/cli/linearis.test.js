import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import * as linearis from '../../src/cli/linearis.js';

// Mock execa
vi.mock('execa');

describe('linearis CLI wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execLinearis', () => {
    it('should execute linearis command successfully', async () => {
      execa.mockResolvedValue({
        stdout: '{"success": true}',
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.execLinearis(['issues', 'list']);

      expect(execa).toHaveBeenCalledWith('linearis', ['issues', 'list'], expect.objectContaining({
        reject: false
      }));
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('{"success": true}');
    });

    it('should throw error for authentication failure', async () => {
      execa.mockResolvedValue({
        stdout: '',
        stderr: 'Unauthorized: API key required',
        exitCode: 1,
      });

      await expect(linearis.execLinearis(['issues', 'list'])).rejects.toThrow(/not authenticated/);
    });

    it('should throw error if linearis not installed', async () => {
      execa.mockRejectedValue({ code: 'ENOENT' });

      await expect(linearis.execLinearis(['issues', 'list'])).rejects.toThrow(/not installed/);
    });
  });

  describe('listIssues', () => {
    it('should list issues for a team', async () => {
      const issues = [
        { identifier: 'TEAM-1', title: 'Issue 1' },
        { identifier: 'TEAM-2', title: 'Issue 2' }
      ];

      execa.mockResolvedValue({
        stdout: JSON.stringify(issues),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.listIssues('team-id', null, { limit: 10 });

      expect(result).toEqual(issues);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'list', '-l', '10', '--team', 'team-id'
      ], expect.any(Object));
    });

    it('should list issues with project filter', async () => {
      execa.mockResolvedValue({
        stdout: '[]',
        stderr: '',
        exitCode: 0,
      });

      await linearis.listIssues('team-id', 'project-id', { limit: 20 });

      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'list', '-l', '20', '--team', 'team-id', '--project', 'project-id'
      ], expect.any(Object));
    });

    it('should use default limit if not specified', async () => {
      execa.mockResolvedValue({
        stdout: '[]',
        stderr: '',
        exitCode: 0,
      });

      await linearis.listIssues('team-id');

      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'list', '-l', '50', '--team', 'team-id'
      ], expect.any(Object));
    });
  });

  describe('searchIssues', () => {
    it('should search issues with query', async () => {
      const results = [{ identifier: 'TEAM-1', title: 'Matching issue' }];

      execa.mockResolvedValue({
        stdout: JSON.stringify(results),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.searchIssues('authentication', {
        team: 'Platform',
        project: 'Auth Service'
      });

      expect(result).toEqual(results);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'search', 'authentication', '--team', 'Platform', '--project', 'Auth Service'
      ], expect.any(Object));
    });
  });

  describe('showIssue', () => {
    it('should fetch issue details', async () => {
      const issue = {
        identifier: 'TEAM-123',
        title: 'Test issue',
        description: 'Description',
        state: { name: 'In Progress' }
      };

      execa.mockResolvedValue({
        stdout: JSON.stringify(issue),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.showIssue('TEAM-123');

      expect(result).toEqual(issue);
      expect(execa).toHaveBeenCalledWith('linearis', ['issues', 'read', 'TEAM-123'], expect.any(Object));
    });
  });

  describe('createIssue', () => {
    it('should create issue with required fields', async () => {
      const newIssue = {
        identifier: 'TEAM-456',
        title: 'New issue'
      };

      execa.mockResolvedValue({
        stdout: JSON.stringify(newIssue),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.createIssue('team-id', {
        title: 'New issue'
      });

      expect(result).toEqual(newIssue);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'create', 'New issue', '--team', 'team-id'
      ], expect.any(Object));
    });

    it('should create issue with all fields', async () => {
      execa.mockResolvedValue({
        stdout: '{"identifier": "TEAM-456"}',
        stderr: '',
        exitCode: 0,
      });

      await linearis.createIssue('team-id', {
        title: 'New issue',
        description: 'Issue description',
        priority: 1,
        assignee: 'user-id',
        labels: 'Bug,Critical',
        projectId: 'project-id'
      });

      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'create', 'New issue',
        '--team', 'team-id',
        '--project', 'project-id',
        '--description', 'Issue description',
        '--priority', '1',
        '--assignee', 'user-id',
        '--labels', 'Bug,Critical'
      ], expect.any(Object));
    });
  });

  describe('updateIssue', () => {
    it('should update issue state', async () => {
      const updated = { identifier: 'TEAM-123', state: { name: 'Done' } };

      execa.mockResolvedValue({
        stdout: JSON.stringify(updated),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.updateIssue('TEAM-123', {
        state: 'Done'
      });

      expect(result).toEqual(updated);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'update', 'TEAM-123', '--state', 'Done'
      ], expect.any(Object));
    });

    it('should throw error if stateId is used instead of state', async () => {
      await expect(linearis.updateIssue('TEAM-123', {
        stateId: 'state-id'
      })).rejects.toThrow(/use updates.state/);
    });

    it('should update multiple fields', async () => {
      execa.mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0,
      });

      await linearis.updateIssue('TEAM-123', {
        title: 'Updated title',
        description: 'Updated description',
        priority: 2,
        labels: 'Feature,UI'
      });

      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'update', 'TEAM-123',
        '--title', 'Updated title',
        '--description', 'Updated description',
        '--priority', '2',
        '--labels', 'Feature,UI'
      ], expect.any(Object));
    });

    it('should clear labels', async () => {
      execa.mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0,
      });

      await linearis.updateIssue('TEAM-123', {
        clearLabels: true
      });

      expect(execa).toHaveBeenCalledWith('linearis', [
        'issues', 'update', 'TEAM-123', '--clear-labels'
      ], expect.any(Object));
    });
  });

  describe('commentOnIssue', () => {
    it('should add comment to issue', async () => {
      const comment = {
        id: 'comment-id',
        body: 'Test comment'
      };

      execa.mockResolvedValue({
        stdout: JSON.stringify(comment),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.commentOnIssue('TEAM-123', 'Test comment');

      expect(result).toEqual(comment);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'comments', 'create', 'TEAM-123', '--body', 'Test comment'
      ], expect.any(Object));
    });
  });

  describe('listWorkflowStates', () => {
    it('should return hardcoded workflow states', async () => {
      const states = await linearis.listWorkflowStates('team-id');

      expect(states).toEqual([
        { id: 'backlog', name: 'Backlog', type: 'backlog' },
        { id: 'unstarted', name: 'Todo', type: 'unstarted' },
        { id: 'started', name: 'In Progress', type: 'started' },
        { id: 'completed', name: 'Done', type: 'completed' },
        { id: 'canceled', name: 'Canceled', type: 'canceled' },
      ]);
    });
  });

  describe('checkAuth', () => {
    it('should return authenticated true if projects list succeeds', async () => {
      execa.mockResolvedValue({
        stdout: '[]',
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.checkAuth();

      expect(result.authenticated).toBe(true);
      expect(execa).toHaveBeenCalledWith('linearis', ['projects', 'list'], expect.any(Object));
    });

    it('should return authenticated false on auth error', async () => {
      execa.mockResolvedValue({
        stdout: '',
        stderr: 'API key required',
        exitCode: 1,
      });

      const result = await linearis.checkAuth();

      expect(result.authenticated).toBe(false);
    });
  });

  describe('listProjects', () => {
    it('should list projects', async () => {
      const projects = [
        { id: 'proj-1', name: 'Project 1' },
        { id: 'proj-2', name: 'Project 2' }
      ];

      execa.mockResolvedValue({
        stdout: JSON.stringify(projects),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.listProjects('team-id');

      expect(result).toEqual(projects);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'projects', 'list', '--team', 'team-id'
      ], expect.any(Object));
    });
  });

  describe('listLabels', () => {
    it('should list labels for a team', async () => {
      const labels = [
        { id: 'label-1', name: 'Bug' },
        { id: 'label-2', name: 'Feature' }
      ];

      execa.mockResolvedValue({
        stdout: JSON.stringify(labels),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.listLabels('team-id');

      expect(result).toEqual(labels);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'labels', 'list', '--team', 'team-id'
      ], expect.any(Object));
    });
  });

  describe('listCycles', () => {
    it('should list cycles with filters', async () => {
      const cycles = [{ id: 'cycle-1', name: 'Sprint 1' }];

      execa.mockResolvedValue({
        stdout: JSON.stringify(cycles),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.listCycles('team-id', {
        limit: 5,
        active: true
      });

      expect(result).toEqual(cycles);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'cycles', 'list', '--team', 'team-id', '--limit', '5', '--active'
      ], expect.any(Object));
    });
  });

  describe('readCycle', () => {
    it('should read cycle details', async () => {
      const cycle = { id: 'cycle-1', name: 'Sprint 1', startDate: '2024-01-01' };

      execa.mockResolvedValue({
        stdout: JSON.stringify(cycle),
        stderr: '',
        exitCode: 0,
      });

      const result = await linearis.readCycle('Sprint 1', 'team-id');

      expect(result).toEqual(cycle);
      expect(execa).toHaveBeenCalledWith('linearis', [
        'cycles', 'read', 'Sprint 1', '--team', 'team-id'
      ], expect.any(Object));
    });
  });
});
