# File Map

<!-- Add entries as files are created. One line per file. -->
<!-- Format: path — role or responsibility -->
<!-- Update when files are created, renamed, or deleted. -->
<!-- Hot whole-file read. See AGENTS.md → "Memory size budgets" for limits. -->
<!-- Map roles, not history. Move batch notes and change history to decision-log.md. -->

<!-- "(planned)" = created after scope sign-off (Milestone 1). -->

## Project memory

- `pm_skills/project/brief.md` — product brief.
- `pm_skills/project/architecture.md` — proposed MVP architecture.
- `pm_skills/project/backlog.md` — milestones and tasks.
- `pm_skills/project/decision-log.md` — design decisions and rationale.
- `pm_skills/project/conventions.md` — code style, testing, patterns.
- `pm_skills/project/file-map.md` — this file.

## Planning deliverables

- `docs/feasibility-matrix.md` — feasibility questions, answers, doc citations.
- `docs/scoping.md` — scope of the MVP build.
- `docs/design-options.md` — options, trade-offs, MVP recommendation.
- `docs/privacy-security.md` — privacy/security posture and data handling.
- `docs/limitations.md` — known limitations and accuracy caveats.
- `docs/verification-checklist.md` — manual verification steps.
- `docs/setup.md` — install / build / wire-up / verification guide.
- `docs/install.md` — automated hook installer guide (`npm run setup`).

## Contracts (root)

- `AGENTS.md` — agent rules and invariants.
- `UI-STANDARDS.md` — UI/accessibility rules (applies to the later extension UI).
- `DEV-INFRASTRUCTURE.md` — build/dev/versioning rules (populated post-sign-off).
- `README.md` — project overview and status.

## Entry point (`bin/`)

- `bin/hook.js` — fail-safe hook entry; normalises the event and appends it to `inbox.jsonl`; always exits 0.
- `bin/cascade-cost-meter.js` — headless CLI; runs the full pipeline on one event, appends a record, prints the summary; subcommands `models`, `dedup`, `doctor [--watch] [--json]`.
- `bin/install.js` — setup helper (`npm run setup`); safely merges our hook into `~/.codeium/windsurf/hooks.json` (backup, idempotent, atomic); `--dry-run`/`--print`.

## Core modules (`src/`)

- `src/core/parser.js` — transcript JSONL → normalised turn (resilient to drift).
- `src/core/estimator.js` — heuristic + optional exact (OpenAI) token estimation.
- `src/core/pricing.js` — load/validate versioned pricing; look up model/alias.
- `src/core/cost.js` — tokens × rates → estimated USD; display formatting.
- `src/core/event.js` — normalise a raw hook payload → content-free inbox event.
- `src/core/usageRecord.js` — build the UsageRecord (counts, not content).
- `src/core/display.js` — per-turn summary + status-bar label.
- `src/core/pipeline.js` — orchestrates parse → estimate → price → cost → record.
- `src/core/doctor.js` — pure diagnostics: probe snapshot → per-layer checks + one verdict + text formatter.
- `src/diag/probe.js` — read-only diagnostic probes (hook config, data dir/offset, inbox/usage recency, transcripts, parser/pricing health, installed-vs-built extension hash).
- `src/diag/canary.js` — live `doctor --watch` canary: read-only snapshot + pure change classifier + poll loop.
- `src/log/usageLog.js` — append/read `usage.jsonl`; summarise totals.
- `src/log/inbox.js` — durable `inbox.jsonl` queue + processed offset.
- `src/config/paths.js` — resolve `~/.cascade-cost-meter/` dirs/files + the Windsurf `hooks.json` path.
- `src/config/hooksConfig.js` — pure, testable merge of our hook entry into a Windsurf `hooks.json` (idempotent; refuses malformed).
- `src/config/settings.js` — load/sanitise settings (defaults + file).
- `src/config/pricingSource.js` — pick the user vs bundled pricing file.
- `src/util/safe.js` — fail-safe wrappers + best-effort internal logging.
- `src/util/stdin.js` — read stdin with a timeout (never hangs).

## UI (extension)

- `extension/package.json` — manifest (status bar, commands, settings).
- `extension/src/extension.js` — activate: watch inbox, compute via core, append log, render status bar + toast, commands.
- `extension/esbuild.mjs` — bundle source + core → `dist/extension.cjs`.
- `extension/.vscodeignore` — keep the `.vsix` lean.
- `extension/dist/extension.cjs` — built bundle (generated; gitignored).
- `extension/cascade-cost-meter.vsix` — packaged extension (generated; gitignored).

## Config and constants

- `config/pricing/pricing.v1.json` — seed model pricing + metadata.
- `config/settings.example.json` — user settings template.
- `hooks.example.json` — sample Windsurf `hooks.json` wiring.
- Runtime config/log live outside the repo in `~/.cascade-cost-meter/`.

## Tests

- `test/fixtures/` — sanitized payloads + a fake transcript.
- `test/{parser,estimator,pricing,cost,event,pipeline,storage,integration,hooksConfig,models,doctor,diag}.test.js` — 138 passing tests.

## Build and tooling

- `package.json` — scripts (`test`, `setup`, `doctor`, `build:ext`, `package:ext`) and dev deps.
- `scripts/build-vsix.mjs` — zero-dep `.vsix` packager (zips the OPC layout;
  replaces `vsce`, which hangs on the OneDrive path).
- `vitest.config.js` — Vitest configuration.
- `.windsurf/workflows/setup.md` — `/setup` workflow Cascade can run to wire the hook and verify.
- `.editorconfig`, `.gitignore`, `.markdownlint.json` — editor/lint config.
