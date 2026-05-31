import { describe, it, expect } from 'vitest';
import { buildRegistry, validatePricing, lookupModel, normalizeModel } from '../src/core/pricing.js';
import { loadPricing } from '../src/core/pricing.js';
import { bundledPricingFile } from '../src/config/pricingSource.js';

const sample = {
  version: 'v1',
  pricingBasis: 'test',
  effectiveDate: '2026-05-31',
  currency: 'USD',
  models: [
    { model: 'Claude Sonnet 4', aliases: ['claude-sonnet-4', 'Claude 3.5 Sonnet'], usdPer1MInput: 3, usdPer1MOutput: 15 },
    { model: 'GPT-4o', usdPer1MInput: 2.5, usdPer1MOutput: 10 },
  ],
};

describe('normalizeModel', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeModel('  Claude   Sonnet 4 ')).toBe('claude sonnet 4');
  });
});

describe('validatePricing', () => {
  it('flags missing version and models', () => {
    expect(validatePricing({})).toContain('missing "version"');
    expect(validatePricing({ version: 'v1' })).toContain('missing "models" array');
    expect(validatePricing(sample)).toHaveLength(0);
  });
});

describe('buildRegistry + lookupModel', () => {
  const registry = buildRegistry(sample);

  it('looks up by canonical name (case-insensitive)', () => {
    expect(lookupModel(registry, 'claude sonnet 4').usdPer1MOutput).toBe(15);
    expect(lookupModel(registry, 'GPT-4o').usdPer1MInput).toBe(2.5);
  });

  it('looks up by alias', () => {
    expect(lookupModel(registry, 'Claude 3.5 Sonnet').usdPer1MInput).toBe(3);
    expect(lookupModel(registry, 'claude-sonnet-4').usdPer1MOutput).toBe(15);
  });

  it('returns null for unknown models', () => {
    expect(lookupModel(registry, 'SWE-1.5')).toBeNull();
    expect(lookupModel(registry, '')).toBeNull();
    expect(lookupModel(null, 'GPT-4o')).toBeNull();
  });
});

describe('the bundled pricing config', () => {
  it('loads and validates', () => {
    const { registry, error } = loadPricing(bundledPricingFile());
    expect(error).toBeNull();
    expect(registry).not.toBeNull();
    expect(registry.version).toBe('v1');
    expect(lookupModel(registry, 'Claude Sonnet 4')).not.toBeNull();
  });
});
