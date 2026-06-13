/**
 * Model discovery: aggregate the distinct model labels seen in the usage log and
 * mark which are currently priced. Windsurf's docs say the authoritative source
 * of current model labels is the in-IDE selector, and that label is exactly what
 * each hook event records — so the usage log is the local, privacy-safe way for a
 * user to find which labels they actually use and which still need a price.
 *
 * Read-only and counts-only: this reads the existing usage records (which never
 * contain prompt/response text) and aggregates counts; it writes nothing.
 */

import { lookupModel } from './pricing.js';

/**
 * @typedef {Object} ModelUsage
 * @property {string} model            The model label as recorded.
 * @property {number} count            Total turns recorded for this label.
 * @property {number} knownCostCount   Turns that had an estimated cost.
 * @property {number} unavailableCount Turns with no price at the time.
 * @property {string|null} lastSeen    Most recent loggedAt/timestamp seen.
 * @property {boolean} priced          Whether the label resolves in the registry now.
 */

/**
 * Aggregate usage records by model label, marking each priced/unpriced against
 * the current registry.
 * @param {Object[]} records  Records from readUsage().
 * @param {import('./pricing.js').PricingRegistry|null} registry
 * @returns {ModelUsage[]} sorted by count (desc), then model name.
 */
export function collectModels(records, registry) {
  const map = new Map();
  for (const r of records) {
    if (!r || typeof r !== 'object') continue;
    const model = typeof r.model === 'string' && r.model.trim() ? r.model : 'Unknown';
    let entry = map.get(model);
    if (!entry) {
      entry = {
        model,
        count: 0,
        knownCostCount: 0,
        unavailableCount: 0,
        lastSeen: null,
        priced: !!lookupModel(registry, model),
      };
      map.set(model, entry);
    }
    entry.count += 1;
    if (typeof r.estimatedCostUsd === 'number') entry.knownCostCount += 1;
    else entry.unavailableCount += 1;
    const ts = r.loggedAt || r.timestamp || null;
    if (ts && (entry.lastSeen == null || String(ts) > String(entry.lastSeen))) entry.lastSeen = ts;
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.model.localeCompare(b.model));
}

/**
 * Render the model-usage table as plain text for the CLI `models` command.
 * @param {ModelUsage[]} rows
 * @returns {string}
 */
export function formatModelsReport(rows) {
  if (!rows.length) return 'No usage recorded yet. Run some Cascade turns first.';
  const lines = [`Models seen in usage history (${rows.length}):`, ''];
  let unpriced = 0;
  for (const r of rows) {
    if (!r.priced) unpriced += 1;
    const mark = r.priced ? '[priced]  ' : '[UNPRICED]';
    const day = r.lastSeen ? String(r.lastSeen).slice(0, 10) : '—';
    lines.push(`  ${mark} ${r.model}  ·  ${r.count} turn${r.count === 1 ? '' : 's'}  ·  last ${day}`);
  }
  if (unpriced) {
    lines.push('');
    lines.push(`${unpriced} model${unpriced === 1 ? '' : 's'} need a price. Add them to your pricing config:`);
    lines.push('  ~/.cascade-cost-meter/pricing/pricing.v1.json  (see docs/pricing.md)');
  }
  return lines.join('\n');
}
