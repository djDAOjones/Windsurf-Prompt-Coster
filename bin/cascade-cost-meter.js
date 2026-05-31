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
import { appendUsage } from '../src/log/usageLog.js';
import { loadSettings } from '../src/config/settings.js';
import { loadPricingRegistry } from '../src/config/pricingSource.js';
import { logError } from '../src/util/safe.js';

async function main() {
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

main()
  .catch((err) => {
    logError('cli.main', err);
    fs.writeSync(2, `cascade-cost-meter: ${err && err.message ? err.message : err}\n`);
  })
  .finally(() => process.exit(0));
