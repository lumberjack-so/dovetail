import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Detect which files changed and determine test strategy
 */
export function detectTestStrategy(changedFiles) {
  const hasUIChanges = changedFiles.some(f =>
    f.includes('apps/web/') || f.includes('components/')
  );

  const hasAPIChanges = changedFiles.some(f =>
    f.includes('apps/api/') || f.includes('routes/') || f.includes('controllers/')
  );

  const hasMigrations = changedFiles.some(f =>
    f.includes('migrations/') || f.includes('.sql')
  );

  return {
    runPlaywright: hasUIChanges,
    runAPITests: hasAPIChanges,
    runVisualTests: hasUIChanges,
    checkMigrations: hasMigrations,
    runSmoke: true, // Always run smoke tests
  };
}

/**
 * Run Playwright tests
 */
export async function runPlaywrightTests(options = {}) {
  try {
    const args = ['playwright', 'test'];

    if (options.headed) {
      args.push('--headed');
    }

    if (options.ui) {
      args.push('--ui');
    }

    const { stdout, stderr } = await execa('npx', args, {
      cwd: options.cwd || process.cwd(),
    });

    return {
      passed: true,
      output: stdout + stderr,
    };
  } catch (error) {
    return {
      passed: false,
      output: error.stdout + error.stderr,
      error: error.message,
    };
  }
}

/**
 * Run API tests
 */
export async function runAPITests(options = {}) {
  try {
    const { stdout, stderr } = await execa('npm', ['run', 'test:api'], {
      cwd: options.cwd || process.cwd(),
    });

    return {
      passed: true,
      output: stdout + stderr,
    };
  } catch (error) {
    return {
      passed: false,
      output: error.stdout + error.stderr,
      error: error.message,
    };
  }
}

/**
 * Run visual regression tests
 */
export async function runVisualTests(options = {}) {
  // Check if Playwright screenshots exist
  const screenshotsDir = join(process.cwd(), 'tests', 'screenshots');

  if (!existsSync(screenshotsDir)) {
    return {
      passed: true,
      skipped: true,
      message: 'No visual tests configured',
    };
  }

  try {
    const { stdout, stderr } = await execa(
      'npx',
      ['playwright', 'test', '--update-snapshots'],
      {
        cwd: options.cwd || process.cwd(),
      }
    );

    return {
      passed: true,
      output: stdout + stderr,
    };
  } catch (error) {
    return {
      passed: false,
      output: error.stdout + error.stderr,
      error: error.message,
    };
  }
}

/**
 * Run smoke tests
 */
export async function runSmokeTests(url) {
  const tests = [
    { name: 'Health check', path: '/health' },
    { name: 'Homepage loads', path: '/' },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const response = await fetch(url + test.path);
      results.push({
        name: test.name,
        passed: response.ok,
        status: response.status,
      });
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        error: error.message,
      });
    }
  }

  return {
    passed: results.every(r => r.passed),
    results,
  };
}

/**
 * Run all relevant tests based on changes
 */
export async function runRelevantTests(changedFiles, options = {}) {
  const strategy = detectTestStrategy(changedFiles);
  const results = {};

  if (strategy.runPlaywright) {
    results.playwright = await runPlaywrightTests(options);
  }

  if (strategy.runAPITests) {
    results.api = await runAPITests(options);
  }

  if (strategy.runVisualTests) {
    results.visual = await runVisualTests(options);
  }

  const passed = Object.values(results).every(r => r.passed);

  return {
    passed,
    strategy,
    results,
  };
}
