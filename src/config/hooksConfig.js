/**
 * Pure logic for merging the Cascade post-response hook into a Windsurf
 * `hooks.json` config. No filesystem access lives here — the installer
 * (`bin/install.js`) does the reading/writing and calls these functions, which
 * keeps the merge fully testable and deterministic.
 *
 * The design priority is "do not butcher the user's config": we preserve the
 * top-level `version`, any other hook events, every other key, and only ever add
 * or update OUR single entry (identified by its `bin/hook.js` command). Anything
 * we cannot safely interpret (a non-object config, a non-object `hooks`, or a
 * non-array entry list for our event) makes us refuse rather than overwrite.
 *
 * The schema we target is the documented shape (confirm against
 * https://docs.windsurf.com/windsurf/cascade/hooks — field names can drift):
 *
 *   { "version": 1, "hooks": { "<event>": [ { "command": "node \"…/hook.js\"" } ] } }
 */

import path from 'node:path';

/** The documented post-response hook event this tool wires itself into. */
export const HOOK_EVENT = 'post_cascade_response_with_transcript';

/**
 * Raised when an existing config cannot be safely merged. The installer catches
 * this, refuses to write, and shows the user a manual snippet instead.
 */
export class MalformedHooksError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'MalformedHooksError';
  }
}

/**
 * Build the quoted shell command that runs the hook entry point.
 *
 * Two quoting/PATH concerns are handled here:
 *  1. This repo's path can contain spaces (and live under OneDrive), so the
 *     script path is always wrapped in double quotes.
 *  2. Windsurf runs hooks via `bash -c` inheriting its own process environment.
 *     For a GUI app launched from the Dock that is the minimal launchd PATH
 *     (`/usr/bin:/bin:/usr/sbin:/sbin`), which excludes Homebrew/nvm — so a bare
 *     `node` silently fails with "command not found". Passing an absolute node
 *     binary (the installer supplies `process.execPath`) makes the hook work
 *     regardless of how Windsurf was started. The binary is quoted only when it
 *     contains whitespace, so the default keeps the simple `node "…"` form.
 *
 * @param {string} repoRoot  Absolute path to the repository root.
 * @param {string} [nodeBin='node']  The node executable to invoke (absolute path recommended).
 * @returns {string} e.g. `/opt/homebrew/bin/node "/abs/path/bin/hook.js"`
 */
export function buildHookCommand(repoRoot, nodeBin = 'node') {
  const hookPath = path.join(repoRoot, 'bin', 'hook.js');
  const node = /\s/.test(nodeBin) ? `"${nodeBin}"` : nodeBin;
  return `${node} "${hookPath}"`;
}

/**
 * Is this command string one of ours (i.e. it invokes `bin/hook.js`)? Matches
 * both POSIX (`/`) and Windows (`\`) separators so re-runs are idempotent
 * regardless of how the path was written.
 * @param {unknown} command
 * @returns {boolean}
 */
export function isOurCommand(command) {
  return typeof command === 'string' && /[\\/]bin[\\/]hook\.js/.test(command);
}

/**
 * Parse `hooks.json` text into a config object. Empty/whitespace-only content is
 * treated as "no config yet" and returns `null`. Invalid JSON or a non-object
 * top level throws {@link MalformedHooksError} so the caller never overwrites a
 * file it could not understand.
 * @param {string} text
 * @returns {object|null}
 */
export function parseHooksJson(text) {
  if (typeof text !== 'string' || text.trim() === '') return null;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new MalformedHooksError(`hooks.json is not valid JSON: ${err.message}`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new MalformedHooksError('hooks.json must contain a JSON object at the top level');
  }
  return parsed;
}

/**
 * Serialize a config object back to `hooks.json` text: 2-space indentation and a
 * trailing newline, matching `hooks.example.json`.
 * @param {object} config
 * @returns {string}
 */
export function serializeHooksJson(config) {
  return `${JSON.stringify(config, null, 2)}\n`;
}

/**
 * Merge our hook entry into an existing config (or create a fresh one), without
 * disturbing anything else. Idempotent: re-running on an already-merged config
 * reports `alreadyPresent` and changes nothing. A stale entry (our command with
 * a different path) is updated in place, and accidental duplicates of our entry
 * are collapsed to one.
 *
 * @param {object|null} existing  Parsed config, or `null` if no file/empty.
 * @param {string} command        The command from {@link buildHookCommand}.
 * @param {{ event?: string }} [options]
 * @returns {{ next: object, action: 'created'|'added'|'updated'|'alreadyPresent', previousCommand: string|null }}
 * @throws {MalformedHooksError} if the existing shape cannot be safely merged.
 */
export function mergeHookEntry(existing, command, options = {}) {
  const event = options.event || HOOK_EVENT;

  if (existing !== null && (typeof existing !== 'object' || Array.isArray(existing))) {
    throw new MalformedHooksError('hooks.json must contain a JSON object at the top level');
  }

  const wasEmpty = existing === null || Object.keys(existing).length === 0;
  const next = existing === null ? {} : structuredClone(existing);

  // Only impose a version on a config we are creating from scratch; never
  // overwrite a version the user already set.
  if (next.version === undefined) next.version = 1;

  if (next.hooks === undefined) {
    next.hooks = {};
  } else if (typeof next.hooks !== 'object' || Array.isArray(next.hooks)) {
    throw new MalformedHooksError('hooks.json "hooks" must be an object');
  }

  const current = next.hooks[event];
  let list;
  if (current === undefined) {
    list = [];
  } else if (Array.isArray(current)) {
    list = current;
  } else {
    throw new MalformedHooksError(`hooks.json "hooks.${event}" must be an array`);
  }

  const ourIndices = [];
  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    if (entry && typeof entry === 'object' && isOurCommand(entry.command)) ourIndices.push(i);
  }

  let action;
  let previousCommand = null;

  if (ourIndices.length === 0) {
    list.push({ command });
    action = wasEmpty ? 'created' : 'added';
  } else {
    const firstIdx = ourIndices[0];
    previousCommand = list[firstIdx].command;
    // Collapse any accidental duplicates, removing from the end so earlier
    // indices stay valid; keep the first occurrence.
    for (let j = ourIndices.length - 1; j >= 1; j -= 1) {
      list.splice(ourIndices[j], 1);
    }
    if (ourIndices.length === 1 && previousCommand === command) {
      action = 'alreadyPresent';
    } else {
      list[firstIdx] = { ...list[firstIdx], command };
      action = 'updated';
    }
  }

  next.hooks[event] = list;
  return { next, action, previousCommand };
}
