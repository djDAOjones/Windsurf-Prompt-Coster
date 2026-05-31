# Project Brief

<!-- Hot whole-file read. See AGENTS.md → "Memory size budgets" for limits. -->

## What are we building?

**Cascade Cost Meter** — a local, privacy-first tool that watches completed
Windsurf Cascade turns and, within a few seconds of each response, shows an
**estimated** cost notification such as
`Cascade estimate: $0.018 · 2.4k in / 680 out · Claude Sonnet 4`. It reads the
Cascade transcript that Windsurf writes to disk, estimates input/output tokens
locally, applies a **versioned local model-pricing config**, and appends a
local JSONL history record. All numbers are clearly labelled estimates, and no
prompt or transcript content ever leaves the machine.

## Who is it for?

Individual Windsurf/Cascade users — initially the maintainer — who want quick,
per-turn visibility into the approximate cost of each AI response, not a billing
dashboard. Especially useful for Pro/Max/BYOK self-serve users, where per-turn
dollar visibility is otherwise unavailable in the IDE.

## Platform and deployment

Runs locally on a developer machine using Windsurf (a VS Code-based IDE).
Primary surface is a **documented Cascade hook** (`post_cascade_response` /
`post_cascade_response_with_transcript`) that invokes a local **Node.js CLI**.
Notifications use an **OS-native notification** (macOS first via `osascript`;
Linux/Windows later). No server and no network. An optional Windsurf/Open VSX
**extension** (status bar + in-IDE notifications) is a later, separable layer.

## Core features (v1)

- A post-response Cascade hook runs the CLI after every Cascade turn.
- The CLI reads the latest transcript and extracts model name, prompt/response
  text, timestamp, and trajectory/turn IDs where available.
- It estimates input/output tokens locally and computes an estimated cost from a
  versioned pricing config; unknown models show tokens but "cost unavailable".
- It shows a visible notification within ~5s and appends a JSONL history record.
- It fails safe: a parsing, pricing, or notification error never crashes Cascade.

## Constraints

- **Official documented APIs only.** No scraping of private app internals; any
  such approach is a clearly separated, opt-in experimental option.
- **Estimator unless verified.** Every notification is labelled "estimate"
  unless exact usage is confirmed by an official source.
- **Privacy-first.** 100% local, zero external calls by default; raw prompt and
  response text are not stored by default.
- **Logs live outside the repo** by default (`~/.cascade-cost-meter/`); any
  in-repo sample logs are gitignored.
- **Pricing is config, not code** — a versioned JSON file, never hard-coded
  deep in logic.
- **Minimal runtime dependencies** (target zero). Node.js runtime; Vitest for
  tests. Tests required for transcript parsing, token estimation, pricing
  lookup, and cost calculation.

## Out of scope (for now)

- Polished UI and sidebar dashboards (begin with a reliable notification loop).
- Exact billing reconciliation — the Cascade Analytics API is Teams/Enterprise
  only and aggregates by day, not per turn.
- JetBrains / multi-IDE support.
- Any telemetry or analytics phone-home.

## Open questions

- The exact line schema of `post_cascade_response_with_transcript` JSONL
  transcripts must be confirmed on a real machine; the parser must be resilient
  to drift (the docs warn the structure may change).
- Whether the hook's `trajectory_id` maps to the Analytics API's `cascadeId`
  for optional later reconciliation.
- Preferred per-OS notification channel (e.g. `osascript` vs `terminal-notifier`
  on macOS) and how to detect availability.
