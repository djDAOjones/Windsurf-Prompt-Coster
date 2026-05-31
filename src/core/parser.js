/**
 * Transcript parser: turns a Cascade transcript (JSONL, or a JSON array) into a
 * normalised view of the latest turn's input/output text.
 *
 * IMPORTANT: the exact transcript schema is NOT officially documented and the
 * docs warn it "may change". This parser is therefore deliberately defensive and
 * heuristic — it recognises common role/text field names rather than a fixed
 * shape, skips malformed lines, and degrades to nulls instead of throwing. The
 * field-name lists are overridable via `opts` so users can tune to a real
 * transcript without code changes. Validate against a real sample before relying
 * on the numbers (see docs/limitations.md).
 *
 * Heuristic for a turn: the LAST assistant/model message is the output; every
 * message before it (system, user, prior assistant, tool output) approximates the
 * input context resent for that turn.
 */

const DEFAULT_ROLE_FIELDS = ['role', 'type', 'speaker', 'sender', 'author', 'kind'];
const DEFAULT_TEXT_FIELDS = ['content', 'text', 'message', 'value', 'body', 'data'];
const DEFAULT_MODEL_FIELDS = ['model', 'model_name', 'modelName'];
const DEFAULT_USER_ROLES = ['user', 'human', 'you', 'prompt', 'input'];
const DEFAULT_ASSISTANT_ROLES = ['assistant', 'ai', 'model', 'bot', 'cascade', 'response', 'output', 'completion'];

/**
 * @typedef {Object} ParsedTurn
 * @property {string|null} model
 * @property {string} inputText
 * @property {string} outputText
 * @property {number} inputChars
 * @property {number} outputChars
 * @property {number} messageCount
 * @property {boolean} ok            True if any usable message text was found.
 */

/**
 * Parse transcript text into a normalised turn view.
 * @param {string} text  Raw transcript file contents.
 * @param {Object} [opts]
 * @param {string[]} [opts.roleFields]
 * @param {string[]} [opts.textFields]
 * @param {string[]} [opts.modelFields]
 * @param {string[]} [opts.userRoles]
 * @param {string[]} [opts.assistantRoles]
 * @returns {ParsedTurn}
 */
export function parseTranscript(text, opts = {}) {
  const roleFields = opts.roleFields || DEFAULT_ROLE_FIELDS;
  const textFields = opts.textFields || DEFAULT_TEXT_FIELDS;
  const modelFields = opts.modelFields || DEFAULT_MODEL_FIELDS;
  const userRoles = opts.userRoles || DEFAULT_USER_ROLES;
  const assistantRoles = opts.assistantRoles || DEFAULT_ASSISTANT_ROLES;

  const empty = { model: null, inputText: '', outputText: '', inputChars: 0, outputChars: 0, messageCount: 0, ok: false };
  if (!text || typeof text !== 'string') return empty;

  const objects = parseObjects(text);
  if (objects.length === 0) return empty;

  let model = null;
  const messages = [];
  for (const obj of objects) {
    if (model == null) model = findModel(obj, modelFields);
    const content = extractText(obj, textFields);
    if (content && content.trim()) {
      messages.push({ role: detectRole(obj, roleFields, userRoles, assistantRoles), text: content });
    }
  }
  if (messages.length === 0) return { ...empty, model };

  // Output = last assistant message; if none identified, the last message.
  let outIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') { outIdx = i; break; }
  }
  if (outIdx === -1) outIdx = messages.length - 1;

  const outputText = messages[outIdx].text;
  const inputText = messages.filter((_, i) => i !== outIdx).map((m) => m.text).join('\n');

  return {
    model,
    inputText,
    outputText,
    inputChars: inputText.length,
    outputChars: outputText.length,
    messageCount: messages.length,
    ok: true,
  };
}

/**
 * Parse raw text into an array of objects. Accepts JSONL (one object per line)
 * or a single JSON array. Malformed lines are skipped.
 * @param {string} text
 * @returns {object[]}
 */
function parseObjects(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Whole-document JSON array.
  if (trimmed[0] === '[') {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) return arr.filter((x) => x && typeof x === 'object');
    } catch {
      // fall through to line-by-line
    }
  }
  const out = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    try {
      const obj = JSON.parse(l);
      if (obj && typeof obj === 'object') out.push(obj);
    } catch {
      // Skip malformed line; resilience over strictness.
    }
  }
  return out;
}

/**
 * Extract human-readable text from an object/array/string shape.
 * @param {unknown} node
 * @param {string[]} textFields
 * @param {number} [depth]
 * @returns {string}
 */
function extractText(node, textFields, depth = 0) {
  if (depth > 6 || node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map((n) => extractText(n, textFields, depth + 1)).filter(Boolean).join('\n');
  if (typeof node === 'object') {
    for (const f of textFields) {
      if (f in node && node[f] != null) {
        const v = node[f];
        if (typeof v === 'string') return v;
        if (Array.isArray(v) || typeof v === 'object') {
          const inner = extractText(v, textFields, depth + 1);
          if (inner) return inner;
        }
      }
    }
  }
  return '';
}

/**
 * Classify an object as 'user' | 'assistant' | 'other' from its role-like fields.
 * @returns {'user'|'assistant'|'other'}
 */
function detectRole(obj, roleFields, userRoles, assistantRoles) {
  for (const f of roleFields) {
    const v = obj[f];
    if (typeof v === 'string') {
      const role = v.toLowerCase();
      if (assistantRoles.some((r) => role.includes(r))) return 'assistant';
      if (userRoles.some((r) => role.includes(r))) return 'user';
    }
  }
  return 'other';
}

/**
 * Find a model identifier anywhere in an object's model-like fields.
 * @returns {string|null}
 */
function findModel(obj, modelFields) {
  for (const f of modelFields) {
    if (typeof obj[f] === 'string' && obj[f].trim()) return obj[f];
  }
  return null;
}
