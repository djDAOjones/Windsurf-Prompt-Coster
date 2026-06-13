import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { appendInbox, readNewEvents, commitOffset } from '../src/log/inbox.js';
import {
  appendUsage,
  appendUsageOnce,
  readUsage,
  summarize,
  claimEvent,
  dedupRecords,
  rewriteUsageDeduped,
} from '../src/log/usageLog.js';
import { resolvePaths } from '../src/config/paths.js';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-test-'));
  process.env.CCM_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.CCM_DATA_DIR;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('inbox queue', () => {
  it('reads new events from the committed offset and does not re-deliver', () => {
    appendInbox({ v: 1, modelName: 'A' });
    appendInbox({ v: 1, modelName: 'B' });

    const first = readNewEvents();
    expect(first.events.map((e) => e.modelName)).toEqual(['A', 'B']);
    commitOffset(first.newOffset);

    const empty = readNewEvents();
    expect(empty.events).toHaveLength(0);

    appendInbox({ v: 1, modelName: 'C' });
    const second = readNewEvents();
    expect(second.events.map((e) => e.modelName)).toEqual(['C']);
  });

  it('ignores a partial trailing line until it is complete', () => {
    const inboxPath = path.join(dir, 'inbox.jsonl');
    fs.writeFileSync(inboxPath, `${JSON.stringify({ v: 1, modelName: 'A' })}\n{"v":1,"modelName":"partial"`);
    const res = readNewEvents();
    expect(res.events.map((e) => e.modelName)).toEqual(['A']);
  });

  it('skips malformed complete lines', () => {
    const inboxPath = path.join(dir, 'inbox.jsonl');
    fs.writeFileSync(inboxPath, `not json\n${JSON.stringify({ v: 1, modelName: 'A' })}\n`);
    const res = readNewEvents();
    expect(res.events.map((e) => e.modelName)).toEqual(['A']);
  });
});

describe('usage log', () => {
  it('appends and reads records', () => {
    appendUsage({ v: 1, model: 'GPT-4o', estimatedCostUsd: 0.01 });
    appendUsage({ v: 1, model: 'Claude Sonnet 4', estimatedCostUsd: 0.02 });
    const records = readUsage();
    expect(records).toHaveLength(2);
    expect(records[1].model).toBe('Claude Sonnet 4');
  });

  it('summarises totals, today, unavailable, and per-model', () => {
    // Local-time literals (no trailing Z) so localDay() is timezone-independent.
    const today = new Date('2026-05-31T10:00:00');
    const records = [
      { model: 'GPT-4o', estimatedCostUsd: 0.01, costStatus: 'estimated', loggedAt: '2026-05-31T09:00:00' },
      { model: 'GPT-4o', estimatedCostUsd: 0.02, costStatus: 'estimated', loggedAt: '2026-05-31T09:30:00' },
      { model: 'SWE-1.5', estimatedCostUsd: null, costStatus: 'cost_unavailable', loggedAt: '2026-05-31T09:45:00' },
      { model: 'GPT-4o', estimatedCostUsd: 1.0, costStatus: 'estimated', loggedAt: '2020-01-01T00:00:00' },
    ];
    const s = summarize(records, today);
    expect(s.count).toBe(4);
    expect(s.unavailableCount).toBe(1);
    expect(s.totalUsd).toBeCloseTo(1.03, 6);
    expect(s.todayUsd).toBeCloseTo(0.03, 6);
    expect(s.todayCount).toBe(2);
    expect(s.byModel['GPT-4o'].count).toBe(3);
  });
});

describe('claim + dedup (one turn, one record)', () => {
  it('claimEvent lets the first caller win and blocks the rest for the same key', () => {
    expect(claimEvent('e:abc')).toBe(true);
    expect(claimEvent('e:abc')).toBe(false);
    expect(claimEvent('e:other')).toBe(true);
  });

  it('claimEvent always allows a null key (unidentifiable turn)', () => {
    expect(claimEvent(null)).toBe(true);
    expect(claimEvent(null)).toBe(true);
  });

  it('appendUsageOnce records a keyed turn once and skips the duplicate', () => {
    const rec = { v: 1, executionId: 'exec_42', model: 'GPT-4o', estimatedCostUsd: 0.01 };
    expect(appendUsageOnce(rec)).toBe(true);
    expect(appendUsageOnce({ ...rec, estimatedCostUsd: 0.99 })).toBe(false);
    expect(readUsage()).toHaveLength(1);
  });

  it('appendUsageOnce treats null-key records as always distinct', () => {
    expect(appendUsageOnce({ v: 1, model: 'A' })).toBe(true);
    expect(appendUsageOnce({ v: 1, model: 'A' })).toBe(true);
    expect(readUsage()).toHaveLength(2);
  });

  it('dedupRecords keeps the first per key and never collapses null-key records', () => {
    const out = dedupRecords([
      { executionId: 'e1', estimatedCostUsd: 0.01 },
      { executionId: 'e1', estimatedCostUsd: 0.99 },
      { model: 'no-id' },
      { model: 'no-id' },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0].estimatedCostUsd).toBe(0.01);
  });

  it('summarize collapses duplicate-key records before tallying', () => {
    const dupe = { executionId: 'e1', model: 'GPT-4o', estimatedCostUsd: 0.01, costStatus: 'estimated', loggedAt: '2026-05-31T09:00:00' };
    const s = summarize([dupe, { ...dupe }], new Date('2026-05-31T10:00:00'));
    expect(s.count).toBe(1);
    expect(s.totalUsd).toBeCloseTo(0.01, 6);
  });

  it('rewriteUsageDeduped removes duplicates and writes a backup', () => {
    appendUsage({ executionId: 'e1', model: 'GPT-4o', estimatedCostUsd: 0.01 });
    appendUsage({ executionId: 'e1', model: 'GPT-4o', estimatedCostUsd: 0.01 });
    appendUsage({ executionId: 'e2', model: 'GPT-4o', estimatedCostUsd: 0.02 });
    expect(rewriteUsageDeduped()).toEqual({ total: 3, kept: 2, removed: 1 });
    expect(readUsage()).toHaveLength(2);
    expect(fs.existsSync(`${resolvePaths().usageLog}.bak`)).toBe(true);
  });

  it('rewriteUsageDeduped is a no-op when there are no duplicates', () => {
    appendUsage({ executionId: 'e1', model: 'GPT-4o', estimatedCostUsd: 0.01 });
    expect(rewriteUsageDeduped()).toEqual({ total: 1, kept: 1, removed: 0 });
    expect(fs.existsSync(`${resolvePaths().usageLog}.bak`)).toBe(false);
  });
});
