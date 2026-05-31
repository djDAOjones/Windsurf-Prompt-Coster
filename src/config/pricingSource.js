/**
 * Resolves which pricing config to load. Preference order:
 *   1. the user's file at `~/.cascade-cost-meter/pricing/pricing.v1.json`
 *   2. the bundled default shipped in this repo at `config/pricing/pricing.v1.json`
 * This lets users override prices without editing the repo, while always having
 * a working default.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePaths } from './paths.js';
import { loadPricing } from '../core/pricing.js';

/** Absolute path to the bundled default pricing file. */
export function bundledPricingFile() {
  return fileURLToPath(new URL('../../config/pricing/pricing.v1.json', import.meta.url));
}

/** Absolute path to the user's pricing file (may not exist). */
export function userPricingFile() {
  return path.join(resolvePaths().pricingDir, 'pricing.v1.json');
}

/**
 * Load a pricing registry from the user's file if present and valid, else the
 * bundled default.
 * @returns {{ registry: import('../core/pricing.js').PricingRegistry|null, error: Error|null, source: string }}
 */
export function loadPricingRegistry() {
  const userFile = userPricingFile();
  if (fs.existsSync(userFile)) {
    const res = loadPricing(userFile);
    if (res.registry) return { ...res, source: userFile };
  }
  const def = bundledPricingFile();
  const res = loadPricing(def);
  return { ...res, source: def };
}
