# Cascade Cost Meter

A **local, privacy-first** cost meter for Windsurf Cascade. After each Cascade
turn, a documented post-response hook records the event; an Open VSX **extension**
reads the on-disk transcript, **estimates** input/output tokens, prices them from
a versioned local config, shows the estimate in-IDE (status-bar running total +
per-turn toast), and appends a local JSONL record.

Example notification:

```text
Cascade estimate: $0.018 · 2.4k in / 680 out · Claude Sonnet 4
```

> **Every figure is an estimate.** No official Windsurf surface exposes exact
> per-turn token counts, so this tool approximates them locally and labels them
> accordingly. It is not a billing system and never replaces your invoice.

## Status

**MVP built and tested.** Shared core, fail-safe hook, headless CLI, and the
Open VSX extension are implemented; **85/85 unit + integration tests pass** and
the extension bundles via esbuild. Each turn is recorded exactly once (dedupe by
`executionId`); `cascade-cost-meter dedup` cleans any legacy duplicates. A packaged
**`extension/cascade-cost-meter.vsix`** is built and ready (`npm run package:ext`).
Remaining on your machine: install the `.vsix`, wire the hook (`npm run setup`), and
run the verification checklist (see `docs/setup.md`).

## How it works

1. Windsurf fires the `post_cascade_response_with_transcript` hook after each turn.
2. `bin/hook.js` appends a content-free event (model, IDs, transcript path) to
   `~/.cascade-cost-meter/inbox.jsonl`, then exits 0.
3. The extension watches the inbox, reads the transcript, estimates tokens, and
   looks up model pricing via the shared core.
4. It updates the status-bar total, shows a per-turn toast, and appends a record
   to `~/.cascade-cost-meter/usage.jsonl`.
5. Every error is caught and logged locally — the hook always exits 0 so Cascade
   is never disrupted. (`bin/cascade-cost-meter.js` runs the same pipeline
   headless, for tests or no-extension use.)

## Privacy at a glance

- **100% local. No network calls** in the default path.
- Logs **token counts and metadata, not raw prompt/response text** (raw text is
  opt-in only).
- Active config and history live **outside this repo** in `~/.cascade-cost-meter/`.

See `docs/privacy-security.md` for the full posture.

## Documentation

- **Product brief:** `pm_skills/project/brief.md`
- **Architecture:** `pm_skills/project/architecture.md`
- **MVP backlog:** `pm_skills/project/backlog.md`
- **Feasibility matrix (with doc citations):** `docs/feasibility-matrix.md`
- **Scope:** `docs/scoping.md`
- **Design options + recommendation:** `docs/design-options.md`
- **Privacy & security:** `docs/privacy-security.md`
- **Limitations:** `docs/limitations.md`
- **Pricing & model coverage:** `docs/pricing.md`
- **Manual verification checklist:** `docs/verification-checklist.md`

## Project layout

```text
AGENTS.md, UI-STANDARDS.md, DEV-INFRASTRUCTURE.md   — agent + project contracts
README.md                                           — this file
docs/                                               — planning deliverables
pm_skills/                                           — project memory + workflows
```

## Setup

See `docs/setup.md` for the full guide (prerequisites, install, build the
extension, verify). The fiddly hook-wiring step is automated: run `npm run setup`
to safely merge the hook into `~/.codeium/windsurf/hooks.json` — it auto-detects
the repo path, backs up your existing config, and is safe to re-run. Details in
`docs/install.md`.
