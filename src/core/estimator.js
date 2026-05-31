/**
 * Token estimation.
 *
 * Default is a model-agnostic heuristic (~4 characters per token). An optional
 * EXACT path uses `js-tiktoken` for OpenAI-family models only — Anthropic Claude
 * and Google Gemini do not publish exact tokenizers, so they always use the
 * heuristic. Even with the exact path, the result is still an ESTIMATE: the true
 * model input (system prompt, rules, retrieved files, tool output) is not fully
 * observable from the transcript, so input tokens are undercounted. See
 * docs/limitations.md.
 */

const CHARS_PER_TOKEN = 4;

export const HEURISTIC_BASIS = `heuristic:chars/${CHARS_PER_TOKEN}`;

/**
 * Approximate tokens from a character count.
 * @param {number} chars
 * @param {number} [divisor]
 * @returns {number}
 */
export function heuristicTokens(chars, divisor = CHARS_PER_TOKEN) {
  if (!Number.isFinite(chars) || chars <= 0) return 0;
  return Math.max(1, Math.ceil(chars / divisor));
}

/**
 * Is this an OpenAI-family model (the only family with a public exact tokenizer)?
 * @param {string|null|undefined} model
 * @returns {boolean}
 */
export function isOpenAiModel(model) {
  const m = (model || '').toLowerCase();
  return m.includes('gpt') || m.includes('openai') || /\bo[1345]\b/.test(m) || m.includes('o3-') || m.includes('o4-');
}

/**
 * Exact token count via js-tiktoken (lazy, optional). Returns null if the
 * dependency is unavailable or anything goes wrong — callers fall back to the
 * heuristic.
 * @param {string} text
 * @returns {Promise<number|null>}
 */
async function exactTokens(text) {
  try {
    const mod = await import('js-tiktoken');
    const getEncoding = mod.getEncoding || (mod.default && mod.default.getEncoding);
    if (!getEncoding) return null;
    const enc = getEncoding('o200k_base');
    return enc.encode(text).length;
  } catch {
    return null;
  }
}

/**
 * @typedef {Object} TokenEstimate
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {string} tokenBasis
 */

/**
 * Estimate input/output tokens for a parsed turn.
 * @param {{ model?: string|null, inputText?: string, outputText?: string, inputChars?: number, outputChars?: number }} turn
 * @param {{ exactTokenizer?: boolean }} [opts]
 * @returns {Promise<TokenEstimate>}
 */
export async function estimateTurn(turn, opts = {}) {
  const inputText = turn.inputText || '';
  const outputText = turn.outputText || '';
  const inputChars = Number.isFinite(turn.inputChars) ? turn.inputChars : inputText.length;
  const outputChars = Number.isFinite(turn.outputChars) ? turn.outputChars : outputText.length;

  let inputTokens = heuristicTokens(inputChars);
  let outputTokens = heuristicTokens(outputChars);
  let tokenBasis = HEURISTIC_BASIS;

  if (opts.exactTokenizer && isOpenAiModel(turn.model) && inputText && outputText) {
    const it = await exactTokens(inputText);
    const ot = await exactTokens(outputText);
    if (it != null && ot != null) {
      inputTokens = it;
      outputTokens = ot;
      tokenBasis = 'tiktoken:o200k_base';
    }
  }

  return { inputTokens, outputTokens, tokenBasis };
}
