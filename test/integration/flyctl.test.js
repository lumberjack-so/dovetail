import { describe, it, expect } from 'vitest';
import { execa } from 'execa';

/**
 * Integration tests for flyctl CLI
 * These verify that the actual CLI commands work as expected
 */
describe('Flyctl CLI Integration', () => {
  describe('apps create', () => {
    it('should NOT support --region flag', async () => {
      const { stderr } = await execa('flyctl', ['apps', 'create', '--help'], {
        reject: false
      });

      // Verify --region is NOT in the help output
      expect(stderr.toLowerCase()).not.toContain('--region');
    });

    it('should support --org flag', async () => {
      const { stdout, stderr } = await execa('flyctl', ['apps', 'create', '--help'], {
        reject: false
      });

      const output = stdout + stderr;
      expect(output).toContain('--org');
    });

    it('should support --json flag', async () => {
      const { stdout, stderr } = await execa('flyctl', ['apps', 'create', '--help'], {
        reject: false
      });

      const output = stdout + stderr;
      expect(output).toContain('--json');
    });
  });
});
