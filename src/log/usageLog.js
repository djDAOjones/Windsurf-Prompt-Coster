/**
 * The usage log (`usage.jsonl`) is the append-only history of estimated turns.
 * One JSON record per line. Readers tolerate malformed lines and records from
 * older schema versions (missing fields are simply absent).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolvePaths, ensureDataDir } from '../config/paths.js';
import { dedupKey } from '../core/event.js';

/**
 * Append one usage record.
 * @param {Object} record
 * @param {ReturnType<typeof resolvePaths>} [paths]
 */
export function appendUsage(record, paths = resolvePaths()) {
  ensureDataDir();
  fs.appendFileSync(paths.usageLog, `${JSON.stringify(record)}\n`, { mode: 0o600 });
}

/**
 * Atomically claim a turn so exactly one consumer records it. Creates an
 * exclusive lock file named after the key; returns true if THIS caller won the
 * claim, false if another consumer already holds it. A null key (unidentifiable
 * turn) is always allowed. On any unexpected fs error we fail OPEN (return true)
 * — risking a rare duplicate (which dedup-on-read collapses) is safer than
 * silently dropping a turn.
 * @param {string|null} key
 * @param {ReturnType<typeof resolvePaths>} [paths]
 * @returns {boolean} true if the caller may proceed to record the turn.
 */
export function claimEvent(key, paths = resolvePaths()) {
  if (!key) return true;
  try {
    ensureDataDir();
    fs.mkdirSync(paths.locksDir, { recursive: true, mode: 0o700 });
    const name = `${crypto.createHash('sha1').update(String(key)).digest('hex')}.lock`;
    const fd = fs.openSync(path.join(paths.locksDir, name), 'wx', 0o600);
    fs.writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
    fs.closeSync(fd);
    return true;
  } catch (err) {
    if (err && err.code === 'EEXIST') return false;
    return true;
  }
}

/**
 * Append a usage record unless this turn was already recorded by another
 * consumer. Returns true if written, false if it was a duplicate. Used by the
 * extension's multi-host watch path; the single-shot CLI uses appendUsage.
 * @param {Object} record
 * @param {ReturnType<typeof resolvePaths>} [paths]
 * @returns {boolean}
 */
export function appendUsageOnce(record, paths = resolvePaths()) {
  if (!claimEvent(dedupKey(record), paths)) return false;
  appendUsage(record, paths);
  return true;
}

/**
 * Read all usage records (skipping malformed lines).
 * @param {ReturnType<typeof resolvePaths>} [paths]
 * @returns {Object[]}
 */
export function readUsage(paths = resolvePaths()) {
  let raw = '';
  try {
    raw = fs.readFileSync(paths.usageLog, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    try {
      out.push(JSON.parse(l));
    } catch {
      // Skip malformed line.
    }
  }
  return out;
}

/**
 * Collapse duplicate records, keeping the first occurrence of each dedup key.
 * Records with no identifiable key are never collapsed (each is kept).
 * @param {Object[]} records
 * @returns {Object[]}
 */
export function dedupRecords(records) {
  if (!Array.isArray(records)) return [];
  const seen = new Set();
  const out = [];
  for (const r of records) {
    const key = dedupKey(r);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(r);
  }
  return out;
}

/**
 * Rewrite the usage log with duplicates removed, backing up the original to
 * `usage.jsonl.bak` first. No-op (no backup, no write) when there is nothing to
 * remove. Returns before/after counts for reporting.
 * @param {ReturnType<typeof resolvePaths>} [paths]
 * @returns {{ total: number, kept: number, removed: number }}
 */
export function rewriteUsageDeduped(paths = resolvePaths()) {
  const records = readUsage(paths);
  const kept = dedupRecords(records);
  const removed = records.length - kept.length;
  if (removed > 0) {
    try {
      fs.copyFileSync(paths.usageLog, `${paths.usageLog}.bak`);
    } catch {
      // Nothing to back up; the rewrite below still writes the deduped set.
    }
    const body = kept.map((r) => JSON.stringify(r)).join('\n');
    fs.writeFileSync(paths.usageLog, kept.length ? `${body}\n` : '', { mode: 0o600 });
  }
  return { total: records.length, kept: kept.length, removed };
}

/**
 * Local YYYY-MM-DD for a date-ish value.
 * @param {string|number|Date} value
 * @returns {string}
 */
function localDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Summarise records into totals overall, for today, and per model. Records with
 * unknown cost contribute to counts but not to the dollar totals.
 * @param {Object[]} records
 * @param {Date} [today]
 * @returns {{
 *   count: number, knownCostCount: number, unavailableCount: number,
 *   totalUsd: number, todayUsd: number, todayCount: number,
 *   byModel: Record<string, { count: number, totalUsd: number }>
 * }}
 */
export function summarize(records, today = new Date()) {
  const todayKey = localDay(today);
  const summary = {
    count: 0,
    knownCostCount: 0,
    unavailableCount: 0,
    totalUsd: 0,
    todayUsd: 0,
    todayCount: 0,
    byModel: {},
  };

  // Collapse duplicate-key records (the same turn recorded twice) before
  // tallying so totals stay correct even if the log still holds legacy dupes.
  for (const r of dedupRecords(records)) {
    if (!r || typeof r !== 'object') continue;
    summary.count += 1;
    const cost = typeof r.estimatedCostUsd === 'number' ? r.estimatedCostUsd : null;
    const model = r.model || 'Unknown';
    if (!summary.byModel[model]) summary.byModel[model] = { count: 0, totalUsd: 0 };
    summary.byModel[model].count += 1;

    if (cost == null) {
      summary.unavailableCount += 1;
    } else {
      summary.knownCostCount += 1;
      summary.totalUsd += cost;
      summary.byModel[model].totalUsd += cost;
      if (localDay(r.loggedAt || r.timestamp) === todayKey) {
        summary.todayUsd += cost;
        summary.todayCount += 1;
      }
    }
  }
  return summary;
}
