import { runSecurityChecks } from './security-scan.js';
// TODO 2.0: Migrate to gh CLI wrapper
// import { getCommitStatus } from '../integrations/github.js';
import { getCurrentBranch } from '../utils/git.js';
import { getChangedFiles } from '../utils/git.js';

/**
 * Check if documentation needs updating
 */
export async function checkDocsUpdated(changedFiles) {
  const apiChanged = changedFiles.some(f =>
    f.includes('routes/') || f.includes('api/') || f.includes('controllers/')
  );

  const docsChanged = changedFiles.some(f =>
    f.includes('docs/') || f.includes('README.md')
  );

  if (apiChanged && !docsChanged) {
    return {
      passed: false,
      warning: 'API files changed but documentation not updated',
    };
  }

  return { passed: true };
}

/**
 * Check migrations are reviewed
 */
export async function checkMigrationsReviewed(changedFiles) {
  const hasMigrations = changedFiles.some(f =>
    f.includes('migrations/') || f.endsWith('.sql')
  );

  if (hasMigrations) {
    // In a real implementation, check for migration review checklist
    return {
      passed: true,
      requiresReview: true,
      message: 'Migrations detected - ensure review checklist is complete',
    };
  }

  return { passed: true };
}

/**
 * Check CI status
 * TODO 2.0: Migrate to gh CLI wrapper
 */
// export async function checkCIStatus(owner, repo) {
//   try {
//     const branch = await getCurrentBranch();
//     const status = await getCommitStatus(owner, repo, branch);

//     return {
//       passed: status.passing,
//       status,
//     };
//   } catch (error) {
//     return {
//       passed: false,
//       error: error.message,
//     };
//   }
// }

/**
 * Run the quality gate - all checks required for merge
 */
export async function runQualityGate(options = {}) {
  const changedFiles = await getChangedFiles();
  const allFiles = [
    ...changedFiles.modified,
    ...changedFiles.created,
    ...changedFiles.renamed.map(r => r.to),
  ];

  const checks = {
    security: await runSecurityChecks(allFiles),
    docs: await checkDocsUpdated(allFiles),
    migrations: await checkMigrationsReviewed(allFiles),
  };

  // TODO 2.0: Migrate CI check to gh CLI wrapper
  // Check CI if GitHub info provided
  // if (options.owner && options.repo) {
  //   checks.ci = await checkCIStatus(options.owner, options.repo);
  // }

  const passed = Object.values(checks).every(c => c.passed);

  return {
    passed,
    checks,
  };
}

/**
 * Format quality gate results for display
 */
export function formatQualityGateResults(results) {
  const lines = [];

  // CI status
  if (results.checks.ci) {
    lines.push(results.checks.ci.passed ? '✅ CI passing' : '❌ CI failing');
  }

  // Security checks
  if (results.checks.security.passed) {
    lines.push('✅ Security checks passed');
  } else {
    lines.push('❌ Security issues found');
    if (results.checks.security.results.audit.total > 0) {
      lines.push(`   → ${results.checks.security.results.audit.total} vulnerabilities`);
    }
    if (results.checks.security.results.consoleLogs?.count > 0) {
      lines.push(`   → ${results.checks.security.results.consoleLogs.count} console.logs found`);
    }
    if (results.checks.security.results.todos?.count > 0) {
      lines.push(`   → ${results.checks.security.results.todos.count} orphaned TODOs`);
    }
  }

  // Documentation
  if (results.checks.docs.passed) {
    lines.push('✅ Documentation updated');
  } else {
    lines.push('⚠️  Documentation may need updating');
    if (results.checks.docs.warning) {
      lines.push(`   → ${results.checks.docs.warning}`);
    }
  }

  // Migrations
  if (results.checks.migrations.requiresReview) {
    lines.push('⚠️  Migration review required');
    lines.push(`   → ${results.checks.migrations.message}`);
  } else {
    lines.push('✅ No migrations or reviewed');
  }

  return lines;
}
