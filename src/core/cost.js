/**
 * Cost calculation: token estimates × pricing → an estimated USD figure, or an
 * explicit "cost unavailable" status when no pricing entry is known. The result
 * is always an ESTIMATE (token counts are approximate; see docs/limitations.md).
 */

/**
 * @typedef {Object} CostResult
 * @property {number|null} estimatedCostUsd
 * @property {number|null} inputCostUsd
 * @property {number|null} outputCostUsd
 * @property {'estimated'|'cost_unavailable'} costStatus
 */

/**
 * @param {number} n
 * @param {number} dp
 * @returns {number}
 */
function round(n, dp) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * Compute estimated cost from token counts and a pricing entry.
 * @param {{ inputTokens?: number, outputTokens?: number }} tokens
 * @param {{ usdPer1MInput: number, usdPer1MOutput: number }|null} pricingEntry
 * @returns {CostResult}
 */
export function computeCost(tokens, pricingEntry) {
  const inputTokens = Number(tokens && tokens.inputTokens) || 0;
  const outputTokens = Number(tokens && tokens.outputTokens) || 0;

  if (!pricingEntry) {
    return { estimatedCostUsd: null, inputCostUsd: null, outputCostUsd: null, costStatus: 'cost_unavailable' };
  }

  const inputCostUsd = (inputTokens / 1e6) * (pricingEntry.usdPer1MInput || 0);
  const outputCostUsd = (outputTokens / 1e6) * (pricingEntry.usdPer1MOutput || 0);
  return {
    estimatedCostUsd: round(inputCostUsd + outputCostUsd, 6),
    inputCostUsd: round(inputCostUsd, 6),
    outputCostUsd: round(outputCostUsd, 6),
    costStatus: 'estimated',
  };
}

/**
 * Format a USD amount for display. Small amounts keep more precision so a
 * fraction-of-a-cent turn is not shown as "$0.00".
 * @param {number|null} n
 * @returns {string}
 */
export function formatUsd(n) {
  if (n == null) return 'cost unavailable';
  if (n === 0) return '$0.00';
  if (n >= 1) return `$${n.toFixed(2)}`;
  // Sub-dollar: keep up to 4 decimals, trimming trailing zeros but never showing
  // fewer than 2 (so $0.40 stays "$0.40", while $0.018 stays "$0.018").
  let s = n.toFixed(4).replace(/0+$/, '');
  const dot = s.indexOf('.');
  if (dot === -1 || s.length - dot - 1 < 2) s = n.toFixed(2);
  return `$${s}`;
}

/**
 * Compact token display, e.g. 2360 → "2.4k".
 * @param {number} n
 * @returns {string}
 */
export function formatTokens(n) {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}k`;
}
