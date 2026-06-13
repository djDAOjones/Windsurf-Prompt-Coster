import { describe, it, expect } from 'vitest';
import { collectModels, formatModelsReport } from '../src/core/models.js';
import { buildRegistry } from '../src/core/pricing.js';

const registry = buildRegistry({
  version: 'v1',
  models: [{ model: 'Claude Opus 4.8', aliases: ['Claude Opus 4.8 Max'], usdPer1MInput: 5, usdPer1MOutput: 25 }],
});

describe('collectModels', () => {
  it('aggregates counts, lastSeen, and a priced flag by model label', () => {
    const records = [
      { model: 'Claude Opus 4.8 Max', estimatedCostUsd: 0.1, loggedAt: '2026-05-30T10:00:00Z' },
      { model: 'Claude Opus 4.8 Max', estimatedCostUsd: 0.2, loggedAt: '2026-05-31T10:00:00Z' },
      { model: 'SWE-1.6', estimatedCostUsd: null, loggedAt: '2026-05-31T09:00:00Z' },
    ];
    const rows = collectModels(records, registry);
    expect(rows).toHaveLength(2);

    const opus = rows.find((r) => r.model === 'Claude Opus 4.8 Max');
    expect(opus.count).toBe(2);
    expect(opus.priced).toBe(true); // resolves via alias
    expect(opus.knownCostCount).toBe(2);
    expect(opus.lastSeen).toBe('2026-05-31T10:00:00Z');

    const swe = rows.find((r) => r.model === 'SWE-1.6');
    expect(swe.priced).toBe(false);
    expect(swe.unavailableCount).toBe(1);
  });

  it('sorts by count desc and treats a missing label as Unknown', () => {
    const rows = collectModels(
      [{ estimatedCostUsd: null }, { model: 'X', estimatedCostUsd: 1 }, { model: 'X', estimatedCostUsd: 1 }],
      registry,
    );
    expect(rows[0].model).toBe('X');
    expect(rows[0].count).toBe(2);
    expect(rows.some((r) => r.model === 'Unknown')).toBe(true);
  });

  it('returns an empty array for no records', () => {
    expect(collectModels([], registry)).toEqual([]);
  });
});

describe('formatModelsReport', () => {
  it('marks priced and unpriced models and hints when prices are missing', () => {
    const rows = collectModels(
      [
        { model: 'Claude Opus 4.8 Max', estimatedCostUsd: 0.1, loggedAt: '2026-05-31T10:00:00Z' },
        { model: 'SWE-1.6', estimatedCostUsd: null, loggedAt: '2026-05-31T10:00:00Z' },
      ],
      registry,
    );
    const out = formatModelsReport(rows);
    expect(out).toContain('[priced]');
    expect(out).toContain('[UNPRICED]');
    expect(out).toContain('SWE-1.6');
    expect(out).toContain('pricing.v1.json');
  });

  it('handles an empty log gracefully', () => {
    expect(formatModelsReport([])).toContain('No usage recorded yet');
  });
});
