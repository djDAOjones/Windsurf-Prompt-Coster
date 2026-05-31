/**
 * Normalises a raw Windsurf hook payload into a compact, CONTENT-FREE inbox
 * event. We store only what we need to estimate later: model, IDs, timestamp, a
 * transcript *path* (not its contents), and — for the summary-only hook — the
 * response's character count (a number, never the text). This keeps the inbox
 * queue free of prompt/response content by default.
 *
 * Accepts both snake_case (as documented) and camelCase keys for resilience.
 */

/**
 * @typedef {Object} InboxEvent
 * @property {number} v
 * @property {string} receivedAt
 * @property {string|null} agentActionName
 * @property {string|null} modelName
 * @property {string|null} trajectoryId
 * @property {string|null} executionId
 * @property {string|null} timestamp
 * @property {string|null} transcriptPath
 * @property {number|null} responseChars
 */

const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return null;
};

/**
 * @param {Record<string, any>} raw  Parsed hook stdin JSON.
 * @param {() => string} [now]        Clock injection for tests.
 * @returns {InboxEvent}
 */
export function normalizeHookEvent(raw, now = () => new Date().toISOString()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const toolInfo = r.tool_info || r.toolInfo || {};
  const responseText = typeof toolInfo.response === 'string' ? toolInfo.response : null;
  return {
    v: 1,
    receivedAt: now(),
    agentActionName: pick(r, 'agent_action_name', 'agentActionName'),
    modelName: pick(r, 'model_name', 'modelName'),
    trajectoryId: pick(r, 'trajectory_id', 'trajectoryId'),
    executionId: pick(r, 'execution_id', 'executionId'),
    timestamp: pick(r, 'timestamp'),
    transcriptPath: pick(toolInfo, 'transcript_path', 'transcriptPath'),
    responseChars: responseText ? responseText.length : null,
  };
}
