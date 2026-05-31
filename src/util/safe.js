/**
 * Fail-safe wrappers and internal logging.
 *
 * The hook entry point must NEVER throw back into Cascade. Everything fallible
 * is wrapped so that, on failure, we log locally and return a fallback instead
 * of propagating the error. Internal logging is itself best-effort and silent
 * on failure — logging must never become a new failure path.
 */

import fs from 'node:fs';
import { resolvePaths } from '../config/paths.js';

/**
 * Run a synchronous function, swallowing any error.
 * @template T
 * @param {() => T} fn        Work to attempt.
 * @param {T} fallback        Value to return if `fn` throws.
 * @param {string} [label]    Context label for the internal log.
 * @returns {T}
 */
export function safe(fn, fallback, label) {
  try {
    return fn();
  } catch (err) {
    logError(label || 'safe', err);
    return fallback;
  }
}

/**
 * Run an async function, swallowing any error.
 * @template T
 * @param {() => Promise<T>} fn  Work to attempt.
 * @param {T} fallback           Value to return if `fn` rejects.
 * @param {string} [label]       Context label for the internal log.
 * @returns {Promise<T>}
 */
export async function safeAsync(fn, fallback, label) {
  try {
    return await fn();
  } catch (err) {
    logError(label || 'safeAsync', err);
    return fallback;
  }
}

/**
 * Append a single line to the local debug log. Best-effort: any failure here
 * (including being unable to resolve or create the data dir) is ignored so that
 * logging can never disrupt the caller.
 * @param {string} label   Where the error happened.
 * @param {unknown} err    The error (or message) to record.
 */
export function logError(label, err) {
  try {
    const p = resolvePaths();
    fs.mkdirSync(p.dir, { recursive: true, mode: 0o700 });
    const message = err && err.stack ? err.stack : String(err);
    const line = `${new Date().toISOString()} [${label}] ${message}\n`;
    fs.appendFileSync(p.debugLog, line, { mode: 0o600 });
  } catch {
    // Intentionally ignored: logging is best-effort and must never throw.
  }
}
