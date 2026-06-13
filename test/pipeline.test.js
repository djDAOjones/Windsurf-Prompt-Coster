import { describe, it, expect } from 'vitest';
import { processEvent } from '../src/core/pipeline.js';
import { buildRegistry } from '../src/core/pricing.js';
import { normalizeHookEvent } from '../src/core/event.js';

const registry = buildRegistry({
  version: 'v1',
  pricingBasis: 'test',
  currency: 'USD',
  models: [{ model: 'Claude Sonnet 4', usdPer1MInput: 3, usdPer1MOutput: 15 }],
});

const transcript = [
  JSON.stringify({ role: 'system', content: 'You are Cascade.' }),
  JSON.stringify({ role: 'user', content: 'Write hello world in Python.' }),
  JSON.stringify({ role: 'assistant', model: 'Claude Sonnet 4', content: "print('hello world')" }),
].join('\n');

const baseEvent = normalizeHookEvent({
  model_name: 'Claude Sonnet 4',
  trajectory_id: 'traj_1',
  execution_id: 'exec_1',
  timestamp: '2026-05-31T12:00:00.000Z',
  tool_info: { transcript_path: '/fake/transcript.jsonl' },
});

const settings = { exactTokenizer: false, storeText: false, textPreviewChars: 0 };

describe('processEvent', () => {
  it('produces an estimated cost record from a parsed transcript', async () => {
    const { record, summary } = await processEvent(baseEvent, {
      registry,
      settings,
      readTranscript: () => transcript,
    });

    expect(record.transcriptStatus).toBe('parsed');
    expect(record.model).toBe('Claude Sonnet 4');
    expect(record.inputTokens).toBeGreaterThan(0);
    expect(record.outputTokens).toBeGreaterThan(0);
    expect(record.costStatus).toBe('estimated');
    expect(record.estimatedCostUsd).toBeGreaterThan(0);
    expect(record.pricingVersion).toBe('v1');
    expect(summary).toMatch(/Cascade estimate: \$/);
  });

  it('parses the real Cascade action-stream schema into non-zero tokens', async () => {
    const cascade = [
      JSON.stringify({ status: 'done', type: 'user_input', user_input: { user_response: 'Write hello world in Python.' } }),
      JSON.stringify({ status: 'done', type: 'planner_response', planner_response: { response: 'Sure, here is a hello world program in Python that prints to stdout.' } }),
    ].join('\n');
    const { record } = await processEvent(baseEvent, { registry, settings, readTranscript: () => cascade });
    expect(record.transcriptStatus).toBe('parsed');
    expect(record.inputTokens).toBeGreaterThan(0);
    expect(record.outputTokens).toBeGreaterThan(0);
    expect(record.costStatus).toBe('estimated');
    expect(record.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('reports cost_unavailable for an unknown model', async () => {
    const ev = normalizeHookEvent({
      model_name: 'SWE-1.5',
      tool_info: { transcript_path: '/fake/t.jsonl' },
    });
    const { record, summary } = await processEvent(ev, {
      registry,
      settings,
      readTranscript: () => JSON.stringify({ role: 'assistant', content: 'done' }),
    });
    expect(record.costStatus).toBe('cost_unavailable');
    expect(record.estimatedCostUsd).toBeNull();
    expect(summary).toContain('cost unavailable');
  });

  it('degrades to missing when the transcript cannot be read', async () => {
    const { record } = await processEvent(baseEvent, {
      registry,
      settings,
      readTranscript: () => {
        throw new Error('ENOENT');
      },
    });
    expect(record.transcriptStatus).toBe('missing');
    expect(record.inputTokens).toBe(0);
  });

  it('never stores raw text by default, but stores previews when opted in', async () => {
    const off = await processEvent(baseEvent, { registry, settings, readTranscript: () => transcript });
    expect(JSON.stringify(off.record)).not.toContain('hello world');

    const on = await processEvent(baseEvent, {
      registry,
      settings: { exactTokenizer: false, storeText: true, textPreviewChars: 50 },
      readTranscript: () => transcript,
    });
    expect(on.record.outputPreview).toContain('hello world');
  });
});
