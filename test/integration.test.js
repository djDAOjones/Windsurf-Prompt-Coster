import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const hookBin = path.join(root, 'bin', 'hook.js');
const cliBin = path.join(root, 'bin', 'cascade-cost-meter.js');

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-int-'));
});
afterEach(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function run(bin, input) {
  return spawnSync('node', [bin], {
    input,
    encoding: 'utf8',
    env: { ...process.env, CCM_DATA_DIR: dir },
  });
}

function runArgs(bin, args = [], input = '') {
  return spawnSync('node', [bin, ...args], {
    input,
    encoding: 'utf8',
    env: { ...process.env, CCM_DATA_DIR: dir },
  });
}

describe('bin/hook.js (fail-safe)', () => {
  it('records a valid event and exits 0', () => {
    const payload = JSON.stringify({
      model_name: 'Claude Sonnet 4',
      trajectory_id: 't1',
      tool_info: { transcript_path: '/x.jsonl' },
    });
    const res = run(hookBin, payload);
    expect(res.status).toBe(0);
    const inbox = fs.readFileSync(path.join(dir, 'inbox.jsonl'), 'utf8').trim().split('\n');
    expect(inbox).toHaveLength(1);
    expect(JSON.parse(inbox[0]).modelName).toBe('Claude Sonnet 4');
  });

  it('exits 0 on garbage stdin (never disrupts Cascade)', () => {
    const res = run(hookBin, 'this is not json at all');
    expect(res.status).toBe(0);
    // It still records a (null-ish) event so nothing is silently lost.
    const inbox = fs.readFileSync(path.join(dir, 'inbox.jsonl'), 'utf8').trim().split('\n');
    expect(inbox).toHaveLength(1);
  });

  it('exits 0 on empty stdin', () => {
    const res = run(hookBin, '');
    expect(res.status).toBe(0);
  });
});

describe('bin/cascade-cost-meter.js (headless pipeline)', () => {
  it('estimates from a real transcript file and logs a record', () => {
    const transcriptPath = path.join(dir, 'transcript.jsonl');
    fs.writeFileSync(
      transcriptPath,
      [
        JSON.stringify({ role: 'user', content: 'Say hi' }),
        JSON.stringify({ role: 'assistant', model: 'Claude Sonnet 4', content: 'hi there friend' }),
      ].join('\n'),
    );
    const payload = JSON.stringify({
      model_name: 'Claude Sonnet 4',
      timestamp: '2026-05-31T12:00:00.000Z',
      tool_info: { transcript_path: transcriptPath },
    });

    const res = run(cliBin, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/Cascade estimate: \$/);

    const usage = fs.readFileSync(path.join(dir, 'usage.jsonl'), 'utf8').trim().split('\n');
    expect(usage).toHaveLength(1);
    const rec = JSON.parse(usage[0]);
    expect(rec.model).toBe('Claude Sonnet 4');
    expect(rec.costStatus).toBe('estimated');
  });

  it('estimates from a real Cascade action-stream transcript', () => {
    const transcriptPath = path.join(dir, 'cascade.jsonl');
    fs.writeFileSync(
      transcriptPath,
      [
        JSON.stringify({ status: 'done', type: 'user_input', user_input: { user_response: 'Say hi to the world' } }),
        JSON.stringify({ status: 'done', type: 'planner_response', planner_response: { response: 'Hi there, world! Nice to meet you.' } }),
      ].join('\n'),
    );
    const payload = JSON.stringify({
      model_name: 'Claude Sonnet 4',
      tool_info: { transcript_path: transcriptPath },
    });

    const res = run(cliBin, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/Cascade estimate: \$/);

    const usage = fs.readFileSync(path.join(dir, 'usage.jsonl'), 'utf8').trim().split('\n');
    const rec = JSON.parse(usage[usage.length - 1]);
    expect(rec.transcriptStatus).toBe('parsed');
    expect(rec.inputTokens).toBeGreaterThan(0);
    expect(rec.outputTokens).toBeGreaterThan(0);
    expect(rec.costStatus).toBe('estimated');
  });

  it('lists models seen in the usage log via the `models` subcommand', () => {
    fs.writeFileSync(
      path.join(dir, 'usage.jsonl'),
      `${[
        JSON.stringify({ model: 'Claude Opus 4.8 Max', estimatedCostUsd: 0.12, costStatus: 'estimated', loggedAt: '2026-05-31T10:00:00Z' }),
        JSON.stringify({ model: 'SWE-1.6', estimatedCostUsd: null, costStatus: 'cost_unavailable', loggedAt: '2026-05-31T11:00:00Z' }),
      ].join('\n')}\n`,
    );

    const res = runArgs(cliBin, ['models']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Claude Opus 4.8 Max');
    expect(res.stdout).toContain('[priced]'); // Opus 4.8 Max resolves in the bundled config
    expect(res.stdout).toContain('[UNPRICED]'); // SWE-1.6 has no public token price
    expect(res.stdout).toContain('SWE-1.6');
  });

  it('removes duplicate records via the `dedup` subcommand and backs up the log', () => {
    const rec = (cost) => JSON.stringify({ executionId: 'exec_dupe', model: 'GPT-4o', estimatedCostUsd: cost, costStatus: 'estimated' });
    fs.writeFileSync(
      path.join(dir, 'usage.jsonl'),
      `${[rec(0.01), rec(0.01), JSON.stringify({ executionId: 'exec_unique', model: 'GPT-4o', estimatedCostUsd: 0.02, costStatus: 'estimated' })].join('\n')}\n`,
    );

    const res = runArgs(cliBin, ['dedup']);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/Removed 1 duplicate record\(s\); kept 2 of 3/);

    const usage = fs.readFileSync(path.join(dir, 'usage.jsonl'), 'utf8').trim().split('\n');
    expect(usage).toHaveLength(2);
    expect(fs.existsSync(path.join(dir, 'usage.jsonl.bak'))).toBe(true);
  });

  it('does not persist raw response text (privacy) on the summary path', () => {
    const secret = 'SECRET_RESPONSE_TEXT_12345';
    const payload = JSON.stringify({ model_name: 'GPT-4o', tool_info: { response: secret } });
    const res = run(cliBin, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain(secret);
    const usageRaw = fs.readFileSync(path.join(dir, 'usage.jsonl'), 'utf8');
    expect(usageRaw).not.toContain(secret);
  });
});
