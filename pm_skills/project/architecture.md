# Architecture

<!-- Generated during project initialization. Review and edit as needed. -->
<!-- Update this file when major structural decisions change. -->
<!-- Hot whole-file read. See AGENTS.md → "Memory size budgets" for limits. -->
<!-- Describe current structure only. Move historical batch notes to decision-log.md. -->

> **Status:** MVP architecture, scope approved 2026-05-31. The MVP includes the
> Open VSX extension (status bar total, per-turn in-IDE toast, usage-log command).
> Options analysis: `docs/design-options.md`; feasibility evidence:
> `docs/feasibility-matrix.md`.

## Tech stack

- **Node.js (LTS), ESM** — the shared core, hook entry, and headless CLI are
  plain Node; the extension host is also Node, so the core is imported directly.
- **Shared deterministic core, zero runtime deps** — parser, estimator, pricing,
  cost use only the standard library. Keeps install trivial and privacy tight.
- **Open VSX / VS Code extension** — the primary UI (status bar, toast, command).
  Authored in JS, bundled with **esbuild**, packaged to `.vsix` with
  **`@vscode/vsce`** (all dev-only). Distributed by local `.vsix` sideload for the
  MVP; Open VSX publish later.
- **Optional exact tokenizer** — `js-tiktoken` (pure JS) for OpenAI-family models,
  lazily loaded; heuristic otherwise. Approved opt-in dependency.
- **Vitest (dev only)** — unit tests for the core and the fail-safe paths.
- **Versioned pricing config (JSON)** — `config/pricing/*.json` with schema
  version, basis, and effective date; loaded at runtime, never hard-coded.

## Project structure

```text
bin/
  hook.js                      — hook entry: read stdin JSON, append event to inbox.jsonl, exit 0 (fail-safe)
  cascade-cost-meter.js        — headless CLI: run the full core pipeline on one event (tests / no-extension)
src/
  core/
    parser.js                  — read transcript JSONL → normalised Turn (resilient to drift)
    estimator.js               — estimate input/output tokens (heuristic + optional exact)
    pricing.js                 — load/validate versioned pricing config, look up a model/alias
    cost.js                    — tokens × rates → estimated USD, or "cost unavailable"
    usageRecord.js             — build the UsageRecord (counts, not content)
  config/
    paths.js                   — resolve ~/.cascade-cost-meter/ dirs + files
    settings.js                — load settings + defaults (currency, privacy opt-in)
  log/
    usageLog.js                — append/read usage.jsonl
    inbox.js                   — append/read/offset the inbox.jsonl queue
  util/
    safe.js                    — fail-safe wrappers; internal local logging
config/
  pricing/pricing.v1.json      — seed pricing (USD per 1M tokens) + metadata
  settings.example.json        — user settings template
extension/
  package.json                 — extension manifest (status bar, command, settings)
  src/extension.js             — activate: watch inbox, compute via core, log, render surfaces
  esbuild.mjs                  — bundle src + core → dist/extension.cjs
  .vscodeignore                — keep the .vsix lean
test/
  fixtures/                    — sanitized payloads + a fake transcript
  *.test.js                    — unit tests for core + fail-safe paths
hooks.example.json             — sample Windsurf hooks.json wiring
```

Runtime config + data live **outside the repo** in `~/.cascade-cost-meter/`
(`pricing/`, `settings.json`, `inbox.jsonl`, `inbox.offset`, `usage.jsonl`).

## Key modules

- **bin/hook.js** — the documented trigger. Reads the hook's stdin JSON, appends a
  compact event (model, ids, timestamp, `transcript_path`) to `inbox.jsonl`, exits
  0. Does no heavy work so it can never disrupt Cascade.
- **core/parser** — reads the referenced transcript JSONL defensively; pulls the
  latest turn's prompt/response/model; tolerates malformed lines and drift.
- **core/estimator** — text → approximate tokens (heuristic ≈ chars/4, model-aware;
  optional exact for OpenAI).
- **core/pricing** — loads/validates the versioned config; returns a rate or `null`.
- **core/cost** — estimated USD, or "cost unavailable".
- **log/inbox** + **log/usageLog** — the durable event queue and the append-only
  usage history; an offset marks processed events for backfill.
- **extension** — on activation, watches `inbox.jsonl`, processes new events via the
  core, appends to `usage.jsonl`, updates the status bar total, shows the per-turn
  toast, and registers the usage-log command; backfills unprocessed events.
- **util/safe** — wraps fallible work so failures log locally and never throw.

## Communication patterns

**Hook → file → extension (`fs.watch`).** The hook can't call the extension
directly, so it appends each turn's event to `inbox.jsonl`; the extension (always
running while the IDE is open) watches the file, computes via the shared **core**
(direct imports — no event bus), and renders. A processed **offset** lets it
backfill events that arrived while it was inactive. This is the bridge proven by
`staronelabs/windsurf-cli`. The headless CLI uses the same core for tests and for
users without the extension.

## Dependency policy

The **core has zero runtime dependencies**. The only approved runtime dependency
is the optional, lazily loaded `js-tiktoken` (OpenAI exact tokens). Dev-only
tooling — Vitest, esbuild, `@vscode/vsce` — is allowed. Any further runtime
dependency needs explicit approval.

## Dev workflow

- **Install:** `npm install` (dev deps; optional `js-tiktoken`).
- **Test:** `npm test` (Vitest).
- **Run core headless:** `cat test/fixtures/<payload>.json | node bin/cascade-cost-meter.js`.
- **Build extension:** `npm run build:ext` (esbuild → `extension/dist/extension.cjs`).
- **Package extension:** `npm run package:ext` (`vsce package` → `.vsix`), then
  install via "Extensions: Install from VSIX…" in Windsurf.
- **Wire up hook:** add a `post_cascade_response_with_transcript` entry to
  `~/.codeium/windsurf/hooks.json` pointing at `bin/hook.js`.
- **No dev server** — Cascade triggers the hook; the extension renders in-IDE.
