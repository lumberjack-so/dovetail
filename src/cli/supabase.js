import { execa } from 'execa';
import chalk from 'chalk';

/**
 * Execute a Supabase CLI command
 * @param {Array<string>} args - Command arguments
 * @param {Object} options - Options (stdin, cwd, etc.)
 * @returns {Promise<Object>} - { stdout, stderr, success }
 */
export async function execSupabase(args, options = {}) {
  try {
    const { stdout, stderr, exitCode } = await execa('supabase', args, {
      reject: false,
      ...options
    });

    if (exitCode !== 0) {
      // Check for common errors
      if (stderr.includes('not logged in') || stderr.includes('authentication') || stderr.includes('access token')) {
        throw new Error(
          'Supabase CLI not authenticated.\n\n' +
          'Run: supabase login'
        );
      }

      if (stderr.includes('not found')) {
        throw new Error(`Supabase project not found.`);
      }

      if (stderr.includes('permission') || stderr.includes('unauthorized')) {
        throw new Error(
          `Supabase permission denied.\n\n` +
          `Check that you have access to the organization/project.`
        );
      }

      throw new Error(`Supabase CLI command failed:\n${stderr || stdout}`);
    }

    return { stdout, stderr, success: true };
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('command not found')) {
      throw new Error(
        'Supabase CLI not installed.\n\n' +
        'Install it from: https://supabase.com/docs/guides/cli\n' +
        '  macOS:   brew install supabase/tap/supabase\n' +
        '  Windows: scoop install supabase\n' +
        '  Linux:   See https://supabase.com/docs/guides/cli'
      );
    }
    throw error;
  }
}

/**
 * Check authentication status
 */
export async function checkAuth() {
  try {
    await execSupabase(['projects', 'list']);
    return { authenticated: true };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}

/**
 * List all organizations
 */
export async function listOrgs() {
  const { stdout } = await execSupabase(['orgs', 'list', '--output', 'json']);
  return JSON.parse(stdout);
}

/**
 * List all projects
 */
export async function listProjects() {
  const { stdout } = await execSupabase(['projects', 'list', '--output', 'json']);
  return JSON.parse(stdout);
}

/**
 * Create a new project
 */
export async function createProject(name, options) {
  const args = [
    'projects',
    'create',
    name,
    '--org-id', options.orgId,
    '--db-password', options.dbPassword,
    '--region', options.region || 'us-east-1',
    '--output', 'json'
  ];

  if (options.plan) {
    args.push('--plan', options.plan);
  }

  const { stdout } = await execSupabase(args);
  return JSON.parse(stdout);
}

/**
 * Get project API keys
 */
export async function getProjectKeys(projectRef) {
  const { stdout } = await execSupabase([
    'projects',
    'api-keys',
    '--project-ref', projectRef,
    '--output', 'json'
  ]);
  return JSON.parse(stdout);
}

/**
 * Link local project to remote
 */
export async function linkProject(projectRef) {
  await execSupabase(['link', '--project-ref', projectRef]);
}

/**
 * Get project details
 */
export async function getProject(projectRef) {
  const projects = await listProjects();
  return projects.find(p => p.id === projectRef || p.ref === projectRef);
}
