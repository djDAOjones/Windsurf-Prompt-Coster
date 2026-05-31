# Decision Log

<!-- Append new decisions at the top. Don't edit old entries. -->
<!-- Use this during the design phase of each task to record what you chose and why. -->
<!-- Hot sectional. Agents read the latest 10 entries by default. -->
<!-- See AGENTS.md → "Memory size budgets" for archiving thresholds. -->
<!-- Append-only: when archiving, move entries verbatim. Never rewrite. -->

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
