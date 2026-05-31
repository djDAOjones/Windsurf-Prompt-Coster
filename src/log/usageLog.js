/**
 * The usage log (`usage.jsonl`) is the append-only history of estimated turns.
 * One JSON record per line. Readers tolerate malformed lines and records from
 * older schema versions (missing fields are simply absent).
 */

import fs from 'node:fs';
import { resolvePaths, ensureDataDir } from '../config/paths.js';

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

  for (const r of records) {
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
