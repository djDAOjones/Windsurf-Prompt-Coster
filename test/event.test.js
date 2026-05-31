import { describe, it, expect } from 'vitest';
import { normalizeHookEvent } from '../src/core/event.js';

describe('normalizeHookEvent', () => {
  const now = () => '2026-05-31T00:00:00.000Z';

  it('maps documented snake_case fields', () => {
    const ev = normalizeHookEvent({
      agent_action_name: 'post_cascade_response_with_transcript',
      model_name: 'Claude Sonnet 4',
      trajectory_id: 'traj_1',
      execution_id: 'exec_1',
      timestamp: '2026-05-31T12:00:00.000Z',
      tool_info: { transcript_path: '/tmp/t.jsonl' },
    }, now);

    expect(ev.v).toBe(1);
    expect(ev.modelName).toBe('Claude Sonnet 4');
    expect(ev.trajectoryId).toBe('traj_1');
    expect(ev.executionId).toBe('exec_1');
    expect(ev.transcriptPath).toBe('/tmp/t.jsonl');
    expect(ev.receivedAt).toBe('2026-05-31T00:00:00.000Z');
  });

  it('stores responseChars (a count) and never the response text', () => {
    const ev = normalizeHookEvent({ model_name: 'GPT-4o', tool_info: { response: 'hello there' } }, now);
    expect(ev.responseChars).toBe('hello there'.length);
    expect(ev.transcriptPath).toBeNull();
    expect(JSON.stringify(ev)).not.toContain('hello there');
  });

  it('accepts camelCase keys too', () => {
    const ev = normalizeHookEvent({ modelName: 'GPT-4o', toolInfo: { transcriptPath: '/x' } }, now);
    expect(ev.modelName).toBe('GPT-4o');
    expect(ev.transcriptPath).toBe('/x');
  });

  it('handles missing/garbage input without throwing', () => {
    expect(() => normalizeHookEvent(null, now)).not.toThrow();
    expect(normalizeHookEvent(null, now).modelName).toBeNull();
  });
});
