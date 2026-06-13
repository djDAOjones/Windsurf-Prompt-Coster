/**
 * Diagnostic probes for `cascade-cost-meter doctor`.
 *
 * This is the ONLY side-effectful half of the doctor: it reads the Windsurf
 * hooks config, the data directory, the usage/inbox logs, the transcripts
 * directory, and the installed-vs-built extension bundle, and returns a single
 * plain-data snapshot. The pure classifier in `src/core/doctor.js` turns that
 * snapshot into checks and a verdict, so all the decision logic stays testable
 * without touching disk.
 *
 * STRICTLY READ-ONLY: nothing here creates, writes, or deletes anything in the
 * user's data dir, hooks file, or extensions dir. Writability is tested with an
 * access check, never by writing. Every probe is wrapped so a single failure
 * degrades to `{ error }` instead of throwing — the doctor must never crash.
 *
 * Environment overrides (all optional; used by tests and power users):
 *   CCM_DATA_DIR          — the data dir (already honoured by config/paths.js)
 *   CCM_WINDSURF_HOOKS    — the hooks.json path (already honoured by paths.js)
 *   CCM_TRANSCRIPTS_DIR   — Cascade transcripts dir (default ~/.windsurf/transcripts)
 *   CCM_EXT_DIR           — Windsurf extensions dir (default ~/.windsurf/extensions)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolvePaths, windsurfHooksFile } from '../config/paths.js';
import { parseHooksJson, isOurCommand, buildHookCommand, HOOK_EVENT, MalformedHooksError } from '../config/hooksConfig.js';
import { parseTranscript } from '../core/parser.js';
import { loadPricingRegistry } from '../config/pricingSource.js';
import { lookupModel } from '../core/pricing.js';
import { readUsage } from '../log/usageLog.js';

/** This repo's root: src/diag/probe.js → up two directories. */
export function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

/** Cascade transcripts dir (override with $CCM_TRANSCRIPTS_DIR). */
export function transcriptsDir() {
  const override = process.env.CCM_TRANSCRIPTS_DIR;
  return override && override.trim() ? override : path.join(os.homedir(), '.windsurf', 'transcripts');
}

/** Windsurf extensions dir (override with $CCM_EXT_DIR). */
export function extensionsDir() {
  const override = process.env.CCM_EXT_DIR;
  return override && override.trim() ? override : path.join(os.homedir(), '.windsurf', 'extensions');
}

/**
 * Wrap a probe so a thrown error becomes data, never a crash. Uses a dedicated
 * `probeError` key so it never collides with a probe's own domain `error` field
 * (e.g. pricing's validation message on a successfully-read but invalid config).
 */
function attempt(fn) {
  try {
    return fn();
  } catch (err) {
    return { probeError: err && err.message ? err.message : String(err) };
  }
}

/** Size of a file, or null if it does not exist / cannot be stat-ed. */
function fileStat(p) {
  try {
    const st = fs.statSync(p);
    return { exists: true, size: st.size, mtimeMs: st.mtimeMs };
  } catch {
    return { exists: false, size: 0, mtimeMs: 0 };
  }
}

/**
 * The Node.js running this command. The hook runs `node` from the shell, so
 * this is a close proxy; PATH differences in a non-login shell are noted by the
 * doctor rather than probed here (spawning a shell would be a side effect).
 */
export function probeNode() {
  const version = process.versions.node || '';
  const major = parseInt(version.split('.')[0], 10) || 0;
  return { version, major, ok: major >= 18 };
}

/**
 * Parse the node executable out of a hook command and judge whether Windsurf
 * could actually run it. Windsurf executes hooks via `bash -c`, inheriting its
 * own (often minimal, GUI/launchd) PATH — so a bare `node` only works if node
 * lives in a base system dir, whereas an absolute path works iff the file
 * exists. This is the single most common reason a correctly-wired hook silently
 * never fires on macOS.
 *
 * @param {string|null} command
 * @returns {{ nodeBinary: string|null, nodeRisk: 'ok'|'missing'|'bare_unresolved'|'unknown' }}
 */
export function classifyHookNode(command) {
  if (typeof command !== 'string' || !command.trim()) return { nodeBinary: null, nodeRisk: 'unknown' };
  // First token: a quoted path ("…/node") or a bare run of non-space chars.
  const m = command.match(/^\s*(?:"([^"]+)"|(\S+))/);
  const nodeBinary = m ? m[1] || m[2] : null;
  if (!nodeBinary) return { nodeBinary: null, nodeRisk: 'unknown' };

  const hasSeparator = /[\\/]/.test(nodeBinary);
  if (hasSeparator) {
    return { nodeBinary, nodeRisk: fs.existsSync(nodeBinary) ? 'ok' : 'missing' };
  }
  // Bare command name. On Windows, hooks run via PowerShell with different PATH
  // semantics, so we don't second-guess it. On POSIX, a bare name is GUI-safe
  // only if it resolves under the base launchd/system PATH.
  if (process.platform === 'win32') return { nodeBinary, nodeRisk: 'unknown' };
  const guiPathDirs = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];
  const onGuiPath = guiPathDirs.some((d) => {
    try {
      return fs.existsSync(path.join(d, nodeBinary));
    } catch {
      return false;
    }
  });
  return { nodeBinary, nodeRisk: onGuiPath ? 'ok' : 'bare_unresolved' };
}

/**
 * Inspect the Windsurf hooks.json: does it exist, parse, contain OUR entry, does
 * that entry point at THIS repo's bin/hook.js (which must exist), and can the
 * node binary in the command actually be resolved when Windsurf runs the hook?
 * @param {{ hooksFile?: string, root?: string }} [opts]
 */
export function probeHookConfig(opts = {}) {
  const hooksFile = opts.hooksFile || windsurfHooksFile();
  const root = opts.root || repoRoot();
  const expectedCommand = buildHookCommand(root, process.execPath);

  let text = null;
  try {
    text = fs.readFileSync(hooksFile, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { hooksFile, exists: false, expectedCommand };
    return { hooksFile, exists: true, readError: err.message, expectedCommand };
  }

  let config;
  try {
    config = parseHooksJson(text);
  } catch (err) {
    const malformed = err instanceof MalformedHooksError;
    return { hooksFile, exists: true, malformed, error: err.message, expectedCommand };
  }

  const hooks = config && typeof config.hooks === 'object' && config.hooks ? config.hooks : {};
  const list = Array.isArray(hooks[HOOK_EVENT]) ? hooks[HOOK_EVENT] : [];
  const ours = list.filter((e) => e && typeof e === 'object' && isOurCommand(e.command));
  const configuredCommand = ours.length ? ours[0].command : null;
  // Extract the hook SCRIPT path: the quoted segment ending in bin/hook.js. The
  // node binary may itself be quoted (when its path has spaces), so we can't
  // simply take the first quoted segment.
  const quotedSegments = configuredCommand ? [...configuredCommand.matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
  const configuredTarget = quotedSegments.find((q) => /[\\/]bin[\\/]hook\.js$/.test(q)) || null;
  // Compare the resolved SCRIPT target, not the whole command: the node prefix
  // legitimately differs (bare `node` vs an absolute path) without meaning the
  // hook points at a different repo.
  const expectedTarget = path.join(root, 'bin', 'hook.js');
  const pointsToThisRepo = configuredTarget
    ? path.resolve(configuredTarget) === path.resolve(expectedTarget)
    : false;
  const { nodeBinary, nodeRisk } = classifyHookNode(configuredCommand);

  return {
    hooksFile,
    exists: true,
    malformed: false,
    hasEvent: HOOK_EVENT in hooks,
    otherEvents: Object.keys(hooks).filter((k) => k !== HOOK_EVENT),
    ourCount: ours.length,
    configuredCommand,
    expectedCommand,
    pointsToThisRepo,
    configuredTarget,
    targetExists: configuredTarget ? fs.existsSync(configuredTarget) : false,
    nodeBinary,
    nodeRisk,
  };
}

/**
 * Inspect the data directory: existence, writability (access check only), and
 * the size/offset state of the queue + log files.
 * @param {ReturnType<typeof resolvePaths>} [paths]
 */
export function probeDataDir(paths = resolvePaths()) {
  const dirExists = fs.existsSync(paths.dir);
  let writable = false;
  if (dirExists) {
    try {
      fs.accessSync(paths.dir, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }
  }

  const inbox = fileStat(paths.inbox);
  const usage = fileStat(paths.usageLog);
  const offsetStat = fileStat(paths.inboxOffset);
  const bak = fileStat(`${paths.usageLog}.bak`);

  let offset = 0;
  try {
    offset = parseInt(String(fs.readFileSync(paths.inboxOffset, 'utf8')).trim(), 10) || 0;
  } catch {
    offset = 0;
  }

  let offsetState;
  if (!inbox.exists) offsetState = 'no_inbox';
  else if (offset > inbox.size) offsetState = 'ahead';
  else if (offset === inbox.size) offsetState = 'caught_up';
  else offsetState = 'pending';

  let locksCount = 0;
  try {
    locksCount = fs.readdirSync(paths.locksDir).filter((f) => f.endsWith('.lock')).length;
  } catch {
    locksCount = 0;
  }

  return {
    dir: paths.dir,
    dirExists,
    writable,
    inbox,
    usage,
    offsetFile: offsetStat,
    bak,
    offset,
    offsetState,
    pendingBytes: offsetState === 'pending' ? inbox.size - offset : 0,
    locksCount,
  };
}

/** Newest receivedAt/timestamp and count from the inbox queue. */
export function probeInbox(paths = resolvePaths()) {
  let raw = '';
  try {
    raw = fs.readFileSync(paths.inbox, 'utf8');
  } catch {
    return { count: 0, newestAt: null };
  }
  let count = 0;
  let newestAt = null;
  for (const line of raw.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    let obj;
    try {
      obj = JSON.parse(l);
    } catch {
      continue;
    }
    count += 1;
    const at = obj.receivedAt || obj.timestamp || null;
    if (at && (newestAt == null || String(at) > String(newestAt))) newestAt = at;
  }
  return { count, newestAt };
}

/**
 * Aggregate the usage log: count, newest record, the quality of the most recent
 * record, and which model labels are (un)priced against the current registry.
 * @param {import('../core/pricing.js').PricingRegistry|null} registry
 */
export function probeUsage(registry) {
  const records = readUsage();
  if (!records.length) return { count: 0, newestAt: null, lastQuality: 'none', modelsSeen: [], unpricedSeen: [] };

  let last = records[0];
  for (const r of records) {
    const at = r.loggedAt || r.timestamp || '';
    const lastAt = last.loggedAt || last.timestamp || '';
    if (String(at) >= String(lastAt)) last = r;
  }

  const modelsSeen = [...new Set(records.map((r) => (r && r.model) || 'Unknown'))];
  const unpricedSeen = modelsSeen.filter((m) => !lookupModel(registry, m));

  return {
    count: records.length,
    newestAt: last.loggedAt || last.timestamp || null,
    lastQuality: recordQuality(last),
    lastModel: last.model || 'Unknown',
    lastCostStatus: last.costStatus || null,
    lastTokens: { input: last.inputTokens || 0, output: last.outputTokens || 0 },
    modelsSeen,
    unpricedSeen,
  };
}

/**
 * Classify a single usage record's quality for the verdict:
 *   healthy            — parsed, nonzero tokens, an estimated cost
 *   cost_unavailable   — tokens but the model wasn't priced
 *   zero               — parsed but zero tokens
 *   unparsed           — the transcript could not be parsed
 * @param {Object} r
 */
export function recordQuality(r) {
  if (!r || typeof r !== 'object') return 'none';
  if (r.transcriptStatus === 'unparsed' || r.transcriptStatus === 'missing') return 'unparsed';
  const tokens = (r.inputTokens || 0) + (r.outputTokens || 0);
  if (tokens === 0) return 'zero';
  if (r.costStatus !== 'estimated' || r.estimatedCostUsd == null) return 'cost_unavailable';
  return 'healthy';
}

/** Newest mtime, count, and newest path in the Cascade transcripts dir. */
export function probeTranscripts(dir = transcriptsDir()) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return { dir, exists: false, count: 0, newestMtimeMs: 0, newestPath: null };
  }
  let count = 0;
  let newestMtimeMs = 0;
  let newestPath = null;
  for (const name of entries) {
    if (!name.endsWith('.jsonl')) continue;
    const full = path.join(dir, name);
    const st = fileStat(full);
    if (!st.exists) continue;
    count += 1;
    if (st.mtimeMs > newestMtimeMs) {
      newestMtimeMs = st.mtimeMs;
      newestPath = full;
    }
  }
  return { dir, exists: true, count, newestMtimeMs, newestPath };
}

/** Minimal inline samples so parser health does not depend on test fixtures. */
const CASCADE_SAMPLE = [
  '{"status":"done","type":"user_input","user_input":{"user_response":"Please help me with a question about my code."}}',
  '{"status":"done","type":"planner_response","planner_response":{"response":"Certainly — here is a reasonably detailed answer to your question."}}',
].join('\n');
const GENERIC_SAMPLE = '[{"role":"user","content":"hi there"},{"role":"assistant","content":"hello back to you"}]';

/** Run the parser against known-good samples to detect a regressed parser. */
export function probeParser() {
  const cascade = parseTranscript(CASCADE_SAMPLE);
  const generic = parseTranscript(GENERIC_SAMPLE);
  return {
    cascadeOk: !!cascade.ok && cascade.inputChars > 0 && cascade.outputChars > 0,
    genericOk: !!generic.ok && generic.outputChars > 0,
  };
}

/** Load + validate the pricing registry (user file or bundled default). */
export function probePricing() {
  const { registry, error, source } = loadPricingRegistry();
  return {
    source,
    valid: !!registry,
    error: error ? error.message : null,
    version: registry ? registry.version : null,
    modelCount: registry ? registry.lookup.size : 0,
    registry,
  };
}

/** Hash a file's contents (sha1), or null if unreadable. */
function hashFile(p) {
  try {
    return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Compare the INSTALLED extension bundle against the repo's freshly built one.
 * A mismatch means the installed `.vsix` predates local core fixes — exactly the
 * trap where a real turn still logs $0 / "cost unavailable" after the code was
 * fixed but the extension wasn't reinstalled.
 * @param {{ root?: string, extDir?: string }} [opts]
 */
export function probeExtension(opts = {}) {
  const root = opts.root || repoRoot();
  const extDir = opts.extDir || extensionsDir();

  let installedDirs = [];
  try {
    installedDirs = fs.readdirSync(extDir)
      .filter((n) => /cascade-cost-meter/i.test(n))
      .map((n) => path.join(extDir, n))
      .filter((p) => {
        try { return fs.statSync(p).isDirectory(); } catch { return false; }
      })
      .sort();
  } catch {
    installedDirs = [];
  }

  const installed = installedDirs.length > 0;
  const installedDir = installed ? installedDirs[installedDirs.length - 1] : null;
  let installedVersion = null;
  let installedHash = null;
  if (installedDir) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(installedDir, 'package.json'), 'utf8'));
      installedVersion = pkg.version || null;
    } catch {
      installedVersion = null;
    }
    installedHash = hashFile(path.join(installedDir, 'dist', 'extension.cjs'));
  }

  const builtBundle = path.join(root, 'extension', 'dist', 'extension.cjs');
  const builtHash = hashFile(builtBundle);

  return {
    extDir,
    installed,
    installedCount: installedDirs.length,
    installedDir,
    installedVersion,
    installedHash,
    builtExists: builtHash != null,
    builtHash,
    match: installedHash != null && builtHash != null ? installedHash === builtHash : null,
  };
}

/**
 * Gather every probe into one plain-data snapshot for the pure classifier. The
 * single I/O entry point the CLI calls; resilient (each probe is wrapped).
 * @param {{ now?: number }} [opts]
 */
export function gatherProbes(opts = {}) {
  const now = opts.now || Date.now();
  const paths = resolvePaths();
  const pricing = attempt(() => probePricing());
  const registry = pricing && !pricing.probeError ? pricing.registry : null;
  return {
    now,
    paths: { dir: paths.dir },
    node: attempt(() => probeNode()),
    hook: attempt(() => probeHookConfig()),
    data: attempt(() => probeDataDir(paths)),
    inbox: attempt(() => probeInbox(paths)),
    usage: attempt(() => probeUsage(registry)),
    transcripts: attempt(() => probeTranscripts()),
    parser: attempt(() => probeParser()),
    pricing: attempt(() => ({ ...pricing, registry: undefined })),
    extension: attempt(() => probeExtension()),
  };
}
