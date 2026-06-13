/**
 * Live canary for `cascade-cost-meter doctor --watch`.
 *
 * Static checks can say "no recent hook events" but cannot tell apart "the hook
 * isn't firing" from "you're using a different AI surface". The canary settles
 * it: snapshot the inbox/usage/transcripts, ask the user to send ONE real prompt
 * in the Cascade panel, watch what changes, and classify it.
 *
 * The decision (`classifyChange`) is a pure function of two snapshots, so it is
 * unit-tested without timers or disk. Only `snapshot` touches the filesystem,
 * and it is strictly read-only.
 */

import { resolvePaths } from '../config/paths.js';
import { readUsage } from '../log/usageLog.js';
import { probeInbox, probeTranscripts, recordQuality } from './probe.js';

/**
 * @typedef {Object} CanarySnapshot
 * @property {number} at
 * @property {number} inboxCount
 * @property {string|null} inboxNewestAt
 * @property {number} usageCount
 * @property {string} usageLastQuality
 * @property {number} transcriptCount
 * @property {number} transcriptNewestMtimeMs
 */

/** Newest usage record by loggedAt/timestamp. */
function newestRecord(records) {
  let last = records[0];
  for (const r of records) {
    const at = (r && (r.loggedAt || r.timestamp)) || '';
    const lastAt = (last && (last.loggedAt || last.timestamp)) || '';
    if (String(at) >= String(lastAt)) last = r;
  }
  return last;
}

/**
 * Read-only point-in-time snapshot of the three things a turn moves.
 * @returns {CanarySnapshot}
 */
export function snapshot() {
  const paths = resolvePaths();
  const inbox = probeInbox(paths);
  const tr = probeTranscripts();
  const records = readUsage();
  const last = records.length ? newestRecord(records) : null;
  return {
    at: Date.now(),
    inboxCount: inbox.count,
    inboxNewestAt: inbox.newestAt,
    usageCount: records.length,
    usageLastQuality: last ? recordQuality(last) : 'none',
    transcriptCount: tr.count,
    transcriptNewestMtimeMs: tr.newestMtimeMs,
  };
}

/** Did anything a turn touches move between two snapshots? */
export function changed(before, after) {
  return (
    after.inboxCount > before.inboxCount ||
    after.usageCount > before.usageCount ||
    after.transcriptCount > before.transcriptCount ||
    after.transcriptNewestMtimeMs > before.transcriptNewestMtimeMs
  );
}

/**
 * Classify what moved into a single pipeline layer. Order matters: a recorded
 * turn (usage grew) is the strongest signal; then a queued-but-unprocessed event
 * (bridge); then a transcript with no event (hook didn't fire); then nothing
 * (coverage / wrong surface).
 * @param {CanarySnapshot} before
 * @param {CanarySnapshot} after
 * @returns {{ layer: string, status: string, message: string }}
 */
export function classifyChange(before, after) {
  const usageGrew = after.usageCount > before.usageCount;
  const inboxGrew = after.inboxCount > before.inboxCount;
  const transcriptMoved = after.transcriptCount > before.transcriptCount || after.transcriptNewestMtimeMs > before.transcriptNewestMtimeMs;

  if (usageGrew) {
    const q = after.usageLastQuality;
    if (q === 'healthy') {
      return { layer: 'healthy', status: 'pass', message: 'A new turn was recorded, parsed, and priced. The full chain works end-to-end.' };
    }
    if (q === 'unparsed' || q === 'zero') {
      return { layer: 'parsing', status: 'warn', message: 'A turn was recorded but parsed to 0 tokens. The installed extension likely predates the parser fix — rebuild + reinstall it.' };
    }
    if (q === 'cost_unavailable') {
      return { layer: 'pricing', status: 'warn', message: 'A turn was recorded but the cost is unavailable. Add the model label to pricing.v1.json (`cascade-cost-meter models`).' };
    }
    return { layer: 'healthy', status: 'pass', message: 'A new turn was recorded.' };
  }

  if (inboxGrew) {
    return { layer: 'extension bridge', status: 'warn', message: 'The hook fired (an inbox event arrived) but no usage record appeared. The extension is inactive, not installed, or stale.' };
  }

  if (transcriptMoved) {
    return { layer: 'hook firing', status: 'warn', message: 'A Cascade turn happened (the transcript changed) but the hook did not append an event. Check the hook wiring and that the hook shell can find `node`.' };
  }

  return { layer: 'coverage', status: 'warn', message: 'Nothing changed: no inbox event and no new transcript. Likely one of: the hook cannot execute (e.g. bare `node` not on Windsurf\'s GUI PATH — check `npm run doctor`), Windsurf has not loaded the hook (fully restart it), or the turn used a different surface (e.g. the Codex/Editor-agent pane, which does not emit the Cascade hook).' };
}

/**
 * Watch for a single turn to land, polling until something changes or the
 * timeout elapses. Side effects (timers, disk) are injectable for tests.
 * @param {{ intervalMs?: number, timeoutMs?: number, onTick?: (s:CanarySnapshot)=>void, snapshot?: ()=>CanarySnapshot, sleep?: (ms:number)=>Promise<void>, now?: ()=>number }} [opts]
 * @returns {Promise<{ before: CanarySnapshot, after: CanarySnapshot, changed: boolean, classification: {layer:string,status:string,message:string} }>}
 */
export async function watchForTurn(opts = {}) {
  // Nullish-coalesce so an explicit `0` (e.g. a zero timeout in tests) is honoured
  // rather than falling back to the default — `0 || 60000` would be a 60s hang.
  const intervalMs = opts.intervalMs ?? 1500;
  const timeoutMs = opts.timeoutMs ?? 60000;
  const onTick = opts.onTick || (() => {});
  const take = opts.snapshot || snapshot;
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const clock = opts.now || (() => Date.now());

  const before = take();
  // The watch window starts now, independent of the snapshot's own timestamp.
  const deadline = clock() + timeoutMs;
  let after = before;
  // Poll on a fixed cadence; break as soon as a turn lands.
  while (clock() < deadline) {
    await sleep(intervalMs);
    after = take();
    onTick(after);
    if (changed(before, after)) break;
  }
  return { before, after, changed: changed(before, after), classification: classifyChange(before, after) };
}
