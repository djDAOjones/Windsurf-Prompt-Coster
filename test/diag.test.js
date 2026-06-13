import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {
  probeHookConfig,
  probeDataDir,
  probeTranscripts,
  probeExtension,
  probeParser,
  probePricing,
  probeNode,
  classifyHookNode,
  gatherProbes,
} from '../src/diag/probe.js';
import { buildReport } from '../src/core/doctor.js';
import { changed, classifyChange, watchForTurn } from '../src/diag/canary.js';

let tmp;
const ENV_KEYS = ['CCM_DATA_DIR', 'CCM_WINDSURF_HOOKS', 'CCM_TRANSCRIPTS_DIR', 'CCM_EXT_DIR'];

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-diag-'));
});
afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

/** Make a fake repo root containing bin/hook.js. */
function fakeRepo(name = 'repo') {
  const root = path.join(tmp, name);
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bin', 'hook.js'), '// hook');
  return root;
}

describe('probeHookConfig', () => {
  it('reports a missing hooks file', () => {
    const res = probeHookConfig({ hooksFile: path.join(tmp, 'nope.json'), root: fakeRepo() });
    expect(res.exists).toBe(false);
  });

  it('recognises our entry pointing at this repo (absolute node pinned)', () => {
    const root = fakeRepo();
    const hooksFile = path.join(tmp, 'hooks.json');
    // The installer pins process.execPath, which exists on the test machine.
    const command = `"${process.execPath}" "${path.join(root, 'bin', 'hook.js')}"`;
    fs.writeFileSync(hooksFile, JSON.stringify({ version: 1, hooks: { post_cascade_response_with_transcript: [{ command }] } }));
    const res = probeHookConfig({ hooksFile, root });
    expect(res.ourCount).toBe(1);
    expect(res.pointsToThisRepo).toBe(true);
    expect(res.targetExists).toBe(true);
    expect(res.nodeBinary).toBe(process.execPath);
    expect(res.nodeRisk).toBe('ok');
  });

  it('still recognises a bare-node entry and reports the node binary', () => {
    const root = fakeRepo();
    const hooksFile = path.join(tmp, 'hooks.json');
    const command = `node "${path.join(root, 'bin', 'hook.js')}"`;
    fs.writeFileSync(hooksFile, JSON.stringify({ version: 1, hooks: { post_cascade_response_with_transcript: [{ command }] } }));
    const res = probeHookConfig({ hooksFile, root });
    expect(res.ourCount).toBe(1);
    expect(res.pointsToThisRepo).toBe(true);
    expect(res.nodeBinary).toBe('node');
  });

  it('flags a malformed hooks file', () => {
    const hooksFile = path.join(tmp, 'hooks.json');
    fs.writeFileSync(hooksFile, '{ not valid json');
    const res = probeHookConfig({ hooksFile, root: fakeRepo() });
    expect(res.malformed).toBe(true);
  });

  it('detects an entry that points at a different repo', () => {
    const root = fakeRepo();
    const hooksFile = path.join(tmp, 'hooks.json');
    const command = 'node "/some/other/place/bin/hook.js"';
    fs.writeFileSync(hooksFile, JSON.stringify({ version: 1, hooks: { post_cascade_response_with_transcript: [{ command }] } }));
    const res = probeHookConfig({ hooksFile, root });
    expect(res.ourCount).toBe(1);
    expect(res.pointsToThisRepo).toBe(false);
    expect(res.targetExists).toBe(false);
  });
});

describe('classifyHookNode', () => {
  it('marks an existing absolute node binary as ok', () => {
    const res = classifyHookNode(`"${process.execPath}" "/r/bin/hook.js"`);
    expect(res.nodeBinary).toBe(process.execPath);
    expect(res.nodeRisk).toBe('ok');
  });

  it('marks a missing absolute node binary as missing', () => {
    const res = classifyHookNode('/no/such/place/node "/r/bin/hook.js"');
    expect(res.nodeBinary).toBe('/no/such/place/node');
    expect(res.nodeRisk).toBe('missing');
  });

  it('parses a quoted node path that contains spaces', () => {
    const res = classifyHookNode('"/Users/joe/n v/bin/node" "/r/bin/hook.js"');
    expect(res.nodeBinary).toBe('/Users/joe/n v/bin/node');
    expect(res.nodeRisk).toBe('missing');
  });

  it('returns unknown for empty or non-string input', () => {
    expect(classifyHookNode('').nodeRisk).toBe('unknown');
    expect(classifyHookNode(null).nodeRisk).toBe('unknown');
  });

  it('extracts a bare node command name', () => {
    expect(classifyHookNode('node "/r/bin/hook.js"').nodeBinary).toBe('node');
  });
});

describe('probeDataDir', () => {
  it('reports caught_up when the offset equals the inbox size', () => {
    process.env.CCM_DATA_DIR = tmp;
    const inbox = path.join(tmp, 'inbox.jsonl');
    fs.writeFileSync(inbox, '{"v":1}\n');
    fs.writeFileSync(path.join(tmp, 'inbox.offset'), String(fs.statSync(inbox).size));
    const res = probeDataDir();
    expect(res.dirExists).toBe(true);
    expect(res.writable).toBe(true);
    expect(res.offsetState).toBe('caught_up');
  });

  it('reports pending when the offset is behind the inbox size', () => {
    process.env.CCM_DATA_DIR = tmp;
    fs.writeFileSync(path.join(tmp, 'inbox.jsonl'), '{"v":1}\n{"v":2}\n');
    fs.writeFileSync(path.join(tmp, 'inbox.offset'), '0');
    const res = probeDataDir();
    expect(res.offsetState).toBe('pending');
    expect(res.pendingBytes).toBeGreaterThan(0);
  });
});

describe('probeTranscripts', () => {
  it('counts transcripts and finds the newest', () => {
    process.env.CCM_TRANSCRIPTS_DIR = tmp;
    fs.writeFileSync(path.join(tmp, 'a.jsonl'), 'x');
    const res = probeTranscripts();
    expect(res.exists).toBe(true);
    expect(res.count).toBe(1);
    expect(res.newestMtimeMs).toBeGreaterThan(0);
  });

  it('handles a missing transcripts dir', () => {
    process.env.CCM_TRANSCRIPTS_DIR = path.join(tmp, 'absent');
    const res = probeTranscripts();
    expect(res.exists).toBe(false);
    expect(res.count).toBe(0);
  });
});

describe('probeExtension', () => {
  function installExtension(extDir, hash) {
    const dir = path.join(extDir, 'local.cascade-cost-meter-0.1.0');
    fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '0.1.0' }));
    fs.writeFileSync(path.join(dir, 'dist', 'extension.cjs'), hash);
  }
  function buildBundle(root, content) {
    fs.mkdirSync(path.join(root, 'extension', 'dist'), { recursive: true });
    fs.writeFileSync(path.join(root, 'extension', 'dist', 'extension.cjs'), content);
  }

  it('reports a match when installed and built bundles are identical', () => {
    const extDir = path.join(tmp, 'extensions');
    fs.mkdirSync(extDir, { recursive: true });
    const root = fakeRepo();
    installExtension(extDir, 'SAME-BYTES');
    buildBundle(root, 'SAME-BYTES');
    const res = probeExtension({ root, extDir });
    expect(res.installed).toBe(true);
    expect(res.installedVersion).toBe('0.1.0');
    expect(res.match).toBe(true);
  });

  it('reports a mismatch when the installed bundle is stale', () => {
    const extDir = path.join(tmp, 'extensions');
    fs.mkdirSync(extDir, { recursive: true });
    const root = fakeRepo();
    installExtension(extDir, 'OLD-BYTES');
    buildBundle(root, 'NEW-BYTES');
    const res = probeExtension({ root, extDir });
    expect(res.match).toBe(false);
  });

  it('reports not-installed when no matching extension dir exists', () => {
    const extDir = path.join(tmp, 'extensions');
    fs.mkdirSync(extDir, { recursive: true });
    const res = probeExtension({ root: fakeRepo(), extDir });
    expect(res.installed).toBe(false);
  });
});

describe('probe smoke', () => {
  it('parser passes its built-in samples', () => {
    const res = probeParser();
    expect(res.cascadeOk).toBe(true);
    expect(res.genericOk).toBe(true);
  });

  it('node probe reflects the running Node', () => {
    const res = probeNode();
    expect(res.major).toBeGreaterThanOrEqual(18);
    expect(res.ok).toBe(true);
  });

  it('pricing loads the bundled default registry', () => {
    process.env.CCM_DATA_DIR = tmp; // no user pricing → falls back to bundled
    const res = probePricing();
    expect(res.valid).toBe(true);
    expect(res.modelCount).toBeGreaterThan(0);
  });

  it('gatherProbes + buildReport never throw and produce a verdict (hermetic)', () => {
    process.env.CCM_DATA_DIR = tmp;
    process.env.CCM_WINDSURF_HOOKS = path.join(tmp, 'hooks.json');
    process.env.CCM_TRANSCRIPTS_DIR = path.join(tmp, 'transcripts');
    process.env.CCM_EXT_DIR = path.join(tmp, 'extensions');
    const report = buildReport(gatherProbes());
    expect(typeof report.verdict.layer).toBe('string');
    expect(Array.isArray(report.checks)).toBe(true);
  });
});

describe('canary classifyChange', () => {
  const base = { at: 0, inboxCount: 0, usageCount: 0, usageLastQuality: 'none', transcriptCount: 0, transcriptNewestMtimeMs: 0 };

  it('changed() detects any growth', () => {
    expect(changed(base, { ...base, inboxCount: 1 })).toBe(true);
    expect(changed(base, { ...base })).toBe(false);
    expect(changed(base, { ...base, transcriptNewestMtimeMs: 5 })).toBe(true);
  });

  it('healthy when usage grew with a healthy record', () => {
    const c = classifyChange(base, { ...base, usageCount: 1, usageLastQuality: 'healthy' });
    expect(c.layer).toBe('healthy');
  });

  it('parsing when usage grew but parsed to zero', () => {
    const c = classifyChange(base, { ...base, usageCount: 1, usageLastQuality: 'unparsed' });
    expect(c.layer).toBe('parsing');
  });

  it('pricing when usage grew but cost unavailable', () => {
    const c = classifyChange(base, { ...base, usageCount: 1, usageLastQuality: 'cost_unavailable' });
    expect(c.layer).toBe('pricing');
  });

  it('extension bridge when only the inbox grew', () => {
    const c = classifyChange(base, { ...base, inboxCount: 1 });
    expect(c.layer).toBe('extension bridge');
  });

  it('hook firing when only a transcript moved', () => {
    const c = classifyChange(base, { ...base, transcriptNewestMtimeMs: 99 });
    expect(c.layer).toBe('hook firing');
  });

  it('coverage when nothing moved', () => {
    const c = classifyChange(base, { ...base });
    expect(c.layer).toBe('coverage');
  });
});

describe('watchForTurn', () => {
  it('returns the classification once a turn lands', async () => {
    const snaps = [
      { at: Date.now(), inboxCount: 0, usageCount: 0, usageLastQuality: 'none', transcriptCount: 0, transcriptNewestMtimeMs: 0 },
      { at: Date.now(), inboxCount: 0, usageCount: 1, usageLastQuality: 'healthy', transcriptCount: 0, transcriptNewestMtimeMs: 0 },
    ];
    let n = 0;
    const res = await watchForTurn({
      snapshot: () => snaps[Math.min(n++, snaps.length - 1)],
      sleep: async () => {},
      intervalMs: 1,
      timeoutMs: 60_000,
    });
    expect(res.changed).toBe(true);
    expect(res.classification.layer).toBe('healthy');
  });

  it('reports coverage when nothing changes before the timeout', async () => {
    const snap = { at: Date.now(), inboxCount: 0, usageCount: 0, usageLastQuality: 'none', transcriptCount: 0, transcriptNewestMtimeMs: 0 };
    const res = await watchForTurn({ snapshot: () => snap, sleep: async () => {}, timeoutMs: 0 });
    expect(res.changed).toBe(false);
    expect(res.classification.layer).toBe('coverage');
  });
});
