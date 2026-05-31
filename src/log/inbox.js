/**
 * The inbox is a durable, append-only queue (`inbox.jsonl`) of hook events. The
 * hook appends; the extension consumes from a byte OFFSET (`inbox.offset`) so it
 * can process new events and backfill any that arrived while it was inactive,
 * without re-processing old ones. Offset-based reading also tolerates a partial
 * final line (a hook write in progress) by only consuming complete lines.
 */

import fs from 'node:fs';
import { resolvePaths, ensureDataDir } from '../config/paths.js';

/**
 * Append one event as a JSON line to the inbox.
 * @param {Object} event
 * @param {ReturnType<typeof resolvePaths>} [paths]
 */
export function appendInbox(event, paths = resolvePaths()) {
  ensureDataDir();
  fs.appendFileSync(paths.inbox, `${JSON.stringify(event)}\n`, { mode: 0o600 });
}

/**
 * Read events appended since the committed offset. Only complete lines are
 * consumed; the returned `newOffset` should be committed AFTER the events are
 * processed so a crash mid-processing re-delivers rather than drops them.
 * @param {ReturnType<typeof resolvePaths>} [paths]
 * @returns {{ events: Object[], newOffset: number, size: number }}
 */
export function readNewEvents(paths = resolvePaths()) {
  let offset = 0;
  try {
    offset = parseInt(String(fs.readFileSync(paths.inboxOffset, 'utf8')).trim(), 10) || 0;
  } catch {
    offset = 0;
  }

  let size = 0;
  try {
    size = fs.statSync(paths.inbox).size;
  } catch {
    return { events: [], newOffset: 0, size: 0 };
  }
  if (offset > size) offset = 0; // file was truncated/rotated; re-read from start.
  if (offset === size) return { events: [], newOffset: offset, size };

  let content = '';
  try {
    const fd = fs.openSync(paths.inbox, 'r');
    const len = size - offset;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, offset);
    fs.closeSync(fd);
    content = buf.toString('utf8');
  } catch {
    return { events: [], newOffset: offset, size };
  }

  const events = [];
  let consumed = 0;
  const lines = content.split('\n');
  // The final element has no trailing newline → it may be a partial write; skip it.
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    consumed += Buffer.byteLength(line, 'utf8') + 1; // include the newline byte
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed line; resilience over strictness.
    }
  }
  return { events, newOffset: offset + consumed, size };
}

/**
 * Persist the processed offset.
 * @param {number} newOffset
 * @param {ReturnType<typeof resolvePaths>} [paths]
 */
export function commitOffset(newOffset, paths = resolvePaths()) {
  ensureDataDir();
  fs.writeFileSync(paths.inboxOffset, String(newOffset), { mode: 0o600 });
}
