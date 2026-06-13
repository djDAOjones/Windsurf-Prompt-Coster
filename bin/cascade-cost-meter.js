#!/usr/bin/env node
/**
 * Headless CLI: run the full estimation pipeline on a single event read from
 * stdin, append the usage record, and print the one-line summary. Accepts either
 * a raw Windsurf hook payload or an already-normalised inbox event.
 *
 * Used for tests, manual verification, and by users who want the headless path
 * without the extension. Like the hook, it exits 0 even on failure (errors go to
 * stderr) so it can be wired directly to a hook if desired.
 */

import fs from 'node:fs';
import { readStdin } from '../src/util/stdin.js';
import { normalizeHookEvent } from '../src/core/event.js';
import { processEvent } from '../src/core/pipeline.js';
import { appendUsage, readUsage, rewriteUsageDeduped } from '../src/log/usageLog.js';
import { collectModels, formatModelsReport } from '../src/core/models.js';
import { loadSettings } from '../src/config/settings.js';
import { loadPricingRegistry } from '../src/config/pricingSource.js';
import { gatherProbes } from '../src/diag/probe.js';
import { buildReport, formatReport } from '../src/core/doctor.js';
import { watchForTurn } from '../src/diag/canary.js';
import { logError } from '../src/util/safe.js';

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'models') {
    runModelsCommand();
    return;
  }
  if (argv[0] === 'dedup') {
    runDedupCommand();
    return;
  }
  if (argv[0] === 'doctor') {
    await runDoctorCommand(argv.slice(1));
    return;
  }

  const raw = await readStdin();
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch (err) {
    logError('cli.parse', err);
    fs.writeSync(2, 'cascade-cost-meter: could not parse stdin JSON\n');
    return;
  }

  // A normalised inbox event already has v + receivedAt; otherwise treat as raw payload.
  const event = parsed && parsed.v && parsed.receivedAt ? parsed : normalizeHookEvent(parsed);
  const settings = loadSettings();
  const { registry, error, source } = loadPricingRegistry();
  if (error) logError('cli.pricing', new Error(`${error.message} (source: ${source})`));

  const { record, summary } = await processEvent(event, { registry, settings });
  appendUsage(record);
  // Synchronous write so the line is flushed to the pipe before the forced exit.
  fs.writeSync(1, `${summary}\n`);
}

/**
 * `cascade-cost-meter models`: list the model labels seen in the usage log and
 * which are currently priced (read-only; prints counts only).
 */
function runModelsCommand() {
  const { registry } = loadPricingRegistry();
  const records = readUsage();
  fs.writeSync(1, `${formatModelsReport(collectModels(records, registry))}\n`);
}

/**
 * `cascade-cost-meter dedup`: remove duplicate records from the usage log
 * (keeping the first of each turn), backing the original up to usage.jsonl.bak.
 */
function runDedupCommand() {
  const { total, kept, removed } = rewriteUsageDeduped();
  const msg = removed > 0
    ? `Removed ${removed} duplicate record(s); kept ${kept} of ${total}. Backup: usage.jsonl.bak\n`
    : `No duplicate records found (${total} total).\n`;
  fs.writeSync(1, msg);
}

/**
 * `cascade-cost-meter doctor [--watch] [--json]`: a READ-ONLY diagnostic that
 * classifies where the hook → inbox → extension → parse → price → log chain
 * stands, and (with `--watch`) drives one live Cascade turn to settle whether a
 * quiet meter is broken or simply observing a different AI surface.
 * @param {string[]} argv  Flags after the `doctor` subcommand.
 */
async function runDoctorCommand(argv) {
  const watch = argv.includes('--watch');
  const json = argv.includes('--json');

  const report = buildReport(gatherProbes());
  if (json) {
    fs.writeSync(1, `${JSON.stringify(report, null, 2)}\n`);
    if (!watch) return;
  } else {
    fs.writeSync(1, `${formatReport(report)}\n`);
  }
  if (!watch) return;

  fs.writeSync(1, '\n--- live canary ---\n');
  fs.writeSync(1, 'Send ONE short prompt in the Cascade panel now (NOT the Codex/Editor pane).\n');
  fs.writeSync(1, 'Watching the inbox, usage log, and transcripts for up to 60s ');
  const result = await watchForTurn({ onTick: () => fs.writeSync(1, '.') });
  fs.writeSync(1, '\n');
  if (!result.changed) fs.writeSync(1, 'No change detected within the timeout.\n');
  const c = result.classification;
  fs.writeSync(1, `WATCH VERDICT: ${c.layer} — ${c.message}\n`);
}

main()
  .catch((err) => {
    logError('cli.main', err);
    fs.writeSync(2, `cascade-cost-meter: ${err && err.message ? err.message : err}\n`);
  })
  .finally(() => process.exit(0));
