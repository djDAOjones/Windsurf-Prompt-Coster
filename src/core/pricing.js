/**
 * Pricing registry: loads a VERSIONED pricing config (USD per 1M tokens) and
 * looks up a model by name or alias. Prices live entirely in config, never in
 * code (project invariant). Unknown models resolve to `null` so the caller can
 * report "cost unavailable" instead of guessing.
 */

import fs from 'node:fs';

/**
 * @typedef {Object} PricingEntry
 * @property {string} model
 * @property {number} usdPer1MInput
 * @property {number} usdPer1MOutput
 */

/**
 * @typedef {Object} PricingRegistry
 * @property {string} version
 * @property {string|null} pricingBasis
 * @property {string|null} effectiveDate
 * @property {string} currency
 * @property {Map<string, PricingEntry>} lookup  Normalised model/alias → entry.
 */

/**
 * Normalise a model name for case/space-insensitive matching.
 * @param {string|null|undefined} name
 * @returns {string}
 */
export function normalizeModel(name) {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Validate the parsed pricing object shape.
 * @param {unknown} obj
 * @returns {string[]} list of problems (empty = valid).
 */
export function validatePricing(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return ['pricing is not an object'];
  if (!('version' in obj) || obj.version == null) errors.push('missing "version"');
  if (!Array.isArray(obj.models)) errors.push('missing "models" array');
  return errors;
}

/**
 * Build an in-memory registry from a validated pricing object.
 * @param {Record<string, any>} pricingObj
 * @returns {PricingRegistry}
 */
export function buildRegistry(pricingObj) {
  const lookup = new Map();
  const models = Array.isArray(pricingObj.models) ? pricingObj.models : [];
  for (const m of models) {
    if (!m || typeof m !== 'object' || typeof m.model !== 'string') continue;
    /** @type {PricingEntry} */
    const entry = {
      model: m.model,
      usdPer1MInput: Number(m.usdPer1MInput) || 0,
      usdPer1MOutput: Number(m.usdPer1MOutput) || 0,
    };
    const keys = [m.model, ...(Array.isArray(m.aliases) ? m.aliases : [])];
    for (const k of keys) {
      if (typeof k === 'string' && k.trim()) lookup.set(normalizeModel(k), entry);
    }
  }
  return {
    version: String(pricingObj.version ?? ''),
    pricingBasis: pricingObj.pricingBasis ?? null,
    effectiveDate: pricingObj.effectiveDate ?? null,
    currency: pricingObj.currency ?? 'USD',
    lookup,
  };
}

/**
 * Load a pricing registry from a JSON file.
 * @param {string} filePath
 * @returns {{ registry: PricingRegistry|null, error: Error|null }}
 */
export function loadPricing(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const obj = JSON.parse(raw);
    const errors = validatePricing(obj);
    if (errors.length) return { registry: null, error: new Error(`invalid pricing config: ${errors.join('; ')}`) };
    return { registry: buildRegistry(obj), error: null };
  } catch (err) {
    return { registry: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Look up a model's pricing entry by name or alias.
 * @param {PricingRegistry|null} registry
 * @param {string|null|undefined} modelName
 * @returns {PricingEntry|null}
 */
export function lookupModel(registry, modelName) {
  if (!registry || !registry.lookup) return null;
  return registry.lookup.get(normalizeModel(modelName)) || null;
}
