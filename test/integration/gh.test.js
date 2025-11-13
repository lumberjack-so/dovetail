import { describe, it, expect } from 'vitest';
import { execa } from 'execa';

/**
 * Integration tests for gh CLI
 * These verify that the actual CLI commands work as expected
 */
describe('GitHub CLI Integration', () => {
  describe('repo create', () => {
    it('should NOT support --json flag on create', async () => {
      const { stdout } = await execa('gh', ['repo', 'create', '--help'], {
        reject: false
      });

      // gh repo create does NOT support --json
      expect(stdout).not.toContain('--json');
    });

    it('should support --private flag', async () => {
      const { stdout } = await execa('gh', ['repo', 'create', '--help'], {
        reject: false
      });

      expect(stdout).toContain('--private');
    });

    it('should support --public flag', async () => {
      const { stdout } = await execa('gh', ['repo', 'create', '--help'], {
        reject: false
      });

      expect(stdout).toContain('--public');
    });
  });

  describe('repo view', () => {
    it('should support --json flag', async () => {
      const { stdout } = await execa('gh', ['repo', 'view', '--help'], {
        reject: false
      });

      expect(stdout).toContain('--json');
    });
  });
});
