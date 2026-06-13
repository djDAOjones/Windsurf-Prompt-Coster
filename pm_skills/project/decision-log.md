# Decision Log

<!-- Append new decisions at the top. Don't edit old entries. -->
<!-- Use this during the design phase of each task to record what you chose and why. -->
<!-- Hot sectional. Agents read the latest 10 entries by default. -->
<!-- See AGENTS.md → "Memory size budgets" for archiving thresholds. -->
<!-- Append-only: when archiving, move entries verbatim. Never rewrite. -->

## 2026-06-13 — Upgraded pm-skills framework 1.1.0 → 2.2.1 (GitHub) + 2.0.0 memory migration

**Decision:** Upgraded the installed pm-skills framework from 1.1.0 to 2.2.1 from
the canonical upstream, and removed the redundant local `pm-skills/` clone (also
1.1.0) plus its two `DELETE …md` conversation exports.

**Source:** `https://github.com/djDAOjones/PM-Skills` (shallow clone, 2.2.1).

**What changed:**

- **Framework files** (Step 4 customisation check clean — the diff against the
  local 1.1.0 reference was empty, so no carry-over): overwrote `GUIDE.md`,
  `init.md`, `MANIFEST.md`, `CHANGELOG.md`, all `prompts/*` and `integrations/*`;
  added new prompts `deploy.md`, `doctor-memory.md`, `roadmap-refactor.md` and new
  integrations `init-mvp.md`, `spec-to-prod.md`. `scaffold/*` already identical.
- **Root template `AGENTS.md`** (3-way merge): adopted the four read tiers (incl.
  Warm/`trajectory.md`), the rebuilt memory-budget table, the invariant-led
  testing doctrine, the `trajectory`/`INDEX.md` document-ownership rows, and two
  new anti-patterns; preserved every project section verbatim; dropped the
  obsolete `pm-skills/` never-edit line. `UI-STANDARDS.md` and
  `DEV-INFRASTRUCTURE.md` were already identical upstream (untouched).
- **2.0.0 memory migration (lossless):** snapshotted `backlog.md` byte-identical
  to `archive/trajectory/backlog-pre-v2-2026-06-13.md`; created `trajectory.md`
  and moved all 24 shipped `[x]` items into it (grouped by milestone, one
  compressed ID-prefixed line each, pointing back here); rewrote `backlog.md` to
  open-work-only (Current/Next/Icebox), removing `## Completed`; created
  `archive/INDEX.md`. Reconcile: 24 snapshot `[x]` = 24 trajectory IDs, 0 `[x]`
  left in the backlog.

**Provenance note:** the prior project's upgrade flagged a local-vs-GitHub
divergence over "Shell safety" sections; this project never had them, so the
GitHub canonical applied cleanly with nothing to reconcile.

## 2026-06-13 — Root cause confirmed: hook used a bare `node` unresolvable on Windsurf's GUI PATH (+ absolute-node fix)

**Context:** The live canary (`doctor --watch`) was run twice with real
Cascade-panel prompts and detected NOTHING — no inbox event, no new transcript.
That falsified the earlier "wrong surface (Codex)" hint: the meter genuinely was
not recording real Cascade turns.

**Investigation (read-only):**

- `hooks.json` was wired correctly at `~/.codeium/windsurf/hooks.json` with the
  command `node "…/bin/hook.js"`.
- `command -v node` → `/opt/homebrew/bin/node`; testing a launchd-style PATH
  (`/usr/bin:/bin:/usr/sbin:/sbin`) showed `node` NOT FOUND.
- `debug.log` had no hook entries from the test turns (its last write was the
  test run), proving `bin/hook.js` never executed.
- Windsurf docs confirm hooks run via `bash -c` (inheriting the GUI/launchd
  PATH), and that `post_cascade_response_with_transcript` + the
  `~/.windsurf/transcripts/` path are still current — so no API rename.

**Root cause:** macOS GUI apps (Dock-launched Windsurf) run hooks with a minimal
PATH that excludes Homebrew/nvm. The bare `node` was "command not found", so the
hook silently failed before writing anything. It worked once (13 days ago) only
because that turn ran with a fuller PATH (e.g. Windsurf launched from a terminal).

**Decision / fix:**

- `buildHookCommand(repoRoot, nodeBin='node')` accepts an absolute node binary
  (quoted iff it has spaces); the default keeps the bare form for tests.
- `install.js` pins an absolute node via `resolveHookNodeBinary()`, preferring a
  stable symlink (`/opt/homebrew/bin/node`, then `/usr/local/bin/node`) over
  `process.execPath` — Homebrew's `execPath` is a versioned Cellar path that
  vanishes on `brew upgrade node`; falls back to `process.execPath` (nvm-only).
- `probe.js` adds `classifyHookNode` (parses the node token → nodeRisk: ok /
  missing / bare_unresolved / unknown) and compares the resolved SCRIPT target
  (not the whole command) for `pointsToThisRepo`.
- `doctor.js` adds a `Hook node` check + a high-priority `hook config` FAIL
  verdict when node is bare-unresolvable or missing, with the exact remedy.
- `canary.js` broadens the "nothing changed" message to include hook/node and
  not-loaded causes, not just "wrong surface".
- Docs (setup/install/hooks.example) require an absolute node path and a FULL
  Windsurf restart; the installer's post-setup message says the same.

**Outcome:** Live hook rewired to `/opt/homebrew/bin/node "…"` (backup kept);
`npm run doctor` now reads `[PASS] Hook node: /opt/homebrew/bin/node (resolvable)`.
138 tests green (85 pre-doctor → 128 after doctor → +10 here). Pending user
action: fully restart Windsurf, then `doctor --watch` + one Cascade prompt to
confirm a `healthy` WATCH VERDICT.

**Alternatives considered:**

- PATH-augmenting the command (`PATH="/opt/homebrew/bin:…" node …`) — doesn't
  cover nvm and is more fragile than an absolute binary.
- `process.execPath` directly — correct but version-pinned under Homebrew, so a
  stable symlink is preferred with execPath as the fallback.

## 2026-06-13 — `doctor` + live canary: classify where the chain stands (a quiet meter ≠ a broken one)

**Decision:** Add a strictly read-only `cascade-cost-meter doctor` (and
`doctor --watch`), exposed as `npm run doctor`. `src/diag/probe.js` gathers a
plain-data snapshot (hook config, data dir + offset state, inbox/usage recency,
transcripts dir, parser-vs-built-in-samples, pricing registry, and an
installed-vs-built extension hash compare). `src/core/doctor.js` is a PURE
classifier that emits per-layer checks and a single verdict — environment ·
hook config · data dir · parsing · pricing · extension bridge · coverage ·
healthy. `src/diag/canary.js` snapshots, asks for one real Cascade-panel prompt,
watches inbox/usage/transcripts, and classifies what moved. Wired as a `doctor`
subcommand next to `models`/`dedup`; 43 new tests (85 → 128).

**Rationale:** First real-machine diagnosis found the hook correctly wired, the
inbox bridge caught up, parser + pricing healthy, and the installed extension
matching the local build — yet the only real usage record was the pre-fix
`unparsed / 0 tokens / cost_unavailable` from 13 days ago, with no newer hook
events or transcripts. The dominant cause is COVERAGE: recent AI activity is the
Codex/Editor-agent surface, which does not emit
`post_cascade_response_with_transcript`, so the meter correctly sees nothing —
the pipeline is not broken. Static state cannot separate "hook not firing" from
"wrong surface", so the verdict punts that one call to `--watch`, which drives a
live turn and names the exact broken link. doctor tests writability with an
access check (never a write) to honour the never-disrupt / local-only invariants.

**Alternatives considered:**

- Fold checks into `models`/`dedup` — conflates read-only diagnostics with log
  mutation; a dedicated side-effect-free command reads cleaner.
- Inject a synthetic event into the real inbox to exercise bridge+parse+price
  without a live turn — useful but MUTATING; deferred to an opt-in `--synthetic`
  to keep this slice read-only.
- Over-claim a static "hook broken" verdict — rejected; honestly defer the
  firing-vs-surface call to the canary.

**Build bug found + fixed:** `watchForTurn` used `opts.timeoutMs || 60000`, so a
`0` timeout fell through to 60s and busy-looped on a no-op sleep — which also
starved the parallel estimator/js-tiktoken test into a 5s timeout. Switched to
`??` and an explicit start clock decoupled from the snapshot timestamp.

## 2026-05-31 — Phase 3: one turn, one record (per-`executionId` claim + dedup-on-read + cleanup)

**Decision:** Guarantee exactly one usage record per turn even when several
Windsurf hosts watch the same inbox. Added `dedupKey(o)` (`src/core/event.js`):
prefer `executionId` (`e:<id>`), else `trajectoryId`+`timestamp` (`t:…`), else
null (never collapsed). In `src/log/usageLog.js`: `claimEvent(key)` creates an
exclusive `wx` lock file under `~/.cascade-cost-meter/locks/` (EEXIST → lost the
claim; any other error → fail-OPEN), `appendUsageOnce(record)` records only the
claim winner, `dedupRecords`/`summarize` collapse duplicate keys on read, and
`rewriteUsageDeduped()` cleans the log behind a `usage.jsonl.bak` backup (exposed
as `cascade-cost-meter dedup`). The extension's watch loop now calls
`appendUsageOnce` and gates the toast/session total on the winner. Tests 73 → 85.
Cleaned the real log (2 → 1; backup kept).

**Rationale:** The duplicate was a read–process–append race on the *shared*
`inbox.offset`: concurrent hosts read from the same committed offset, so the
per-host `processing` guard can't help — the only correct serialization point is
an atomic, cross-process claim keyed on the turn. `executionId` is a stable UUID
present on every event/record, so one key serves the claim, the on-read dedupe,
and the cleanup. Fail-open on unexpected lock errors preserves the "never drop a
turn" invariant: a rare duplicate is recoverable (dedup-on-read), a lost turn is
not. Dedup-on-read also makes legacy duplicates harmless immediately, before any
cleanup is run.

**Alternatives considered:**

- Global queue lock around the whole inbox read/append — serializes every host on
  the hot path and a dead holder stalls the queue; rejected for a per-turn claim
  that only ever blocks the exact duplicate.
- Tightening the `fs.watch` filter / single-owner election — reduces but does not
  eliminate the race and adds host-coordination complexity. Dedup by identity is
  simpler and complete (the filter change proved unnecessary).
- Dedup-on-read only (no claim) — leaves the log physically doubled and fires the
  per-turn toast N times; the claim fixes both at the source.

## 2026-05-31 — Phase 2: priced current models + a read-only `models` discovery command

**Decision:** Curate `config/pricing/pricing.v1.json` to current provider list
prices — added `Claude Opus 4.8` ($5/$25 in/out per 1M, aliasing the real
`Claude Opus 4.8 Max` selector label), `Claude Sonnet 4.5` ($3/$15), `Claude
Haiku 4.5` ($1/$5), `GPT-5.4`/`GPT-5.4 mini`, and corrected `o3` to $0.40/$1.60.
Added `src/core/models.js` (`collectModels` + `formatModelsReport`) and a
read-only `cascade-cost-meter models` subcommand that aggregates the usage log
and flags priced vs unpriced labels. New `docs/pricing.md`. Tests 66 → 73. Kept
the provider-list-price basis; deferred an opt-in price-fetch command and a
Windsurf ACU-credit basis (wish-list).

**Rationale:** After Phase 1, real turns still read "cost unavailable" purely
because the label wasn't priced. Research corrected a key assumption: Anthropic's
Opus 4.8 lists at $5/$25, not the old Opus $15/$75 — the stale figure would have
over-estimated ~3×. Windsurf's docs defer to the in-IDE selector for current
models, and that label is exactly what each turn records, so discovery from the
local usage log (no network) is the right "way to get current models". Verified on
the real event: `Cascade estimate: $0.3083 · 49.9k in / 2.4k out · Claude Opus 4.8 Max`.

**Alternatives considered:**

- Per-turn "seen models" state file — extra hot-path write + a new protected file,
  redundant with the usage log. Rejected.
- Automated opt-in price fetch / ACU-credit basis — real value but adds network +
  parsing/maintenance; deferred to the wish-list to keep Phase 2 local and small.

## 2026-05-31 — Parser reads Cascade's real action-stream transcript (latest turn, full-context input)

**Decision:** Teach `src/core/parser.js` Cascade's real transcript schema — an
action stream of `{ status, type, <action>: {…} }` lines with user text at
`user_input.user_response` and assistant text at `planner_response.response`. When
detected (presence of those keys), the parser isolates the latest turn (from the
last `user_input` to EOF): the turn's `planner_response.response` chunks are the
OUTPUT; everything else (prior turns, this turn's user message, tool/file output)
is the resent INPUT context. Any non-Cascade shape keeps the existing generic
heuristic. Added a sanitised real-schema fixture and parser/pipeline/integration
tests (60 → 66).

**Rationale:** The first real turn logged 0 tokens / "cost unavailable" because the
parser expected a flat `{role, content}` log and extracted nothing from the real
schema. Slicing the latest turn avoids re-counting earlier turns as new output;
counting the full prior context as input reflects that Cascade re-sends the whole
conversation each turn, so longer chats genuinely cost more. Verified on the real
on-disk transcript: ~49.9k in / 2.4k out, `transcriptStatus:"parsed"`.

**Alternatives considered:**

- Minimal field-list extension (add `response`/`user_response`) — still undercounts
  multi-chunk replies (a reply spans many `planner_response` lines). Rejected.
- Per-trajectory delta tracking (persist a read position per conversation) — most
  accurate but adds persistent state/complexity beyond an approximate meter. Parked
  on the wish-list.

## 2026-05-31 — Setup: a safe Node hook installer (`npm run setup`) + AI runbook, not an HTML wizard

**Decision:** Add `bin/install.js` (orchestration) backed by a pure, tested
`src/config/hooksConfig.js` (merge logic). It auto-detects the repo's absolute
path, merges our `post_cascade_response_with_transcript` entry into
`~/.codeium/windsurf/hooks.json` idempotently, backs up the original, and writes
atomically (temp + rename). On a malformed or unmergeable config it refuses to
write and prints a manual snippet. Exposed as `npm run setup`
(`--dry-run` / `--print` / `--hooks-file`), with `docs/install.md` and a
`/setup` Windsurf workflow as the concise, AI-navigable runbook.

**Rationale:** The ask was an "upload button that routes to the hooks path and
inserts what's required without butchering existing config." A browser/HTML page
is sandboxed: it can't learn an uploaded file's real path or write back to
`~/.codeium/...`, and staying local-only forbids a CDN UI stack. Only a local
Node process can read, merge, back up, and write that file and auto-detect the
absolute repo path — removing the manual `ABSOLUTE_PATH_TO_REPO` edit. Keeps the
MVP headless and zero runtime dependencies.

**Alternatives considered:**

- Standalone HTML wizard (upload → download merged file) — can't write to or
  detect the real path; clunky manual move; a new UI surface vs the headless
  MVP. Rejected.
- Hybrid HTML face + Node engine — two surfaces for one outcome; the HTML adds
  little over the AI runbook once the command exists. Parked (a webview "setup
  panel" idea on `wish-list.md`).

## 2026-05-31 — Package the .vsix with a zero-dep zip packager (vsce hangs on OneDrive)

**Decision:** Replace `@vscode/vsce` with `scripts/build-vsix.mjs`, a small
zero-dependency packager that stages the bundled files in a local temp dir and
zips the OPC layout (`[Content_Types].xml` + `extension.vsixmanifest` +
`extension/`) with the system `zip`. `npm run package:ext` now runs `build:ext`
then this script. Removed the unused `@vscode/vsce` devDependency.

**Rationale:** `vsce package` reliably hangs at startup on this project's OneDrive
CloudStorage path — zero output for 3+ minutes (stalls loading its large
dependency tree / globbing the cloud-synced folder), even with `--no-dependencies`,
`</dev/null`, and `yes |`. A `.vsix` is just an OPC zip, so hand-building it is
deterministic, fast (<1s after esbuild), and network-free. macOS/Linux only (needs
`zip`); revisit for Windows. Verified: produced an installable
`extension/cascade-cost-meter.vsix` with the 5 expected parts.

## 2026-05-31 — Open VSX extension is in the MVP; OS notification dropped from MVP

**Decision:** The MVP now includes a Windsurf/Open VSX extension as the primary
surface, with three surfaces chosen by the maintainer: a **status bar** running
session/today total, a **per-turn in-IDE toast**, and a **command** to open the
usage log / today's breakdown. The per-turn **OS notification is dropped from the
MVP** (deferred to a later fallback). Trigger stays the
`post_cascade_response_with_transcript` hook; a thin hook entry appends each event
to `~/.cascade-cost-meter/inbox.jsonl`; the extension watches it (`fs.watch`),
computes via the shared core, appends to `usage.jsonl`, and renders the surfaces.

**Rationale:** The maintainer wants in-IDE surfaces, not an OS toast. The
extension is always running while the IDE is open, so it replaces the OS
notification and adds a persistent running total. An inbox queue + processed
offset lets the extension backfill turns that occurred while it was inactive, so
no data is lost. The deterministic core stays a shared, tested library, keeping
the extension thin.

**Alternatives considered:**

- CLI computes + logs, extension display-only — guarantees logging without the
  extension but spawns Node per turn; rejected since the extension is now required.
- Extension watches `~/.windsurf/transcripts/` directly (no hook) — rejected: an
  undocumented, pruned internal dir, and lacks clean model/ID fields.

## 2026-05-31 — Token estimation: heuristic baseline + optional exact for OpenAI

**Decision:** Default to the heuristic estimator for all models; add an optional,
approved exact tokenizer (e.g. `js-tiktoken`, pure JS) for **OpenAI-family models
only**. Anthropic/Gemini have no public exact tokenizer and stay heuristic. The
figure is always labelled "estimate".

**Rationale:** The maintainer accepts a tokenizer dependency but does not require
it. Exactness is only achievable for OpenAI tokenizers, and hidden input context
makes the number an estimate regardless, so a heuristic baseline with a targeted
exact path is the best accuracy/effort trade.

**Alternatives considered:**

- Bundle exact tokenizers for all models — impossible (no public Claude/Gemini
  tokenizer) and heavier; rejected.

## 2026-05-31 — Privacy posture: local-only, counts-not-content by default

**Decision:** No network calls by default; store token counts, model, cost, IDs,
and timestamps in the usage log — never raw prompt/response text unless the user
explicitly opts in. Any reconciliation/external call is opt-in and separate.

**Rationale:** The transcript can contain sensitive code and data (the docs note
the response "may contain sensitive" content). The user mandated no external
transmission without approval. Counts-only logging delivers the feature with the
smallest data-at-rest footprint.

**Alternatives considered:**

- Store full transcripts for richer history — rejected as default (privacy risk).

## 2026-05-31 — Cost is an estimate from a versioned pricing config

**Decision:** Estimate tokens locally and price them via a versioned JSON config
(`pricing.vN.json`) keyed by model, in USD per 1M input/output tokens, with a
`pricing_basis` label and effective date. Unknown models show token estimates and
"cost unavailable". Notifications always say "estimate".

**Rationale:** No official Windsurf surface (hooks or Analytics API) exposes exact
per-turn token counts; Analytics returns credits in cents aggregated by day. A
config-driven estimate keeps prices out of logic and honestly labelled.

**Alternatives considered:**

- Windsurf credits/ACUs as the cost unit — rejected for the headline figure: not
  exposed per turn and meaningless for BYOK/self-serve; may be added later.
- Hard-coded prices — rejected (violates "pricing is config" constraint).

## 2026-05-31 — MVP surface: documented hook → Node CLI → OS notification

**Decision:** Build the MVP as a `post_cascade_response_with_transcript` hook that
runs a Node CLI, which estimates cost and fires an OS-native notification, with an
optional Open VSX extension deferred to a later milestone.

**Rationale:** `show_output` does not apply to the post-response hooks (they run
asynchronously), so a hook cannot print a toast into the Cascade chat. An OS
notification is the lowest-friction visible surface and needs no extension. The
hook→file→`fs.watch` bridge (proven by `staronelabs/windsurf-cli`) is the upgrade
path to in-IDE UI without rework.

**Alternatives considered:**

- Hook-only with stdout in chat — not possible (show_output disabled for the event).
- Extension-first — higher setup friction and packaging cost for v1.
- Analytics-API-backed — Teams/Enterprise only, daily granularity; not an MVP fit.

## 2026-05-31 — Runtime: Node.js, target zero runtime dependencies

**Decision:** Implement in Node.js (ESM) with no runtime dependencies for the MVP;
Vitest for tests. An exact tokenizer would be an optional, lazily loaded, opt-in
dependency requiring approval.

**Rationale:** Hooks invoke shell commands, so a single Node entry point is
cross-platform and shares code with a future extension. Zero deps keeps install
trivial and the privacy/supply-chain surface minimal.

**Alternatives considered:**

- Python — rejected to avoid a second runtime and ease extension code-sharing.
- Bundled tokenizer by default — rejected to preserve the zero-dependency target.
