import { describe, it, expect } from 'vitest';
import { buildReport, formatReport, ago, STALE_MS } from '../src/core/doctor.js';
import { recordQuality } from '../src/diag/probe.js';

const NOW = Date.parse('2026-06-13T12:00:00Z');
const recent = (ms) => new Date(NOW - ms).toISOString();

/** A fully-healthy hook probe; spread + override in node-specific tests. */
const HEALTHY_HOOK = {
  hooksFile: '/h/hooks.json', exists: true, malformed: false, hasEvent: true,
  ourCount: 1, configuredCommand: '/usr/bin/node "/repo/bin/hook.js"', expectedCommand: '/usr/bin/node "/repo/bin/hook.js"',
  pointsToThisRepo: true, configuredTarget: '/repo/bin/hook.js', targetExists: true,
  nodeBinary: '/usr/bin/node', nodeRisk: 'ok',
};

/** A fully-healthy probe snapshot; override fields per test. */
function healthyProbes(overrides = {}) {
  const base = {
    now: NOW,
    node: { version: '20.11.0', major: 20, ok: true },
    hook: { ...HEALTHY_HOOK },
    data: { dir: '/d', dirExists: true, writable: true, inbox: { exists: true, size: 100 }, offset: 100, offsetState: 'caught_up', pendingBytes: 0, locksCount: 1 },
    inbox: { count: 3, newestAt: recent(60_000) },
    usage: { count: 5, newestAt: recent(60_000), lastQuality: 'healthy', lastModel: 'Claude Opus 4.8 Max', unpricedSeen: [] },
    transcripts: { dir: '/t', exists: true, count: 1, newestMtimeMs: NOW - 60_000 },
    parser: { cascadeOk: true, genericOk: true },
    pricing: { source: '/p', valid: true, error: null, version: 'v1', modelCount: 30 },
    extension: { installed: true, installedVersion: '0.1.0', installedHash: 'h', builtExists: true, builtHash: 'h', match: true },
  };
  return { ...base, ...overrides };
}

describe('buildReport verdict', () => {
  it('reports healthy when every layer is fine and turns are recent', () => {
    const r = buildReport(healthyProbes());
    expect(r.verdict.layer).toBe('healthy');
    expect(r.checks.find((c) => c.id === 'coverage').status).toBe('pass');
  });

  it('flags an old Node as an environment failure first', () => {
    const r = buildReport(healthyProbes({ node: { version: '16.0.0', major: 16, ok: false } }));
    expect(r.verdict.layer).toBe('environment');
    expect(r.verdict.status).toBe('fail');
  });

  it('flags a missing hook config', () => {
    const r = buildReport(healthyProbes({ hook: { hooksFile: '/h', exists: false, expectedCommand: 'node "x"' } }));
    expect(r.verdict.layer).toBe('hook config');
  });

  it('flags a malformed hook config', () => {
    const r = buildReport(healthyProbes({ hook: { hooksFile: '/h', exists: true, malformed: true, error: 'bad' } }));
    expect(r.verdict.layer).toBe('hook config');
  });

  it('flags a bare `node` Windsurf cannot resolve as the (root) cause', () => {
    const r = buildReport(healthyProbes({ hook: { ...HEALTHY_HOOK, nodeBinary: 'node', nodeRisk: 'bare_unresolved' } }));
    expect(r.verdict.layer).toBe('hook config');
    expect(r.verdict.status).toBe('fail');
    expect(r.verdict.hint).toMatch(/PATH/);
    expect(r.checks.find((c) => c.id === 'hook-node').status).toBe('fail');
  });

  it('flags a missing hook node binary', () => {
    const r = buildReport(healthyProbes({ hook: { ...HEALTHY_HOOK, nodeBinary: '/opt/homebrew/bin/node', nodeRisk: 'missing' } }));
    expect(r.verdict.layer).toBe('hook config');
    expect(r.verdict.status).toBe('fail');
  });

  it('flags an unwritable data dir', () => {
    const r = buildReport(healthyProbes({ data: { dir: '/d', dirExists: true, writable: false, offsetState: 'caught_up' } }));
    expect(r.verdict.layer).toBe('data dir');
  });

  it('flags a regressed parser', () => {
    const r = buildReport(healthyProbes({ parser: { cascadeOk: false, genericOk: true } }));
    expect(r.verdict.layer).toBe('parsing');
  });

  it('flags an invalid pricing config', () => {
    const r = buildReport(healthyProbes({ pricing: { valid: false, error: 'missing models' } }));
    expect(r.verdict.layer).toBe('pricing');
  });

  it('flags a stuck bridge when events are queued but unprocessed', () => {
    const r = buildReport(healthyProbes({ data: { dir: '/d', dirExists: true, writable: true, inbox: { exists: true, size: 200 }, offset: 100, offsetState: 'pending', pendingBytes: 100 } }));
    expect(r.verdict.layer).toBe('extension bridge');
  });

  it('returns coverage with a Codex hint when no recent hook events and no recent transcript', () => {
    const r = buildReport(healthyProbes({
      inbox: { count: 1, newestAt: recent(13 * 24 * 3600_000) },
      transcripts: { dir: '/t', exists: true, count: 1, newestMtimeMs: NOW - 13 * 24 * 3600_000 },
    }));
    expect(r.verdict.layer).toBe('coverage');
    expect(r.verdict.hint).toMatch(/Codex/);
    expect(r.verdict.nextSteps.join(' ')).toMatch(/--watch/);
  });

  it('returns coverage with a hook-firing hint when a transcript is recent but no hook event', () => {
    const r = buildReport(healthyProbes({
      inbox: { count: 1, newestAt: recent(13 * 24 * 3600_000) },
      transcripts: { dir: '/t', exists: true, count: 1, newestMtimeMs: NOW - 1000 },
    }));
    expect(r.verdict.layer).toBe('coverage');
    expect(r.verdict.hint).toMatch(/firing the hook|older conversation/);
  });

  it('returns coverage when nothing has ever been observed', () => {
    const r = buildReport(healthyProbes({
      inbox: { count: 0, newestAt: null },
      transcripts: { dir: '/t', exists: false, count: 0, newestMtimeMs: 0 },
    }));
    expect(r.verdict.layer).toBe('coverage');
  });

  it('blames parsing when recent turns parse to zero tokens', () => {
    const r = buildReport(healthyProbes({ usage: { count: 2, newestAt: recent(30_000), lastQuality: 'unparsed', lastModel: 'Claude Opus 4.8 Max', unpricedSeen: [] } }));
    expect(r.verdict.layer).toBe('parsing');
  });

  it('blames pricing when a recent turn is cost_unavailable', () => {
    const r = buildReport(healthyProbes({ usage: { count: 2, newestAt: recent(30_000), lastQuality: 'cost_unavailable', lastModel: 'SWE-1.5', unpricedSeen: ['SWE-1.5'] } }));
    expect(r.verdict.layer).toBe('pricing');
  });

  it('keeps a healthy verdict but surfaces a stale installed extension as a secondary warning', () => {
    const r = buildReport(healthyProbes({ extension: { installed: true, installedVersion: '0.1.0', installedHash: 'a', builtExists: true, builtHash: 'b', match: false } }));
    expect(r.verdict.layer).toBe('healthy');
    expect(r.otherWarnings.join(' ')).toMatch(/Extension build/);
  });

  it('degrades gracefully when a probe failed (returned a probeError)', () => {
    const r = buildReport(healthyProbes({ node: { probeError: 'boom' } }));
    // A failed node probe must not crash, and must not be read as "too old".
    expect(r.verdict.layer).not.toBe('environment');
    expect(r.checks.find((c) => c.id === 'node').status).toBe('warn');
  });
});

describe('formatReport', () => {
  it('renders status tags and a verdict line, and states it changed nothing', () => {
    const text = formatReport(buildReport(healthyProbes()));
    expect(text).toMatch(/\[PASS\]/);
    expect(text).toMatch(/VERDICT:/);
    expect(text).toMatch(/read-only — it changed nothing/);
  });
});

describe('ago', () => {
  it('formats compact ages', () => {
    expect(ago(NOW, recent(10_000))).toBe('just now');
    expect(ago(NOW, recent(5 * 60_000))).toBe('5m ago');
    expect(ago(NOW, recent(3 * 3600_000))).toBe('3h ago');
    expect(ago(NOW, recent(2 * 24 * 3600_000))).toBe('2d ago');
    expect(ago(NOW, null)).toBe('unknown');
  });
});

describe('recordQuality', () => {
  it('classifies record quality', () => {
    expect(recordQuality({ transcriptStatus: 'unparsed' })).toBe('unparsed');
    expect(recordQuality({ transcriptStatus: 'parsed', inputTokens: 0, outputTokens: 0 })).toBe('zero');
    expect(recordQuality({ transcriptStatus: 'parsed', inputTokens: 10, outputTokens: 5, costStatus: 'cost_unavailable', estimatedCostUsd: null })).toBe('cost_unavailable');
    expect(recordQuality({ transcriptStatus: 'parsed', inputTokens: 10, outputTokens: 5, costStatus: 'estimated', estimatedCostUsd: 0.01 })).toBe('healthy');
  });
});

describe('exports', () => {
  it('exposes STALE_MS as 24h', () => {
    expect(STALE_MS).toBe(24 * 60 * 60 * 1000);
  });
});
