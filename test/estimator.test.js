import { describe, it, expect } from 'vitest';
import { heuristicTokens, isOpenAiModel, estimateTurn, HEURISTIC_BASIS } from '../src/core/estimator.js';

describe('heuristicTokens', () => {
  it('returns 0 for non-positive input', () => {
    expect(heuristicTokens(0)).toBe(0);
    expect(heuristicTokens(-5)).toBe(0);
    expect(heuristicTokens(NaN)).toBe(0);
  });

  it('approximates ~4 chars per token with a floor of 1', () => {
    expect(heuristicTokens(1)).toBe(1);
    expect(heuristicTokens(4)).toBe(1);
    expect(heuristicTokens(10)).toBe(3); // ceil(10/4)
    expect(heuristicTokens(100)).toBe(25);
  });
});

describe('isOpenAiModel', () => {
  it('detects OpenAI-family models', () => {
    expect(isOpenAiModel('GPT-4o')).toBe(true);
    expect(isOpenAiModel('gpt-4.1-mini')).toBe(true);
    expect(isOpenAiModel('o3')).toBe(true);
  });
  it('returns false for non-OpenAI models', () => {
    expect(isOpenAiModel('Claude Sonnet 4')).toBe(false);
    expect(isOpenAiModel('Gemini 2.5 Pro')).toBe(false);
    expect(isOpenAiModel(null)).toBe(false);
  });
});

describe('estimateTurn', () => {
  it('uses the heuristic basis by default', async () => {
    const turn = { model: 'Claude Sonnet 4', inputText: 'x'.repeat(40), outputText: 'y'.repeat(20) };
    const est = await estimateTurn(turn);
    expect(est.tokenBasis).toBe(HEURISTIC_BASIS);
    expect(est.inputTokens).toBe(10); // 40/4
    expect(est.outputTokens).toBe(5); // 20/4
  });

  it('falls back to the heuristic when exact tokenizer is unavailable', async () => {
    const turn = { model: 'GPT-4o', inputText: 'hello world', outputText: 'hi' };
    const est = await estimateTurn(turn, { exactTokenizer: true });
    // Either js-tiktoken produced exact tokens, or we fell back — both valid.
    expect(est.inputTokens).toBeGreaterThan(0);
    expect(est.outputTokens).toBeGreaterThan(0);
    expect(['tiktoken:o200k_base', HEURISTIC_BASIS]).toContain(est.tokenBasis);
  });

  it('estimates from char counts when no text is present (summary path)', async () => {
    const est = await estimateTurn({ model: 'GPT-4o', outputChars: 80 });
    expect(est.inputTokens).toBe(0);
    expect(est.outputTokens).toBe(20);
  });
});
