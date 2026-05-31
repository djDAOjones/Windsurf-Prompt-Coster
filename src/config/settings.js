/**
 * User settings: defaults plus an optional `settings.json` in the data dir.
 * Settings are deliberately small and privacy-first — text storage is OFF by
 * default. Unknown keys in the file are ignored; malformed files fall back to
 * defaults rather than throwing.
 */

import fs from 'node:fs';
import { resolvePaths } from './paths.js';

/**
 * @typedef {Object} Settings
 * @property {string}  currency           Display currency code (informational; pricing is USD).
 * @property {boolean} exactTokenizer     Use js-tiktoken for OpenAI models when available.
 * @property {boolean} storeText          Persist (truncated) prompt/response text. Privacy opt-in.
 * @property {number}  textPreviewChars   Max chars stored per side when storeText is true.
 * @property {number}  notifyThresholdUsd Only surface turns at/above this estimated cost (0 = all).
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = {
  currency: 'USD',
  exactTokenizer: false,
  storeText: false,
  textPreviewChars: 0,
  notifyThresholdUsd: 0,
};

/**
 * Load settings, merging file values and explicit overrides over the defaults.
 * @param {Partial<Settings>} [overrides]  Programmatic overrides (highest priority).
 * @returns {Settings}
 */
export function loadSettings(overrides = {}) {
  let fromFile = {};
  try {
    const raw = fs.readFileSync(resolvePaths().settingsFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') fromFile = parsed;
  } catch {
    // No settings file, or unreadable/invalid — defaults are fine.
  }
  return sanitize({ ...DEFAULT_SETTINGS, ...fromFile, ...overrides });
}

/**
 * Coerce settings to safe types so a bad file value can't break downstream code.
 * @param {Record<string, unknown>} s
 * @returns {Settings}
 */
function sanitize(s) {
  return {
    currency: typeof s.currency === 'string' ? s.currency : DEFAULT_SETTINGS.currency,
    exactTokenizer: Boolean(s.exactTokenizer),
    storeText: Boolean(s.storeText),
    textPreviewChars: Number.isFinite(s.textPreviewChars) ? Math.max(0, Math.floor(s.textPreviewChars)) : 0,
    notifyThresholdUsd: Number.isFinite(s.notifyThresholdUsd) ? Math.max(0, s.notifyThresholdUsd) : 0,
  };
}
