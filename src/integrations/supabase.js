import axios from 'axios';
import { getConfig } from '../utils/config.js';

const SUPABASE_API_URL = 'https://api.supabase.com/v1';

/**
 * Get Supabase API headers
 */
async function getHeaders() {
  const token = await getConfig('supabaseToken', 'SUPABASE_ACCESS_TOKEN');
  if (!token) {
    throw new Error('Supabase access token not configured');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create a new Supabase project
 */
export async function createProject(name, organizationId, options = {}) {
  const headers = await getHeaders();

  const response = await axios.post(
    `${SUPABASE_API_URL}/projects`,
    {
      name,
      organization_id: organizationId,
      db_pass: options.dbPassword || generatePassword(),
      region: options.region || 'us-east-1',
      plan: options.plan || 'free',
    },
    { headers }
  );

  return response.data;
}

/**
 * Get project details
 */
export async function getProject(projectRef) {
  const headers = await getHeaders();

  const response = await axios.get(
    `${SUPABASE_API_URL}/projects/${projectRef}`,
    { headers }
  );

  return response.data;
}

/**
 * Get all organizations
 */
export async function getOrganizations() {
  const headers = await getHeaders();

  const response = await axios.get(
    `${SUPABASE_API_URL}/organizations`,
    { headers }
  );

  return response.data;
}

/**
 * Get project API keys
 */
export async function getProjectApiKeys(projectRef) {
  const headers = await getHeaders();

  const response = await axios.get(
    `${SUPABASE_API_URL}/projects/${projectRef}/api-keys`,
    { headers }
  );

  return response.data;
}

/**
 * Get connection string
 */
export async function getConnectionString(projectRef) {
  const project = await getProject(projectRef);
  return project.database?.connection_string || null;
}

/**
 * Wait for project to be ready
 */
export async function waitForProject(projectRef, maxAttempts = 30) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const project = await getProject(projectRef);

    if (project.status === 'ACTIVE_HEALTHY') {
      return project;
    }

    // Wait 10 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 10000));
    attempts++;
  }

  throw new Error('Project creation timeout');
}

/**
 * Generate secure password
 */
function generatePassword(length = 24) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Format project info for display
 */
export function formatProjectInfo(project) {
  return {
    id: project.id,
    ref: project.ref,
    name: project.name,
    status: project.status,
    url: `https://${project.ref}.supabase.co`,
    region: project.region,
  };
}

/**
 * Get project settings
 */
export async function getProjectSettings(projectRef) {
  const headers = await getHeaders();

  const response = await axios.get(
    `${SUPABASE_API_URL}/projects/${projectRef}/settings`,
    { headers }
  );

  return response.data;
}

/**
 * Run SQL query (for migrations)
 */
export async function runSQL(projectRef, sql) {
  const headers = await getHeaders();

  const response = await axios.post(
    `${SUPABASE_API_URL}/projects/${projectRef}/database/query`,
    { query: sql },
    { headers }
  );

  return response.data;
}
