/**
 * The doctor's PURE half: turn a probe snapshot (from src/diag/probe.js) into a
 * list of checks and a single, actionable verdict. No I/O happens here, so every
 * branch is unit-testable with a hand-built snapshot.
 *
 * The verdict names exactly one layer of the pipeline so the user gets a single
 * answer to "where does the chain stand?":
 *   environment · hook config · data dir · parsing · pricing ·
 *   extension bridge · coverage · healthy
 *
 * The hardest distinction — "is the meter broken, or am I just using the wrong
 * AI surface (e.g. the Codex/Editor-agent pane, which doesn't emit the Cascade
 * hook)?" — cannot be settled from static state alone, so when there are no
 * recent hook events the verdict is `coverage` and points the user at
 * `doctor --watch`, which drives one real Cascade turn and classifies it live.
 */

/** Check/verdict status levels, worst-first for sorting. */
export const STATUS = { FAIL: 'fail', WARN: 'warn', INFO: 'info', PASS: 'pass' };

/** A hook event with no fresh activity for this long is "stale". */
export const STALE_MS = 24 * 60 * 60 * 1000;

/**
 * Build the full doctor report from a probe snapshot.
 * @param {import('../diag/probe.js').gatherProbes extends (...a:any)=>infer R ? R : any} probes
 * @returns {{ generatedAt: string, checks: Array<{id:string,label:string,status:string,detail:string}>, verdict: {layer:string,status:string,headline:string,hint:string,nextSteps:string[]}, otherWarnings: string[] }}
 */
export function buildReport(probes) {
  const checks = [];
  const add = (id, label, status, detail) => checks.push({ id, label, status, detail });
  const now = probes.now || Date.now();

  // 1. Node runtime.
  const node = clean(probes.node);
  if (!node) add('node', 'Node runtime', STATUS.WARN, 'could not detect Node version');
  else if (!node.ok) add('node', 'Node runtime', STATUS.FAIL, `Node ${node.version} is below the required v18`);
  else add('node', 'Node runtime', STATUS.PASS, `Node ${node.version}`);

  // 2. Hook config.
  const hook = clean(probes.hook);
  if (!hook) add('hook', 'Hook config', STATUS.WARN, 'could not read hooks config');
  else if (!hook.exists) add('hook', 'Hook config', STATUS.FAIL, `no hooks.json at ${hook.hooksFile} — run \`npm run setup\``);
  else if (hook.readError) add('hook', 'Hook config', STATUS.FAIL, `cannot read hooks.json: ${hook.readError}`);
  else if (hook.malformed) add('hook', 'Hook config', STATUS.FAIL, 'hooks.json is malformed — fix the JSON, then `npm run setup`');
  else if (!hook.ourCount) add('hook', 'Hook config', STATUS.FAIL, 'Cascade Cost Meter hook not wired — run `npm run setup`');
  else if (!hook.targetExists) add('hook', 'Hook config', STATUS.FAIL, `hook target missing: ${hook.configuredTarget}`);
  else if (!hook.pointsToThisRepo) add('hook', 'Hook config', STATUS.WARN, `hook points elsewhere: ${hook.configuredTarget} (expected this repo)`);
  else if (hook.ourCount > 1) add('hook', 'Hook config', STATUS.WARN, `wired, but ${hook.ourCount} duplicate entries — re-run \`npm run setup\``);
  else add('hook', 'Hook config', STATUS.PASS, 'wired → bin/hook.js (this repo)');

  // 2b. Hook node binary — can Windsurf actually run it under its (GUI) PATH?
  if (hook && hook.exists && !hook.malformed && hook.ourCount && hook.targetExists) {
    if (hook.nodeRisk === 'missing') add('hook-node', 'Hook node', STATUS.FAIL, `node binary not found: ${hook.nodeBinary} — re-run \`npm run setup\``);
    else if (hook.nodeRisk === 'bare_unresolved') add('hook-node', 'Hook node', STATUS.FAIL, "bare `node` won't resolve on Windsurf's GUI PATH — run `npm run setup` to pin an absolute path");
    else if (hook.nodeRisk === 'ok') add('hook-node', 'Hook node', STATUS.PASS, `${hook.nodeBinary} (resolvable)`);
    else add('hook-node', 'Hook node', STATUS.INFO, `node binary: ${hook.nodeBinary || 'unknown'}`);
  }

  // 3. Data directory.
  const data = clean(probes.data);
  if (!data) add('data', 'Data dir', STATUS.WARN, 'could not inspect data dir');
  else if (!data.dirExists) add('data', 'Data dir', STATUS.INFO, 'not created yet — appears on the first hook fire');
  else if (!data.writable) add('data', 'Data dir', STATUS.FAIL, `not writable: ${data.dir}`);
  else add('data', 'Data dir', STATUS.PASS, data.dir);

  // 4. Inbox → usage bridge (offset state).
  if (data && data.dirExists) {
    if (data.offsetState === 'pending') add('bridge', 'Inbox bridge', STATUS.WARN, `${data.pendingBytes} bytes queued but not processed — is the extension running/current?`);
    else if (data.offsetState === 'ahead') add('bridge', 'Inbox bridge', STATUS.WARN, 'offset is ahead of the inbox (rotated) — will re-read from the start');
    else if (data.offsetState === 'caught_up') add('bridge', 'Inbox bridge', STATUS.PASS, 'inbox fully consumed');
    else add('bridge', 'Inbox bridge', STATUS.INFO, 'no inbox queue yet');
  }

  // 5. Parser health (against built-in samples).
  const parser = clean(probes.parser);
  if (!parser) add('parser', 'Parser health', STATUS.WARN, 'could not run parser samples');
  else if (parser.cascadeOk && parser.genericOk) add('parser', 'Parser health', STATUS.PASS, 'Cascade + generic samples parse');
  else add('parser', 'Parser health', STATUS.FAIL, `parser regressed (cascade=${parser.cascadeOk}, generic=${parser.genericOk})`);

  // 6. Pricing registry + seen-model coverage.
  const pricing = clean(probes.pricing);
  const usage = clean(probes.usage);
  if (!pricing) add('pricing', 'Pricing', STATUS.WARN, 'could not load pricing');
  else if (!pricing.valid) add('pricing', 'Pricing', STATUS.FAIL, `pricing config invalid: ${pricing.error}`);
  else if (usage && usage.unpricedSeen && usage.unpricedSeen.length) add('pricing', 'Pricing', STATUS.WARN, `unpriced model(s) in your log: ${usage.unpricedSeen.join(', ')}`);
  else add('pricing', 'Pricing', STATUS.PASS, `${pricing.version}, ${pricing.modelCount} model keys`);

  // 7. Most recent usage record quality.
  if (usage) {
    if (!usage.count) add('usage', 'Last record', STATUS.INFO, 'no usage recorded yet');
    else if (usage.lastQuality === 'healthy') add('usage', 'Last record', STATUS.PASS, `${usage.lastModel} · parsed & priced (${ago(now, usage.newestAt)})`);
    else if (usage.lastQuality === 'unparsed') add('usage', 'Last record', STATUS.WARN, `transcript unparsed → 0 tokens (${ago(now, usage.newestAt)}) — predates the parser fix or schema drifted`);
    else if (usage.lastQuality === 'zero') add('usage', 'Last record', STATUS.WARN, `parsed but 0 tokens (${ago(now, usage.newestAt)})`);
    else add('usage', 'Last record', STATUS.WARN, `cost unavailable — ${usage.lastModel} unpriced at write time (${ago(now, usage.newestAt)})`);
  }

  // 8. Installed extension vs local build.
  const ext = clean(probes.extension);
  if (!ext) add('extension', 'Extension build', STATUS.WARN, 'could not inspect installed extension');
  else if (!ext.installed) add('extension', 'Extension build', STATUS.WARN, 'not installed in Windsurf (no in-IDE surface; CLI still works)');
  else if (!ext.builtExists) add('extension', 'Extension build', STATUS.INFO, `installed v${ext.installedVersion}; run \`npm run build:ext\` to compare with local code`);
  else if (ext.match === false) add('extension', 'Extension build', STATUS.WARN, 'installed bundle differs from local build — `npm run package:ext` then reinstall the .vsix');
  else add('extension', 'Extension build', STATUS.PASS, `installed v${ext.installedVersion} matches local build`);

  // 9. Coverage / recency (the wrong-surface vs idle distinction).
  const inbox = clean(probes.inbox);
  const transcripts = clean(probes.transcripts);
  const cov = coverageCheck(now, inbox, transcripts);
  if (cov) add('coverage', 'Coverage', cov.status, cov.detail);

  const verdict = classify({ now, node, hook, data, parser, pricing, usage, ext, inbox, transcripts });
  const otherWarnings = checks
    .filter((c) => (c.status === STATUS.WARN || c.status === STATUS.FAIL) && c.id !== verdict.layerId)
    .map((c) => `${c.label}: ${c.detail}`);

  return { generatedAt: new Date(now).toISOString(), checks, verdict, otherWarnings };
}

/**
 * Pick the single most actionable verdict. Foundational failures first (nothing
 * can work), then runtime state, then the coverage question, then health.
 */
function classify(s) {
  if (s.node && !s.node.ok) {
    return verdict('environment', 'node', STATUS.FAIL, `Node ${s.node.version} is too old (need v18+).`,
      'Install Node 18+ and make sure the hook shell can see it.', ['Upgrade Node, then `npm run doctor`.']);
  }
  const h = s.hook;
  if (!h || !h.exists || h.readError || h.malformed || !h.ourCount || !h.targetExists) {
    return verdict('hook config', 'hook', STATUS.FAIL, 'The Cascade hook is not correctly wired.',
      'Without the hook, no turn is ever recorded.', ['Run `npm run setup` (or fix the JSON it reports), then reload Windsurf.']);
  }
  if (h.nodeRisk === 'missing') {
    return verdict('hook config', 'hook-node', STATUS.FAIL, `The hook's node binary no longer exists (${h.nodeBinary}).`,
      'Windsurf runs the hook but cannot find that node path, so nothing is ever recorded.',
      ['Re-run `npm run setup` to re-pin node, then fully restart Windsurf.']);
  }
  if (h.nodeRisk === 'bare_unresolved') {
    return verdict('hook config', 'hook-node', STATUS.FAIL, 'The hook calls a bare `node` that Windsurf cannot resolve.',
      'Windsurf runs hooks via `bash -c` with a minimal GUI PATH that excludes Homebrew/nvm, so `node` is "command not found" and the hook silently does nothing — exactly the symptom of a meter that records nothing.',
      ['Run `npm run setup` to pin an absolute node path, then FULLY RESTART Windsurf and run `npm run doctor -- --watch`.']);
  }
  if (s.data && s.data.dirExists && !s.data.writable) {
    return verdict('data dir', 'data', STATUS.FAIL, `The data dir is not writable: ${s.data.dir}.`,
      'Records cannot be appended.', ['Fix permissions on the data dir, then `npm run doctor`.']);
  }
  if (s.parser && !(s.parser.cascadeOk && s.parser.genericOk)) {
    return verdict('parsing', 'parser', STATUS.FAIL, 'The transcript parser failed a known-good sample.',
      'A code regression or schema change would make every turn read 0 tokens.', ['Check src/core/parser.js against a real transcript; run `npm test`.']);
  }
  if (s.pricing && !s.pricing.valid) {
    return verdict('pricing', 'pricing', STATUS.FAIL, `The pricing config is invalid: ${s.pricing.error}.`,
      'Every turn would read "cost unavailable".', ['Fix config/pricing/pricing.v1.json, then `npm run doctor`.']);
  }
  if (s.data && s.data.offsetState === 'pending') {
    return verdict('extension bridge', 'bridge', STATUS.WARN, 'Hook events are queued but not being processed.',
      'The extension is inactive, not installed, or stale.', ['Confirm the extension is installed and current (`npm run package:ext` then reinstall), reload Windsurf.']);
  }

  // Coverage: is there ANY recent hook activity?
  const inboxStale = !s.inbox || !s.inbox.newestAt || (s.now - parseTime(s.inbox.newestAt)) > STALE_MS;
  const nothingEver = (!s.inbox || !s.inbox.count) && (!s.transcripts || !s.transcripts.count);
  if (nothingEver) {
    return verdict('coverage', 'coverage', STATUS.WARN, 'No Cascade activity has been observed yet.',
      'Either no Cascade turn has run, or the hook never fired.', ['Run `npm run doctor -- --watch`, then send one prompt in the Cascade panel.']);
  }
  if (inboxStale) {
    const transcriptRecent = s.transcripts && s.transcripts.newestMtimeMs && (s.now - s.transcripts.newestMtimeMs) < STALE_MS;
    const hint = transcriptRecent
      ? 'A transcript changed recently but produced no hook event — a Cascade turn may not be firing the hook, or an older conversation is just being appended.'
      : 'Recent AI activity may be going through the Codex/Editor-agent pane, which does NOT emit the Cascade hook — so the meter correctly sees nothing.';
    return verdict('coverage', 'coverage', STATUS.WARN, `Newest Cascade hook event was ${ago(s.now, s.inbox && s.inbox.newestAt)}.`,
      hint, ['Run `npm run doctor -- --watch`, then send one prompt in the actual Cascade panel to classify it definitively.']);
  }

  // Recent events exist — judge the freshest record.
  const q = s.usage && s.usage.lastQuality;
  if (q === 'unparsed' || q === 'zero') {
    return verdict('parsing', 'usage', STATUS.WARN, 'The most recent turn parsed to 0 tokens.',
      'The installed extension may predate the parser fix, or the transcript schema drifted.', ['Rebuild + reinstall the extension (`npm run package:ext`); validate with `npm run doctor -- --watch`.']);
  }
  if (q === 'cost_unavailable') {
    return verdict('pricing', 'usage', STATUS.WARN, 'The most recent turn read "cost unavailable".',
      'The model label is not in the pricing config.', ['Run `cascade-cost-meter models` and add the label as a model/alias in pricing.v1.json.']);
  }
  return verdict('healthy', 'usage', STATUS.PASS, 'The chain is healthy — recent turns parse and price correctly.',
    'Nothing to do.', ['Keep using the Cascade panel; the status bar tracks today\'s estimate.']);
}

/** Coverage check row (separate from the verdict, always shown). */
function coverageCheck(now, inbox, transcripts) {
  if ((!inbox || !inbox.count) && (!transcripts || !transcripts.count)) {
    return { status: STATUS.WARN, detail: 'no Cascade activity observed yet' };
  }
  if (!inbox || !inbox.newestAt) return { status: STATUS.WARN, detail: 'no hook events recorded' };
  const age = now - parseTime(inbox.newestAt);
  if (age > STALE_MS) return { status: STATUS.WARN, detail: `newest hook event was ${ago(now, inbox.newestAt)} — likely a different AI surface (e.g. Codex) is in use` };
  return { status: STATUS.PASS, detail: `recent hook event (${ago(now, inbox.newestAt)})` };
}

/** Build a verdict object; `layerId` ties it back to the originating check id. */
function verdict(layer, layerId, status, headline, hint, nextSteps) {
  return { layer, layerId, status, headline, hint, nextSteps: nextSteps || [] };
}

/** Return a probe value only if it succeeded (no `.probeError`); else null. */
function clean(p) {
  if (!p || typeof p !== 'object') return null;
  if (p.probeError) return null;
  return p;
}

/** Parse an ISO string (or pass through a number) to epoch ms; 0 if unknown. */
function parseTime(v) {
  if (typeof v === 'number') return v;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Compact human age, e.g. "3d", "5h", "12m", "just now".
 * @param {number} now  Epoch ms.
 * @param {string|number|null} when  ISO string or epoch ms.
 */
export function ago(now, when) {
  const t = when == null ? 0 : parseTime(when);
  if (!t) return 'unknown';
  const ms = Math.max(0, now - t);
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TAG = { pass: '[PASS]', warn: '[WARN]', fail: '[FAIL]', info: '[INFO]' };

/**
 * Render a report as plain text for the CLI.
 * @param {ReturnType<typeof buildReport>} report
 * @returns {string}
 */
export function formatReport(report) {
  const lines = ['Cascade Cost Meter — doctor', ''];
  for (const c of report.checks) {
    lines.push(`${TAG[c.status] || '[????]'} ${c.label}: ${c.detail}`);
  }
  lines.push('');
  lines.push(`VERDICT: ${report.verdict.layer} — ${report.verdict.headline}`);
  if (report.verdict.hint) lines.push(`  ${report.verdict.hint}`);
  for (const step of report.verdict.nextSteps) lines.push(`  → ${step}`);
  if (report.otherWarnings.length) {
    lines.push('');
    lines.push(`Also worth addressing (${report.otherWarnings.length}):`);
    for (const w of report.otherWarnings) lines.push(`  - ${w}`);
  }
  lines.push('');
  lines.push('Every figure is an estimate. doctor is read-only — it changed nothing.');
  return lines.join('\n');
}
