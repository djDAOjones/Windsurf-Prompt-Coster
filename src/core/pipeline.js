/**
 * The estimation pipeline, shared by the headless CLI and the extension:
 *
 *   inbox event → (read transcript) → parse → estimate tokens → look up pricing
 *               → compute cost → build usage record → display summary
 *
 * Pure orchestration with injectable dependencies (`registry`, `settings`,
 * `readTranscript`) so it is fully testable without touching the real disk.
 * Transcript reads are wrapped so a missing/unreadable file degrades to
 * "cost unavailable" rather than throwing.
 */

import fs from 'node:fs';
import { parseTranscript } from './parser.js';
import { estimateTurn } from './estimator.js';
import { lookupModel } from './pricing.js';
import { computeCost } from './cost.js';
import { buildUsageRecord } from './usageRecord.js';
import { formatTurnSummary } from './display.js';
import { safe } from '../util/safe.js';

/**
 * @param {import('./event.js').InboxEvent} event
 * @param {Object} [deps]
 * @param {import('./pricing.js').PricingRegistry|null} [deps.registry]
 * @param {import('../config/settings.js').Settings} [deps.settings]
 * @param {(path: string) => string} [deps.readTranscript]
 * @returns {Promise<{ record: Object, summary: string }>}
 */
export async function processEvent(event, deps = {}) {
  const settings = deps.settings || {};
  const registry = deps.registry || null;
  const readTranscript = deps.readTranscript || ((p) => fs.readFileSync(p, 'utf8'));

  let turn = { model: event.modelName || null, inputText: '', outputText: '', inputChars: 0, outputChars: 0 };
  let transcriptStatus = 'none';

  if (event.transcriptPath) {
    const text = safe(() => readTranscript(event.transcriptPath), null, 'pipeline.readTranscript');
    if (text == null) {
      transcriptStatus = 'missing';
    } else {
      const parsed = parseTranscript(text, settings.transcriptSchema);
      if (parsed.ok) {
        turn = {
          model: parsed.model || event.modelName || null,
          inputText: parsed.inputText,
          outputText: parsed.outputText,
          inputChars: parsed.inputChars,
          outputChars: parsed.outputChars,
        };
        transcriptStatus = 'parsed';
      } else {
        transcriptStatus = 'unparsed';
      }
    }
  } else if (event.responseChars) {
    // Summary-only event: we know the output size but not the input context.
    turn.outputChars = event.responseChars;
    transcriptStatus = 'summary';
  }

  const tokens = await estimateTurn(turn, { exactTokenizer: !!settings.exactTokenizer });
  const model = turn.model || event.modelName || null;
  const entry = lookupModel(registry, model);
  const cost = computeCost(tokens, entry);
  const record = buildUsageRecord({ event, model, tokens, cost, registry, transcriptStatus, turn, settings });
  return { record, summary: formatTurnSummary(record) };
}
