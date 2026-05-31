import { describe, it, expect } from 'vitest';
import { parseTranscript } from '../src/core/parser.js';

describe('parseTranscript', () => {
  it('extracts the last assistant message as output and the rest as input', () => {
    const jsonl = [
      JSON.stringify({ role: 'system', content: 'You are Cascade.' }),
      JSON.stringify({ role: 'user', content: 'Hello there' }),
      JSON.stringify({ role: 'assistant', model: 'Claude Sonnet 4', content: 'Hi! How can I help?' }),
    ].join('\n');

    const turn = parseTranscript(jsonl);
    expect(turn.ok).toBe(true);
    expect(turn.model).toBe('Claude Sonnet 4');
    expect(turn.outputText).toBe('Hi! How can I help?');
    expect(turn.inputText).toContain('You are Cascade.');
    expect(turn.inputText).toContain('Hello there');
    expect(turn.outputChars).toBe('Hi! How can I help?'.length);
    expect(turn.inputChars).toBeGreaterThan(0);
  });

  it('skips malformed lines instead of throwing', () => {
    const jsonl = [
      '{ this is not json',
      JSON.stringify({ role: 'user', content: 'question' }),
      'also not json',
      JSON.stringify({ role: 'assistant', content: 'answer' }),
    ].join('\n');

    const turn = parseTranscript(jsonl);
    expect(turn.ok).toBe(true);
    expect(turn.outputText).toBe('answer');
    expect(turn.inputText).toContain('question');
  });

  it('accepts a whole-document JSON array', () => {
    const arr = JSON.stringify([
      { role: 'user', text: 'a question' },
      { role: 'assistant', text: 'a reply' },
    ]);
    const turn = parseTranscript(arr);
    expect(turn.ok).toBe(true);
    expect(turn.outputText).toBe('a reply');
  });

  it('extracts text from array-of-parts content', () => {
    const jsonl = JSON.stringify({ role: 'assistant', content: [{ text: 'part one' }, { text: 'part two' }] });
    const turn = parseTranscript(jsonl);
    expect(turn.outputText).toContain('part one');
    expect(turn.outputText).toContain('part two');
  });

  it('falls back to the last message when no role is recognised', () => {
    const jsonl = [
      JSON.stringify({ content: 'first' }),
      JSON.stringify({ content: 'second' }),
    ].join('\n');
    const turn = parseTranscript(jsonl);
    expect(turn.ok).toBe(true);
    expect(turn.outputText).toBe('second');
    expect(turn.inputText).toContain('first');
  });

  it('returns ok:false for empty or non-string input', () => {
    expect(parseTranscript('').ok).toBe(false);
    expect(parseTranscript(null).ok).toBe(false);
    expect(parseTranscript('   \n  ').ok).toBe(false);
  });
});
