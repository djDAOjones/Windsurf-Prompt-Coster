/**
 * Human-readable summaries derived from a usage record. Every cost figure is
 * labelled an estimate; unknown models read "cost unavailable".
 */

import { formatUsd, formatTokens } from './cost.js';

/**
 * One-line per-turn summary, e.g.
 * `Cascade estimate: $0.018 · 2.4k in / 680 out · Claude Sonnet 4`.
 * @param {Object} record  A usage record from buildUsageRecord.
 * @returns {string}
 */
export function formatTurnSummary(record) {
  const tokens = `${formatTokens(record.inputTokens)} in / ${formatTokens(record.outputTokens)} out`;
  const model = record.model || 'Unknown';
  if (record.costStatus === 'estimated') {
    return `Cascade estimate: ${formatUsd(record.estimatedCostUsd)} · ${tokens} · ${model}`;
  }
  return `Cascade: cost unavailable · ${tokens} · ${model}`;
}

/**
 * Compact status-bar label for a running total, e.g. `≈ $0.42` (the ≈ keeps the
 * "estimate" meaning visible in a tiny space).
 * @param {number|null} totalUsd
 * @returns {string}
 */
export function formatStatusBar(totalUsd) {
  if (totalUsd == null) return '≈ $—';
  return `≈ ${formatUsd(totalUsd)}`;
}
