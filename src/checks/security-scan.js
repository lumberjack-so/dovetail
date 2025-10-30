import { execa } from 'execa';
import { promises as fs } from 'fs';

/**
 * Run npm audit
 */
export async function runNpmAudit() {
  try {
    const { stdout } = await execa('npm', ['audit', '--json']);
    const result = JSON.parse(stdout);

    const vulnerabilities = result.metadata?.vulnerabilities || {};
    const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);

    return {
      passed: total === 0,
      vulnerabilities,
      total,
    };
  } catch (error) {
    // npm audit returns non-zero exit code if vulnerabilities found
    if (error.stdout) {
      const result = JSON.parse(error.stdout);
      const vulnerabilities = result.metadata?.vulnerabilities || {};
      const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);

      return {
        passed: false,
        vulnerabilities,
        total,
      };
    }
    throw error;
  }
}

/**
 * Check for sensitive files
 */
export async function checkSensitiveFiles() {
  const sensitivePatterns = [
    '.env',
    '.env.local',
    '.env.production',
    'credentials.json',
    'serviceAccountKey.json',
    'private-key.pem',
  ];

  const found = [];

  for (const pattern of sensitivePatterns) {
    try {
      await fs.access(pattern);
      found.push(pattern);
    } catch {
      // File doesn't exist, which is good
    }
  }

  return {
    passed: found.length === 0,
    found,
  };
}

/**
 * Check for console.log statements
 */
export async function checkConsoleLogs(files) {
  const { stdout } = await execa('git', ['grep', '-n', 'console\\.log', '--', ...files], {
    reject: false,
  });

  const matches = stdout.trim().split('\n').filter(Boolean);

  return {
    passed: matches.length === 0,
    matches,
    count: matches.length,
  };
}

/**
 * Check for TODOs without issue references
 */
export async function checkOrphanedTodos(files) {
  const { stdout } = await execa(
    'git',
    ['grep', '-n', '-E', '(TODO|FIXME)', '--', ...files],
    { reject: false }
  );

  const matches = stdout.trim().split('\n').filter(Boolean);

  // Check if TODOs have issue references (e.g., TODO(TS-007))
  const orphaned = matches.filter(line => !line.match(/TODO\([A-Z]+-\d+\)/));

  return {
    passed: orphaned.length === 0,
    orphaned,
    count: orphaned.length,
  };
}

/**
 * Run all security checks
 */
export async function runSecurityChecks(files = []) {
  const results = {
    audit: await runNpmAudit(),
    sensitiveFiles: await checkSensitiveFiles(),
  };

  if (files.length > 0) {
    results.consoleLogs = await checkConsoleLogs(files);
    results.todos = await checkOrphanedTodos(files);
  }

  const passed = Object.values(results).every(r => r.passed);

  return {
    passed,
    results,
  };
}
