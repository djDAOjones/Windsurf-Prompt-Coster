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
 *
 * Cascade's REAL transcript (confirmed 2026-05-31 on a real machine) is an action
 * stream of `{ status, type, <action>: {…} }` lines, with user text at
 * `user_input.user_response` and assistant text at `planner_response.response`,
 * plus tool actions (`view_file`, `run_command`, …). When that shape is detected
 * we use a schema-aware, latest-turn reading (see parseCascadeStream); any other
 * shape falls back to the generic heuristic.
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

  // Cascade's real transcript is an action stream, not a flat role/content log.
  // Detect it and use the schema-aware, latest-turn reading; otherwise fall back
  // to the generic heuristic below.
  if (isCascadeStream(objects)) {
    const turn = parseCascadeStream(objects);
    return turn.ok ? turn : { ...empty, model: turn.model };
  }

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

/**
 * Detect Cascade's action-stream transcript: lines shaped like
 * `{ status, type, <action>: {…} }`, carrying user text at
 * `user_input.user_response` and assistant text at `planner_response.response`.
 * We key off those two content containers because they uniquely identify the
 * schema — a flat role/content log has neither — so generic transcripts still
 * take the heuristic path.
 * @param {object[]} objects
 * @returns {boolean}
 */
function isCascadeStream(objects) {
  for (const o of objects) {
    if (o && typeof o === 'object' && ('user_input' in o || 'planner_response' in o)) return true;
  }
  return false;
}

/**
 * Parse a Cascade action stream into a single normalised turn.
 *
 * The transcript is the WHOLE conversation so far, so we isolate the latest turn
 * (from the last `user_input` line to the end). Per the approved design
 * (Option B, "full context"): the latest turn's `planner_response.response`
 * chunks are the OUTPUT, while everything else — earlier turns, this turn's user
 * message, and tool/file output — is the resent INPUT context. This avoids
 * re-counting prior assistant text as new output, and reflects that longer
 * conversations cost more because more context is re-sent each turn. Input is
 * still an estimate and undercounts hidden system/rules context (see
 * docs/limitations.md).
 * @param {object[]} objects
 * @returns {ParsedTurn}
 */
function parseCascadeStream(objects) {
  let lastUserIdx = -1;
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o && typeof o === 'object' && o.user_input != null) { lastUserIdx = i; break; }
  }
  const turnStart = lastUserIdx === -1 ? 0 : lastUserIdx;

  let model = null;
  const inputParts = [];
  const outputParts = [];

  for (let i = 0; i < objects.length; i++) {
    const line = objects[i];
    if (!line || typeof line !== 'object') continue;
    if (model == null) model = findModel(line, DEFAULT_MODEL_FIELDS);

    const planner = line.planner_response;
    if (i >= turnStart && planner && typeof planner === 'object') {
      // Latest-turn assistant text → output (not also counted as input).
      const resp = typeof planner.response === 'string' ? planner.response : collectStrings(planner);
      if (resp && resp.trim()) outputParts.push(resp);
      continue;
    }

    // Everything else is resent input context: prior turns, the user's message,
    // and tool/file output. Skip the per-line metadata fields.
    const parts = [];
    for (const key of Object.keys(line)) {
      if (key === 'status' || key === 'type') continue;
      gatherStrings(line[key], 0, parts);
    }
    const text = parts.join('\n');
    if (text && text.trim()) inputParts.push(text);
  }

  const inputText = inputParts.join('\n');
  const outputText = outputParts.join('\n');
  return {
    model,
    inputText,
    outputText,
    inputChars: inputText.length,
    outputChars: outputText.length,
    messageCount: objects.length,
    ok: !!(inputText || outputText),
  };
}

/**
 * Recursively collect every string value under a node into `acc` (bounded depth).
 * Approximates the full text the model received for a transcript line, including
 * nested tool/file payloads.
 * @param {unknown} node
 * @param {number} depth
 * @param {string[]} acc
 */
function gatherStrings(node, depth, acc) {
  if (depth > 6 || node == null) return;
  if (typeof node === 'string') { if (node) acc.push(node); return; }
  if (Array.isArray(node)) { for (const n of node) gatherStrings(n, depth + 1, acc); return; }
  if (typeof node === 'object') { for (const k of Object.keys(node)) gatherStrings(node[k], depth + 1, acc); return; }
}

/**
 * Collect all strings under a node and join them — a fallback for a
 * `planner_response` that has no plain string `response`.
 * @param {unknown} node
 * @returns {string}
 */
function collectStrings(node) {
  const acc = [];
  gatherStrings(node, 0, acc);
  return acc.join('\n');
}
