/**
 * Resolves the on-disk locations the meter uses. Everything lives OUTSIDE the
 * repo, in the user's home directory, so usage history is never committed or
 * synced to cloud storage. Set the `CCM_DATA_DIR` environment variable to point
 * the meter at a different directory — tests use this to stay off the real log.
 */

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

/** Environment variable that overrides the data directory (used by tests). */
export const DATA_DIR_ENV = 'CCM_DATA_DIR';

/** Environment variable that overrides the Windsurf hooks.json path (used by tests). */
export const HOOKS_FILE_ENV = 'CCM_WINDSURF_HOOKS';

/**
 * The base data directory, e.g. `~/.cascade-cost-meter` (or `$CCM_DATA_DIR`).
 * @returns {string}
 */
export function dataDir() {
  const override = process.env[DATA_DIR_ENV];
  return override && override.trim() ? override : path.join(os.homedir(), '.cascade-cost-meter');
}

/**
 * Absolute path to the Windsurf Cascade hooks config the installer merges into,
 * `~/.codeium/windsurf/hooks.json` by default. Set `$CCM_WINDSURF_HOOKS` to point
 * elsewhere — tests use this so they never touch the user's real config.
 * @returns {string}
 */
export function windsurfHooksFile() {
  const override = process.env[HOOKS_FILE_ENV];
  return override && override.trim()
    ? override
    : path.join(os.homedir(), '.codeium', 'windsurf', 'hooks.json');
}

/**
 * All file/dir paths the meter reads or writes.
 * @returns {{
 *   dir: string, pricingDir: string, settingsFile: string,
 *   usageLog: string, inbox: string, inboxOffset: string, debugLog: string,
 *   locksDir: string
 * }}
 */
export function resolvePaths() {
  const dir = dataDir();
  return {
    dir,
    pricingDir: path.join(dir, 'pricing'),
    settingsFile: path.join(dir, 'settings.json'),
    usageLog: path.join(dir, 'usage.jsonl'),
    inbox: path.join(dir, 'inbox.jsonl'),
    inboxOffset: path.join(dir, 'inbox.offset'),
    debugLog: path.join(dir, 'debug.log'),
    locksDir: path.join(dir, 'locks'),
  };
}

/**
 * Ensure the data directory exists with owner-only permissions.
 * @returns {string} the data directory path.
 */
export function ensureDataDir() {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
