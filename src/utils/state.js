import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATE_DIR = join(homedir(), '.dovetail');
const STATE_FILE = join(STATE_DIR, 'state.json');
const CONFIG_FILE = join(STATE_DIR, 'config.json');

/**
 * Ensure state directory exists
 */
async function ensureStateDir() {
  try {
    await fs.access(STATE_DIR);
  } catch {
    await fs.mkdir(STATE_DIR, { recursive: true });
  }
}

/**
 * Read state file
 */
export async function readState() {
  await ensureStateDir();
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Write state file
 */
export async function writeState(state) {
  await ensureStateDir();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Update state (merge with existing)
 */
export async function updateState(updates) {
  const current = await readState();
  const updated = { ...current, ...updates };
  await writeState(updated);
  return updated;
}

/**
 * Clear state
 */
export async function clearState() {
  await ensureStateDir();
  await fs.writeFile(STATE_FILE, '{}');
}

/**
 * Get current active issue
 */
export async function getActiveIssue() {
  const state = await readState();
  return state.activeIssue || null;
}

/**
 * Set active issue
 */
export async function setActiveIssue(issue) {
  await updateState({ activeIssue: issue });
}

/**
 * Clear active issue
 */
export async function clearActiveIssue() {
  const state = await readState();
  delete state.activeIssue;
  await writeState(state);
}

/**
 * Read config file
 */
export async function readConfig() {
  await ensureStateDir();
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Write config file
 */
export async function writeConfig(config) {
  await ensureStateDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Update config (merge with existing)
 */
export async function updateConfig(updates) {
  const current = await readConfig();
  const updated = { ...current, ...updates };
  await writeConfig(updated);
  return updated;
}

/**
 * Get project-specific state file path
 */
export function getProjectStatePath(projectRoot) {
  return join(projectRoot, '.dovetail', 'state.json');
}

/**
 * Read project-specific state
 */
export async function readProjectState(projectRoot) {
  const statePath = getProjectStatePath(projectRoot);
  try {
    const data = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Write project-specific state
 */
export async function writeProjectState(projectRoot, state) {
  const stateDir = join(projectRoot, '.dovetail');
  try {
    await fs.access(stateDir);
  } catch {
    await fs.mkdir(stateDir, { recursive: true });
  }

  const statePath = getProjectStatePath(projectRoot);
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

/**
 * Update project-specific state
 */
export async function updateProjectState(projectRoot, updates) {
  const current = await readProjectState(projectRoot);
  const updated = { ...current, ...updates };
  await writeProjectState(projectRoot, updated);
  return updated;
}
