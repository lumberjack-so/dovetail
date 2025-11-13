import { describe, it, expect } from 'vitest';
import { execa } from 'execa';

/**
 * Integration tests for linearis CLI
 * These verify that the actual CLI commands work as expected
 */
describe('Linearis CLI Integration', () => {
  describe('issues list', () => {
    it('should support -l flag for limit', async () => {
      const { exitCode, stderr } = await execa('linearis', ['issues', 'list', '-l', '5'], {
        reject: false
      });

      // Should not error on the flag itself
      expect(stderr).not.toContain('unknown option');
      expect(stderr).not.toContain('unknown flag');
    });

    it('should NOT support --team flag', async () => {
      const { exitCode, stderr } = await execa('linearis', ['issues', 'list', '--team', 'SSD'], {
        reject: false
      });

      // This SHOULD fail - documenting that linearis doesn't support team filtering
      expect(stderr).toContain('unknown option');
    });

    it('should NOT support --project flag', async () => {
      const { exitCode, stderr } = await execa('linearis', ['issues', 'list', '--project', 'test'], {
        reject: false
      });

      // This SHOULD fail - documenting that linearis doesn't support project filtering
      expect(stderr).toContain('unknown option');
    });
  });

  describe('issues create', () => {
    it('should support --team flag', async () => {
      // Don't actually create, just verify the flag is recognized
      const { stderr } = await execa('linearis', ['issues', 'create', 'Test', '--team', 'SSD', '--help'], {
        reject: false
      });

      expect(stderr).not.toContain('unknown option');
    });

    it('should support --project flag', async () => {
      const { stderr } = await execa('linearis', ['issues', 'create', 'Test', '--project', 'test-project', '--help'], {
        reject: false
      });

      expect(stderr).not.toContain('unknown option');
    });
  });

  describe('projects list', () => {
    it('should work without team filter', async () => {
      const { exitCode, stderr } = await execa('linearis', ['projects', 'list'], {
        reject: false
      });

      expect(stderr).not.toContain('unknown option');
      expect(stderr).not.toContain('unknown flag');
    });
  });
});
