import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import * as gh from '../../src/cli/gh.js';

// Mock execa
vi.mock('execa');

describe('gh CLI wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execGh', () => {
    it('should execute gh command successfully', async () => {
      execa.mockResolvedValue({
        stdout: 'success',
        stderr: '',
        exitCode: 0,
      });

      const result = await gh.execGh(['repo', 'view']);

      expect(execa).toHaveBeenCalledWith('gh', ['repo', 'view'], expect.objectContaining({
        reject: false
      }));
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('success');
    });

    it('should throw error for authentication failure', async () => {
      execa.mockResolvedValue({
        stdout: '',
        stderr: 'not logged in',
        exitCode: 1,
      });

      await expect(gh.execGh(['repo', 'view'])).rejects.toThrow(/not authenticated/);
    });

    it('should throw error if gh CLI not installed', async () => {
      execa.mockRejectedValue({ code: 'ENOENT' });

      await expect(gh.execGh(['repo', 'view'])).rejects.toThrow(/not installed/);
    });
  });

  describe('checkAuth', () => {
    it('should return authenticated true when gh auth status succeeds', async () => {
      execa.mockResolvedValue({
        stdout: 'Logged in to github.com as username',
        stderr: '',
        exitCode: 0,
      });

      const result = await gh.checkAuth();

      expect(result.authenticated).toBe(true);
      expect(execa).toHaveBeenCalledWith('gh', ['auth', 'status'], expect.any(Object));
    });

    it('should return authenticated false when not logged in', async () => {
      execa.mockResolvedValue({
        stdout: '',
        stderr: 'not logged in',
        exitCode: 1,
      });

      const result = await gh.checkAuth();

      expect(result.authenticated).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current username', async () => {
      execa.mockResolvedValue({
        stdout: 'testuser\n',
        stderr: '',
        exitCode: 0,
      });

      const username = await gh.getCurrentUser();

      expect(username).toBe('testuser');
      expect(execa).toHaveBeenCalledWith('gh', ['api', 'user', '--jq', '.login'], expect.any(Object));
    });
  });

  describe('createRepo', () => {
    it('should create a private repository', async () => {
      // Mock the create command
      execa.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      // Mock getCurrentUser call
      execa.mockResolvedValueOnce({
        stdout: 'testuser',
        stderr: '',
        exitCode: 0,
      });

      // Mock the view command
      execa.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'test-repo',
          owner: { login: 'testuser' },
          url: 'https://github.com/testuser/test-repo'
        }),
        stderr: '',
        exitCode: 0,
      });

      const result = await gh.createRepo('test-repo', { private: true });

      expect(result.name).toBe('test-repo');
      expect(result.owner.login).toBe('testuser');
      expect(execa).toHaveBeenNthCalledWith(1, 'gh', ['repo', 'create', 'test-repo', '--private'], expect.any(Object));
    });

    it('should create a public repository with description', async () => {
      execa.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      execa.mockResolvedValueOnce({
        stdout: 'testuser',
        stderr: '',
        exitCode: 0,
      });

      execa.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'test-repo',
          owner: { login: 'testuser' },
          url: 'https://github.com/testuser/test-repo'
        }),
        stderr: '',
        exitCode: 0,
      });

      await gh.createRepo('test-repo', {
        private: false,
        description: 'Test description'
      });

      expect(execa).toHaveBeenNthCalledWith(1, 'gh', [
        'repo', 'create', 'test-repo', '--public', '--description', 'Test description'
      ], expect.any(Object));
    });
  });

  describe('viewRepo', () => {
    it('should fetch repository details', async () => {
      const repoData = {
        name: 'test-repo',
        owner: { login: 'testuser' },
        url: 'https://github.com/testuser/test-repo',
        isPrivate: true,
        defaultBranchRef: { name: 'main' }
      };

      execa.mockResolvedValue({
        stdout: JSON.stringify(repoData),
        stderr: '',
        exitCode: 0,
      });

      const result = await gh.viewRepo('testuser/test-repo');

      expect(result).toEqual(repoData);
      expect(execa).toHaveBeenCalledWith('gh', [
        'repo', 'view', 'testuser/test-repo', '--json', 'name,owner,url,defaultBranchRef,isPrivate'
      ], expect.any(Object));
    });
  });

  describe('setSecret', () => {
    it('should set repository secret', async () => {
      execa.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      await gh.setSecret('owner/repo', 'SECRET_NAME', 'secret-value');

      expect(execa).toHaveBeenCalledWith('gh', [
        'secret', 'set', 'SECRET_NAME', '--repo', 'owner/repo', '--body', 'secret-value'
      ], expect.any(Object));
    });
  });

  describe('createPr', () => {
    it('should create pull request with title and body', async () => {
      const prData = {
        url: 'https://github.com/owner/repo/pull/1',
        number: 1,
        title: 'Test PR'
      };

      execa.mockResolvedValue({
        stdout: JSON.stringify(prData),
        stderr: '',
        exitCode: 0,
      });

      const result = await gh.createPr({
        title: 'Test PR',
        body: 'PR description',
        base: 'main',
        head: 'feature-branch'
      });

      expect(result).toEqual(prData);
      expect(execa).toHaveBeenCalledWith('gh', [
        'pr', 'create',
        '--json', 'url,number,title',
        '--title', 'Test PR',
        '--body', 'PR description',
        '--base', 'main',
        '--head', 'feature-branch'
      ], expect.any(Object));
    });
  });

  describe('listPrs', () => {
    it('should list pull requests', async () => {
      const prs = [
        { number: 1, title: 'PR 1', state: 'open', url: 'https://...', headRefName: 'feature-1' },
        { number: 2, title: 'PR 2', state: 'closed', url: 'https://...', headRefName: 'feature-2' }
      ];

      execa.mockResolvedValue({
        stdout: JSON.stringify(prs),
        stderr: '',
        exitCode: 0,
      });

      const result = await gh.listPrs({ state: 'all', limit: 10 });

      expect(result).toEqual(prs);
      expect(execa).toHaveBeenCalledWith('gh', [
        'pr', 'list',
        '--json', 'number,title,state,url,headRefName',
        '--state', 'all',
        '--limit', '10'
      ], expect.any(Object));
    });
  });

  describe('getCurrentRepo', () => {
    it('should return current repository info', async () => {
      const repoData = {
        name: 'test-repo',
        owner: { login: 'testuser' }
      };

      execa.mockResolvedValue({
        stdout: JSON.stringify(repoData),
        stderr: '',
        exitCode: 0,
      });

      const result = await gh.getCurrentRepo();

      expect(result).toEqual(repoData);
    });

    it('should return null if not in a repository', async () => {
      execa.mockResolvedValue({
        stdout: '',
        stderr: 'not a git repository',
        exitCode: 1,
      });

      const result = await gh.getCurrentRepo();

      expect(result).toBeNull();
    });
  });
});
