#!/usr/bin/env node
/**
 * Cascade post-response hook entry point (FAIL-SAFE).
 *
 * Windsurf runs this as a shell command after each Cascade turn, piping the hook
 * event JSON on stdin. This script does the minimum: normalise the event into a
 * content-free record and append it to the inbox queue for the extension to
 * process. It NEVER throws and ALWAYS exits 0 — a failure here must never block
 * or break a Cascade turn (project invariant).
 */

import { readStdin } from '../src/util/stdin.js';
import { normalizeHookEvent } from '../src/core/event.js';
import { appendInbox } from '../src/log/inbox.js';
import { logError } from '../src/util/safe.js';

async function main() {
  const raw = await readStdin();
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch (err) {
    logError('hook.parse', err);
    parsed = {};
  }
  const event = normalizeHookEvent(parsed);
  appendInbox(event);
}

main()
  .catch((err) => logError('hook.main', err))
  .finally(() => process.exit(0));
