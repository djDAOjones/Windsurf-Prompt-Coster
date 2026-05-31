import { describe, it, expect } from 'vitest';
import { computeCost, formatUsd, formatTokens } from '../src/core/cost.js';

describe('computeCost', () => {
  it('computes estimated USD from tokens and rates', () => {
    const entry = { usdPer1MInput: 3, usdPer1MOutput: 15 };
    const res = computeCost({ inputTokens: 1_000_000, outputTokens: 100_000 }, entry);
    expect(res.costStatus).toBe('estimated');
    expect(res.inputCostUsd).toBe(3);
    expect(res.outputCostUsd).toBe(1.5);
    expect(res.estimatedCostUsd).toBe(4.5);
  });

  it('reports cost_unavailable when there is no pricing entry', () => {
    const res = computeCost({ inputTokens: 100, outputTokens: 100 }, null);
    expect(res.costStatus).toBe('cost_unavailable');
    expect(res.estimatedCostUsd).toBeNull();
  });

  it('treats missing token counts as zero', () => {
    const res = computeCost({}, { usdPer1MInput: 3, usdPer1MOutput: 15 });
    expect(res.estimatedCostUsd).toBe(0);
  });
});

describe('formatUsd', () => {
  it('formats amounts and the unavailable case', () => {
    expect(formatUsd(null)).toBe('cost unavailable');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(0.018)).toBe('$0.018');
    expect(formatUsd(0.0123)).toBe('$0.0123');
    expect(formatUsd(0.4)).toBe('$0.40');
    expect(formatUsd(0.0008)).toBe('$0.0008');
    expect(formatUsd(1.5)).toBe('$1.50');
  });
});

describe('formatTokens', () => {
  it('formats compactly', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(680)).toBe('680');
    expect(formatTokens(2360)).toBe('2.4k');
  });
});
