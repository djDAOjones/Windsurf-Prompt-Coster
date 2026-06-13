/**
 * Cascade Cost Meter extension.
 *
 * The hook appends each Cascade turn's event to `~/.cascade-cost-meter/inbox.jsonl`.
 * This extension watches that file, computes an estimate via the shared core
 * (parser → estimator → pricing → cost), appends a usage record, and renders three
 * surfaces: a status-bar running total, a per-turn in-IDE toast, and commands to
 * open the usage log / show today's breakdown. It backfills any events that
 * arrived while it was inactive (via the inbox offset).
 *
 * Everything is wrapped so a failure surfaces in the output channel and never
 * throws out of the extension host.
 */

import * as vscode from 'vscode';
import fs from 'node:fs';
import path from 'node:path';

import { processEvent } from '../../src/core/pipeline.js';
import { buildRegistry, loadPricing } from '../../src/core/pricing.js';
import { readNewEvents, commitOffset } from '../../src/log/inbox.js';
import { appendUsageOnce, readUsage, summarize } from '../../src/log/usageLog.js';
import { resolvePaths, ensureDataDir } from '../../src/config/paths.js';
import { loadSettings } from '../../src/config/settings.js';
import { formatStatusBar } from '../../src/core/display.js';
import { formatUsd } from '../../src/core/cost.js';
import defaultPricing from '../../config/pricing/pricing.v1.json';

let statusBarItem;
let watcher;
let output;
let registry;
let sessionUsd = 0;
let processing = false;
let pending = false;
let debounceTimer;

/** @param {vscode.ExtensionContext} context */
export function activate(context) {
  try {
    output = vscode.window.createOutputChannel('Cascade Cost Meter');
    registry = loadRegistry();

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'cascadeCostMeter.showToday';
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
      vscode.commands.registerCommand('cascadeCostMeter.openUsageLog', openUsageLog),
      vscode.commands.registerCommand('cascadeCostMeter.showToday', showToday),
    );

    startWatching(context);
    updateStatusBar();
    // Backfill anything that arrived before activation.
    void processNewEvents();
  } catch (err) {
    logError('activate', err);
  }
}

export function deactivate() {
  try {
    if (watcher) watcher.close();
    if (debounceTimer) clearTimeout(debounceTimer);
  } catch (err) {
    logError('deactivate', err);
  }
}

/**
 * Load pricing: prefer the user's file, else the bundled default JSON.
 * @returns {import('../../src/core/pricing.js').PricingRegistry}
 */
function loadRegistry() {
  try {
    const userFile = path.join(resolvePaths().pricingDir, 'pricing.v1.json');
    if (fs.existsSync(userFile)) {
      const { registry: reg } = loadPricing(userFile);
      if (reg) return reg;
    }
  } catch (err) {
    logError('loadRegistry', err);
  }
  return buildRegistry(defaultPricing);
}

/** Watch the data directory for inbox changes (debounced). */
function startWatching(context) {
  try {
    ensureDataDir();
    const p = resolvePaths();
    watcher = fs.watch(p.dir, (_eventType, filename) => {
      if (!filename || path.basename(p.inbox).startsWith(String(filename)) || String(filename) === path.basename(p.inbox)) {
        scheduleProcess();
      }
    });
    context.subscriptions.push({ dispose: () => watcher && watcher.close() });
  } catch (err) {
    logError('startWatching', err);
  }
}

function scheduleProcess() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void processNewEvents(), 200);
}

/** Process all new inbox events; serialised so overlapping watch events are safe. */
async function processNewEvents() {
  if (processing) {
    pending = true;
    return;
  }
  processing = true;
  try {
    const settings = loadSettings();
    const config = vscode.workspace.getConfiguration('cascadeCostMeter');
    const showToast = config.get('showToastPerTurn', true);

    const { events, newOffset } = readNewEvents();
    for (const event of events) {
      try {
        const { record, summary } = await processEvent(event, { registry, settings });
        // One record per turn across hosts: only the consumer that wins the
        // claim writes the record and toasts; duplicates are skipped silently.
        if (!appendUsageOnce(record)) continue;
        if (typeof record.estimatedCostUsd === 'number') sessionUsd += record.estimatedCostUsd;
        const threshold = settings.notifyThresholdUsd || 0;
        const cost = record.estimatedCostUsd || 0;
        if (showToast && cost >= threshold) {
          vscode.window.showInformationMessage(summary);
        }
      } catch (err) {
        logError('processEvent', err);
      }
    }
    if (events.length) commitOffset(newOffset);
    updateStatusBar();
  } catch (err) {
    logError('processNewEvents', err);
  } finally {
    processing = false;
    if (pending) {
      pending = false;
      void processNewEvents();
    }
  }
}

function updateStatusBar() {
  try {
    if (!statusBarItem) return;
    const records = readUsage();
    const s = summarize(records);
    const scope = vscode.workspace.getConfiguration('cascadeCostMeter').get('statusBarScope', 'today');
    const total = scope === 'session' ? sessionUsd : s.todayUsd;
    statusBarItem.text = `$(graph) ${formatStatusBar(total)}`;
    statusBarItem.tooltip = [
      'Cascade Cost Meter — estimates only',
      `Today: ${formatUsd(s.todayUsd)} (${s.todayCount} turns)`,
      `Session: ${formatUsd(sessionUsd)}`,
      `All-time: ${formatUsd(s.totalUsd)} (${s.count} turns)`,
      s.unavailableCount ? `Unknown-cost turns: ${s.unavailableCount}` : '',
    ].filter(Boolean).join('\n');
    statusBarItem.show();
  } catch (err) {
    logError('updateStatusBar', err);
  }
}

async function openUsageLog() {
  try {
    const p = resolvePaths();
    if (!fs.existsSync(p.usageLog)) {
      vscode.window.showInformationMessage('Cascade Cost Meter: no usage recorded yet.');
      return;
    }
    const doc = await vscode.workspace.openTextDocument(p.usageLog);
    await vscode.window.showTextDocument(doc, { preview: false });
  } catch (err) {
    logError('openUsageLog', err);
  }
}

async function showToday() {
  try {
    const s = summarize(readUsage());
    const byModel = Object.entries(s.byModel)
      .sort((a, b) => b[1].totalUsd - a[1].totalUsd)
      .map(([model, v]) => `${model}: ${formatUsd(v.totalUsd)} (${v.count})`);
    const lines = [
      `Today (estimate): ${formatUsd(s.todayUsd)} across ${s.todayCount} turns`,
      `All-time (estimate): ${formatUsd(s.totalUsd)} across ${s.count} turns`,
      s.unavailableCount ? `${s.unavailableCount} turn(s) had unknown cost` : '',
      '',
      'By model (all-time):',
      ...byModel,
    ].filter(Boolean);
    void vscode.window.showInformationMessage(lines[0], 'Open Usage Log').then((choice) => {
      if (choice === 'Open Usage Log') void openUsageLog();
    });
    if (output) {
      output.clear();
      output.appendLine(lines.join('\n'));
      output.show(true);
    }
  } catch (err) {
    logError('showToday', err);
  }
}

function logError(label, err) {
  const message = err && err.stack ? err.stack : String(err);
  if (output) output.appendLine(`[${new Date().toISOString()}] ${label}: ${message}`);
}
