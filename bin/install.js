#!/usr/bin/env node
/**
 * Setup helper: wire the Cascade post-response hook into the user's Windsurf
 * `hooks.json` safely, so they don't have to hand-edit JSON or paste an absolute
 * path. Run via `npm run setup`.
 *
 * What it does:
 *   1. Auto-detects this repo's absolute path (no manual ABSOLUTE_PATH_TO_REPO).
 *   2. Reads the existing `~/.codeium/windsurf/hooks.json` (if any), defensively.
 *   3. Merges in OUR single entry without disturbing other hooks/keys.
 *   4. Backs up the original, then writes atomically (temp file + rename).
 *
 * Unlike `bin/hook.js`, this is a user-invoked tool, so it MAY exit non-zero on
 * failure — but it never leaves a half-written or corrupt config: on anything it
 * cannot safely interpret it refuses and prints a manual snippet instead.
 *
 * Flags:
 *   --dry-run        Show what would change; write nothing.
 *   --print          Print the merged hooks.json to stdout and exit (no write).
 *   --hooks-file P   Target a specific hooks.json (defaults to the Windsurf path;
 *                    $CCM_WINDSURF_HOOKS also overrides it).
 *   --help, -h       Show usage.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { windsurfHooksFile } from '../src/config/paths.js';
import {
  HOOK_EVENT,
  buildHookCommand,
  parseHooksJson,
  mergeHookEntry,
  serializeHooksJson,
  MalformedHooksError,
} from '../src/config/hooksConfig.js';

/** This repo's root: bin/install.js → up one directory. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Choose the absolute node binary to bake into the hook command.
 *
 * Windsurf runs hooks via `bash -c` with a minimal GUI/launchd PATH that
 * excludes Homebrew/nvm, so a bare `node` is "command not found" at hook time —
 * the hook must use an absolute path. `process.execPath` is absolute but, for
 * Homebrew, points into a versioned Cellar path (e.g. .../node/24.5.0/bin/node)
 * that disappears on `brew upgrade node`. We therefore prefer a stable,
 * non-versioned symlink location when one exists; the hook is version-agnostic,
 * so any Node 18+ there works. Falls back to `process.execPath` (e.g. nvm-only
 * setups), and `doctor` flags it if that path later goes missing.
 * @returns {string} absolute path to a node executable
 */
function resolveHookNodeBinary() {
  const stableCandidates = ['/opt/homebrew/bin/node', '/usr/local/bin/node'];
  for (const candidate of stableCandidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return process.execPath;
}

/**
 * Parse the handful of flags we support. Unknown flags are reported as an error
 * so a typo never silently does the wrong (destructive) thing.
 * @param {string[]} argv
 * @returns {{ dryRun: boolean, print: boolean, help: boolean, hooksFile: string|null }}
 */
function parseArgs(argv) {
  const opts = { dryRun: false, print: false, help: false, hooksFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--print') opts.print = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--hooks-file') opts.hooksFile = argv[(i += 1)];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return opts;
}

const USAGE = `cascade-cost-meter setup — wire the Cascade hook into Windsurf

Usage: npm run setup [-- <flags>]

Flags:
  --dry-run        Show what would change; write nothing.
  --print          Print the merged hooks.json to stdout and exit (no write).
  --hooks-file P   Target a specific hooks.json (default: ~/.codeium/windsurf/hooks.json).
  --help, -h       Show this help.`;

/** Human label for each merge action. */
const ACTION_LABEL = {
  created: 'create a new hooks.json',
  added: 'add the Cascade Cost Meter hook',
  updated: 'update the existing Cascade Cost Meter hook (path changed)',
  alreadyPresent: 'no change — already configured',
};

/**
 * The minimal config to paste by hand if we cannot safely merge automatically.
 * @param {string} command
 * @returns {string}
 */
function manualSnippet(command) {
  return serializeHooksJson(mergeHookEntry(null, command).next);
}

/** @param {string} hooksFile @param {string} command */
function printManualFallback(hooksFile, command) {
  console.error('\nNothing was changed. To wire the hook by hand, edit:');
  console.error(`  ${hooksFile}`);
  console.error(`and merge the "${HOOK_EVENT}" entry below (keep your existing keys):\n`);
  console.error(manualSnippet(command));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }

  const hooksFile = opts.hooksFile || windsurfHooksFile();
  const command = buildHookCommand(REPO_ROOT, resolveHookNodeBinary());

  // Read existing config (ENOENT just means "no file yet"); other read errors
  // (e.g. permissions) are real failures we should not paper over.
  let existingText = null;
  try {
    existingText = fs.readFileSync(hooksFile, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Could not read ${hooksFile}: ${err.message}`);
      printManualFallback(hooksFile, command);
      return 1;
    }
  }

  // Parse + merge. A malformed file or unmergeable shape means we refuse to
  // write and show the manual snippet rather than risk butchering the config.
  let result;
  try {
    const existing = existingText === null ? null : parseHooksJson(existingText);
    result = mergeHookEntry(existing, command);
  } catch (err) {
    if (err instanceof MalformedHooksError) {
      console.error(`Refusing to modify ${hooksFile}: ${err.message}`);
      printManualFallback(hooksFile, command);
      return 1;
    }
    throw err;
  }

  const merged = serializeHooksJson(result.next);

  if (opts.print) {
    process.stdout.write(merged);
    return 0;
  }

  console.log('Cascade Cost Meter — hook setup');
  console.log(`  Repo:    ${REPO_ROOT}`);
  console.log(`  Target:  ${hooksFile}`);
  console.log(`  Command: ${command}`);
  console.log(`  Action:  ${ACTION_LABEL[result.action]}`);

  if (result.action === 'alreadyPresent') {
    console.log('\nAlready configured. Nothing to do.');
    return 0;
  }

  if (opts.dryRun) {
    console.log('\n(dry run) The merged hooks.json would be:\n');
    process.stdout.write(merged);
    console.log('\n(dry run) No changes written. Re-run without --dry-run to apply.');
    return 0;
  }

  // Apply: ensure the directory exists, back up any existing file, then write
  // atomically (write a temp file in the same dir and rename over the target).
  fs.mkdirSync(path.dirname(hooksFile), { recursive: true });

  let backupPath = null;
  if (existingText !== null) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupPath = `${hooksFile}.bak-${stamp}`;
    fs.writeFileSync(backupPath, existingText);
  }

  const tmpPath = `${hooksFile}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, merged);
  fs.renameSync(tmpPath, hooksFile);

  console.log('\nDone. Hook wired.');
  if (backupPath) console.log(`  Backup:  ${backupPath}`);
  console.log('\nNext: FULLY RESTART Windsurf (quit and reopen — hooks load at startup),');
  console.log('then run `npm run doctor -- --watch` and send one prompt in the Cascade');
  console.log('panel. A WATCH VERDICT of "healthy" confirms the chain. See docs/install.md.');
  return 0;
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((err) => {
    console.error(`setup failed: ${err && err.message ? err.message : err}`);
    process.exit(1);
  });
