/**
 * Builds the UsageRecord that is appended to the usage log. By default it
 * contains COUNTS AND METADATA ONLY — no raw prompt/response text. Truncated
 * text previews are included only when the user explicitly opts in
 * (`storeText` + `textPreviewChars`).
 */

/** Bump when the on-disk record shape changes (see AGENTS.md persistence checklist). */
export const RECORD_SCHEMA_VERSION = 1;

/**
 * @param {Object} args
 * @param {import('./event.js').InboxEvent} args.event
 * @param {string|null} args.model
 * @param {{ inputTokens: number, outputTokens: number, tokenBasis: string }} args.tokens
 * @param {import('./cost.js').CostResult} args.cost
 * @param {import('./pricing.js').PricingRegistry|null} args.registry
 * @param {string} args.transcriptStatus  parsed | unparsed | missing | summary | none
 * @param {{ inputText?: string, outputText?: string }} [args.turn]
 * @param {import('../config/settings.js').Settings} args.settings
 * @param {() => string} [args.now]
 * @returns {Object} the usage record (JSON-serialisable).
 */
export function buildUsageRecord(args) {
  const { event, model, tokens, cost, registry, transcriptStatus, turn = {}, settings, now = () => new Date().toISOString() } = args;

  const record = {
    v: RECORD_SCHEMA_VERSION,
    loggedAt: now(),
    timestamp: event.timestamp || event.receivedAt || null,
    trajectoryId: event.trajectoryId || null,
    executionId: event.executionId || null,
    model: model || event.modelName || 'Unknown',
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    tokenBasis: tokens.tokenBasis,
    estimatedCostUsd: cost.estimatedCostUsd,
    costStatus: cost.costStatus,
    pricingVersion: registry ? registry.version : null,
    pricingBasis: registry ? registry.pricingBasis : null,
    currency: registry ? registry.currency : (settings.currency || 'USD'),
    transcriptStatus,
  };

  // Privacy opt-in: store truncated text only when explicitly enabled.
  if (settings.storeText && settings.textPreviewChars > 0) {
    record.inputPreview = String(turn.inputText || '').slice(0, settings.textPreviewChars);
    record.outputPreview = String(turn.outputText || '').slice(0, settings.textPreviewChars);
  }

  return record;
}
